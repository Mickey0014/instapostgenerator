function MessageBubble({ message, onArticleSelect, onGeneratePrompt }) {
  const formatPublishedDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
  };

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
        <p className="text-xs uppercase tracking-[0.3em] text-slate">{message.article.source}</p>
        <h3 className="mt-2 text-base font-semibold text-paper">{message.article.title}</h3>
      </div>
    );
  }

  return <p className="text-sm leading-7 text-slate-100">{message.text}</p>;
}

function HistorySummary({ message, onArticleSelect, onGeneratePrompt }) {
  if (message.type === "search-results") {
    return (
      <details className="rounded-[20px] border border-white/10 bg-white/5">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-paper">
          Previous sources
        </summary>
        <div className="border-t border-white/10 px-4 py-4">
          <MessageBubble
            message={message}
            onArticleSelect={onArticleSelect}
            onGeneratePrompt={onGeneratePrompt}
          />
        </div>
      </details>
    );
  }

  if (message.type === "post-ready") {
    return (
      <details className="rounded-[20px] border border-white/10 bg-white/5">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-paper">
          Previous post
        </summary>
        <div className="border-t border-white/10 px-4 py-4">
          <MessageBubble
            message={message}
            onArticleSelect={onArticleSelect}
            onGeneratePrompt={onGeneratePrompt}
          />
        </div>
      </details>
    );
  }

  return null;
}

export default function ChatUI({
  input,
  loading,
  messages,
  onArticleSelect,
  onGeneratePrompt,
  onInputChange,
  onSearchSources,
  onSubmit
}) {
  const trimmedInput = input.trim();
  const inputLooksLikeUrl = /^https?:\/\//i.test(trimmedInput);
  const latestSearchIndex = messages.reduce(
    (latestIndex, message, index) => (message.type === "search-results" ? index : latestIndex),
    -1
  );
  const latestPostIndex = messages.reduce(
    (latestIndex, message, index) => (message.type === "post-ready" ? index : latestIndex),
    -1
  );

  return (
    <section className="min-w-0 flex min-h-[65vh] flex-col rounded-[28px] border border-white/10 bg-ink/80 shadow-panel backdrop-blur sm:min-h-[72vh] sm:rounded-[32px]">
      <div className="flex justify-center border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6">
        <div className="insta-pg-logo" aria-label="Insta PG">
          <span className="insta-pg-logo__word">Insta</span>
          <span className="insta-pg-logo__mark">PG</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
        {messages.map((message, index) => {
          const isOlderSearch = message.type === "search-results" && index !== latestSearchIndex;
          const isOlderPost = message.type === "post-ready" && index !== latestPostIndex;

          if (isOlderSearch || isOlderPost) {
            return (
              <HistorySummary
                key={message.id}
                message={message}
                onArticleSelect={onArticleSelect}
                onGeneratePrompt={onGeneratePrompt}
              />
            );
          }

          return (
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
          );
        })}
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
