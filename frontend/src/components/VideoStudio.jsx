import { useEffect, useMemo, useState } from "react";

import {
  buildProxyAssetUrl,
  drawVideoOverlayTemplate,
  ensureCanvasFontsLoaded,
  ensureVideoTemplateAssetsLoaded,
  INSTAGRAM_REEL_ASPECT_CLASS,
  INSTAGRAM_REEL_HEIGHT,
  INSTAGRAM_REEL_WIDTH
} from "../lib/postRenderer";

function parseTimestamp(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }

  const parts = raw.split(":").map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return Number.NaN;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return Number.NaN;
}

function once(target, eventName) {
  return new Promise((resolve, reject) => {
    const handleSuccess = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Unable to load video for ${eventName}.`));
    };

    const cleanup = () => {
      target.removeEventListener(eventName, handleSuccess);
      target.removeEventListener("error", handleError);
    };

    target.addEventListener(eventName, handleSuccess, { once: true });
    target.addEventListener("error", handleError, { once: true });
  });
}

async function findPlayableVideoSource(candidateUrls) {
  let lastError = null;

  for (const candidateUrl of candidateUrls) {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.playsInline = true;
      video.muted = true;
      video.crossOrigin = "anonymous";
      video.src = candidateUrl;

      await once(video, "loadedmetadata");

      if (Number.isFinite(video.duration) && video.duration > 0) {
        return candidateUrl;
      }

      lastError = new Error("I couldn't read the source video duration.");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load the extracted video.");
}

export default function VideoStudio({
  article,
  design,
  settings,
  videoOptions,
  onDesignChange,
  onResetDesign,
  onVideoOptionsChange
}) {
  const [rendering, setRendering] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState("");
  const [renderedMimeType, setRenderedMimeType] = useState("video/webm");
  const [error, setError] = useState("");
  const [resolvedSourceVideoUrl, setResolvedSourceVideoUrl] = useState("");
  const [loadingSourceVideo, setLoadingSourceVideo] = useState(true);
  const selectedVideoTemplate = videoOptions.template || "tamil-buzz";

const sourceVideoCandidates = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(article.video?.candidates || []).map((candidate) => candidate?.url),
            article.video?.url
          ]
            .filter(Boolean)
            .map((url) => buildProxyAssetUrl(url))
        )
      ),
    [article.video?.candidates, article.video?.url]
  );

  useEffect(() => {
    return () => {
      if (renderedVideoUrl) {
        URL.revokeObjectURL(renderedVideoUrl);
      }
    };
  }, [renderedVideoUrl]);

  useEffect(() => {
    let active = true;

    setLoadingSourceVideo(true);
    setResolvedSourceVideoUrl("");
    setError("");

    findPlayableVideoSource(sourceVideoCandidates)
      .then((videoUrl) => {
        if (active) {
          setResolvedSourceVideoUrl(videoUrl);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Unable to load the extracted video.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSourceVideo(false);
        }
      });

    return () => {
      active = false;
    };
  }, [sourceVideoCandidates]);

  useEffect(() => {
    setRenderedVideoUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return "";
    });
  }, [selectedVideoTemplate]);

  if (!article.video?.url) {
    return null;
  }

  const handleRenderVideo = async () => {
    if (rendering) {
      return;
    }

    setError("");
    setRendering(true);

    try {
      if (typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support in-browser video export.");
      }

      if (!resolvedSourceVideoUrl) {
        throw new Error("The extracted video is not playable in this browser yet.");
      }

      await ensureCanvasFontsLoaded(settings.fontFamily, [
        "Baloo Thambi",
        "Open Sans ExtraBold",
        "Squad"
      ]);
      await ensureVideoTemplateAssetsLoaded();

      const startSeconds = parseTimestamp(videoOptions.startTime);
      const endSeconds = parseTimestamp(videoOptions.endTime);

      if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) {
        throw new Error("Use timestamps like 00:05, 00:00:12, or raw seconds.");
      }

      const video = document.createElement("video");
      video.src = resolvedSourceVideoUrl;
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.playsInline = true;
      video.volume = 0;

      if (video.readyState < 1) {
        await once(video, "loadedmetadata");
      }

      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        throw new Error("I couldn't read the source video duration.");
      }

      const startTime = Math.max(0, startSeconds ?? 0);
      const endTime = Math.min(
        video.duration,
        endSeconds ?? Math.min(video.duration, startTime + 20)
      );

      if (endTime <= startTime) {
        throw new Error("End time must be later than start time.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = INSTAGRAM_REEL_WIDTH;
      canvas.height = INSTAGRAM_REEL_HEIGHT;
      const context = canvas.getContext("2d");

      const canvasStream = canvas.captureStream(30);
      const sourceStream =
        typeof video.captureStream === "function" ? video.captureStream() : null;
      const mixedStream = new MediaStream(canvasStream.getVideoTracks());

      sourceStream?.getAudioTracks().forEach((track) => mixedStream.addTrack(track));

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const chunks = [];
      const recorder = new MediaRecorder(mixedStream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      };

      const stopPromise = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start(250);
      video.currentTime = startTime;
      await once(video, "seeked");
      await video.play();

      await new Promise((resolve, reject) => {
        let frameHandle = 0;

        const finish = () => {
          cancelAnimationFrame(frameHandle);
          video.pause();
          recorder.stop();
          mixedStream.getTracks().forEach((track) => track.stop());
          resolve();
        };

        const step = () => {
          drawVideoOverlayTemplate(context, {
            article,
            design,
            settings,
            media: video,
            mediaMeta: null,
            videoTemplate: selectedVideoTemplate,
            width: canvas.width,
            height: canvas.height
          });

          if (video.currentTime >= endTime || video.ended) {
            finish();
            return;
          }

          frameHandle = requestAnimationFrame(step);
        };

        video.onerror = () => {
          cancelAnimationFrame(frameHandle);
          reject(new Error("Video playback failed during export."));
        };

        step();
      });

      await stopPromise;

      const blob = new Blob(chunks, { type: mimeType });

      if (!blob.size) {
        throw new Error("The video export finished with no data.");
      }

      if (renderedVideoUrl) {
        URL.revokeObjectURL(renderedVideoUrl);
      }

      setRenderedMimeType(mimeType);
      setRenderedVideoUrl(URL.createObjectURL(blob));
    } catch (renderError) {
      setError(renderError.message || "Video rendering failed.");
    } finally {
      setRendering(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-panel sm:rounded-[32px] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate">Video</p>
          <h2 className="mt-2 text-xl font-semibold text-paper sm:text-2xl">Clip</h2>
        </div>
        <button
          type="button"
          onClick={handleRenderVideo}
          disabled={rendering || loadingSourceVideo || !resolvedSourceVideoUrl}
          className="w-full rounded-full bg-sky px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {rendering ? "Rendering Video..." : "Render Video Clip"}
        </button>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-ink/35 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate">Video Overlay</p>
            <p className="mt-1 text-sm text-slate-300">
              Edit the headline and subheadline used in the rendered clip.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetDesign}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky/50"
          >
            Reset Copy
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">Template</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: "tamil-buzz", label: "Tamil Buzz" },
                { value: "thriving-tn", label: "Thriving Tamil Nadu" }
              ].map((template) => (
                <button
                  key={template.value}
                  type="button"
                  onClick={() => onVideoOptionsChange({ template: template.value })}
                  className={`rounded-[18px] border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedVideoTemplate === template.value
                      ? "border-sky/70 bg-sky/15 text-sky"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25"
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>
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
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate">Source Video</p>
          {resolvedSourceVideoUrl ? (
            <video
              src={resolvedSourceVideoUrl}
              controls
              playsInline
              poster={article.video?.poster ? buildProxyAssetUrl(article.video.poster) : ""}
              className={`${INSTAGRAM_REEL_ASPECT_CLASS} w-full rounded-[24px] border border-white/10 bg-ink object-contain`}
            />
          ) : (
            <div
              className={`flex ${INSTAGRAM_REEL_ASPECT_CLASS} items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-ink/40 p-6 text-center text-sm leading-6 text-slate`}
            >
              {loadingSourceVideo
                ? "Checking extracted video sources..."
                : "I couldn't find a playable source video for this link."}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate">Rendered Output</p>
          {renderedVideoUrl ? (
            <>
              <video
                src={renderedVideoUrl}
                controls
                playsInline
                className={`${INSTAGRAM_REEL_ASPECT_CLASS} w-full rounded-[24px] border border-white/10 bg-ink object-contain`}
              />
              <a
                href={renderedVideoUrl}
                download={`instagram-clip.${renderedMimeType.includes("webm") ? "webm" : "mp4"}`}
                className="inline-flex rounded-full border border-coral/60 px-4 py-2 text-sm font-semibold text-coral transition hover:bg-coral hover:text-ink"
              >
                Download Clip
              </a>
            </>
          ) : (
            <div
              className={`flex ${INSTAGRAM_REEL_ASPECT_CLASS} items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-ink/40 p-6 text-center text-sm leading-6 text-slate`}
            >
              Rendered clips will appear here after export.
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">Start Time</span>
          <input
            type="text"
            value={videoOptions.startTime}
            onChange={(event) => onVideoOptionsChange({ startTime: event.target.value })}
            placeholder="00:00"
            className="w-full rounded-[20px] border border-white/10 bg-ink/60 px-4 py-3 text-white outline-none focus:border-sky/50"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate">End Time</span>
          <input
            type="text"
            value={videoOptions.endTime}
            onChange={(event) => onVideoOptionsChange({ endTime: event.target.value })}
            placeholder="00:20"
            className="w-full rounded-[20px] border border-white/10 bg-ink/60 px-4 py-3 text-white outline-none focus:border-sky/50"
          />
        </label>
      </div>

      {article.video?.clip?.reason ? (
        <p className="mt-4 text-sm text-slate-300">Suggested clip: {article.video.clip.reason}</p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
