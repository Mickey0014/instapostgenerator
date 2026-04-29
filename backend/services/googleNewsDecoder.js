const axios = require("axios");
const { JSDOM } = require("jsdom");

const GOOGLE_NEWS_HOST = "news.google.com";
const MAX_CACHE_ENTRIES = 200;
const decodeCache = new Map();
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
};

function readGoogleNewsToken(sourceUrl) {
  try {
    const parsed = new URL(sourceUrl);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const type = pathParts[pathParts.length - 2];
    const token = pathParts[pathParts.length - 1];

    if (parsed.hostname !== GOOGLE_NEWS_HOST || !["articles", "read"].includes(type) || !token) {
      return "";
    }

    return token;
  } catch (error) {
    return "";
  }
}

function setCachedValue(key, value) {
  if (!key || !value) {
    return value;
  }

  if (decodeCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = decodeCache.keys().next().value;

    if (firstKey) {
      decodeCache.delete(firstKey);
    }
  }

  decodeCache.set(key, value);
  return value;
}

function decodeLegacyGoogleNewsUrl(token) {
  if (!token) {
    return "";
  }

  try {
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
    const urlMatch = decoded.match(/https?:\/\/[^\s"<>]+/);

    return urlMatch ? urlMatch[0] : "";
  } catch (error) {
    return "";
  }
}

async function getDecodingParams(token) {
  const candidateUrls = [
    `https://${GOOGLE_NEWS_HOST}/articles/${token}`,
    `https://${GOOGLE_NEWS_HOST}/rss/articles/${token}`
  ];

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await axios.get(candidateUrl, {
        timeout: 15000,
        proxy: false,
        headers: REQUEST_HEADERS
      });

      const dom = new JSDOM(response.data, { url: candidateUrl });
      const node = dom.window.document.querySelector(
        "c-wiz > div[jscontroller][data-n-a-sg][data-n-a-ts]"
      );

      if (node) {
        return {
          signature: node.getAttribute("data-n-a-sg"),
          timestamp: node.getAttribute("data-n-a-ts")
        };
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error("Unable to resolve the original publisher URL.");
}

async function decodeWithGoogleBatch(token, signature, timestamp) {
  const payload = [
    "Fbv4je",
    `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${token}",${timestamp},"${signature}"]`
  ];

  const response = await axios.post(
    `https://${GOOGLE_NEWS_HOST}/_/DotsSplashUi/data/batchexecute`,
    `f.req=${encodeURIComponent(JSON.stringify([[payload]]))}`,
    {
      timeout: 15000,
      proxy: false,
      headers: {
        ...REQUEST_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      }
    }
  );

  const responseChunk = String(response.data)
    .split("\n\n")
    .find((chunk) => chunk.trim().startsWith("[["));

  if (!responseChunk) {
    throw new Error("Unable to decode the Google News redirect.");
  }

  const decodedUrl = JSON.parse(JSON.parse(responseChunk)[0][2])[1];

  if (!decodedUrl) {
    throw new Error("Google News did not return a publisher URL.");
  }

  return decodedUrl;
}

async function decodeWithGoogleBatchFallback(token) {
  const requestBody = [
    [
      [
        "Fbv4je",
        JSON.stringify([
          "garturlreq",
          [
            [
              "en-US",
              "US",
              ["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"],
              null,
              null,
              1,
              1,
              "US:en",
              null,
              180,
              null,
              null,
              null,
              null,
              null,
              0,
              null,
              null,
              [1608992183, 723341000]
            ],
            "en-US",
            "US",
            1,
            [2, 3, 4, 8],
            1,
            0,
            "655000234",
            0,
            0,
            null,
            0
          ],
          token
        ]),
        null,
        "generic"
      ]
    ]
  ];

  const response = await axios.post(
    `https://${GOOGLE_NEWS_HOST}/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je`,
    `f.req=${encodeURIComponent(JSON.stringify(requestBody))}`,
    {
      timeout: 15000,
      proxy: false,
      headers: {
        ...REQUEST_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Referer: `https://${GOOGLE_NEWS_HOST}/`
      }
    }
  );

  const text = String(response.data || "");
  const resultMatch = text.match(/\[\\"garturlres\\",\\"((?:\\\\.|[^\\"])*)\\"/);
  const decodedUrl = resultMatch?.[1]
    ? JSON.parse(`"${resultMatch[1].replace(/"/g, '\\"')}"`)
    : "";

  if (!decodedUrl) {
    throw new Error("Google News did not return a publisher URL.");
  }

  return decodedUrl;
}

async function resolveGoogleNewsUrl(sourceUrl) {
  const token = readGoogleNewsToken(sourceUrl);

  if (!token) {
    return sourceUrl;
  }

  if (decodeCache.has(token)) {
    return decodeCache.get(token);
  }

  const legacyUrl = decodeLegacyGoogleNewsUrl(token);

  if (legacyUrl) {
    return setCachedValue(token, legacyUrl);
  }

  let decodedUrl = "";

  try {
    const { signature, timestamp } = await getDecodingParams(token);
    decodedUrl = await decodeWithGoogleBatch(token, signature, timestamp);
  } catch (error) {
    decodedUrl = await decodeWithGoogleBatchFallback(token);
  }

  return setCachedValue(token, decodedUrl);
}

async function resolveArticleUrl(sourceUrl) {
  try {
    return await resolveGoogleNewsUrl(sourceUrl);
  } catch (error) {
    return sourceUrl;
  }
}

module.exports = {
  resolveArticleUrl
};
