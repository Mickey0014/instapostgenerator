function MessageBubble({ message, onArticleSelect, onGeneratePrompt }) {
  const formatPublishedDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
  };

  if (message.type === "search-results") {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-7 text-slate-200">
          I found {message.articles.length} recent articles for{" "}
          <span className="font-semibold text-white">{message.query}</span> across{" "}
          <span className="font-semibold text-white">{message.sourceCount || message.articles.length}</span>{" "}
          sources. Pick one to generate a post, or create a direct prompt-based draft from multiple sources.
        </p>
        <div className="grid gap-3">
          {message.articles.map((article) => (
            <article
              key={article.url}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-sky/60 hover:bg-white/10"
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
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {article.summary || "Open this story to generate Instagram copy and a preview image."}
                </p>
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
          className="w-full rounded-full border border-coral/60 px-4 py-3 text-sm font-semibold text-coral transition hover:bg-coral hover:text-ink sm:w-auto"
        >
          Generate from multiple sources
        </button>
      </div>
    );
  }

  if (message.type === "post-ready") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-7 text-slate-200">{message.text}</p>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate">{message.article.source}</p>
          <h3 className="mt-2 font-display text-2xl text-paper">{message.article.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{message.post.summary}</p>
        </div>
      </div>
    );
  }

  return <p className="text-sm leading-7 text-slate-100">{message.text}</p>;
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

  return (
    <section className="min-w-0 flex min-h-[65vh] flex-col rounded-[28px] border border-white/10 bg-ink/80 shadow-panel backdrop-blur sm:min-h-[72vh] sm:rounded-[32px]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate">Chat Interface</p>
          <h1 className="mt-2 font-display text-2xl text-paper sm:text-3xl">News to Insta Studio</h1>
          <p className="mt-2 text-sm text-slate-300">
            Start with either a direct draft or a quick source review.
          </p>
        </div>
        <div className="w-fit rounded-full border border-sky/30 bg-sky/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky">
          {loading ? "Generating" : "Ready"}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`min-w-0 max-w-3xl rounded-[24px] border px-4 py-4 sm:rounded-[28px] sm:px-5 ${
              message.role === "user"
                ? "ml-auto border-coral/40 bg-coral/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-slate">
              {message.role === "user" ? "You" : "Studio"}
            </p>
            <MessageBubble
              message={message}
              onArticleSelect={onArticleSelect}
              onGeneratePrompt={onGeneratePrompt}
            />
          </article>
        ))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/10 p-4 sm:p-5">
        <label className="mb-3 block text-xs uppercase tracking-[0.32em] text-slate">
          Paste a news link or type a topic prompt
        </label>
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          rows={4}
          placeholder="https://www.bbc.com/... or AI startup funding news"
          className="w-full resize-none rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate focus:border-sky/50 sm:rounded-[28px] sm:px-5"
        />
        <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <p className="text-sm leading-6 text-slate">
              Direct mode builds the post immediately. Research mode shows article options first when you want a quick editorial check.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-ink/35 p-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate">Research Mode</p>
                <button
                  type="button"
                  onClick={onSearchSources}
                  disabled={loading || !trimmedInput || inputLooksLikeUrl}
                  className="mt-3 w-full rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Find Sources
                </button>
              </div>
              <div className="rounded-[20px] border border-coral/40 bg-coral/10 p-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-coral">Direct Mode</p>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 w-full rounded-full bg-coral px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Working..." : "Generate Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
