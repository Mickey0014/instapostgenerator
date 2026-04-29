import { useState } from "react";

function formatPublishedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function MessageBubble({ message, onArticleSelect, onGeneratePrompt }) {
  const providerLabel = message.post?.providerUsed
    ? message.post.providerUsed.replace(/^./, (char) => char.toUpperCase())
    : "";

  if (message.type === "search-results") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate">
          <span>{message.articles.length} results</span>
          <span className="text-white">{message.query}</span>
        </div>
        <div className="grid gap-3">
          {message.articles.map((article) => (
            <article
              key={article.url}
              className="overflow-hidden rounded-[22px] border border-white/10 bg-white/5 transition hover:border-sky/60 hover:bg-white/10"
            >
              {article.image ? (
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-36 w-full object-cover sm:h-44"
                />
              ) : null}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate">{article.source}</p>
                  {article.publishedAt && formatPublishedDate(article.publishedAt) ? (
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-300">
                      {formatPublishedDate(article.publishedAt)}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-base font-semibold text-white">{article.title}</h3>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onArticleSelect(article)}
                    className="rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
                  >
                    Generate Post
                  </button>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/10 px-4 py-2 text-center text-sm font-semibold text-white transition hover:border-sky/50"
                  >
                    Open Source
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onGeneratePrompt(message.query)}
          className="w-full rounded-[20px] border border-coral/60 px-4 py-3 text-sm font-semibold text-coral transition hover:bg-coral hover:text-ink sm:w-auto"
        >
          Generate from multiple sources
        </button>
      </div>
    );
  }

  if (message.type === "post-ready") {
    return (
      <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate">{message.article.source}</p>
          {providerLabel ? (
            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-300">
              {providerLabel}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 text-base font-semibold text-paper">{message.article.title}</h3>
      </div>
    );
  }

  return <p className="text-sm leading-7 text-slate-100">{message.text}</p>;
}

function HistoryPanel({
  open,
  sourceHistory,
  postHistory,
  onArticleSelect,
  onGeneratePrompt,
  onRestorePost
}) {
  const [activeTab, setActiveTab] = useState("sources");

  if (!open) {
    return null;
  }

  return (
    <div className="border-b border-white/10 bg-black/20 px-3 py-4 sm:px-5">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "sources"
              ? "bg-sky text-ink"
              : "border border-white/10 bg-white/5 text-paper hover:border-sky/50"
          }`}
        >
          Previous Sources
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "posts"
              ? "bg-sky text-ink"
              : "border border-white/10 bg-white/5 text-paper hover:border-sky/50"
          }`}
        >
          Previous Posts
        </button>
      </div>

      {activeTab === "sources" ? (
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {sourceHistory.length ? (
            sourceHistory.map((entry) => (
              <details key={entry.id} className="rounded-[20px] border border-white/10 bg-white/5">
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-paper">{entry.query}</span>
                    <span className="text-xs uppercase tracking-[0.22em] text-slate">
                      {entry.articles.length} results
                    </span>
                  </div>
                </summary>
                <div className="border-t border-white/10 px-4 py-4">
                  <MessageBubble
                    message={{
                      type: "search-results",
                      query: entry.query,
                      articles: entry.articles
                    }}
                    onArticleSelect={onArticleSelect}
                    onGeneratePrompt={onGeneratePrompt}
                  />
                </div>
              </details>
            ))
          ) : (
            <p className="rounded-[20px] border border-dashed border-white/10 p-4 text-sm text-slate">
              No previous sources yet.
            </p>
          )}
        </div>
      ) : (
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {postHistory.length ? (
            postHistory.map((entry) => (
              <article key={entry.id} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate">
                    {entry.article.source}
                  </p>
                  {entry.createdAt ? (
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-300">
                      {formatPublishedDate(entry.createdAt)}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-base font-semibold text-paper">{entry.article.title}</h3>
                <button
                  type="button"
                  onClick={() => onRestorePost(entry.result)}
                  className="mt-4 rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
                >
                  Open Post
                </button>
              </article>
            ))
          ) : (
            <p className="rounded-[20px] border border-dashed border-white/10 p-4 text-sm text-slate">
              No previous posts yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatUI({
  input,
  loading,
  messages,
  postHistory,
  sourceHistory,
  onArticleSelect,
  onGeneratePrompt,
  onInputChange,
  onRestorePost,
  onSearchSources,
  onSubmit
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const trimmedInput = input.trim();
  const inputLooksLikeUrl = /^https?:\/\//i.test(trimmedInput);
  const historyCount = sourceHistory.length + postHistory.length;
  const handleHistoryArticleSelect = (article) => {
    setHistoryOpen(false);
    onArticleSelect(article);
  };
  const handleHistoryGeneratePrompt = (prompt) => {
    setHistoryOpen(false);
    onGeneratePrompt(prompt);
  };
  const handleHistoryRestorePost = (result) => {
    setHistoryOpen(false);
    onRestorePost(result);
  };

  return (
    <section className="min-w-0 flex min-h-[65vh] flex-col rounded-[28px] border border-white/10 bg-ink/80 shadow-panel backdrop-blur sm:min-h-[72vh] sm:rounded-[32px]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6 md:flex-row md:items-center md:justify-between">
        <div className="insta-pg-logo" aria-label="Insta PG">
          <span className="insta-pg-logo__word">Insta</span>
          <span className="insta-pg-logo__mark">PG</span>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen((current) => !current)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-paper transition hover:border-sky/50"
        >
          History{historyCount ? ` (${historyCount})` : ""}
        </button>
      </div>

      <HistoryPanel
        open={historyOpen}
        sourceHistory={sourceHistory}
        postHistory={postHistory}
        onArticleSelect={handleHistoryArticleSelect}
        onGeneratePrompt={handleHistoryGeneratePrompt}
        onRestorePost={handleHistoryRestorePost}
      />

      <div className="min-w-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`min-w-0 max-w-3xl rounded-[20px] border px-4 py-3 sm:px-4 ${
              message.role === "user"
                ? "ml-auto border-coral/40 bg-coral/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <MessageBubble
              message={message}
              onArticleSelect={onArticleSelect}
              onGeneratePrompt={onGeneratePrompt}
            />
          </article>
        ))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/10 p-4 sm:p-5">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          rows={4}
          placeholder="Paste a link or type a topic"
          className="w-full resize-none rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate focus:border-sky/50 sm:rounded-[28px] sm:px-5"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onSearchSources}
            disabled={loading || !trimmedInput || inputLooksLikeUrl}
            className="action-tile rounded-[22px] px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="action-tile__label block text-sm font-semibold">Find Sources</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="action-tile rounded-[22px] px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="action-tile__label block text-sm font-semibold">
              {loading ? "Working..." : "Generate Post"}
            </span>
          </button>
        </div>
      </form>
    </section>
  );
}
