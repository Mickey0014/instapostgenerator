import { STYLE_OPTIONS } from "../lib/postOptions";

export default function CaptionSelector({
  activeCaption,
  hashtags,
  keywords,
  selectedStyle,
  onCaptionChange,
  onCopyCaption,
  onCopyHashtags,
  onStyleChange
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-panel sm:rounded-[32px] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
            Step 1
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.32em] text-slate">Caption Tone</p>
          <h2 className="mt-2 font-display text-2xl text-paper sm:text-3xl">Choose the Voice</h2>
          <p className="mt-2 text-sm text-slate-300">
            Switch tone here first. The same tone also drives the active headline and subheadline in the layout editor.
          </p>
        </div>
        <div className="min-w-0 rounded-[24px] border border-white/10 bg-ink/35 p-2">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.key}
              type="button"
              onClick={() => onStyleChange(style.key)}
              className={`w-full sm:min-w-[132px] sm:w-auto rounded-full px-4 py-3 text-sm font-semibold transition ${
                selectedStyle === style.key
                  ? "border border-gold bg-gold text-ink shadow-panel"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:border-gold/50"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {selectedStyle === style.key ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-gold">
                    ✓
                  </span>
                ) : null}
                <span>{style.label}</span>
              </span>
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-gold/30 bg-gold/10 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate">Active Tone</p>
        <p className="mt-2 text-lg font-semibold text-paper">{STYLE_OPTIONS.find((style) => style.key === selectedStyle)?.label}</p>
      </div>

      <textarea
        value={activeCaption}
        onChange={(event) => onCaptionChange(event.target.value)}
        rows={9}
        className="mt-5 w-full rounded-[24px] border border-white/10 bg-ink/60 px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-sky/50 sm:rounded-[28px] sm:px-5"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCopyCaption}
          className="w-full rounded-full bg-sky px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 sm:w-auto"
        >
          Copy Caption
        </button>
        <button
          type="button"
          onClick={onCopyHashtags}
          className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky/50 sm:w-auto"
        >
          Copy Hashtags
        </button>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.32em] text-slate">Hashtags</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {hashtags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-3 py-2 text-sm text-paper">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.32em] text-slate">Image Keywords</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-100">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
