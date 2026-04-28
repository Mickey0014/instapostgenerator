const axios = require("axios");
const Parser = require("rss-parser");

const { resolveArticleUrl } = require("./googleNewsDecoder");
const { cleanText, cleanUrl, dedupeByKey } = require("../utils/text");

const parser = new Parser({
  customFields: {
    item: [["media:content", "mediaContent", { keepArray: true }]]
  }
});

function normalizeSourceName(source) {
  return cleanText(source).toLowerCase().replace(/^www\./, "");
}

function extractSourceFromTitle(title) {
  const normalizedTitle = cleanText(title);
  const parts = normalizedTitle.split(" - ").map((part) => cleanText(part)).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function normalizeArticle(item) {
  let hostname = "";

  try {
    hostname = item.link ? new URL(item.link).hostname.replace(/^www\./, "") : "";
  } catch (error) {
    hostname = "";
  }

  const sourceFromTitle = extractSourceFromTitle(item.title);
  const normalizedSource =
    cleanText(item.source?.name) ||
    cleanText(item.creator) ||
    cleanText(item["dc:creator"]) ||
    (hostname === "news.google.com" ? sourceFromTitle : "") ||
    hostname ||
    "Unknown source";

  return {
    title: cleanText(item.title),
    url: cleanUrl(item.url || item.link),
    source: normalizedSource,
    summary: cleanText(item.description || item.contentSnippet || item.content || ""),
    publishedAt: cleanText(item.pubDate || item.isoDate || ""),
    image:
      cleanUrl(item.urlToImage) ||
      cleanUrl(item.enclosure?.url) ||
      cleanUrl(item.mediaContent?.[0]?.$?.url || "")
  };
}

async function searchWithNewsApi(query) {
  if (!process.env.NEWS_API_KEY) {
    return [];
  }

  const response = await axios.get("https://newsapi.org/v2/everything", {
    timeout: 15000,
    proxy: false,
    params: {
      apiKey: process.env.NEWS_API_KEY,
      q: query,
      language: "en",
      pageSize: 8,
      sortBy: "publishedAt"
    }
  });

  return (response.data?.articles || [])
    .map(normalizeArticle)
    .filter((item) => item.title && item.url);
}

async function searchWithGoogleNewsRss(query) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=en-US&gl=US&ceid=US:en`;

  const feed = await parser.parseURL(rssUrl);
  const articles = await Promise.all(
    (feed.items || []).map(async (item) => {
      const article = normalizeArticle(item);

      if (article.url) {
        article.url = await resolveArticleUrl(article.url);
      }

      return article;
    })
  );

  return articles.filter((item) => item.title && item.url);
}

function diversifyBySource(articles, limit = 12) {
  const buckets = new Map();

  for (const article of articles) {
    const sourceKey = normalizeSourceName(article.source) || "unknown-source";

    if (!buckets.has(sourceKey)) {
      buckets.set(sourceKey, []);
    }

    buckets.get(sourceKey).push(article);
  }

  const bucketEntries = Array.from(buckets.values()).map((bucket) =>
    bucket.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  );

  const diversified = [];
  let cursor = 0;

  while (diversified.length < limit) {
    let appended = false;

    for (const bucket of bucketEntries) {
      if (bucket[cursor]) {
        diversified.push(bucket[cursor]);
        appended = true;
      }

      if (diversified.length >= limit) {
        break;
      }
    }

    if (!appended) {
      break;
    }

    cursor += 1;
  }

  return diversified;
}

async function searchNewsByTopic(query) {
  const [newsApiResults, rssResults] = await Promise.allSettled([
    searchWithNewsApi(query),
    searchWithGoogleNewsRss(query)
  ]);

  const combined = [
    ...(newsApiResults.status === "fulfilled" ? newsApiResults.value : []),
    ...(rssResults.status === "fulfilled" ? rssResults.value : [])
  ];

  const deduped = dedupeByKey(combined, (item) => item.url);
  return diversifyBySource(deduped, 12);
}

function buildMultiSourceStory(query, articles) {
  const selectedArticles = articles.slice(0, 5);
  const sources = dedupeByKey(
    selectedArticles.map((article) => ({
      source: article.source,
      url: article.url,
      title: article.title,
      image: article.image
    })),
    (item) => normalizeSourceName(item.source)
  );

  const content = selectedArticles
    .map(
      (article, index) =>
        `Source ${index + 1}: ${article.source}\nTitle: ${article.title}\nSummary: ${
          article.summary || "No summary available."
        }`
    )
    .join("\n\n");

  return {
    title: `Latest coverage: ${query}`,
    content,
    excerpt: selectedArticles.map((article) => article.title).join(" | "),
    source: sources.map((item) => item.source).join(", "),
    url: "",
    image: selectedArticles.find((article) => article.image)?.image || "",
    publishedAt: selectedArticles[0]?.publishedAt || "",
    author: "",
    keywords: [],
    sourceArticles: selectedArticles,
    sourceCount: sources.length
  };
}

module.exports = {
  buildMultiSourceStory,
  searchNewsByTopic
};
