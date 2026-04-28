const axios = require("axios");

const {
  cleanText,
  cleanUrl,
  dedupeStrings,
  keywordCandidates,
  trimToWordBoundary
} = require("../utils/text");

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
};

function resolveUrl(url, baseUrl) {
  if (!url) {
    return "";
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    return "";
  }
}

function safeJsonStringDecode(value) {
  if (!value) {
    return "";
  }

  try {
    return JSON.parse(`"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  } catch (error) {
    return String(value);
  }
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeVideoUrlCandidate(value, baseUrl) {
  const decoded = decodeHtmlEntities(
    safeJsonStringDecode(String(value || "").replace(/\\u0026/g, "&").replace(/\\\//g, "/"))
  );

  return resolveUrl(decoded, baseUrl);
}

function sanitizeCueText(value) {
  return cleanText(
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/\([^)]*music[^)]*\)/gi, " ")
      .replace(/\([^)]*applause[^)]*\)/gi, " ")
  );
}

function parseDurationSeconds(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) && numberValue > 1000 ? numberValue / 1000 : numberValue;
  }

  const isoMatch = normalized.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);

  if (isoMatch) {
    const hours = Number(isoMatch[1] || 0);
    const minutes = Number(isoMatch[2] || 0);
    const seconds = Number(isoMatch[3] || 0);
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
  }

  const parts = normalized.split(":").map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

function formatTimestamp(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function collectRegexMatches(pattern, input, mapFn = (match) => match[1]) {
  const matches = [];

  for (const match of String(input || "").matchAll(pattern)) {
    const value = mapFn(match);

    if (value) {
      matches.push(value);
    }
  }

  return matches;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractStatusId(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    return parsed.pathname.match(/\/status\/(\d+)/i)?.[1] || "";
  } catch (error) {
    return "";
  }
}

function findAllIndices(input, searchValue) {
  const indices = [];
  let startIndex = 0;

  while (startIndex < input.length) {
    const nextIndex = input.indexOf(searchValue, startIndex);

    if (nextIndex === -1) {
      break;
    }

    indices.push(nextIndex);
    startIndex = nextIndex + searchValue.length;
  }

  return indices;
}

function extractVideoCandidatesFromText(html, baseUrl) {
  const directMatches = collectRegexMatches(
    /https?:\\?\/\\?\/[^"'\\\s<>]+?\.(?:mp4|webm|mov|m3u8)(?:\?[^"'\\\s<>]*)?/gi,
    html,
    (match) => match[0]
  );
  const urlFieldMatches = collectRegexMatches(
    /"(?:url|src|contentUrl|playbackUrl|streamUrl)"\s*:\s*"([^"]+?\.(?:mp4|webm|mov|m3u8)(?:\?[^"]*)?)"/gi,
    html
  );
  const twitterVariantMatches = collectRegexMatches(
    /"content_type"\s*:\s*"video\/(?:mp4|webm)".{0,220}?"url"\s*:\s*"([^"]+)"/gi,
    html
  );

  return dedupeStrings(
    [...directMatches, ...urlFieldMatches, ...twitterVariantMatches]
      .map((candidate) => normalizeVideoUrlCandidate(candidate, baseUrl))
      .filter(Boolean)
  );
}

function extractTwitterStatusVideoCandidates(html, baseUrl) {
  const statusId = extractStatusId(baseUrl);

  if (!statusId) {
    return [];
  }

  const markers = [
    `"rest_id":"${statusId}"`,
    `"id_str":"${statusId}"`,
    `"source_status_id_str":"${statusId}"`,
    `/status/${statusId}`,
    escapeRegex(statusId)
  ];
  const snippets = [];

  markers.forEach((marker, markerIndex) => {
    const searchValue = markerIndex === markers.length - 1 ? `"${statusId}"` : marker;
    const indices = findAllIndices(String(html || ""), searchValue);

    indices.forEach((index) => {
      const snippetStart = Math.max(0, index - 35000);
      const snippetEnd = Math.min(String(html || "").length, index + 35000);
      snippets.push(String(html || "").slice(snippetStart, snippetEnd));
    });
  });

  return dedupeStrings(
    snippets.flatMap((snippet) => extractVideoCandidatesFromText(snippet, baseUrl))
  );
}

function extractVideoCandidates(document, html, baseUrl) {
  const twitterStatusMatches = extractTwitterStatusVideoCandidates(html, baseUrl);
  const genericMatches = extractVideoCandidatesFromText(html, baseUrl);

  const documentCandidates = [
    document.querySelector('meta[property="og:video"]')?.getAttribute("content") || "",
    document.querySelector('meta[property="og:video:url"]')?.getAttribute("content") || "",
    document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute("content") || "",
    document.querySelector('meta[name="twitter:player:stream"]')?.getAttribute("content") || "",
    document.querySelector("video")?.getAttribute("src") || "",
    document.querySelector("video source")?.getAttribute("src") || "",
    ...Array.from(document.querySelectorAll("video source")).map((node) => node.getAttribute("src")),
    ...Array.from(document.querySelectorAll("video")).map((node) => node.getAttribute("src"))
  ];

  return dedupeStrings(
    [...twitterStatusMatches, ...documentCandidates, ...genericMatches]
      .map((candidate) => normalizeVideoUrlCandidate(candidate, baseUrl))
      .filter(Boolean)
  );
}

function normalizeVideoCandidates(urls, preferredUrls = []) {
  const preferredSet = new Set((preferredUrls || []).map((url) => cleanUrl(url).toLowerCase()));

  return dedupeStrings((urls || []).filter(Boolean))
    .sort((left, right) => {
      const leftScore =
        videoPriority(left) + (preferredSet.has(cleanUrl(left).toLowerCase()) ? 200 : 0);
      const rightScore =
        videoPriority(right) + (preferredSet.has(cleanUrl(right).toLowerCase()) ? 200 : 0);

      return rightScore - leftScore;
    })
    .slice(0, 8)
    .map((url) => ({
      url: cleanUrl(url),
      type: extractVideoType({ querySelector: () => null }, url)
    }));
}

function videoPriority(url) {
  const normalized = cleanUrl(url).toLowerCase();
  let score = 0;

  if (normalized.endsWith(".mp4") || normalized.includes(".mp4?")) {
    score += 60;
  }

  if (normalized.endsWith(".webm") || normalized.includes(".webm?")) {
    score += 40;
  }

  if (normalized.endsWith(".mov") || normalized.includes(".mov?")) {
    score += 20;
  }

  if (normalized.endsWith(".m3u8") || normalized.includes(".m3u8?")) {
    score -= 10;
  }

  if (normalized.includes("video.twimg.com")) {
    score += 25;
  }

  if (normalized.includes("blob:")) {
    score -= 100;
  }

  return score;
}

function extractPoster(document, baseUrl) {
  const candidates = [
    document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
    document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute("content") || "",
    document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || "",
    document.querySelector("video")?.getAttribute("poster") || ""
  ];

  return (
    candidates
      .map((candidate) => resolveUrl(candidate, baseUrl))
      .find(Boolean) || ""
  );
}

function extractVideoType(document, url) {
  const metaType =
    document.querySelector('meta[property="og:video:type"]')?.getAttribute("content") ||
    document.querySelector("video source")?.getAttribute("type") ||
    "";

  if (metaType) {
    return cleanText(metaType);
  }

  const normalized = cleanUrl(url).toLowerCase();

  if (normalized.includes(".webm")) {
    return "video/webm";
  }

  if (normalized.includes(".mov")) {
    return "video/quicktime";
  }

  if (normalized.includes(".m3u8")) {
    return "application/vnd.apple.mpegurl";
  }

  return "video/mp4";
}

function extractDurationSeconds(document, html) {
  const metaCandidates = [
    document.querySelector('meta[property="video:duration"]')?.getAttribute("content"),
    document.querySelector('meta[property="og:video:duration"]')?.getAttribute("content"),
    document.querySelector('meta[itemprop="duration"]')?.getAttribute("content"),
    document.querySelector('meta[name="duration"]')?.getAttribute("content"),
    document.querySelector('meta[name="video:duration"]')?.getAttribute("content"),
    document.querySelector('meta[name="twitter:duration"]')?.getAttribute("content")
  ];

  for (const value of metaCandidates) {
    const parsed = parseDurationSeconds(value);

    if (parsed) {
      return parsed;
    }
  }

  const durationMillisMatches = collectRegexMatches(
    /"duration_millis"\s*:\s*"?(?<value>\d+)"?/gi,
    html,
    (match) => Number(match.groups?.value || match[1]) / 1000
  );
  const durationSecondsMatches = collectRegexMatches(
    /"duration"\s*:\s*"?(?<value>\d+(?:\.\d+)?)"?/gi,
    html,
    (match) => Number(match.groups?.value || match[1])
  );

  return [...durationMillisMatches, ...durationSecondsMatches].find(
    (value) => Number.isFinite(value) && value > 0
  ) || null;
}

function extractCaptionTracks(document, html, baseUrl) {
  const trackNodes = Array.from(document.querySelectorAll("track"));
  const trackCandidates = trackNodes.map((node) => ({
    url: resolveUrl(node.getAttribute("src"), baseUrl),
    label: cleanText(node.getAttribute("label") || ""),
    srclang: cleanText(node.getAttribute("srclang") || ""),
    kind: cleanText(node.getAttribute("kind") || "")
  }));

  const regexCandidates = collectRegexMatches(
    /https?:\\?\/\\?\/[^"'\\\s<>]+?\.(?:vtt|srt|ttml)(?:\?[^"'\\\s<>]*)?/gi,
    html,
    (match) => ({
      url: match[0],
      label: "",
      srclang: "",
      kind: "captions"
    })
  );

  return dedupeStrings(
    [...trackCandidates, ...regexCandidates]
      .map((track) => ({
        ...track,
        url: normalizeVideoUrlCandidate(track.url, baseUrl)
      }))
      .filter((track) => track.url)
      .map((track) => JSON.stringify(track))
  ).map((value) => JSON.parse(value));
}

function captionTrackPriority(track) {
  const fingerprint = cleanText([track.label, track.srclang, track.kind, track.url].join(" "))
    .toLowerCase()
    .trim();
  let score = 0;

  if (/caption|subtitle/.test(fingerprint)) {
    score += 8;
  }

  if (/\ben\b|\beng\b|english/.test(fingerprint)) {
    score += 12;
  }

  if (/auto/.test(fingerprint)) {
    score -= 2;
  }

  if (/\.vtt(?:$|\?)/.test(fingerprint)) {
    score += 4;
  }

  return score;
}

function parseTimestampToSeconds(value) {
  const normalized = String(value || "").trim().replace(",", ".");
  const parts = normalized.split(":").map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

function parseVtt(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const cues = [];
  let currentCue = null;

  const flushCue = () => {
    if (!currentCue) {
      return;
    }

    const cleanedText = sanitizeCueText(currentCue.text.join(" "));

    if (cleanedText && currentCue.end > currentCue.start) {
      cues.push({
        start: currentCue.start,
        end: currentCue.end,
        text: cleanedText
      });
    }

    currentCue = null;
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const timeMatch = trimmedLine.match(
      /^(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)/
    );

    if (timeMatch) {
      flushCue();
      currentCue = {
        start: parseTimestampToSeconds(timeMatch[1]),
        end: parseTimestampToSeconds(timeMatch[2]),
        text: []
      };
      return;
    }

    if (!trimmedLine) {
      flushCue();
      return;
    }

    if (!currentCue) {
      return;
    }

    currentCue.text.push(trimmedLine);
  });

  flushCue();

  return dedupeTranscriptCues(cues);
}

function parseSrt(text) {
  return parseVtt(text);
}

function dedupeTranscriptCues(cues) {
  const seen = new Set();

  return (cues || []).filter((cue) => {
    const key = `${cue.start}-${cue.end}-${cue.text.toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function transcriptToText(cues, maxLength = 5000) {
  const joined = dedupeStrings((cues || []).map((cue) => sanitizeCueText(cue.text))).join(" ");
  return trimToWordBoundary(joined, maxLength, "...");
}

function windowWordCount(text) {
  return cleanText(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildImpactfulClip({ durationSeconds, transcriptCues = [], title, description }) {
  const safeDuration =
    durationSeconds ||
    transcriptCues.reduce((maxValue, cue) => Math.max(maxValue, cue.end || 0), 0) ||
    0;

  if (!safeDuration) {
    return {
      startSeconds: 0,
      endSeconds: 60,
      startTime: "00:00",
      endTime: "01:00",
      label: "00:00 - 01:00",
      reason: "Using the opening minute because the source did not expose a transcript or duration.",
      transcriptExcerpt: ""
    };
  }

  if (safeDuration <= 62) {
    return {
      startSeconds: 0,
      endSeconds: Math.max(5, Math.round(safeDuration)),
      startTime: "00:00",
      endTime: formatTimestamp(safeDuration),
      label: `00:00 - ${formatTimestamp(safeDuration)}`,
      reason: "Using the full source clip because the video is already about a minute or shorter.",
      transcriptExcerpt: transcriptToText(transcriptCues, 280)
    };
  }

  if (!transcriptCues.length) {
    return {
      startSeconds: 0,
      endSeconds: 60,
      startTime: "00:00",
      endTime: "01:00",
      label: "00:00 - 01:00",
      reason: "Using the opening minute because no transcript was available for impact scoring.",
      transcriptExcerpt: ""
    };
  }

  const keywords = keywordCandidates(`${title || ""} ${description || ""}`).slice(0, 12);
  const lastStart = Math.max(0, Math.floor(safeDuration - 60));
  const startCandidates = new Set([0, lastStart]);

  for (let start = 0; start <= lastStart; start += 15) {
    startCandidates.add(start);
  }

  transcriptCues.forEach((cue) => {
    if (cue.start <= lastStart) {
      startCandidates.add(Math.max(0, Math.floor(cue.start)));
    }
  });

  const ranked = Array.from(startCandidates)
    .sort((left, right) => left - right)
    .map((startSeconds) => {
      const endSeconds = Math.min(safeDuration, startSeconds + 60);
      const cuesInWindow = transcriptCues.filter(
        (cue) => cue.end > startSeconds && cue.start < endSeconds
      );
      const transcriptExcerpt = cleanText(cuesInWindow.map((cue) => cue.text).join(" "));
      const wordCount = windowWordCount(transcriptExcerpt);
      const lowerText = transcriptExcerpt.toLowerCase();
      const matchedKeywords = keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()));
      const uniqueMatches = new Set(matchedKeywords.map((keyword) => keyword.toLowerCase())).size;
      const densityScore = Math.min(wordCount, 170) / 12;
      const keywordScore = uniqueMatches * 9 + matchedKeywords.length * 2;
      const latePenalty = startSeconds > safeDuration * 0.8 ? 6 : 0;
      const sparsePenalty = wordCount < 18 ? 18 : wordCount < 32 ? 8 : 0;
      const score = densityScore + keywordScore - latePenalty - sparsePenalty;

      return {
        startSeconds,
        endSeconds,
        transcriptExcerpt: trimToWordBoundary(transcriptExcerpt, 280, "..."),
        score
      };
    })
    .sort((left, right) => right.score - left.score || left.startSeconds - right.startSeconds);

  const selected = ranked[0] || {
    startSeconds: 0,
    endSeconds: 60,
    transcriptExcerpt: ""
  };

  return {
    startSeconds: selected.startSeconds,
    endSeconds: selected.endSeconds,
    startTime: formatTimestamp(selected.startSeconds),
    endTime: formatTimestamp(selected.endSeconds),
    label: `${formatTimestamp(selected.startSeconds)} - ${formatTimestamp(selected.endSeconds)}`,
    reason: "Picked the 1-minute section with the strongest transcript density and story-keyword overlap.",
    transcriptExcerpt: selected.transcriptExcerpt
  };
}

async function fetchTranscript(captionTracks) {
  const candidate = [...(captionTracks || [])]
    .sort((left, right) => captionTrackPriority(right) - captionTrackPriority(left))
    .find((track) => track.url);

  if (!candidate) {
    return {
      sourceUrl: "",
      cues: [],
      text: ""
    };
  }

  try {
    const response = await axios.get(candidate.url, {
      timeout: 15000,
      proxy: false,
      headers: DEFAULT_HEADERS
    });
    const rawText = String(response.data || "");
    const cues = /\.srt(?:$|\?)/i.test(candidate.url) ? parseSrt(rawText) : parseVtt(rawText);

    return {
      sourceUrl: candidate.url,
      cues,
      text: transcriptToText(cues)
    };
  } catch (error) {
    return {
      sourceUrl: candidate.url,
      cues: [],
      text: ""
    };
  }
}

async function extractVideoContext({ document, html, baseUrl, title, description }) {
  const videoCandidates = extractVideoCandidates(document, html, baseUrl);
  const preferredCandidates = extractTwitterStatusVideoCandidates(html, baseUrl);

  if (!videoCandidates.length) {
    return null;
  }

  const normalizedCandidates = normalizeVideoCandidates(videoCandidates, preferredCandidates);
  const url = normalizedCandidates[0]?.url || "";
  const durationSeconds = extractDurationSeconds(document, html);
  const captionTracks = extractCaptionTracks(document, html, baseUrl);
  const transcript = await fetchTranscript(captionTracks);
  const clip = buildImpactfulClip({
    durationSeconds,
    transcriptCues: transcript.cues,
    title,
    description
  });

  return {
    url: cleanUrl(url),
    type: extractVideoType(document, url),
    candidates: normalizedCandidates,
    poster: cleanUrl(extractPoster(document, baseUrl)),
    durationSeconds: durationSeconds ? Math.round(durationSeconds) : null,
    durationLabel: durationSeconds ? formatTimestamp(durationSeconds) : "",
    transcript: {
      sourceUrl: cleanUrl(transcript.sourceUrl),
      excerpt: transcript.text,
      cues: transcript.cues.slice(0, 120)
    },
    clip
  };
}

module.exports = {
  extractVideoContext,
  formatTimestamp,
  transcriptToText
};
