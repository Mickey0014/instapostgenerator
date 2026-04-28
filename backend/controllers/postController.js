const { buildMultiSourceStory, searchNewsByTopic } = require("../services/newsService");
const {
  extractArticleFromUrl,
  normalizeStorySeed
} = require("../services/articleExtractor");
const { getReadinessStatus } = require("../config");
const {
  generateInstagramPackageFromArticle,
  generateInstagramPackageFromPrompt
} = require("../services/aiService");
const {
  fetchRelevantImages,
  proxyRemoteAsset
} = require("../services/imageService");

async function healthCheck(req, res) {
  const status = getReadinessStatus();
  res.status(status.ok ? 200 : 503).json(status);
}

async function proxyAsset(req, res, next) {
  try {
    const { url } = req.query || {};

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "A valid asset URL is required." });
    }

    const asset = await proxyRemoteAsset(url, {
      range: typeof req.headers.range === "string" ? req.headers.range : ""
    });

    res.status(asset.status || 200);
    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (asset.contentLength) {
      res.setHeader("Content-Length", asset.contentLength);
    }

    if (asset.contentRange) {
      res.setHeader("Content-Range", asset.contentRange);
    }

    if (asset.acceptRanges) {
      res.setHeader("Accept-Ranges", asset.acceptRanges);
    }

    if (asset.etag) {
      res.setHeader("ETag", asset.etag);
    }

    if (asset.lastModified) {
      res.setHeader("Last-Modified", asset.lastModified);
    }

    asset.stream.on("error", next);
    asset.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

async function searchNews(req, res, next) {
  try {
    const query = String(req.body?.query || "").trim();

    if (!query) {
      return res.status(400).json({ error: "A topic or search prompt is required." });
    }

    const articles = await searchNewsByTopic(query);

    res.json({
      query,
      count: articles.length,
      sourceCount: new Set(articles.map((article) => article.source.toLowerCase())).size,
      articles
    });
  } catch (error) {
    next(error);
  }
}

async function generateFromLink(req, res, next) {
  try {
    const url = String(req.body?.url || "").trim();

    if (!url) {
      return res.status(400).json({ error: "A news article URL is required." });
    }

    const article = await extractArticleFromUrl(url);
    const post = await generateInstagramPackageFromArticle(article);
    const images = await fetchRelevantImages({
      title: article.title,
      summary: post.summary,
      keywords: post.keywords,
      fallbackImage: article.image,
      preferredQuery: post.suggestedImageQuery,
      sourceImages: article.sourceArticles || []
    });

    res.json({
      article,
      post: {
        ...post,
        images
      }
    });
  } catch (error) {
    next(error);
  }
}

async function generatePost(req, res, next) {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    const url = String(req.body?.url || "").trim();
    let article;

    if (url) {
      article = await extractArticleFromUrl(url);
    } else if (prompt) {
      const promptContext = String(req.body?.context || "").trim();

      if (promptContext) {
        article = normalizeStorySeed({
          title: prompt,
          content: promptContext,
          source: "Prompt Brief",
          url: "",
          image: ""
        });
      } else {
        const sourceArticles = await searchNewsByTopic(prompt);
        article = buildMultiSourceStory(prompt, sourceArticles);
      }
    } else {
      const title = String(req.body?.title || "").trim();
      const summary = String(req.body?.summary || "").trim();

      if (!title && !summary) {
        return res.status(400).json({
          error: "Provide a prompt, URL, or a title/summary pair to generate a post."
        });
      }

      article = normalizeStorySeed({
        title: title || "Untitled story",
        content: summary,
        source: String(req.body?.source || "Manual Entry").trim(),
        url: "",
        image: String(req.body?.image || "").trim()
      });
    }

    const post = url
      ? await generateInstagramPackageFromArticle(article)
      : await generateInstagramPackageFromPrompt({
          prompt: prompt || article.title,
          context: article.content,
          source: article.source
        });

    const images = await fetchRelevantImages({
      title: article.title,
      summary: post.summary,
      keywords: post.keywords,
      fallbackImage: article.image,
      preferredQuery: post.suggestedImageQuery || prompt,
      sourceImages: article.sourceArticles || []
    });

    res.json({
      article,
      post: {
        ...post,
        images
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generateFromLink,
  generatePost,
  healthCheck,
  proxyAsset,
  searchNews
};
