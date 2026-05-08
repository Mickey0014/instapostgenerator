const axios = require("axios");

const { cleanText, cleanUrl, dedupeByKey } = require("../utils/text");

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
};

function detectTextRisk({ source, originalUrl, alt }) {
  const fingerprint = cleanText([source, originalUrl, alt].join(" ")).toLowerCase();
  return /(bbc|cnn|reuters|ap news|al jazeera|getty|shutterstock|logo|watermark|caption|credit)/.test(
    fingerprint
  );
}

function buildProxyUrl(url) {
  return `/api/asset?url=${encodeURIComponent(url)}`;
}

function normalizeImage(image) {
  const textRisk = detectTextRisk(image);

  return {
    id: image.id,
    source: image.source,
    alt: cleanText(image.alt || "Suggested visual"),
    originalUrl: cleanUrl(image.originalUrl),
    previewUrl: cleanUrl(image.previewUrl || image.originalUrl),
    proxyUrl: buildProxyUrl(cleanUrl(image.originalUrl)),
    creditName: cleanText(image.creditName || ""),
    creditUrl: cleanUrl(image.creditUrl || ""),
    textRisk,
    preferredForOverlay: image.preferredForOverlay !== false && !textRisk
  };
}

function buildSearchQuery({ title, summary, keywords }) {
  return cleanText(
    [title, ...(keywords || []).slice(0, 3), summary.split(" ").slice(0, 8).join(" ")]
      .join(" ")
      .replace(/[^\w\s-]/g, " ")
  )
    .split(" ")
    .slice(0, 8)
    .join(" ");
}

function buildSearchQueries({ title, summary, keywords, preferredQuery }) {
  const queries = [
    cleanText(preferredQuery || ""),
    buildSearchQuery({ title, summary, keywords }),
    cleanText([title, ...(keywords || []).slice(0, 4)].join(" ")),
    cleanText((keywords || []).slice(0, 4).join(" "))
  ].filter(Boolean);

  return dedupeByKey(
    queries.map((query) => ({ query })),
    (item) => item.query.toLowerCase()
  ).map((item) => item.query);
}

async function searchUnsplash(query) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return [];
  }

  const response = await axios.get("https://api.unsplash.com/search/photos", {
    timeout: 15000,
    proxy: false,
    params: {
      query,
      per_page: 6,
      orientation: "squarish"
    },
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
    }
  });

  return (response.data?.results || [])
    .map((item) =>
      normalizeImage({
        id: `unsplash-${item.id}`,
        source: "Unsplash",
        alt: item.alt_description || item.description,
        originalUrl: item.urls?.regular || item.urls?.full,
        previewUrl: item.urls?.small || item.urls?.thumb,
        creditName: item.user?.name,
        creditUrl: item.user?.links?.html
      })
    )
    .filter((item) => item.originalUrl);
}

async function searchPexels(query) {
  if (!process.env.PEXELS_API_KEY) {
    return [];
  }

  const response = await axios.get("https://api.pexels.com/v1/search", {
    timeout: 15000,
    proxy: false,
    params: {
      query,
      per_page: 6,
      orientation: "square"
    },
    headers: {
      Authorization: process.env.PEXELS_API_KEY
    }
  });

  return (response.data?.photos || [])
    .map((item) =>
      normalizeImage({
        id: `pexels-${item.id}`,
        source: "Pexels",
        alt: item.alt,
        originalUrl: item.src?.large2x || item.src?.large,
        previewUrl: item.src?.medium || item.src?.small,
        creditName: item.photographer,
        creditUrl: item.photographer_url
      })
    )
    .filter((item) => item.originalUrl);
}

function normalizeSourceImages(sourceImages = []) {
  return sourceImages
    .filter((item) => item?.image)
    .map((item, index) =>
      normalizeImage({
        id: `source-image-${index + 1}`,
        source: item.source || "Article",
        alt: item.title || item.source || "Source image",
        originalUrl: item.image,
        previewUrl: item.image,
        preferredForOverlay: false
      })
    );
}

function imagePriority(image) {
  let score = 0;

  if (image.source && image.source !== "Unsplash" && image.source !== "Pexels") {
    score += 80;
  }

  if (image.source === "Unsplash" || image.source === "Pexels") {
    score += 50;
  }

  if (image.preferredForOverlay) {
    score += 20;
  }

  if (image.textRisk) {
    score -= 35;
  }

  if (image.source === "Article") {
    score -= 10;
  }

  return score;
}

function buildArticleImages({ title, fallbackImage, sourceImages = [] }) {
  return [
    ...normalizeSourceImages(sourceImages),
    ...(fallbackImage
      ? [
          normalizeImage({
            id: "article-og-image",
            source: "Article",
            alt: title,
            originalUrl: fallbackImage,
            previewUrl: fallbackImage,
            preferredForOverlay: false
          })
        ]
      : [])
  ];
}

function rankImages(images) {
  return dedupeByKey(images, (item) => item.originalUrl)
    .sort((left, right) => imagePriority(right) - imagePriority(left))
    .slice(0, 8);
}

function hasStrongArticleImage(images) {
  return images.some(
    (image) =>
      image.source &&
      image.source !== "Unsplash" &&
      image.source !== "Pexels" &&
      !image.textRisk
  );
}

async function fetchRelevantImages({
  title,
  summary,
  keywords,
  fallbackImage,
  preferredQuery,
  sourceImages = []
}) {
  const articleImages = rankImages(buildArticleImages({ title, fallbackImage, sourceImages }));

  if (hasStrongArticleImage(articleImages)) {
    return articleImages;
  }

  const queries = buildSearchQueries({ title, summary, keywords, preferredQuery });
  const [unsplash, pexels] = await Promise.allSettled([
    Promise.all(queries.slice(0, 3).map((query) => searchUnsplash(query))),
    Promise.all(queries.slice(0, 3).map((query) => searchPexels(query)))
  ]);

  return rankImages([
    ...(unsplash.status === "fulfilled" ? unsplash.value.flat() : []),
    ...(pexels.status === "fulfilled" ? pexels.value.flat() : []),
    ...articleImages
  ]);
}

async function proxyRemoteAsset(url, options = {}) {
  let parsedUrl = null;

  try {
    parsedUrl = new URL(url);
  } catch (error) {
    parsedUrl = null;
  }

  const headers = {
    ...DEFAULT_HEADERS,
    Accept: "*/*"
  };

  if (options.range) {
    headers.Range = options.range;
  }

  const hostname = parsedUrl?.hostname?.toLowerCase() || "";
  const isXVideoAsset =
    hostname.includes("video.twimg.com") ||
    hostname.includes("twimg.com") ||
    hostname === "x.com" ||
    hostname.endsWith(".x.com") ||
    hostname === "twitter.com" ||
    hostname.endsWith(".twitter.com");

  if (isXVideoAsset) {
    headers.Origin = "https://x.com";
    headers.Referer = "https://x.com/";
  }

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 20000,
    proxy: false,
    headers,
    validateStatus: (status) => status >= 200 && status < 400
  });

  return {
    status: response.status,
    stream: response.data,
    contentType: response.headers["content-type"] || "application/octet-stream",
    contentLength: response.headers["content-length"] || "",
    contentRange: response.headers["content-range"] || "",
    acceptRanges: response.headers["accept-ranges"] || "",
    etag: response.headers.etag || "",
    lastModified: response.headers["last-modified"] || ""
  };
}

module.exports = {
  fetchRelevantImages,
  proxyRemoteAsset
};
