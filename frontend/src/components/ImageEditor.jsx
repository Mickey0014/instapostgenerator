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
  if (template === "spotlight") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,_#11233e_0%,_#09131f_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(141,213,255,0.25),_transparent_42%)]" />
        <div className="absolute inset-x-3 bottom-3 rounded-[16px] border border-white/15 bg-black/45 p-3">
          <div className="h-2.5 w-16 rounded-full bg-sky/80" />
          <div className="mt-3 h-3 w-4/5 rounded-full bg-white/80" />
          <div className="mt-2 h-2.5 w-3/5 rounded-full bg-white/45" />
        </div>
      </div>
    );
  }

  if (template === "minimal") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,_#314b66_0%,_#18263a_42%,_#060c14_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,_transparent,_rgba(3,8,15,0.92))]" />
        <div className="absolute left-3 top-3 h-2.5 w-14 rounded-full bg-white/65" />
        <div className="absolute inset-x-3 bottom-5 h-3 w-4/5 rounded-full bg-paper/90" />
        <div className="absolute bottom-3 left-3 h-2.5 w-3/5 rounded-full bg-white/50" />
      </div>
    );
  }

  if (template === "bulletin") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,_#081019_0%,_#0d1a2d_100%)]">
        <div className="absolute left-3 top-3 h-[calc(100%-24px)] w-[38%] rounded-[14px] bg-[linear-gradient(180deg,_#2d5475,_#162233)]" />
        <div className="absolute right-3 top-3 h-2.5 w-24 rounded-full bg-gold/85" />
        <div className="absolute right-3 top-9 h-3 w-32 rounded-full bg-white/85" />
        <div className="absolute right-3 top-14 h-3 w-28 rounded-full bg-white/70" />
        <div className="absolute right-3 top-20 h-2.5 w-24 rounded-full bg-white/40" />
      </div>
    );
  }

  if (template === "pulse") {
    return (
      <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,_#240d10_0%,_#08131b_48%,_#12314a_100%)]">
        <div className="absolute -right-4 top-2 h-24 w-20 rotate-[18deg] rounded-[20px] bg-coral/40" />
        <div className="absolute left-3 top-3 h-2.5 w-14 rounded-full bg-coral/85" />
        <div className="absolute left-3 bottom-8 h-3 w-3/4 rounded-full bg-paper/90" />
        <div className="absolute bottom-4 left-3 h-2.5 w-1/2 rounded-full bg-white/45" />
      </div>
    );
  }

  return (
    <div className="relative h-28 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,_#17304f_0%,_#0b1524_55%,_#060c14_100%)]">
      <div className="absolute inset-x-3 top-3 h-[45%] rounded-[16px] bg-[linear-gradient(180deg,_#456d98_0%,_#1d2f46_100%)]" />
      <div className="absolute inset-x-3 bottom-3 rounded-[16px] bg-black/55 p-3">
        <div className="h-2.5 w-16 rounded-full bg-white/70" />
        <div className="mt-3 h-3 w-4/5 rounded-full bg-paper/90" />
        <div className="mt-2 h-2.5 w-3/5 rounded-full bg-white/45" />
      </div>
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
