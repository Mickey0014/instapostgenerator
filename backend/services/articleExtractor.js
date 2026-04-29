const axios = require("axios");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

const {
  cleanText,
  cleanUrl,
  dedupeStrings,
  keywordCandidates,
  trimToWordBoundary
} = require("../utils/text");
const { resolveArticleUrl } = require("./googleNewsDecoder");
const { extractVideoContext, formatTimestamp, transcriptToText } = require("./videoService");

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1"
};

function buildRequestHeaders(url) {
  return {
    ...DEFAULT_HEADERS,
    Referer: `${url.protocol}//${url.host}/`
  };
}

function buildBlockedArticleError(url, statusCode) {
  const hostname = cleanText(url.hostname || "").replace(/^www\./, "");
  const error = new Error(
    statusCode === 403
      ? `This publisher blocked article extraction from the server (403) for ${hostname}. Try a different source for this story, or use source search first and generate from the summarized results.`
      : `I couldn't access this article from ${hostname} right now (HTTP ${statusCode}). Try another source or use source search first.`
  );
  error.status = statusCode;
  return error;
}

function getMeta(document, key, attribute = "property") {
  const selector = `meta[${attribute}="${key}"]`;
  return document.querySelector(selector)?.getAttribute("content") || "";
}

function extractKeywords(title, text) {
  return dedupeStrings(keywordCandidates(`${title} ${text}`)).slice(0, 8);
}

function isTwitterStatusUrl(url) {
  const hostname = cleanText(url.hostname || "").toLowerCase().replace(/^www\./, "");

  if (!["x.com", "twitter.com", "mobile.twitter.com"].includes(hostname)) {
    return false;
  }

  return /^\/[^/]+\/status\/\d+/i.test(url.pathname || "");
}

function cleanupTweetText(value) {
  return cleanText(
    String(value || "")
      .replace(/\bpic\.twitter\.com\/\S+/gi, " ")
      .replace(/\bhttps?:\/\/t\.co\/\S+/gi, " ")
      .replace(/\s+/g, " ")
  );
}

function buildTweetTitle(text, authorName) {
  const cleanTweetText = cleanupTweetText(text);

  if (!cleanTweetText) {
    return cleanText(authorName ? `Post by ${authorName}` : "Post from X");
  }

  return trimToWordBoundary(cleanTweetText, 110, "...");
}

function extractPublishedTextFromTweetHtml(document) {
  const anchors = Array.from(document.querySelectorAll("blockquote.twitter-tweet a"));

  for (let index = anchors.length - 1; index >= 0; index -= 1) {
    const text = cleanText(anchors[index].textContent || "");

    if (text && /\b\d{4}\b/.test(text)) {
      return text;
    }
  }

  return "";
}

function extractTwitterStatusId(url) {
  return url.pathname.match(/\/status\/(\d+)/i)?.[1] || "";
}

function sortTwitterVideoVariants(variants = []) {
  return [...variants]
    .filter((variant) => cleanText(variant?.content_type || variant?.type || "").includes("video/"))
    .map((variant) => ({
      url: cleanUrl(variant?.url || variant?.src || ""),
      type: cleanText(variant?.content_type || variant?.type || ""),
      bitrate: Number(variant?.bitrate || 0)
    }))
    .filter((variant) => variant.url)
    .sort((left, right) => right.bitrate - left.bitrate || right.url.length - left.url.length);
}

function buildTwitterVideoFromSyndication(payload) {
  const mediaDetail = Array.isArray(payload?.mediaDetails)
    ? payload.mediaDetails.find((item) => item?.type === "video" || item?.type === "animated_gif")
    : null;
  const rawVariants =
    mediaDetail?.video_info?.variants ||
    payload?.video?.variants?.map((variant) => ({
      type: variant?.type,
      url: variant?.src
    })) ||
    [];
  const variants = sortTwitterVideoVariants(rawVariants);
  const durationMs = Number(
    payload?.video?.durationMs || mediaDetail?.video_info?.duration_millis || 0
  );
  const durationSeconds = durationMs > 0 ? Math.round(durationMs / 1000) : null;

  if (!variants.length) {
    return null;
  }

  return {
    url: variants[0].url,
    type: variants[0].type || "video/mp4",
    candidates: variants.map((variant) => ({
      url: variant.url,
      type: variant.type || "video/mp4"
    })),
    poster: cleanUrl(payload?.video?.poster || mediaDetail?.media_url_https || ""),
    durationSeconds,
    durationLabel: durationSeconds ? formatTimestamp(durationSeconds) : "",
    transcript: null,
    clip: durationSeconds
      ? {
          startSeconds: 0,
          endSeconds: Math.min(durationSeconds, 60),
          startTime: "00:00",
          endTime: formatTimestamp(Math.min(durationSeconds, 60)),
          label: `00:00 - ${formatTimestamp(Math.min(durationSeconds, 60))}`,
          reason:
            durationSeconds <= 62
              ? "Using the full source clip because the video is already about a minute or shorter."
              : "Using the opening minute from the exact video attached to this X post.",
          transcriptExcerpt: ""
        }
      : null
  };
}

async function fetchTwitterStatusContext(url) {
  const statusId = extractTwitterStatusId(url);

  if (statusId) {
    try {
      const syndicationResponse = await axios.get("https://cdn.syndication.twimg.com/tweet-result", {
        timeout: 15000,
        proxy: false,
        params: {
          id: statusId,
          token: 0
        },
        headers: DEFAULT_HEADERS
      });
      const payload = syndicationResponse.data || {};
      const tweetText = cleanupTweetText(payload.text || "");

      if (tweetText) {
        return {
          title: buildTweetTitle(tweetText, cleanText(payload?.user?.name || "")),
          content: tweetText,
          source: "X (formerly Twitter)",
          author: cleanText(payload?.user?.name || ""),
          authorUrl: cleanUrl(
            payload?.user?.screen_name ? `https://x.com/${payload.user.screen_name}` : ""
          ),
          publishedAt: cleanText(payload?.created_at || ""),
          image: cleanUrl(
            payload?.video?.poster ||
              payload?.mediaDetails?.[0]?.media_url_https ||
              payload?.photos?.[0]?.url ||
              ""
          ),
          video: buildTwitterVideoFromSyndication(payload)
        };
      }
    } catch (error) {
      // Fall back to oEmbed and page extraction below.
    }
  }

  try {
    const response = await axios.get("https://publish.twitter.com/oembed", {
      timeout: 15000,
      proxy: false,
      params: {
        url: url.toString(),
        omit_script: 1,
        hide_thread: 1,
        dnt: true,
        lang: "en"
      },
      headers: DEFAULT_HEADERS
    });

    const html = String(response.data?.html || "");

    if (!html) {
      return null;
    }

    const dom = new JSDOM(`<body>${html}</body>`);
    const document = dom.window.document;
    const tweetText = cleanupTweetText(
      document.querySelector("blockquote.twitter-tweet p")?.textContent || ""
    );
    const authorName = cleanText(response.data?.author_name || "");
    const authorUrl = cleanUrl(response.data?.author_url || "");
    const publishedAt = extractPublishedTextFromTweetHtml(document);

    if (!tweetText) {
      return null;
    }

    return {
      title: buildTweetTitle(tweetText, authorName),
      content: tweetText,
      source: "X (formerly Twitter)",
      author: authorName,
      authorUrl,
      publishedAt,
      image: "",
      video: null
    };
  } catch (error) {
    return null;
  }
}

function normalizeStorySeed({ title, content, source, url, image, publishedAt, author, video }) {
  const cleanContent = cleanText(content || title || "");

  return {
    title: cleanText(title || "Untitled story"),
    content: cleanContent,
    excerpt: cleanContent.slice(0, 280),
    source: cleanText(source || "Unknown source"),
    url: cleanUrl(url || ""),
    image: cleanUrl(image || ""),
    publishedAt: cleanText(publishedAt || ""),
    author: cleanText(author || ""),
    keywords: extractKeywords(title || "", cleanContent),
    video: video?.url
      ? {
          url: cleanUrl(video.url),
          type: cleanText(video.type),
          candidates: Array.isArray(video.candidates)
            ? video.candidates
                .map((candidate) => ({
                  url: cleanUrl(candidate?.url),
                  type: cleanText(candidate?.type || "")
                }))
                .filter((candidate) => candidate.url)
            : [],
          poster: cleanUrl(video.poster),
          durationSeconds:
            typeof video.durationSeconds === "number" && Number.isFinite(video.durationSeconds)
              ? video.durationSeconds
              : null,
          durationLabel: cleanText(video.durationLabel || ""),
          transcript: video.transcript
            ? {
                sourceUrl: cleanUrl(video.transcript.sourceUrl),
                excerpt: cleanText(video.transcript.excerpt || "")
              }
            : null,
          clip: video.clip
            ? {
                startSeconds:
                  typeof video.clip.startSeconds === "number" && Number.isFinite(video.clip.startSeconds)
                    ? video.clip.startSeconds
                    : 0,
                endSeconds:
                  typeof video.clip.endSeconds === "number" && Number.isFinite(video.clip.endSeconds)
                    ? video.clip.endSeconds
                    : 0,
                startTime: cleanText(video.clip.startTime || ""),
                endTime: cleanText(video.clip.endTime || ""),
                label: cleanText(video.clip.label || ""),
                reason: cleanText(video.clip.reason || ""),
                transcriptExcerpt: cleanText(video.clip.transcriptExcerpt || "")
              }
            : null
        }
      : null
  };
}

function slugToWords(value) {
  return cleanText(
    String(value || "")
      .replace(/\.(html|htm|amp|cms|php|aspx?)$/i, " ")
      .replace(/[-_+]+/g, " ")
      .replace(/\b\d+\b/g, " ")
  );
}

function cleanFallbackQuery(value) {
  return cleanText(value)
    .replace(/\b(breaking|live|latest|update|news|story|article|video|photos?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveTopicFromUrl(url) {
  let validatedUrl;

  try {
    validatedUrl = typeof url === "string" ? new URL(url) : url;
  } catch (error) {
    return "";
  }

  const pathSegments = validatedUrl.pathname
    .split("/")
    .map((segment) => slugToWords(decodeURIComponent(segment)))
    .filter(Boolean);
  const bestPathSegment = [...pathSegments].reverse().find((segment) => segment.split(/\s+/).length >= 3) || "";
  const domainHint = cleanText(validatedUrl.hostname.replace(/^www\./, "").split(".").slice(0, -1).join(" "));
  const query = cleanFallbackQuery(bestPathSegment || pathSegments.join(" ") || domainHint);

  return query
    .split(/\s+/)
    .slice(0, 10)
    .join(" ");
}

async function extractArticleFromUrl(url) {
  let validatedUrl;

  try {
    const resolvedUrl = await resolveArticleUrl(url);
    validatedUrl = new URL(resolvedUrl);
  } catch (error) {
    const validationError = new Error("Please enter a valid article URL.");
    validationError.status = 400;
    throw validationError;
  }

  if (validatedUrl.hostname === "news.google.com") {
    const extractionError = new Error(
      "I couldn't resolve that Google News wrapper to the publisher article."
    );
    extractionError.status = 422;
    throw extractionError;
  }

  const twitterStatus = isTwitterStatusUrl(validatedUrl)
    ? await fetchTwitterStatusContext(validatedUrl)
    : null;
  const response = await axios.get(validatedUrl.toString(), {
    timeout: 20000,
    proxy: false,
    maxRedirects: 5,
    responseType: "text",
    headers: buildRequestHeaders(validatedUrl),
    validateStatus: (status) => status >= 200 && status < 500
  });

  const dom = new JSDOM(String(response.data || ""), { url: validatedUrl.toString() });
  const document = dom.window.document;
  const readable = new Readability(document).parse();
  const metaDescription =
    cleanText(getMeta(document, "description", "name")) ||
    cleanText(getMeta(document, "og:description")) ||
    cleanText(getMeta(document, "twitter:description", "name"));
  const fallbackTitle =
    cleanText(readable?.title) ||
    cleanText(getMeta(document, "og:title")) ||
    cleanText(getMeta(document, "twitter:title", "name")) ||
    cleanText(document.title) ||
    "Untitled article";
  const preferredTitle = cleanText(twitterStatus?.title || "");
  const preferredDescription = cleanText(twitterStatus?.content || metaDescription);

  const title =
    preferredTitle ||
    fallbackTitle;

  const video = await extractVideoContext({
    document,
    html: response.data,
    baseUrl: validatedUrl.toString(),
    title,
    description: preferredDescription
  });
  const resolvedVideo = twitterStatus?.video?.url ? twitterStatus.video : video;
  const transcriptExcerpt = transcriptToText(video?.transcript?.cues || [], 900);
  const fallbackVideoText =
    transcriptExcerpt || cleanText(resolvedVideo?.clip?.transcriptExcerpt || "");
  const content = cleanText(
    twitterStatus?.content ||
      readable?.textContent ||
      dedupeStrings([preferredDescription, fallbackVideoText].filter(Boolean)).join(" ")
  );

  if ([401, 403, 451].includes(response.status)) {
    throw buildBlockedArticleError(validatedUrl, response.status);
  }

  if (!content) {
    const extractionError = new Error(
      "I couldn't extract enough readable content or video context from that link."
    );
    extractionError.status = 422;
    throw extractionError;
  }

  return normalizeStorySeed({
    title,
    content,
    source:
      cleanText(twitterStatus?.source) ||
      cleanText(getMeta(document, "og:site_name")) ||
      validatedUrl.hostname.replace(/^www\./, ""),
    url: validatedUrl.toString(),
    image: cleanUrl(twitterStatus?.image || getMeta(document, "og:image")),
    publishedAt:
      cleanText(twitterStatus?.publishedAt) ||
      cleanText(getMeta(document, "article:published_time")),
    author: cleanText(twitterStatus?.author) || cleanText(getMeta(document, "author", "name")),
    video: resolvedVideo
  });
}

module.exports = {
  deriveTopicFromUrl,
  extractArticleFromUrl,
  normalizeStorySeed
};
