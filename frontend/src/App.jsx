import { useState } from "react";

import CaptionSelector from "./components/CaptionSelector";
import ChatUI from "./components/ChatUI";
import ImageEditor from "./components/ImageEditor";
import PostPreview from "./components/PostPreview"; 
import VideoStudio from "./components/VideoStudio";
import { generateFromLink, generateFromPrompt, searchNews } from "./lib/api";
import { getTemplateLabel, STYLE_OPTIONS } from "./lib/postOptions";

const INITIAL_MESSAGES = [
  {
    id: "welcome-message",
    role: "assistant",
    type: "text",
    text:
      "Paste a news article link or type a topic prompt to generate an Instagram-ready post in one click. Use source search only when you want to inspect articles first."
  }
];

const DEFAULT_SETTINGS = {
  fontFamily: "Newsreader",
  fontSize: 82,
  color: "#fff8ee",
  padding: 72,
  overlayOpacity: 0.48,
  template: "editorial"
};

function isLikelyUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}

async function copyToClipboard(value) {
  await navigator.clipboard.writeText(value);
}

function createEmptyDesignVariants() {
  return STYLE_OPTIONS.reduce((accumulator, style) => {
    accumulator[style.key] = { headline: "", subheadline: "" };
    return accumulator;
  }, {});
}

function formatVideoTimestamp(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function cloneDesignVariants(designVariants) {
  return STYLE_OPTIONS.reduce((accumulator, style) => {
    accumulator[style.key] = {
      headline: String(designVariants?.[style.key]?.headline || ""),
      subheadline: String(designVariants?.[style.key]?.subheadline || "")
    };
    return accumulator;
  }, {});
}

function normalizeDesignVariants(designVariants, fallbackDesign) {
  return STYLE_OPTIONS.reduce((accumulator, style) => {
    accumulator[style.key] = {
      headline: String(
        designVariants?.[style.key]?.headline || fallbackDesign?.headline || ""
      ),
      subheadline: String(
        designVariants?.[style.key]?.subheadline || fallbackDesign?.subheadline || ""
      )
    };
    return accumulator;
  }, {});
}

export default function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("professional");
  const [activeResult, setActiveResult] = useState(null);
  const [baseDesignVariants, setBaseDesignVariants] = useState(createEmptyDesignVariants);
  const [captionDrafts, setCaptionDrafts] = useState({});
  const [designDrafts, setDesignDrafts] = useState(createEmptyDesignVariants);
  const [imageSettings, setImageSettings] = useState(DEFAULT_SETTINGS);
  const [selectedImageId, setSelectedImageId] = useState("");
  const [videoOptions, setVideoOptions] = useState({ startTime: "00:00", endTime: "00:20" });

  const activeCaption = captionDrafts[selectedStyle] || "";
  const activeDesign = designDrafts[selectedStyle] || { headline: "", subheadline: "" };
  const activeHashtags = activeResult?.post?.hashtags || [];
  const activeKeywords = activeResult?.post?.keywords || [];

  const pushMessage = (message) => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), ...message }]);
  };

  const hydrateStudio = (result, assistantText) => {
    const normalizedDesignVariants = normalizeDesignVariants(
      result.post.designVariants,
      result.post.design
    );
    const suggestedClip = result.article?.video?.clip;
    const defaultStartTime =
      suggestedClip?.startTime ||
      formatVideoTimestamp(suggestedClip?.startSeconds || 0) ||
      "00:00";
    const defaultEndTime =
      suggestedClip?.endTime ||
      formatVideoTimestamp(suggestedClip?.endSeconds || 20) ||
      "00:20";

    setActiveResult(result);
    setCaptionDrafts(result.post.captions);
    setBaseDesignVariants(cloneDesignVariants(normalizedDesignVariants));
    setDesignDrafts(cloneDesignVariants(normalizedDesignVariants));
    setSelectedStyle("professional");
    setSelectedImageId(result.post.images?.[0]?.id || "");
    setVideoOptions({ startTime: defaultStartTime, endTime: defaultEndTime });
    pushMessage({
      role: "assistant",
      type: "post-ready",
      text: assistantText,
      article: result.article,
      post: result.post
    });
  };

  const runPromptSearch = async (query) => {
    const data = await searchNews(query);
    pushMessage({
      role: "assistant",
      type: "search-results",
      query,
      sourceCount: data.sourceCount,
      articles: data.articles
    });
  };

  const runLinkGeneration = async (url) => {
    const result = await generateFromLink(url);
    hydrateStudio(
      result,
      "Your Instagram post package is ready. You can switch caption styles, edit the copy, swap images, and export the 4:5 visual."
    );
  };

  const runPromptGeneration = async (prompt) => {
    const result = await generateFromPrompt(prompt);
    hydrateStudio(
      result,
      "I created a prompt-based post draft. You can still edit the overlay, caption, and export just like a link-based story."
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = input.trim();

    if (!trimmed || loading) {
      return;
    }

    pushMessage({
      role: "user",
      type: "text",
      text: trimmed
    });

    setInput("");
    setLoading(true);

    try {
      if (isLikelyUrl(trimmed)) {
        await runLinkGeneration(trimmed);
      } else {
        await runPromptGeneration(trimmed);
      }
    } catch (error) {
      pushMessage({
        role: "assistant",
        type: "text",
        text: error.message || "Something went wrong while generating your post."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSources = async () => {
    const trimmed = input.trim();

    if (!trimmed || loading || isLikelyUrl(trimmed)) {
      return;
    }

    pushMessage({
      role: "user",
      type: "text",
      text: `Find sources for: ${trimmed}`
    });

    setInput("");
    setLoading(true);

    try {
      await runPromptSearch(trimmed);
    } catch (error) {
      pushMessage({
        role: "assistant",
        type: "text",
        text: error.message || "I couldn't find sources for that topic."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArticleSelect = async (article) => {
    if (loading) {
      return;
    }

    pushMessage({
      role: "user",
      type: "text",
      text: `Generate post from: ${article.title}`
    });

    setLoading(true);

    try {
      await runLinkGeneration(article.url);
    } catch (error) {
      pushMessage({
        role: "assistant",
        type: "text",
        text: error.message || "I couldn't generate a post from that article."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompt = async (prompt) => {
    if (loading) {
      return;
    }

    pushMessage({
      role: "user",
      type: "text",
      text: `Generate directly from prompt: ${prompt}`
    });

    setLoading(true);

    try {
      await runPromptGeneration(prompt);
    } catch (error) {
      pushMessage({
        role: "assistant",
        type: "text",
        text: error.message || "I couldn't create a prompt-based draft."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,190,120,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(103,162,255,0.18),_transparent_28%),radial-gradient(circle_at_50%_120%,_rgba(27,178,148,0.12),_transparent_34%),linear-gradient(160deg,_#050816_0%,_#0b1324_34%,_#111a2f_64%,_#060a12_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 rounded-[28px] border border-white/10 bg-white/5 px-4 py-5 sm:mb-6 sm:rounded-[32px] sm:px-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate">AI Powered Workflow</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl text-paper sm:text-5xl">
                Convert breaking stories into polished Instagram posts.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
                Generate from a topic prompt or article link in one click, fetch supporting visuals, and fine-tune the 4:5 Instagram post design before you export.
              </p>
            </div>
            <div className="grid gap-2 rounded-[28px] border border-white/10 bg-ink/50 px-4 py-4 text-sm text-slate-200">
              <span>1. Enter a topic or paste a URL</span>
              <span>2. Pick a caption style and image</span>
              <span>3. Edit the overlay and download</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:gap-6">
          <ChatUI
            input={input}
            loading={loading}
            messages={messages}
            onArticleSelect={handleArticleSelect}
            onGeneratePrompt={handleGeneratePrompt}
            onInputChange={setInput}
            onSearchSources={handleSearchSources}
            onSubmit={handleSubmit}
          />

          <div className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start xl:space-y-6">
            {activeResult ? (
              <>
                <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-panel sm:rounded-[32px] sm:p-5">
                  <p className="text-xs uppercase tracking-[0.32em] text-slate">Current Setup</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-[20px] border border-white/10 bg-ink/35 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate">Tone</p>
                      <p className="mt-2 text-sm font-semibold text-paper">
                        {STYLE_OPTIONS.find((style) => style.key === selectedStyle)?.label || "Professional"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-ink/35 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate">Layout</p>
                      <p className="mt-2 text-sm font-semibold text-paper">{getTemplateLabel(imageSettings.template)}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-ink/35 px-4 py-3 sm:col-span-2 xl:col-span-1">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate">Media</p>
                      <p className="mt-2 text-sm font-semibold text-paper">
                        {activeResult.article.video?.url ? "Image + video version" : "Image version"}
                      </p>
                    </div>
                  </div>
                </section>
                <PostPreview
                  article={activeResult.article}
                  design={activeDesign}
                  images={activeResult.post.images || []}
                  selectedImageId={selectedImageId}
                  selectedStyle={selectedStyle}
                  settings={imageSettings}
                  onSelectImage={setSelectedImageId}
                />
                <CaptionSelector
                  activeCaption={activeCaption}
                  hashtags={activeHashtags}
                  keywords={activeKeywords}
                  selectedStyle={selectedStyle}
                  onCaptionChange={(value) =>
                    setCaptionDrafts((current) => ({ ...current, [selectedStyle]: value }))
                  }
                  onCopyCaption={() => copyToClipboard(activeCaption)}
                  onCopyHashtags={() => copyToClipboard(activeHashtags.join(" "))}
                  onStyleChange={setSelectedStyle}
                />
                <ImageEditor
                  design={activeDesign}
                  selectedStyle={selectedStyle}
                  settings={imageSettings}
                  videoAvailable={Boolean(activeResult.article.video?.url)}
                  onDesignChange={(patch) =>
                    setDesignDrafts((current) => ({
                      ...current,
                      [selectedStyle]: {
                        ...(current[selectedStyle] || { headline: "", subheadline: "" }),
                        ...patch
                      }
                    }))
                  }
                  onResetDesign={() =>
                    setDesignDrafts((current) => ({
                      ...current,
                      [selectedStyle]: {
                        ...(baseDesignVariants[selectedStyle] || { headline: "", subheadline: "" })
                      }
                    }))
                  }
                  onSettingsChange={(patch) =>
                    setImageSettings((current) => ({
                      ...current,
                      ...patch
                    }))
                  }
                />
                {activeResult.article.video?.url ? (
                  <VideoStudio
                    article={activeResult.article}
                    design={activeDesign}
                    settings={imageSettings}
                    videoOptions={videoOptions}
                    onVideoOptionsChange={(patch) =>
                      setVideoOptions((current) => ({
                        ...current,
                        ...patch
                      }))
                    }
                  />
                ) : null}
              </>
                ) : (
              <section className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-6 text-slate-200 sm:rounded-[32px] sm:p-8">
                <p className="text-xs uppercase tracking-[0.35em] text-slate">Studio</p>
                <h2 className="mt-3 font-display text-3xl text-paper sm:text-4xl">No active post yet</h2>
                <p className="mt-4 text-sm leading-7">
                  Once we generate a story, the tone picker, layout tools, preview canvas, and export panels will appear here in a guided sequence.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-white/10 bg-ink/35 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate">Step 1</p>
                    <p className="mt-2 text-sm font-semibold text-paper">Choose caption tone</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-ink/35 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate">Step 2</p>
                    <p className="mt-2 text-sm font-semibold text-paper">Adjust layout and export</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
