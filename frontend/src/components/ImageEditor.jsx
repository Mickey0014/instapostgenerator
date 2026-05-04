import { getStyleLabel, TEMPLATE_OPTIONS } from "../lib/postOptions";

const FONT_OPTIONS = [
  "Newsreader",
  "Aileron",
  "Anton",
  "Archivo Narrow",
  "Argentum Sans",
  "Arno Pro",
  "Baloo Chettan",
  "Barlow",
  "Calibri",
  "Century Gothic",
  "Epica Pro",
  "Epica Sans Pro",
  "Evogria",
  "Fira Sans",
  "Francois One",
  "Fulbo Premier",
  "Futura",
  "Futura Now Headline",
  "Gill Sans",
  "Gilroy",
  "Gotham",
  "Gothic B0",
  "Inter",
  "Intro Rust",
  "Jockey One",
  "Karma",
  "Lato",
  "Lemon Milk",
  "MADE TOMMY",
  "Metropolis",
  "Montserrat",
  "Mulish"
];

function RangeField({ label, min, max, step = 1, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-coral"
      />
      <span className="mt-2 block text-sm text-paper">{value}</span>
    </label>
  );
}

function TemplatePreview({ template }) {
  if (template === "split-caption") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-white">
        <div className="absolute left-4 top-2 h-2.5 w-28 rounded-full bg-black" />
        <div className="absolute left-8 top-6 h-2.5 w-20 rounded-full bg-red-700" />
        <div className="absolute inset-x-0 top-10 h-14 bg-[linear-gradient(90deg,_#6f1d1b_0%,_#1b263b_50%,_#6f1d1b_100%)]" />
        <div className="absolute left-1/2 top-14 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-white bg-[#1b263b]" />
        <div className="absolute inset-x-0 bottom-0 h-6 bg-[#a92907]" />
      </div>
    );
  }

  if (template === "blue-black") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-black">
        <div className="absolute inset-x-0 top-0 h-7 bg-[#075272]" />
        <div className="absolute left-5 top-2 h-2.5 w-24 rounded-full bg-white" />
        <div className="absolute inset-x-0 top-7 h-14 bg-[linear-gradient(135deg,_#d8dde4,_#334155)]" />
        <div className="absolute left-4 bottom-6 h-3 w-28 rounded-full bg-yellow-300" />
        <div className="absolute bottom-3 left-4 h-2.5 w-20 rounded-full bg-white" />
      </div>
    );
  }

  if (template === "brown-bar") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#475569,_#020617)]">
        <div className="absolute bottom-8 left-3 h-5 w-[calc(100%-24px)] bg-[#8d4a2f]" />
        <div className="absolute bottom-9 left-5 h-2.5 w-28 rounded-full bg-white" />
        <div className="absolute bottom-3 left-3 h-3 w-32 rounded-full bg-white" />
        <div className="absolute bottom-3 left-0 h-16 w-1.5 bg-yellow-300" />
      </div>
    );
  }

  if (template === "circle-montage") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#94a3b8,_#020617)]">
        <div className="absolute inset-x-0 top-0 h-12 bg-[linear-gradient(90deg,_#64748b_50%,_#334155_50%)]" />
        <div className="absolute right-5 top-10 h-9 w-9 rounded-full border-2 border-white bg-slate-500" />
        <div className="absolute bottom-8 left-3 h-3 w-28 rounded-full bg-white" />
        <div className="absolute bottom-4 left-3 h-2.5 w-20 rounded-full bg-white/70" />
      </div>
    );
  }

  if (template === "history-date") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#9ca3af,_#030712)]">
        <div className="absolute right-5 top-9 h-10 w-10 rounded-full border-2 border-white bg-slate-300" />
        <div className="absolute bottom-8 left-5 h-5 w-28 rounded-full bg-[linear-gradient(90deg,_#fb923c,_#ffffff,_#22c55e)]" />
        <div className="absolute bottom-3 left-5 h-2 w-24 bg-[linear-gradient(90deg,_#fb923c,_#ffffff,_#22c55e)]" />
      </div>
    );
  }

  if (template === "regional-bold") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#475569,_#030712)]">
        <div className="absolute left-1/2 top-0 h-16 w-1.5 bg-yellow-300 shadow-[0_0_12px_#fde047]" />
        <div className="absolute bottom-7 left-3 h-3 w-32 rounded-full bg-orange-500" />
        <div className="absolute bottom-3 left-3 h-3 w-24 rounded-full bg-white" />
      </div>
    );
  }

  if (template === "yellow-question") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#334155,_#020617)]">
        <div className="absolute left-6 top-10 h-10 w-10 rounded-full border-2 border-white bg-slate-400" />
        <div className="absolute bottom-9 left-4 h-3 w-36 rounded-full bg-yellow-300" />
        <div className="absolute bottom-5 left-8 h-2.5 w-24 rounded-full bg-white" />
        <div className="absolute inset-x-0 bottom-0 h-4 bg-yellow-300" />
      </div>
    );
  }

  if (template === "legacy-poster") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#94a3b8,_#020617)]">
        <div className="absolute left-5 top-12 h-8 w-8 rounded-full border-2 border-white bg-slate-500" />
        <div className="absolute right-5 top-12 h-8 w-8 rounded-full border-2 border-white bg-slate-500" />
        <div className="absolute bottom-8 left-6 h-3 w-28 rounded-full bg-[#b7d4aa]" />
        <div className="absolute bottom-4 left-8 h-2.5 w-24 rounded-full bg-white" />
      </div>
    );
  }

  if (template === "targeted-card") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#1e293b,_#020617)]">
        <div className="absolute right-4 top-8 h-9 w-16 rounded border-2 border-yellow-300 bg-white" />
        <div className="absolute inset-x-5 bottom-8 h-5 bg-red-600" />
        <div className="absolute bottom-3 left-5 h-3 w-28 rounded-full bg-white" />
      </div>
    );
  }

  if (template === "cyan-pattern") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(90deg,_#334155_50%,_#111827_50%)]">
        <div className="absolute bottom-10 left-4 h-3 w-36 rounded-full bg-cyan-300" />
        <div className="absolute bottom-6 left-10 h-px w-20 bg-white" />
        <div className="absolute bottom-0 left-0 h-5 w-full bg-cyan-300" />
      </div>
    );
  }

  return (
    <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#475569,_#020617)]">
      <div className="absolute inset-x-3 bottom-8 h-7 rounded bg-red-600" />
      <div className="absolute bottom-10 left-5 h-3 w-32 rounded-full bg-white" />
      <div className="absolute bottom-3 left-0 h-5 w-full bg-white" />
      <div className="absolute bottom-4 left-7 h-2.5 w-28 rounded-full bg-red-600" />
    </div>
  );
}

function TemplateCard({ template, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.value)}
      className={`rounded-[24px] border p-3 text-left transition ${
        active
          ? "border-gold bg-white/10 shadow-panel"
          : "border-white/10 bg-ink/35 hover:border-sky/40 hover:bg-white/5"
      }`}
    >
      <TemplatePreview template={template.value} />
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-paper">{template.label}</p>
          {active ? (
            <span className="rounded-full bg-gold px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
              Active
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-300">{template.description}</p>
      </div>
    </button>
  );
}

export default function ImageEditor({
  design,
  selectedStyle,
  settings,
  videoAvailable,
  onDesignChange,
  onResetDesign,
  onSettingsChange
}) {
  const styleLabel = getStyleLabel(selectedStyle);

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-panel sm:rounded-[32px] sm:p-6">
      <p className="text-xs uppercase tracking-[0.32em] text-slate">Layout</p>
      <h2 className="mt-2 text-xl font-semibold text-paper sm:text-2xl">Overlay</h2>

      <div className="mt-5 grid gap-4">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="block text-xs uppercase tracking-[0.24em] text-slate">Template</span>
            </div>
            <button
              type="button"
              onClick={onResetDesign}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky/50"
            >
              Reset {styleLabel} Copy
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TEMPLATE_OPTIONS.map((template) => (
              <TemplateCard
                key={template.value}
                template={template}
                active={settings.template === template.value}
                onSelect={(value) => onSettingsChange({ template: value })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-ink/35 px-4 py-4 text-sm font-semibold text-gold">
          {styleLabel}
        </div>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">Headline</span>
          <input
            type="text"
            value={design.headline}
            onChange={(event) => onDesignChange({ headline: event.target.value })}
            className="w-full rounded-[20px] border border-white/10 bg-ink/60 px-4 py-3 text-white outline-none focus:border-sky/50"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">Subheadline</span>
          <input
            type="text"
            value={design.subheadline}
            onChange={(event) => onDesignChange({ subheadline: event.target.value })}
            className="w-full rounded-[20px] border border-white/10 bg-ink/60 px-4 py-3 text-white outline-none focus:border-sky/50"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">Font</span>
          <select
            value={settings.fontFamily}
            onChange={(event) => onSettingsChange({ fontFamily: event.target.value })}
            className="w-full rounded-[20px] border border-white/10 bg-ink/60 px-4 py-3 text-white outline-none focus:border-sky/50"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <RangeField
            label="Text Size"
            min={48}
            max={110}
            value={settings.fontSize}
            onChange={(value) => onSettingsChange({ fontSize: value })}
          />
          <RangeField
            label="Padding"
            min={36}
            max={140}
            value={settings.padding}
            onChange={(value) => onSettingsChange({ padding: value })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <RangeField
            label="Overlay Opacity"
            min={0.1}
            max={0.9}
            step={0.05}
            value={settings.overlayOpacity}
            onChange={(value) => onSettingsChange({ overlayOpacity: value })}
          />
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">Text Color</span>
            <input
              type="color"
              value={settings.color}
              onChange={(event) => onSettingsChange({ color: event.target.value })}
              className="h-[52px] w-full rounded-[20px] border border-white/10 bg-ink/60 p-2"
            />
          </label>
        </div>

        {videoAvailable ? (
          <div className="rounded-[24px] border border-sky/20 bg-sky/10 px-4 py-3 text-sm leading-6 text-sky">
            Video available below.
          </div>
        ) : null}
      </div>
    </section>
  );
}
