const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { getRuntimeConfig } = require("../config");
const {
  cleanText,
  dedupeStrings,
  extractMeaningfulSentence,
  keywordCandidates,
  toSentenceCase,
  trimToWordBoundary,
  takeSentences
} = require("../utils/text");

const runtimeConfig = getRuntimeConfig();
const provider = runtimeConfig.provider;
const fallbackProvider = runtimeConfig.fallbackProvider;
const openaiClient = runtimeConfig.openaiApiKey ? new OpenAI({ apiKey: runtimeConfig.openaiApiKey }) : null;
const geminiClient = runtimeConfig.geminiApiKey
  ? new GoogleGenerativeAI(runtimeConfig.geminiApiKey)
  : null;
const groqClient = runtimeConfig.groqApiKey
  ? new OpenAI({
      apiKey: runtimeConfig.groqApiKey,
      baseURL: runtimeConfig.groqBaseUrl
    })
  : null;
const OPENAI_MODEL = runtimeConfig.openaiModel;
const GEMINI_MODEL = runtimeConfig.geminiModel;
const GROQ_MODEL = runtimeConfig.groqModel;
const STYLE_KEYS = ["professional", "casual", "narrative", "simple"];

function overlaySchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      subheadline: { type: "string" }
    },
    required: ["headline", "subheadline"]
  };
}

function jsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      captions: {
        type: "object",
        additionalProperties: false,
        properties: {
          professional: { type: "string" },
          casual: { type: "string" },
          narrative: { type: "string" },
          simple: { type: "string" }
        },
        required: STYLE_KEYS
      },
      hashtags: {
        type: "array",
        items: { type: "string" },
        minItems: 6,
        maxItems: 12
      },
      headline: { type: "string" },
      subheadline: { type: "string" },
      designVariants: {
        type: "object",
        additionalProperties: false,
        properties: {
          professional: overlaySchema(),
          casual: overlaySchema(),
          narrative: overlaySchema(),
          simple: overlaySchema()
        },
        required: STYLE_KEYS
      },
      imageQuery: { type: "string" },
      keywords: {
        type: "array",
        items: { type: "string" },
        minItems: 4,
        maxItems: 10
      }
    },
    required: [
      "summary",
      "captions",
      "hashtags",
      "headline",
      "subheadline",
      "designVariants",
      "imageQuery",
      "keywords"
    ]
  };
}

function buildPrompt({ article, prompt, context, source }) {
  const sourceText = article
    ? [
        `Source: ${article.source}`,
        article.sourceCount ? `Number of sources: ${article.sourceCount}` : "",
        `Title: ${article.title}`,
        `URL: ${article.url || "N/A"}`,
        `Published: ${article.publishedAt || "Unknown"}`,
        `Author: ${article.author || "Unknown"}`,
        "",
        `Content:\n${article.content.slice(0, 12000)}`
      ].join("\n")
    : [
        `Prompt: ${prompt}`,
        `Source hint: ${source || "Prompt Brief"}`,
        "",
        `Context:\n${cleanText(context || prompt).slice(0, 12000)}`
      ].join("\n");

  return [
    "You create Instagram-ready news posts.",
    "Return strict JSON only.",
    "Write a summary plus four caption variants: professional, casual, narrative, simple.",
    "Generate matching headline and subheadline overlay variants for the same four tones.",
    "Set the top-level headline and subheadline to the professional overlay version.",
    "Generate relevant hashtags and an image-search phrase.",
    "Keep captions factual, vivid, and concise.",
    "The professional headline must clearly capture the full event context using the main actor, action, and subject.",
    "The professional subheadline must be a complete grammatical sentence that explains the event accurately.",
    "Use correct names, places, and entities from the source. Never shorten proper nouns incorrectly.",
    "Avoid vague or teaser wording such as 'what's happening now', 'here's the latest', or 'inside the story'.",
    "Avoid labels, fragments, bullet-style phrasing, trailing clauses, or cut-off endings.",
    "Headlines should be concise but complete and natural, ideally 7 to 12 words.",
    "Subheadlines should be one complete sentence of roughly 90 to 140 characters.",
    "If multiple sources are provided, synthesize them into one accurate post and avoid repeating the same claim.",
    "Headline should fit a square visual overlay.",
    "",
    sourceText
  ].join("\n");
}

function clampHeadline(value, fallbackValue) {
  return trimToWordBoundary(value || fallbackValue, 90, "...");
}

function clampSubheadline(value, fallbackValue) {
  return trimToWordBoundary(value || fallbackValue, 140, "...");
}

function buildCleanSummary(content, title) {
  const leadSentence = extractMeaningfulSentence(content, title);
  return trimToWordBoundary(leadSentence, 150, "...");
}

function stripSourceSuffix(text) {
  const cleaned = cleanText(text);

  return cleaned
    .replace(/\s+[-|:]\s+(BBC News|BBC|Reuters|AP News|Associated Press|CNN|The Guardian|Al Jazeera|CNBC|Bloomberg)$/i, "")
    .replace(/\s+\|\s+(BBC News|BBC|Reuters|AP News|Associated Press|CNN|The Guardian|Al Jazeera|CNBC|Bloomberg)$/i, "")
    .trim();
}

function normalizeHeadlineText(value) {
  return cleanText(value)
    .replace(/^(breaking|update|latest|quick update)\s*[:,-]\s*/i, "")
    .replace(/[.]+$/, "")
    .trim();
}

function normalizeSubheadlineText(value) {
  const text = cleanText(value)
    .replace(/^(quick update|here'?s the latest|the latest turn|what happened|summary)\s*[:,-]\s*/i, "")
    .trim();

  if (!text) {
    return "";
  }

  if (/[.!?]$/.test(text)) {
    return toSentenceCase(text);
  }

  return `${toSentenceCase(text)}.`;
}

function buildContextHeadline({ title, summary }) {
  const safeTitle = stripSourceSuffix(title);
  const safeSummary = cleanText(summary);

  if (safeTitle && safeTitle.length >= 24) {
    return clampHeadline(safeTitle, safeTitle);
  }

  return clampHeadline(`${safeTitle} ${safeSummary}`.trim(), safeTitle || safeSummary);
}

function buildContextSubheadline({ summary, content, title }) {
  const summarySentence = extractMeaningfulSentence(summary, content || title);
  const contentSentence = extractMeaningfulSentence(content, summarySentence || title);
  const chosen = summarySentence.length >= 36 ? summarySentence : contentSentence;
  return clampSubheadline(normalizeSubheadlineText(chosen), chosen || title);
}

function isWeakHeadline(headline, title) {
  const text = normalizeHeadlineText(headline);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    !text ||
    text.length < 22 ||
    wordCount < 4 ||
    /(what'?s happening now|here'?s the latest|inside the story|matters now)$/i.test(text) ||
    /^[a-z]/.test(text) ||
    /(?:\bof|\bto|\bin|\bon|\bat|\bfor|\bwith|\bfrom|\ba|\ban|\bthe)\.?$/i.test(text) ||
    (title && text.toLowerCase() === cleanText(title).toLowerCase() && text.length < 28)
  );
}

function isWeakSubheadline(subheadline) {
  const text = cleanText(subheadline);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    !text ||
    text.length < 40 ||
    wordCount < 7 ||
    /(watch ?& ?listen|live reporting|summary|read more)/i.test(text) ||
    /(?:\bof|\bto|\bin|\bon|\bat|\bfor|\bwith|\bfrom|\ba|\ban|\bthe|[A-Z])$/.test(text) ||
    !/[.!?]$/.test(normalizeSubheadlineText(text))
  );
}

function buildEditorialOverlay(base, fallbackContext, mode) {
  const baseHeadline =
    mode === "professional" || mode === "simple"
      ? buildContextHeadline(fallbackContext)
      : base.headline;
  const baseSubheadline =
    mode === "professional" || mode === "simple"
      ? buildContextSubheadline(fallbackContext)
      : base.subheadline;

  return {
    headline: normalizeHeadlineText(clampHeadline(baseHeadline, fallbackContext.title)),
    subheadline: normalizeSubheadlineText(clampSubheadline(baseSubheadline, fallbackContext.summary))
  };
}

function buildFallbackHeadline(title, mode) {
  const safeTitle = trimToWordBoundary(stripSourceSuffix(title), 86, "...");

  if (mode === "casual") {
    return trimToWordBoundary(`${safeTitle}: what this means now`, 90, "...");
  }

  if (mode === "narrative") {
    return trimToWordBoundary(`${safeTitle} as the story unfolds`, 90, "...");
  }

  return safeTitle;
}

function buildFallbackSubheadline(summary, mode) {
  if (mode === "casual") {
    return clampSubheadline(`The latest update is that ${summary}`, summary);
  }

  if (mode === "narrative") {
    return clampSubheadline(`The story has developed as ${summary}`, summary);
  }

  return clampSubheadline(summary, summary);
}

function sanitizeDesignVariants(result, fallbackContext) {
  const professionalBase = {
    headline: isWeakHeadline(result.headline, fallbackContext.title)
      ? buildContextHeadline(fallbackContext)
      : normalizeHeadlineText(clampHeadline(result.headline, fallbackContext.title)),
    subheadline: isWeakSubheadline(result.subheadline)
      ? buildContextSubheadline(fallbackContext)
      : normalizeSubheadlineText(clampSubheadline(result.subheadline, fallbackContext.summary))
  };

  return STYLE_KEYS.reduce((accumulator, style) => {
    const rawVariant = result.designVariants?.[style] || {};
    const fallbackVariant =
      style === "professional"
        ? professionalBase
        : buildEditorialOverlay(
            {
              headline: rawVariant.headline || accumulator.professional.headline,
              subheadline: rawVariant.subheadline || accumulator.professional.subheadline
            },
            fallbackContext,
            style
          );

    accumulator[style] =
      style === "professional"
        ? professionalBase
        : {
            headline: normalizeHeadlineText(clampHeadline(rawVariant.headline, fallbackVariant.headline)),
            subheadline: normalizeSubheadlineText(
              clampSubheadline(rawVariant.subheadline, fallbackVariant.subheadline)
            )
          };

    return accumulator;
  }, {});
}

function sanitizeResult(result, fallbackContext) {
  const hashtags = dedupeStrings(
    (result.hashtags || []).map((tag) => {
      const cleaned = cleanText(tag).replace(/^#*/, "").replace(/\s+/g, "");
      return cleaned ? `#${cleaned}` : "";
    })
  ).slice(0, 12);

  while (hashtags.length < 6) {
    hashtags.push(`#${cleanText(fallbackContext.title).replace(/[^\w]/g, "").slice(0, 14) || "news"}`);
  }

  const summary =
    trimToWordBoundary(result.summary, 320, "...") ||
    buildCleanSummary(fallbackContext.content || fallbackContext.summary, fallbackContext.title);
  const designVariants = sanitizeDesignVariants(result, {
    ...fallbackContext,
    summary
  });

  return {
    summary,
    captions: {
      professional: trimToWordBoundary(result.captions?.professional, 1200, "..."),
      casual: trimToWordBoundary(result.captions?.casual, 1200, "..."),
      narrative: trimToWordBoundary(result.captions?.narrative, 1200, "..."),
      simple: trimToWordBoundary(result.captions?.simple, 1200, "...")
    },
    hashtags,
    design: designVariants.professional,
    designVariants,
    suggestedImageQuery: trimToWordBoundary(result.imageQuery, 80, ""),
    keywords: dedupeStrings((result.keywords || []).map((item) => cleanText(item))).slice(0, 10)
  };
}

function parseJsonPayload(payload) {
  if (typeof payload !== "string") {
    throw new Error("Model returned an empty response.");
  }

  const trimmed = payload.trim();

  if (!trimmed) {
    throw new Error("Model returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1].trim());
    }

    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd > objectStart) {
      return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
    }

    throw error;
  }
}

function isProviderReady(providerName) {
  if (providerName === "openai") {
    return Boolean(openaiClient);
  }

  if (providerName === "gemini") {
    return Boolean(geminiClient);
  }

  if (providerName === "groq") {
    return Boolean(groqClient);
  }

  return providerName === "fallback";
}

function buildProviderChain() {
  const chain = [];

  [provider, fallbackProvider].forEach((providerName) => {
    if (providerName && !chain.includes(providerName)) {
      chain.push(providerName);
    }
  });

  return chain.length ? chain : ["fallback"];
}

function isRateLimitError(error) {
  const statusCode =
    error?.status ||
    error?.statusCode ||
    error?.response?.status ||
    error?.cause?.status ||
    error?.error?.code;
  const message = String(error?.message || "");

  return (
    statusCode === 429 ||
    /\b429\b/.test(message) ||
    /quota exceeded|rate limit|too many requests|retry in/i.test(message)
  );
}

async function runOpenAiJson(promptText) {
  const response = await openaiClient.responses.create({
    model: OPENAI_MODEL,
    ...(OPENAI_MODEL.startsWith("gpt-5") ? { reasoning: { effort: "medium" } } : {}),
    input: promptText,
    text: {
      format: {
        type: "json_schema",
        name: "instagram_news_post",
        strict: true,
        schema: jsonSchema()
      }
    }
  });

  return parseJsonPayload(response.output_text);
}

async function runGeminiJson(promptText) {
  const model = geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const response = await model.generateContent([
    {
      text: `${promptText}\n\nReturn JSON shaped like:\n${JSON.stringify(jsonSchema())}`
    }
  ]);

  return parseJsonPayload(response.response.text());
}

async function runGroqJson(promptText) {
  const response = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    response_format: {
      type: "json_object"
    },
    messages: [
      {
        role: "system",
        content: "You create Instagram-ready news posts. Return one valid JSON object only."
      },
      {
        role: "user",
        content: `${promptText}\n\nReturn one JSON object that matches this schema exactly:\n${JSON.stringify(
          jsonSchema()
        )}`
      }
    ]
  });

  return parseJsonPayload(response.choices?.[0]?.message?.content || "");
}

function buildFallbackFromStory({ title, content, source }) {
  const summary = buildCleanSummary(content, title);
  const keywords = dedupeStrings(keywordCandidates(`${title} ${content}`)).slice(0, 8);
  const designVariants = {
    professional: {
      headline: buildFallbackHeadline(title, "professional"),
      subheadline: buildFallbackSubheadline(summary, "professional")
    },
    casual: {
      headline: buildFallbackHeadline(title, "casual"),
      subheadline: buildFallbackSubheadline(summary, "casual")
    },
    narrative: {
      headline: buildFallbackHeadline(title, "narrative"),
      subheadline: buildFallbackSubheadline(summary, "narrative")
    },
    simple: {
      headline: buildFallbackHeadline(title, "simple"),
      subheadline: buildFallbackSubheadline(summary, "simple")
    }
  };

  return {
    summary,
    captions: {
      professional: `${title}\n\n${summary}\n\nWhy it matters: ${takeSentences(
        content,
        1
      )} Source: ${source}.`,
      casual: `Quick rundown: ${title}. ${summary} Keeping an eye on this one from ${source}.`,
      narrative: `The story starts with ${title}. ${summary} Now the bigger question is what happens next.`,
      simple: `${title}. ${summary} Source: ${source}.`
    },
    hashtags: dedupeStrings(
      ["#news", "#instagramnews", "#currentaffairs", ...keywords.map((item) => `#${item.replace(/\s+/g, "")}`)]
    ).slice(0, 10),
    headline: designVariants.professional.headline,
    subheadline: designVariants.professional.subheadline,
    designVariants,
    imageQuery: keywords.slice(0, 4).join(" "),
    keywords
  };
}

async function runConfiguredModel(promptText, fallbackStory) {
  const providerChain = buildProviderChain();
  let previousRateLimitError = null;

  for (let index = 0; index < providerChain.length; index += 1) {
    const activeProvider = providerChain[index];

    if (!isProviderReady(activeProvider)) {
      if (activeProvider === provider) {
        throw new Error(`Configured AI provider "${activeProvider}" is not ready.`);
      }

      continue;
    }

    try {
      if (activeProvider === "openai") {
        return await runOpenAiJson(promptText);
      }

      if (activeProvider === "gemini") {
        return await runGeminiJson(promptText);
      }

      if (activeProvider === "groq") {
        return await runGroqJson(promptText);
      }

      return buildFallbackFromStory(fallbackStory);
    } catch (error) {
      const canTryNextProvider =
        index < providerChain.length - 1 && activeProvider === provider && isRateLimitError(error);

      if (canTryNextProvider) {
        const nextProvider = providerChain[index + 1];
        previousRateLimitError = error;
        console.warn(
          `[ai] Provider "${activeProvider}" hit a rate limit or quota error. Falling back to "${nextProvider}".`
        );
        continue;
      }

      if (previousRateLimitError && activeProvider !== provider) {
        error.message = `Primary provider "${provider}" hit a rate limit or quota error, and fallback provider "${activeProvider}" also failed: ${error.message}`;
      }

      throw error;
    }
  }

  if (previousRateLimitError) {
    throw previousRateLimitError;
  }

  throw new Error("No AI provider is available to generate a post.");
}

async function generateInstagramPackageFromArticle(article) {
  const promptText = buildPrompt({ article });
  const result = await runConfiguredModel(promptText, article);

  return sanitizeResult(result, {
    title: article.title,
    summary: article.excerpt || "",
    content: article.content || ""
  });
}

async function generateInstagramPackageFromPrompt({ prompt, context, source }) {
  const promptText = buildPrompt({ prompt, context, source });
  const fallbackStory = {
    title: prompt,
    content: context || prompt,
    source: source || "Prompt Brief"
  };

  const result = await runConfiguredModel(promptText, fallbackStory);

  return sanitizeResult(result, {
    title: prompt,
    summary: context || prompt,
    content: context || prompt
  });
}

module.exports = {
  generateInstagramPackageFromArticle,
  generateInstagramPackageFromPrompt
};
