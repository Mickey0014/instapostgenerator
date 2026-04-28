const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export function searchNews(query) {
  return request("/api/search-news", {
    method: "POST",
    body: JSON.stringify({ query })
  });
}

export function generateFromLink(url) {
  return request("/api/generate-from-link", {
    method: "POST",
    body: JSON.stringify({ url })
  });
}

export function generateFromPrompt(prompt) {
  return request("/api/generate-post", {
    method: "POST",
    body: JSON.stringify({ prompt })
  });
}
