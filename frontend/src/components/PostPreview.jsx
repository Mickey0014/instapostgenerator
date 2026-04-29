import { useEffect, useMemo, useRef } from "react";

import {
  drawInstagramTemplate,
  ensureCanvasFontsLoaded,
  INSTAGRAM_EXPORT_ASPECT_CLASS,
  INSTAGRAM_EXPORT_HEIGHT,
  INSTAGRAM_EXPORT_WIDTH,
  loadImage
} from "../lib/postRenderer";
import { getStyleLabel, getTemplateLabel } from "../lib/postOptions";

export default function PostPreview({
  article,
  design,
  images,
  providerUsed,
  selectedImageId,
  selectedStyle,
  settings,
  onImageUpload,
  onSelectImage
}) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) || images[0] || null,
    [images, selectedImageId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    let cancelled = false;

    async function renderCanvas() {
      try {
        await ensureCanvasFontsLoaded(settings.fontFamily);
        const image = await loadImage(selectedImage?.proxyUrl);

        if (cancelled) {
          return;
        }

        drawInstagramTemplate(context, {
          article,
          design,
          settings,
          media: image,
          mediaMeta: selectedImage,
          width: canvas.width,
          height: canvas.height
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        drawInstagramTemplate(context, {
          article,
          design,
          settings,
          media: null,
          mediaMeta: selectedImage,
          width: canvas.width,
          height: canvas.height
        });
      }
    }

    renderCanvas();

    return () => {
      cancelled = true;
    };
  }, [article, design, selectedImage, settings]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "instagram-post.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      onImageUpload(file);
    }

    event.target.value = "";
  };

  const providerLabel = providerUsed ? providerUsed.replace(/^./, (char) => char.toUpperCase()) : "";

  return (
    <section className="rounded-[28px] border border-white/15 bg-white/10 p-4 shadow-panel sm:rounded-[32px] sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate">Preview</p>
            <h2 className="mt-2 text-xl font-semibold text-paper sm:text-2xl">Canvas</h2>
            {providerLabel ? (
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                Provider used: <span className="text-paper">{providerLabel}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-full bg-coral px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 sm:w-auto"
          >
            Download Image
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-slate">
          <span>{getStyleLabel(selectedStyle)}</span>
          <span>{getTemplateLabel(settings.template)}</span>
          <span>{settings.fontFamily}</span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-ink sm:rounded-[28px]">
        <canvas
          ref={canvasRef}
          width={INSTAGRAM_EXPORT_WIDTH}
          height={INSTAGRAM_EXPORT_HEIGHT}
          className={`h-auto w-full ${INSTAGRAM_EXPORT_ASPECT_CLASS}`}
        />
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.32em] text-slate">Suggested Images</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-300">
            Keep a suggested image selected, or upload one from your device.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-paper transition hover:border-sky/50 hover:bg-white/15 sm:w-auto"
          >
            Upload Image
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          {images.length ? (
            images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelectImage(image.id)}
                className={`overflow-hidden rounded-[24px] border text-left transition ${
                  selectedImage?.id === image.id
                    ? "border-gold bg-white/10 shadow-panel"
                    : "border-white/10 bg-white/5 hover:border-sky/40"
                }`}
              >
                <img src={image.proxyUrl} alt={image.alt} className="aspect-square w-full object-cover" />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate">{image.source}</p>
                    {selectedImage?.id === image.id ? (
                      <span className="rounded-full bg-gold px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
                        Active
                      </span>
                    ) : null}
                  </div>
                  {image.textRisk ? (
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gold">
                      Text in source image
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-paper">{image.alt}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 p-6 text-sm text-slate">
              Add `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY` to load stock-photo suggestions.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
