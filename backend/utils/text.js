function cleanText(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([,.;:!?])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function trimToWordBoundary(value, maxLength, suffix = "") {
  const text = cleanText(value);

  if (!text || text.length <= maxLength) {
    return text;
  }

  const safeLimit = Math.max(1, maxLength - suffix.length);
  let trimmed = text.slice(0, safeLimit).trim();
  const lastWhitespace = trimmed.search(/\s+\S*$/);

  if (lastWhitespace > Math.floor(safeLimit * 0.6)) {
    trimmed = trimmed.slice(0, lastWhitespace).trim();
  }

  return `${trimmed}${suffix}`.trim();
}

function toSentenceCase(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function extractMeaningfulSentence(text, fallback = "") {
  const cleaned = cleanText(text);
  const candidates = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter(Boolean)
    .filter(
      (sentence) =>
        sentence.length >= 24 &&
        !/^(live reporting|watch ?& ?listen|summary|video|listen|read more)\b/i.test(sentence)
    );

  return candidates[0] || cleanText(fallback || cleaned);
}

function dedupeStrings(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function dedupeByKey(values, keyFn) {
  const seen = new Set();

  return (values || []).filter((item) => {
    const key = keyFn(item);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function takeSentences(text, count) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, count)
    .join(" ");
}

function keywordCandidates(text) {
  const stopWords = new Set([
    "about",
    "after",
    "against",
    "also",
    "been",
    "because",
    "before",
    "being",
    "between",
    "could",
    "first",
    "from",
    "have",
    "into",
    "more",
    "news",
    "over",
    "said",
    "says",
    "some",
    "that",
    "their",
    "there",
    "these",
    "they",
    "this",
    "today",
    "under",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "would"
  ]);

  return dedupeStrings(
    cleanText(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
  );
}

module.exports = {
  cleanUrl,
  cleanText,
  dedupeByKey,
  dedupeStrings,
  extractMeaningfulSentence,
  keywordCandidates,
  toSentenceCase,
  trimToWordBoundary,
  takeSentences
};
