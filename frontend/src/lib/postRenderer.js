const UI_FONT_FAMILY = "Inter";

export const INSTAGRAM_EXPORT_WIDTH = 1080;
export const INSTAGRAM_EXPORT_HEIGHT = 1350;
export const INSTAGRAM_EXPORT_ASPECT_CLASS = "aspect-[4/5]";

export function buildDisplayCopy(article, design) {
  const headline = trimDisplayText(
    design.headline || article.title || "Top story",
    96
  );
  const subheadline = trimDisplayText(
    design.subheadline || article.excerpt || "Swipe-ready summary generated automatically.",
    160
  );

  return {
    headline,
    subheadline
  };
}

export async function ensureCanvasFontsLoaded(fontFamily) {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }

  const fontRequests = [
    `700 72px "${fontFamily}"`,
    `700 26px "${fontFamily}"`,
    `500 28px "${UI_FONT_FAMILY}"`
  ];

  try {
    await document.fonts.ready;
    await Promise.allSettled(fontRequests.map((font) => document.fonts.load(font)));
  } catch (error) {
    // Fall back to immediate canvas rendering if the Font Loading API is unavailable.
  }
}

function trimDisplayText(text, maxLength) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength).trim();
  const lastWhitespace = sliced.search(/\s+\S*$/);
  const safe = lastWhitespace > Math.floor(maxLength * 0.6) ? sliced.slice(0, lastWhitespace) : sliced;
  return `${safe.trim()}...`;
}

function getMediaSize(media) {
  return {
    width: media?.videoWidth || media?.naturalWidth || media?.width || 0,
    height: media?.videoHeight || media?.naturalHeight || media?.height || 0
  };
}

function wrapText(context, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function applyEllipsis(context, lines, maxLines, maxWidth) {
  if (lines.length <= maxLines) {
    return lines;
  }

  const truncated = lines.slice(0, maxLines);
  let finalLine = truncated[maxLines - 1];

  while (finalLine && context.measureText(`${finalLine}...`).width > maxWidth) {
    const words = finalLine.split(" ");
    words.pop();
    finalLine = words.join(" ");
  }

  truncated[maxLines - 1] = finalLine ? `${finalLine}...` : "...";
  return truncated;
}

function fitTextBlock(context, text, options) {
  const {
    fontFamily,
    fontWeight,
    maxFontSize,
    minFontSize,
    maxWidth,
    maxLines,
    lineHeightRatio
  } = options;

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
    context.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
    const lines = wrapText(context, text, maxWidth);

    if (lines.length <= maxLines) {
      return {
        fontSize,
        lineHeight: fontSize * lineHeightRatio,
        lines
      };
    }
  }

  context.font = `${fontWeight} ${minFontSize}px "${fontFamily}"`;
  return {
    fontSize: minFontSize,
    lineHeight: minFontSize * lineHeightRatio,
    lines: applyEllipsis(context, wrapText(context, text, maxWidth), maxLines, maxWidth)
  };
}

function drawTextLines(context, lines, x, y, lineHeight) {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + lineHeight * index);
  });
}

export function withRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawMediaCover(context, media, x, y, width, height, focusY = 0.5, focusX = 0.5, zoom = 1) {
  const size = getMediaSize(media);

  if (!size.width || !size.height) {
    return;
  }

  const scale = Math.max(width / size.width, height / size.height) * zoom;
  const scaledWidth = size.width * scale;
  const scaledHeight = size.height * scale;
  const availableX = Math.max(0, scaledWidth - width);
  const offsetX = x - availableX * focusX;
  const availableY = Math.max(0, scaledHeight - height);
  const offsetY = y - availableY * focusY;

  context.drawImage(media, offsetX, offsetY, scaledWidth, scaledHeight);
}

function drawMediaContain(context, media, x, y, width, height, scale = 1) {
  const size = getMediaSize(media);

  if (!size.width || !size.height) {
    return null;
  }

  const containScale = Math.min(width / size.width, height / size.height) * scale;
  const drawWidth = size.width * containScale;
  const drawHeight = size.height * containScale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(media, drawX, drawY, drawWidth, drawHeight);

  return {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight
  };
}

function softenTextArtifacts(context, media, frame, placement, mediaMeta) {
  if (!media || !mediaMeta?.textRisk) {
    return;
  }

  const regions = [
    {
      x: 0,
      y: 0.86,
      width: 0.22,
      height: 0.1,
      tintTop: "rgba(8, 16, 28, 0.42)",
      tintBottom: "rgba(7, 14, 25, 0.72)",
      outline: "rgba(255, 255, 255, 0.03)"
    },
    {
      x: 0.18,
      y: 0.88,
      width: 0.54,
      height: 0.07,
      tintTop: "rgba(8, 15, 26, 0.28)",
      tintBottom: "rgba(7, 14, 25, 0.56)",
      outline: "rgba(255, 255, 255, 0.03)"
    }
  ];

  regions.forEach((region) => {
    const x = frame.x + frame.width * region.x;
    const y = frame.y + frame.height * region.y;
    const width = frame.width * region.width;
    const height = frame.height * region.height;
    const radius = Math.max(12, Math.min(width, height) * 0.22);
    const matte = context.createLinearGradient(0, y, 0, y + height);
    matte.addColorStop(0, region.tintTop);
    matte.addColorStop(1, region.tintBottom);

    context.save();
    withRoundedRect(context, x, y, width, height, radius);
    context.clip();
    context.fillStyle = matte;
    context.fillRect(x, y, width, height);
    context.restore();

    context.save();
    context.globalAlpha = 0.45;
    withRoundedRect(context, x, y, width, height, radius);
    context.strokeStyle = region.outline;
    context.lineWidth = Math.max(2, Math.min(width, height) * 0.04);
    context.stroke();
    context.restore();
  });
}

function drawBackdrop(context, media, mediaMeta, width, height) {
  const baseGradient = context.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, "#162b45");
  baseGradient.addColorStop(0.52, "#0c1727");
  baseGradient.addColorStop(1, "#050b14");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  if (!media) {
    return;
  }

  context.save();
  context.globalAlpha = mediaMeta?.textRisk ? 0.2 : 0.26;
  context.filter = mediaMeta?.textRisk
    ? "brightness(0.66) saturate(0.84)"
    : "brightness(0.76) saturate(0.94)";
  const backdropBounds = drawMediaContain(context, media, 0, 0, width, height, 1.04);
  context.restore();

  if (backdropBounds) {
    const frameGlow = context.createRadialGradient(
      backdropBounds.x + backdropBounds.width * 0.5,
      backdropBounds.y + backdropBounds.height * 0.35,
      backdropBounds.width * 0.12,
      backdropBounds.x + backdropBounds.width * 0.5,
      backdropBounds.y + backdropBounds.height * 0.5,
      backdropBounds.width * 0.68
    );
    frameGlow.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    frameGlow.addColorStop(0.48, "rgba(141, 213, 255, 0.08)");
    frameGlow.addColorStop(1, "rgba(5, 12, 22, 0)");
    context.fillStyle = frameGlow;
    context.fillRect(0, 0, width, height);
  }

  const topWash = context.createLinearGradient(0, 0, 0, height * 0.42);
  topWash.addColorStop(0, "rgba(5, 12, 22, 0.22)");
  topWash.addColorStop(1, "rgba(5, 12, 22, 0)");
  context.fillStyle = topWash;
  context.fillRect(0, 0, width, height * 0.42);

  const sideVignette = context.createRadialGradient(
    width * 0.5,
    height * 0.48,
    width * 0.18,
    width * 0.5,
    height * 0.5,
    width * 0.74
  );
  sideVignette.addColorStop(0, "rgba(5, 12, 22, 0)");
  sideVignette.addColorStop(0.72, "rgba(5, 12, 22, 0.12)");
  sideVignette.addColorStop(1, "rgba(5, 12, 22, 0.44)");
  context.fillStyle = sideVignette;
  context.fillRect(0, 0, width, height);

  const backdropGradient = context.createLinearGradient(0, 0, 0, height);
  backdropGradient.addColorStop(0, "rgba(5, 12, 22, 0.12)");
  backdropGradient.addColorStop(0.58, "rgba(5, 12, 22, 0.32)");
  backdropGradient.addColorStop(1, "rgba(5, 12, 22, 0.78)");
  context.fillStyle = backdropGradient;
  context.fillRect(0, 0, width, height);

  if (mediaMeta?.textRisk) {
    const cleanMask = context.createLinearGradient(0, height * 0.72, 0, height);
    cleanMask.addColorStop(0, "rgba(5, 12, 22, 0)");
    cleanMask.addColorStop(0.58, "rgba(5, 12, 22, 0.22)");
    cleanMask.addColorStop(1, "rgba(5, 12, 22, 0.46)");
    context.fillStyle = cleanMask;
    context.fillRect(0, height * 0.72, width, height * 0.28);
  }
}

function fitCopyPair(context, options) {
  const {
    headline,
    subheadline,
    headlineOptions,
    subheadlineOptions,
    gap,
    maxHeight
  } = options;

  for (
    let headlineSize = headlineOptions.maxFontSize;
    headlineSize >= headlineOptions.minFontSize;
    headlineSize -= 2
  ) {
    const headlineLayout = fitTextBlock(context, headline, {
      ...headlineOptions,
      maxFontSize: headlineSize
    });

    for (
      let subheadlineSize = subheadlineOptions.maxFontSize;
      subheadlineSize >= subheadlineOptions.minFontSize;
      subheadlineSize -= 1
    ) {
      const subheadlineLayout = fitTextBlock(context, subheadline, {
        ...subheadlineOptions,
        maxFontSize: subheadlineSize
      });

      const totalHeight =
        headlineLayout.lines.length * headlineLayout.lineHeight +
        gap +
        subheadlineLayout.lines.length * subheadlineLayout.lineHeight;

      if (totalHeight <= maxHeight) {
        return {
          headlineLayout,
          subheadlineLayout
        };
      }
    }
  }

  return {
    headlineLayout: fitTextBlock(context, headline, headlineOptions),
    subheadlineLayout: fitTextBlock(context, subheadline, subheadlineOptions)
  };
}

function drawSourceBadge(context, article, settings, x, y, width = null) {
  context.font = `700 26px "${settings.fontFamily}"`;
  const badgeWidth = width || Math.min(360, Math.max(200, context.measureText(article.source || "News").width + 64));

  context.save();
  withRoundedRect(context, x, y, badgeWidth, 54, 16);
  context.fillStyle = "rgba(255,255,255,0.1)";
  context.fill();
  context.restore();

  context.fillStyle = settings.color;
  context.fillText(article.source || "News Source", x + 20, y + 35);
}

function drawPosterMedia(context, media, mediaMeta, width, height, options = {}) {
  const {
    x = 0,
    y = 0,
    frameWidth = width,
    frameHeight = height,
    focusY = 0.32,
    focusX = 0.5,
    zoom = 1,
    filter = "brightness(0.82) contrast(1.06) saturate(1.04)"
  } = options;

  if (!media) {
    const fallback = context.createLinearGradient(0, y, frameWidth, y + frameHeight);
    fallback.addColorStop(0, "#243145");
    fallback.addColorStop(0.5, "#121821");
    fallback.addColorStop(1, "#030406");
    context.fillStyle = fallback;
    context.fillRect(x, y, frameWidth, frameHeight);
    return;
  }

  context.save();
  context.beginPath();
  context.rect(x, y, frameWidth, frameHeight);
  context.clip();
  context.filter = filter;
  drawMediaCover(context, media, x, y, frameWidth, frameHeight, focusY, focusX, zoom);
  context.restore();
  softenTextArtifacts(context, media, { x, y, width: frameWidth, height: frameHeight }, {}, mediaMeta);
}

function drawBottomShade(context, width, height, start = 0.42, strength = 0.96) {
  const shade = context.createLinearGradient(0, height * start, 0, height);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.55, `rgba(0,0,0,${strength * 0.58})`);
  shade.addColorStop(1, `rgba(0,0,0,${strength})`);
  context.fillStyle = shade;
  context.fillRect(0, height * start, width, height * (1 - start));
}

function drawTopShade(context, width, height, end = 0.22, strength = 0.48) {
  const shade = context.createLinearGradient(0, 0, 0, height * end);
  shade.addColorStop(0, `rgba(0,0,0,${strength})`);
  shade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height * end);
}

function drawFittedText(context, text, options) {
  const {
    x,
    y,
    maxWidth,
    maxLines,
    maxFontSize,
    minFontSize,
    fontFamily,
    fontWeight = 900,
    lineHeightRatio = 0.96,
    color = "#ffffff",
    align = "left",
    baseline = "top",
    uppercase = false
  } = options;
  const copy = uppercase ? String(text || "").toUpperCase() : String(text || "");
  const layout = fitTextBlock(context, copy, {
    fontFamily,
    fontWeight,
    maxFontSize,
    minFontSize,
    maxWidth,
    maxLines,
    lineHeightRatio
  });

  context.save();
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = baseline;
  context.font = `${fontWeight} ${layout.fontSize}px "${fontFamily}"`;
  drawTextLines(context, layout.lines, x, y, layout.lineHeight);
  context.restore();

  return layout;
}

function drawCircleImage(context, media, x, y, radius, options = {}) {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();
  drawPosterMedia(context, media, options.mediaMeta, radius * 2, radius * 2, {
    x: x - radius,
    y: y - radius,
    frameWidth: radius * 2,
    frameHeight: radius * 2,
    focusY: options.focusY ?? 0.28,
    focusX: options.focusX ?? 0.5,
    zoom: options.zoom ?? 1.12,
    filter: options.filter || "brightness(0.96) contrast(1.05) saturate(1.06)"
  });
  context.restore();

  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.strokeStyle = options.stroke || "#ffffff";
  context.lineWidth = options.lineWidth || 8;
  context.stroke();
  context.restore();
}

function formatPostDate(article) {
  const date = article?.publishedAt ? new Date(article.publishedAt) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "TODAY";
  }

  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
    .toUpperCase();
}

function drawRedAlertTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const padding = Math.max(36, Math.min(140, Number(settings.padding) || 72));
  const textColor = settings.color || "#ffffff";
  const overlayOpacity = Math.max(0.1, Math.min(0.9, Number(settings.overlayOpacity) || 0.48));
  const bottomShadeStrength = Math.min(1, 0.28 + overlayOpacity * 1.46);

  drawPosterMedia(context, media, mediaMeta, width, height, { focusY: 0.26, filter: "brightness(0.74) contrast(1.08) saturate(1.02)" });
  drawTopShade(context, width, height, 0.22, overlayOpacity);
  drawBottomShade(context, width, height, 0.44, bottomShadeStrength);

  const headlineY = height * 0.68;
  const headlineHeight = 94;
  context.fillStyle = "#f01912";
  withRoundedRect(context, padding * 0.34, headlineY - 18, width - padding * 0.68, headlineHeight, 8);
  context.fill();

  drawFittedText(context, headline, {
    x: width / 2,
    y: headlineY,
    maxWidth: width - padding * 2,
    maxLines: 1,
    maxFontSize: Math.min(settings.fontSize + 10, 104),
    minFontSize: 48,
    fontFamily: font,
    color: textColor,
    align: "center",
    uppercase: true
  });

  drawFittedText(context, subheadline, {
    x: width / 2,
    y: headlineY + 132,
    maxWidth: width - padding * 2,
    maxLines: 4,
    maxFontSize: Math.min(Math.max(settings.fontSize * 0.52, 34), 54),
    minFontSize: 28,
    fontFamily: font,
    fontWeight: 800,
    lineHeightRatio: 1.16,
    color: textColor,
    align: "center"
  });

  context.fillStyle = "#ffffff";
  context.fillRect(0, height - 60, width, 60);
  drawFittedText(context, subheadline || headline, {
    x: width / 2,
    y: height - 52,
    maxWidth: width - padding * 2,
    maxLines: 1,
    maxFontSize: Math.min(Math.max(settings.fontSize * 0.45, 28), 44),
    minFontSize: 24,
    fontFamily: font,
    fontWeight: 900,
    color: textColor,
    align: "center"
  });
}

function drawSplitCaptionTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots = {}) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const primaryMedia = mediaSlots.primary || media;
  const primaryMeta = mediaSlots.primaryMeta || mediaMeta;
  const secondMedia = mediaSlots.second || media;
  const secondMeta = mediaSlots.secondMeta || mediaMeta;
  const circleMedia = mediaSlots.circle || primaryMedia;
  const circleMeta = mediaSlots.circleMeta || primaryMeta;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  drawFittedText(context, headline, {
    x: width / 2,
    y: 28,
    maxWidth: width - 160,
    maxLines: 3,
    maxFontSize: 52,
    minFontSize: 30,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.08,
    color: "#050505",
    align: "center"
  });

  const imageY = 202;
  const imageHeight = 946;
  drawPosterMedia(context, primaryMedia, primaryMeta, width / 2, imageHeight, { x: 0, y: imageY, frameWidth: width / 2, frameHeight: imageHeight, focusX: 0.26, focusY: 0.28 });
  drawPosterMedia(context, secondMedia, secondMeta, width / 2, imageHeight, { x: width / 2, y: imageY, frameWidth: width / 2, frameHeight: imageHeight, focusX: 0.74, focusY: 0.28, filter: "grayscale(0.62) brightness(0.7) contrast(1.04)" });
  context.fillStyle = "rgba(0,0,0,0.18)";
  context.fillRect(width / 2, imageY, width / 2, imageHeight);
  drawCircleImage(context, circleMedia, width / 2, imageY + imageHeight * 0.58, 178, { mediaMeta: circleMeta, stroke: "#ffffff", lineWidth: 6 });

  context.fillStyle = "#a92907";
  context.fillRect(0, height - 202, width, 202);
  drawFittedText(context, subheadline, {
    x: width / 2,
    y: height - 164,
    maxWidth: width - 120,
    maxLines: 2,
    maxFontSize: 54,
    minFontSize: 34,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.18,
    color: "#ffffff",
    align: "center"
  });
}

function drawBlueBlackTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots = {}) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const primaryMedia = mediaSlots.primary || media;
  const primaryMeta = mediaSlots.primaryMeta || mediaMeta;
  const secondMedia = mediaSlots.second || null;
  const secondMeta = mediaSlots.secondMeta || null;

  context.fillStyle = "#075272";
  context.fillRect(0, 0, width, 232);
  drawFittedText(context, headline, {
    x: width / 2,
    y: 50,
    maxWidth: width - 120,
    maxLines: 2,
    maxFontSize: 50,
    minFontSize: 30,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.18,
    color: "#ffffff",
    align: "center"
  });

  if (secondMedia) {
    drawPosterMedia(context, primaryMedia, primaryMeta, width / 2, 780, { x: 0, y: 232, frameWidth: width / 2, frameHeight: 780, focusX: 0.42, focusY: 0.26 });
    drawPosterMedia(context, secondMedia, secondMeta, width / 2, 780, { x: width / 2, y: 232, frameWidth: width / 2, frameHeight: 780, focusX: 0.58, focusY: 0.26 });
  } else {
    drawPosterMedia(context, primaryMedia, primaryMeta, width, 780, { x: 0, y: 232, frameWidth: width, frameHeight: 780, focusY: 0.26 });
  }
  context.fillStyle = "#000000";
  context.fillRect(0, 1012, width, height - 1012);

  drawFittedText(context, subheadline, {
    x: 98,
    y: 1068,
    maxWidth: width - 196,
    maxLines: 4,
    maxFontSize: 50,
    minFontSize: 28,
    fontFamily: font,
    fontWeight: 700,
    lineHeightRatio: 1.12,
    color: "#ffffff"
  });
}

function drawBrownBarTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;

  drawPosterMedia(context, media, mediaMeta, width, height, { focusY: 0.24, filter: "brightness(0.72) contrast(1.08) saturate(0.96)" });
  drawBottomShade(context, width, height, 0.42, 0.98);
  context.fillStyle = "#fff21a";
  [0, 56, 112, 168, 224].forEach((offset) => context.fillRect(30, height - 318 + offset, 16, 38));

  context.fillStyle = "#8d4a2f";
  context.fillRect(72, height - 320, width - 116, 72);
  drawFittedText(context, headline, {
    x: 92,
    y: height - 312,
    maxWidth: width - 160,
    maxLines: 1,
    maxFontSize: 64,
    minFontSize: 34,
    fontFamily: font,
    fontWeight: 900,
    color: "#ffffff",
    uppercase: false
  });

  drawFittedText(context, subheadline, {
    x: 74,
    y: height - 226,
    maxWidth: width - 112,
    maxLines: 4,
    maxFontSize: 40,
    minFontSize: 26,
    fontFamily: font,
    fontWeight: 800,
    lineHeightRatio: 1.2,
    color: "#ffffff"
  });
}

function drawCircleMontageTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots = {}) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const primaryMedia = mediaSlots.primary || media;
  const primaryMeta = mediaSlots.primaryMeta || mediaMeta;
  const secondMedia = mediaSlots.second || media;
  const secondMeta = mediaSlots.secondMeta || mediaMeta;
  const backgroundMedia = mediaSlots.background || primaryMedia;
  const backgroundMeta = mediaSlots.backgroundMeta || primaryMeta;
  const circleMedia = mediaSlots.circle || secondMedia || primaryMedia;
  const circleMeta = mediaSlots.circleMeta || secondMeta || primaryMeta;

  drawPosterMedia(context, primaryMedia, primaryMeta, width / 2, 660, { x: 0, y: 0, frameWidth: width / 2, frameHeight: 660, focusX: 0.32, focusY: 0.22 });
  drawPosterMedia(context, secondMedia, secondMeta, width / 2, 660, { x: width / 2, y: 0, frameWidth: width / 2, frameHeight: 660, focusX: 0.68, focusY: 0.22 });
  drawPosterMedia(context, backgroundMedia, backgroundMeta, width, height - 620, { x: 0, y: 620, frameWidth: width, frameHeight: height - 620, focusY: 0.52, filter: "brightness(0.88) contrast(1.02) saturate(1.02)" });
  drawBottomShade(context, width, height, 0.28, 0.78);

  drawCircleImage(context, circleMedia, width - 180, 610, 124, { mediaMeta: circleMeta, stroke: "#ffffff", lineWidth: 7, focusX: 0.72 });
  drawFittedText(context, headline, {
    x: 42,
    y: 548,
    maxWidth: width - 300,
    maxLines: 4,
    maxFontSize: 47,
    minFontSize: 28,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.12,
    color: "#ffffff"
  });

  drawFittedText(context, subheadline, {
    x: width / 2,
    y: height - 128,
    maxWidth: width - 120,
    maxLines: 2,
    maxFontSize: 34,
    minFontSize: 22,
    fontFamily: UI_FONT_FAMILY,
    fontWeight: 800,
    lineHeightRatio: 1.22,
    color: "#ffffff",
    align: "center",
    uppercase: true
  });
}

function drawHistoryDateTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots = {}) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const circleMedia = mediaSlots.circle || media;
  const circleMeta = mediaSlots.circleMeta || mediaMeta;

  drawPosterMedia(context, media, mediaMeta, width, height, { focusY: 0.22, filter: "grayscale(1) brightness(0.76) contrast(1.12)" });
  drawBottomShade(context, width, height, 0.38, 1);
  drawCircleImage(context, circleMedia, width - 250, 635, 142, { mediaMeta: circleMeta, stroke: "#ffffff", lineWidth: 8, filter: "brightness(1.04) contrast(1.03)" });

  context.fillStyle = "#ffffff";
  context.font = `900 70px "${font}"`;
  context.fillText("▦", 140, 1000);
  const dateGradient = context.createLinearGradient(260, 0, 920, 0);
  dateGradient.addColorStop(0, "#ff7b32");
  dateGradient.addColorStop(0.5, "#fff4e5");
  dateGradient.addColorStop(1, "#11ef72");
  context.fillStyle = dateGradient;
  context.font = `900 72px "${font}"`;
  context.fillText(formatPostDate(article), 268, 1000);

  drawFittedText(context, headline || subheadline, {
    x: 132,
    y: 1078,
    maxWidth: width - 260,
    maxLines: 2,
    maxFontSize: 44,
    minFontSize: 28,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.25,
    color: "#ffffff"
  });
  context.fillStyle = dateGradient;
  context.fillRect(108, height - 70, width - 216, 12);
}

function drawRegionalBoldTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;

  drawPosterMedia(context, media, mediaMeta, width, height, { focusY: 0.24, filter: "brightness(0.78) contrast(1.08) saturate(1.08)" });
  drawBottomShade(context, width, height, 0.42, 0.95);
  context.fillStyle = "rgba(255, 202, 22, 0.9)";
  context.fillRect(width / 2 - 8, 0, 16, height * 0.62);
  context.shadowColor = "rgba(255, 222, 30, 0.9)";
  context.shadowBlur = 18;
  context.fillRect(width / 2 - 4, 0, 8, height * 0.62);
  context.shadowBlur = 0;

  drawFittedText(context, headline, {
    x: 48,
    y: height - 356,
    maxWidth: width - 96,
    maxLines: 3,
    maxFontSize: 58,
    minFontSize: 34,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.16,
    color: "#ff7b13"
  });
  drawFittedText(context, subheadline, {
    x: 48,
    y: height - 158,
    maxWidth: width - 96,
    maxLines: 2,
    maxFontSize: 48,
    minFontSize: 30,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.18,
    color: "#ffffff"
  });
  context.fillStyle = "#ff7b13";
  context.fillRect(0, height - 8, width, 8);
}

function drawYellowQuestionTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots = {}) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const circleMedia = mediaSlots.circle || media;
  const circleMeta = mediaSlots.circleMeta || mediaMeta;

  drawPosterMedia(context, media, mediaMeta, width, height, { focusY: 0.3, filter: "brightness(0.64) contrast(1.14) saturate(1.1)" });
  drawBottomShade(context, width, height, 0.38, 0.98);
  drawCircleImage(context, circleMedia, 268, 606, 150, { mediaMeta: circleMeta, stroke: "#ffffff", lineWidth: 7, filter: "grayscale(1) brightness(1.02)" });
  drawFittedText(context, headline, {
    x: width / 2,
    y: 920,
    maxWidth: width - 120,
    maxLines: 2,
    maxFontSize: 62,
    minFontSize: 36,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.15,
    color: "#ffff00",
    align: "center",
    uppercase: true
  });
  drawFittedText(context, subheadline, {
    x: width / 2,
    y: 1086,
    maxWidth: width - 170,
    maxLines: 4,
    maxFontSize: 35,
    minFontSize: 24,
    fontFamily: font,
    fontWeight: 800,
    lineHeightRatio: 1.25,
    color: "#ffffff",
    align: "center"
  });
  context.fillStyle = "#ffff00";
  context.fillRect(0, height - 48, width, 48);
  drawFittedText(context, subheadline || headline, {
    x: width / 2,
    y: height - 40,
    maxWidth: width - 160,
    maxLines: 1,
    maxFontSize: 31,
    minFontSize: 18,
    fontFamily: font,
    fontWeight: 900,
    color: "#000000",
    align: "center"
  });
}

function drawLegacyPosterTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots = {}) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const leftCircleMedia = mediaSlots.circleLeft || mediaSlots.circle || media;
  const leftCircleMeta = mediaSlots.circleLeftMeta || mediaSlots.circleMeta || mediaMeta;
  const rightCircleMedia = mediaSlots.circleRight || mediaSlots.circle || leftCircleMedia;
  const rightCircleMeta = mediaSlots.circleRightMeta || mediaSlots.circleMeta || leftCircleMeta;

  drawPosterMedia(context, media, mediaMeta, width, height, { focusY: 0.18, filter: "brightness(0.72) contrast(1.04) saturate(0.92)" });
  drawBottomShade(context, width, height, 0.34, 1);
  drawCircleImage(context, leftCircleMedia, 296, 694, 124, { mediaMeta: leftCircleMeta, stroke: "#ffffff", lineWidth: 6, focusX: 0.32 });
  drawCircleImage(context, rightCircleMedia, width - 298, 694, 124, { mediaMeta: rightCircleMeta, stroke: "#ffffff", lineWidth: 6, focusX: 0.72 });
  drawFittedText(context, headline, {
    x: width / 2,
    y: 930,
    maxWidth: width - 170,
    maxLines: 2,
    maxFontSize: 62,
    minFontSize: 36,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.12,
    color: "#b7d4aa",
    align: "center",
    uppercase: true
  });
  drawFittedText(context, subheadline, {
    x: width / 2,
    y: 1112,
    maxWidth: width - 170,
    maxLines: 3,
    maxFontSize: 34,
    minFontSize: 22,
    fontFamily: UI_FONT_FAMILY,
    fontWeight: 500,
    lineHeightRatio: 1.35,
    color: "#ffffff",
    align: "center",
    uppercase: true
  });
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(76, height - 78);
  context.lineTo(width - 76, height - 78);
  context.stroke();
}

function drawTargetedCardTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;

  drawPosterMedia(context, media, mediaMeta, width, height, { focusY: 0.2, filter: "brightness(0.58) contrast(1.12) saturate(0.92)" });
  drawBottomShade(context, width, height, 0.36, 0.98);

  context.save();
  withRoundedRect(context, width * 0.47, 452, width * 0.46, 350, 18);
  context.fillStyle = "#ffffff";
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = "#fff200";
  context.stroke();
  context.restore();
  drawFittedText(context, subheadline, {
    x: width * 0.5,
    y: 498,
    maxWidth: width * 0.38,
    maxLines: 6,
    maxFontSize: 26,
    minFontSize: 17,
    fontFamily: UI_FONT_FAMILY,
    fontWeight: 500,
    lineHeightRatio: 1.24,
    color: "#111111"
  });

  context.fillStyle = "#f2352c";
  context.fillRect(72, 886, width - 144, 96);
  drawFittedText(context, headline, {
    x: width / 2,
    y: 902,
    maxWidth: width - 180,
    maxLines: 1,
    maxFontSize: 72,
    minFontSize: 38,
    fontFamily: font,
    fontWeight: 900,
    color: "#ffffff",
    align: "center",
    uppercase: true
  });
  drawFittedText(context, subheadline, {
    x: width / 2,
    y: 1030,
    maxWidth: width - 150,
    maxLines: 4,
    maxFontSize: 38,
    minFontSize: 24,
    fontFamily: font,
    fontWeight: 800,
    lineHeightRatio: 1.25,
    color: "#ffffff",
    align: "center"
  });
  context.fillStyle = "#ffffff";
  context.fillRect(0, height - 36, width, 4);
}

function drawCyanPatternTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots = {}) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const font = settings.fontFamily;
  const primaryMedia = mediaSlots.primary || media;
  const primaryMeta = mediaSlots.primaryMeta || mediaMeta;
  const secondMedia = mediaSlots.second || media;
  const secondMeta = mediaSlots.secondMeta || mediaMeta;

  drawPosterMedia(context, primaryMedia, primaryMeta, width / 2, height, { x: 0, y: 0, frameWidth: width / 2, frameHeight: height, focusX: 0.32, focusY: 0.22, filter: "brightness(0.7) contrast(1.12) saturate(0.9)" });
  drawPosterMedia(context, secondMedia, secondMeta, width / 2, height, { x: width / 2, y: 0, frameWidth: width / 2, frameHeight: height, focusX: 0.68, focusY: 0.22, filter: "brightness(0.82) contrast(1.16) saturate(1.18)" });
  drawBottomShade(context, width, height, 0.4, 0.96);

  drawFittedText(context, headline, {
    x: width / 2,
    y: 878,
    maxWidth: width - 130,
    maxLines: 2,
    maxFontSize: 58,
    minFontSize: 34,
    fontFamily: font,
    fontWeight: 900,
    lineHeightRatio: 1.13,
    color: "#26eef1",
    align: "center",
    uppercase: true
  });
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(194, 1058);
  context.lineTo(width - 194, 1058);
  context.stroke();
  drawFittedText(context, subheadline, {
    x: width / 2,
    y: 1100,
    maxWidth: width - 160,
    maxLines: 3,
    maxFontSize: 36,
    minFontSize: 23,
    fontFamily: UI_FONT_FAMILY,
    fontWeight: 500,
    lineHeightRatio: 1.28,
    color: "#ffffff",
    align: "center"
  });
  context.fillStyle = "#18dfe8";
  context.fillRect(0, height - 58, width, 58);
  drawFittedText(context, subheadline || headline, {
    x: width / 2,
    y: height - 48,
    maxWidth: width - 120,
    maxLines: 1,
    maxFontSize: 32,
    minFontSize: 18,
    fontFamily: font,
    fontWeight: 900,
    color: "#000000",
    align: "center"
  });
}

function drawEditorialTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const outerPadding = Math.max(36, settings.padding * 0.72);
  const mediaHeight = Math.min(height * 0.5, 680);
  const mediaFrame = {
    x: outerPadding,
    y: 44,
    width: width - outerPadding * 2,
    height: mediaHeight
  };
  const panel = {
    x: outerPadding,
    y: mediaFrame.y + mediaFrame.height + 30,
    width: width - outerPadding * 2,
    height: height - (mediaFrame.y + mediaFrame.height + 30) - outerPadding
  };

  if (media) {
    const mediaPlacement = {
      focusY: 0.24,
      focusX: 0.5,
      zoom: 1
    };

    context.save();
    withRoundedRect(context, mediaFrame.x, mediaFrame.y, mediaFrame.width, mediaFrame.height, 34);
    context.clip();
    drawMediaCover(context, media, mediaFrame.x, mediaFrame.y, mediaFrame.width, mediaFrame.height, mediaPlacement.focusY, mediaPlacement.focusX, mediaPlacement.zoom);
    softenTextArtifacts(context, media, mediaFrame, mediaPlacement, mediaMeta);
    context.restore();

    const imageFade = context.createLinearGradient(0, mediaFrame.y, 0, mediaFrame.y + mediaFrame.height);
    imageFade.addColorStop(0, "rgba(0,0,0,0)");
    imageFade.addColorStop(0.76, "rgba(3,8,15,0.08)");
    imageFade.addColorStop(1, "rgba(3,8,15,0.42)");
    context.save();
    withRoundedRect(context, mediaFrame.x, mediaFrame.y, mediaFrame.width, mediaFrame.height, 34);
    context.clip();
    context.fillStyle = imageFade;
    context.fillRect(mediaFrame.x, mediaFrame.y, mediaFrame.width, mediaFrame.height);
    context.restore();
  }

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.28)";
  context.shadowBlur = 34;
  withRoundedRect(context, panel.x, panel.y, panel.width, panel.height, 34);
  context.fillStyle = "rgba(6, 13, 23, 0.88)";
  context.fill();
  context.restore();

  context.save();
  withRoundedRect(context, panel.x, panel.y, panel.width, panel.height, 34);
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  const badgeX = panel.x + 34;
  const badgeY = panel.y + 28;
  drawSourceBadge(context, article, settings, badgeX, badgeY);

  const textX = panel.x + 34;
  const textWidth = panel.width - 68;
  const headlineTop = badgeY + 106;
  const copyLayout = fitCopyPair(context, {
    headline,
    subheadline,
    headlineOptions: {
      fontFamily: settings.fontFamily,
      fontWeight: 700,
      maxFontSize: Math.min(settings.fontSize, 88),
      minFontSize: 40,
      maxWidth: textWidth,
      maxLines: 3,
      lineHeightRatio: 0.92
    },
    subheadlineOptions: {
      fontFamily: UI_FONT_FAMILY,
      fontWeight: 500,
      maxFontSize: 28,
      minFontSize: 20,
      maxWidth: textWidth,
      maxLines: 2,
      lineHeightRatio: 1.28
    },
    gap: 34,
    maxHeight: panel.height - 170
  });

  context.fillStyle = settings.color;
  const headlineLayout = copyLayout.headlineLayout;
  context.font = `700 ${headlineLayout.fontSize}px "${settings.fontFamily}"`;
  drawTextLines(context, headlineLayout.lines, textX, headlineTop, headlineLayout.lineHeight);

  const subheadlineTop = headlineTop + headlineLayout.lines.length * headlineLayout.lineHeight + 34;
  context.fillStyle = "rgba(255,255,255,0.84)";
  const subheadlineLayout = copyLayout.subheadlineLayout;
  context.font = `500 ${subheadlineLayout.fontSize}px "${UI_FONT_FAMILY}"`;
  drawTextLines(context, subheadlineLayout.lines, textX, subheadlineTop, subheadlineLayout.lineHeight);
}

function drawSpotlightTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const framePadding = 44;
  const cardHeight = Math.min(430, 330 + Math.max(0, height - width) * 0.4);

  if (media) {
    const mediaPlacement = {
      focusY: 0.3,
      focusX: 0.5,
      zoom: 1
    };

    context.save();
    withRoundedRect(context, framePadding, framePadding, width - framePadding * 2, height - framePadding * 2, 42);
    context.clip();
    drawMediaCover(context, media, framePadding, framePadding, width - framePadding * 2, height - framePadding * 2, mediaPlacement.focusY, mediaPlacement.focusX, mediaPlacement.zoom);
    softenTextArtifacts(
      context,
      media,
      {
        x: framePadding,
        y: framePadding,
        width: width - framePadding * 2,
        height: height - framePadding * 2
      },
      mediaPlacement,
      mediaMeta
    );
    context.restore();
  }

  const overlay = context.createLinearGradient(0, 0, 0, height);
  overlay.addColorStop(0, "rgba(5,10,18,0.08)");
  overlay.addColorStop(0.52, "rgba(5,10,18,0.26)");
  overlay.addColorStop(1, "rgba(5,10,18,0.76)");
  context.fillStyle = overlay;
  context.fillRect(0, 0, width, height);

  drawSourceBadge(context, article, settings, 72, 74);

  const card = {
    x: 68,
    y: height - cardHeight - 132,
    width: width - 136,
    height: cardHeight
  };

  context.save();
  withRoundedRect(context, card.x, card.y, card.width, card.height, 36);
  context.fillStyle = "rgba(6, 13, 23, 0.78)";
  context.fill();
  context.restore();

  context.save();
  withRoundedRect(context, card.x, card.y, card.width, card.height, 36);
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  const textX = card.x + 36;
  const textWidth = card.width - 72;
  const headlineTop = card.y + 74;
  const copyLayout = fitCopyPair(context, {
    headline,
    subheadline,
    headlineOptions: {
      fontFamily: settings.fontFamily,
      fontWeight: 700,
      maxFontSize: Math.min(settings.fontSize, 88),
      minFontSize: 42,
      maxWidth: textWidth,
      maxLines: 3,
      lineHeightRatio: 0.94
    },
    subheadlineOptions: {
      fontFamily: UI_FONT_FAMILY,
      fontWeight: 500,
      maxFontSize: 26,
      minFontSize: 20,
      maxWidth: textWidth,
      maxLines: 2,
      lineHeightRatio: 1.24
    },
    gap: 28,
    maxHeight: card.height - 112
  });

  context.fillStyle = settings.color;
  const headlineLayout = copyLayout.headlineLayout;
  context.font = `700 ${headlineLayout.fontSize}px "${settings.fontFamily}"`;
  drawTextLines(context, headlineLayout.lines, textX, headlineTop, headlineLayout.lineHeight);

  const subheadlineTop = headlineTop + headlineLayout.lines.length * headlineLayout.lineHeight + 28;
  context.fillStyle = "rgba(255,255,255,0.86)";
  const subLayout = copyLayout.subheadlineLayout;
  context.font = `500 ${subLayout.fontSize}px "${UI_FONT_FAMILY}"`;
  drawTextLines(context, subLayout.lines, textX, subheadlineTop, subLayout.lineHeight);
}

function drawMinimalTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const maxTextHeight = Math.min(340, height * 0.25);
  const frame = {
    x: 54,
    y: 54,
    width: width - 108,
    height: height - 108
  };

  if (media) {
    const mediaPlacement = {
      focusY: 0.28,
      focusX: 0.5,
      zoom: 1
    };

    context.save();
    withRoundedRect(context, frame.x, frame.y, frame.width, frame.height, 44);
    context.clip();
    drawMediaCover(context, media, frame.x, frame.y, frame.width, frame.height, mediaPlacement.focusY, mediaPlacement.focusX, mediaPlacement.zoom);
    softenTextArtifacts(context, media, frame, mediaPlacement, mediaMeta);
    context.restore();
  }

  const bottomGradient = context.createLinearGradient(0, height * 0.42, 0, height);
  bottomGradient.addColorStop(0, "rgba(2,6,12,0)");
  bottomGradient.addColorStop(1, "rgba(2,6,12,0.92)");
  context.fillStyle = bottomGradient;
  context.fillRect(frame.x, frame.y, frame.width, frame.height);

  drawSourceBadge(context, article, settings, 78, 84, 250);

  const textX = 82;
  const textWidth = width - 164;
  const headlineTop = Math.max(650, height * 0.56);
  const copyLayout = fitCopyPair(context, {
    headline,
    subheadline,
    headlineOptions: {
      fontFamily: settings.fontFamily,
      fontWeight: 700,
      maxFontSize: Math.min(settings.fontSize, 84),
      minFontSize: 40,
      maxWidth: textWidth,
      maxLines: 3,
      lineHeightRatio: 0.94
    },
    subheadlineOptions: {
      fontFamily: UI_FONT_FAMILY,
      fontWeight: 500,
      maxFontSize: 24,
      minFontSize: 18,
      maxWidth: textWidth,
      maxLines: 2,
      lineHeightRatio: 1.28
    },
    gap: 24,
    maxHeight: maxTextHeight
  });

  context.fillStyle = settings.color;
  const headlineLayout = copyLayout.headlineLayout;
  context.font = `700 ${headlineLayout.fontSize}px "${settings.fontFamily}"`;
  drawTextLines(context, headlineLayout.lines, textX, headlineTop, headlineLayout.lineHeight);

  const subheadlineTop = headlineTop + headlineLayout.lines.length * headlineLayout.lineHeight + 24;
  context.fillStyle = "rgba(255,255,255,0.88)";
  const subLayout = copyLayout.subheadlineLayout;
  context.font = `500 ${subLayout.fontSize}px "${UI_FONT_FAMILY}"`;
  drawTextLines(context, subLayout.lines, textX, subheadlineTop, subLayout.lineHeight);
}

function drawBulletinTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const outerPadding = Math.max(34, settings.padding * 0.54);
  const card = {
    x: outerPadding,
    y: outerPadding,
    width: width - outerPadding * 2,
    height: height - outerPadding * 2
  };
  const mediaPanel = {
    x: card.x + 26,
    y: card.y + 112,
    width: Math.min(362, card.width * 0.38),
    height: card.height - 138
  };
  const copyPanel = {
    x: mediaPanel.x + mediaPanel.width + 28,
    y: mediaPanel.y,
    width: card.x + card.width - (mediaPanel.x + mediaPanel.width + 54),
    height: mediaPanel.height
  };

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.24)";
  context.shadowBlur = 26;
  withRoundedRect(context, card.x, card.y, card.width, card.height, 36);
  context.fillStyle = "rgba(7, 16, 28, 0.88)";
  context.fill();
  context.restore();

  context.save();
  withRoundedRect(context, card.x, card.y, card.width, card.height, 36);
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  context.save();
  withRoundedRect(context, card.x + 26, card.y + 26, card.width - 52, 66, 24);
  context.fillStyle = "rgba(255,255,255,0.05)";
  context.fill();
  context.restore();

  context.fillStyle = "#ffcb77";
  context.font = `700 24px "${settings.fontFamily}"`;
  context.fillText("NEWS BULLETIN", card.x + 50, card.y + 67);

  if (media) {
    const mediaPlacement = {
      focusY: 0.3,
      focusX: 0.5,
      zoom: 1.04
    };

    context.save();
    withRoundedRect(context, mediaPanel.x, mediaPanel.y, mediaPanel.width, mediaPanel.height, 30);
    context.clip();
    drawMediaCover(context, media, mediaPanel.x, mediaPanel.y, mediaPanel.width, mediaPanel.height, mediaPlacement.focusY, mediaPlacement.focusX, mediaPlacement.zoom);
    softenTextArtifacts(context, media, mediaPanel, mediaPlacement, mediaMeta);
    context.restore();

    const mediaShade = context.createLinearGradient(0, mediaPanel.y, 0, mediaPanel.y + mediaPanel.height);
    mediaShade.addColorStop(0, "rgba(3,8,15,0.02)");
    mediaShade.addColorStop(1, "rgba(3,8,15,0.36)");
    context.save();
    withRoundedRect(context, mediaPanel.x, mediaPanel.y, mediaPanel.width, mediaPanel.height, 30);
    context.clip();
    context.fillStyle = mediaShade;
    context.fillRect(mediaPanel.x, mediaPanel.y, mediaPanel.width, mediaPanel.height);
    context.restore();
  }

  drawSourceBadge(context, article, settings, copyPanel.x, card.y + 36, Math.min(320, copyPanel.width));

  const textX = copyPanel.x;
  const textWidth = copyPanel.width;
  const headlineTop = copyPanel.y + 126;
  const copyLayout = fitCopyPair(context, {
    headline,
    subheadline,
    headlineOptions: {
      fontFamily: settings.fontFamily,
      fontWeight: 700,
      maxFontSize: Math.min(settings.fontSize, 82),
      minFontSize: 38,
      maxWidth: textWidth,
      maxLines: 4,
      lineHeightRatio: 0.94
    },
    subheadlineOptions: {
      fontFamily: UI_FONT_FAMILY,
      fontWeight: 500,
      maxFontSize: 24,
      minFontSize: 18,
      maxWidth: textWidth,
      maxLines: 3,
      lineHeightRatio: 1.3
    },
    gap: 24,
    maxHeight: copyPanel.height - 170
  });

  context.fillStyle = settings.color;
  const headlineLayout = copyLayout.headlineLayout;
  context.font = `700 ${headlineLayout.fontSize}px "${settings.fontFamily}"`;
  drawTextLines(context, headlineLayout.lines, textX, headlineTop, headlineLayout.lineHeight);

  const subheadlineTop = headlineTop + headlineLayout.lines.length * headlineLayout.lineHeight + 28;
  context.fillStyle = "rgba(255,255,255,0.86)";
  const subLayout = copyLayout.subheadlineLayout;
  context.font = `500 ${subLayout.fontSize}px "${UI_FONT_FAMILY}"`;
  drawTextLines(context, subLayout.lines, textX, subheadlineTop, subLayout.lineHeight);
}

function drawPulseTemplate(context, article, design, settings, media, mediaMeta, width, height) {
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const cardHeight = Math.min(340, 276 + Math.max(0, height - width) * 0.25);
  const cardY = height - cardHeight - 176;

  if (media) {
    const mediaPlacement = {
      focusY: 0.26,
      focusX: 0.5,
      zoom: 1
    };

    context.save();
    withRoundedRect(context, 46, 46, width - 92, height - 92, 42);
    context.clip();
    drawMediaCover(context, media, 46, 46, width - 92, height - 92, mediaPlacement.focusY, mediaPlacement.focusX, mediaPlacement.zoom);
    softenTextArtifacts(
      context,
      media,
      {
        x: 46,
        y: 46,
        width: width - 92,
        height: height - 92
      },
      mediaPlacement,
      mediaMeta
    );
    context.restore();
  }

  context.save();
  context.globalAlpha = 0.9;
  context.fillStyle = "rgba(3,8,15,0.32)";
  context.fillRect(0, 0, width, height);
  context.restore();

  context.save();
  context.translate(width - 180, 120);
  context.rotate((18 * Math.PI) / 180);
  withRoundedRect(context, 0, 0, 124, height - 220, 30);
  context.fillStyle = "rgba(255, 122, 89, 0.2)";
  context.fill();
  context.restore();

  context.save();
  withRoundedRect(context, 66, cardY, width - 132, cardHeight, 34);
  context.fillStyle = "rgba(6, 13, 23, 0.8)";
  context.fill();
  context.restore();

  context.save();
  withRoundedRect(context, 66, cardY, width - 132, cardHeight, 34);
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  drawSourceBadge(context, article, settings, 76, 86, 270);

  context.fillStyle = "#ff7a59";
  context.fillRect(76, cardY - 36, 108, 8);

  const textX = 76;
  const textWidth = width - 220;
  const headlineTop = cardY + 74;
  const copyLayout = fitCopyPair(context, {
    headline,
    subheadline,
    headlineOptions: {
      fontFamily: settings.fontFamily,
      fontWeight: 700,
      maxFontSize: Math.min(settings.fontSize, 86),
      minFontSize: 40,
      maxWidth: textWidth,
      maxLines: 3,
      lineHeightRatio: 0.94
    },
    subheadlineOptions: {
      fontFamily: UI_FONT_FAMILY,
      fontWeight: 500,
      maxFontSize: 24,
      minFontSize: 18,
      maxWidth: textWidth,
      maxLines: 2,
      lineHeightRatio: 1.3
    },
    gap: 24,
    maxHeight: cardHeight - 92
  });

  context.fillStyle = settings.color;
  const headlineLayout = copyLayout.headlineLayout;
  context.font = `700 ${headlineLayout.fontSize}px "${settings.fontFamily}"`;
  drawTextLines(context, headlineLayout.lines, textX, headlineTop, headlineLayout.lineHeight);

  const subheadlineTop = headlineTop + headlineLayout.lines.length * headlineLayout.lineHeight + 26;
  context.fillStyle = "rgba(255,255,255,0.85)";
  const subLayout = copyLayout.subheadlineLayout;
  context.font = `500 ${subLayout.fontSize}px "${UI_FONT_FAMILY}"`;
  drawTextLines(context, subLayout.lines, textX, subheadlineTop, subLayout.lineHeight);
}

export function drawVideoOverlayTemplate(context, options) {
  const { article, design, settings, media, mediaMeta, width, height } = options;
  const { headline, subheadline } = buildDisplayCopy(article, design);
  const headerHeight = Math.min(330, 276 + Math.max(0, height - width) * 0.2);

  context.clearRect(0, 0, width, height);

  const backgroundGradient = context.createLinearGradient(0, 0, width, height);
  backgroundGradient.addColorStop(0, "#13253d");
  backgroundGradient.addColorStop(0.46, "#0b1626");
  backgroundGradient.addColorStop(1, "#060d16");
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, width, height);

  const ambientGlow = context.createRadialGradient(
    width * 0.18,
    height * 0.12,
    width * 0.02,
    width * 0.18,
    height * 0.12,
    width * 0.46
  );
  ambientGlow.addColorStop(0, "rgba(141, 213, 255, 0.18)");
  ambientGlow.addColorStop(1, "rgba(141, 213, 255, 0)");
  context.fillStyle = ambientGlow;
  context.fillRect(0, 0, width, height);

  const headerCard = {
    x: 54,
    y: 46,
    width: width - 108,
    height: headerHeight
  };
  const videoFrame = {
    x: 54,
    y: headerCard.y + headerCard.height + 30,
    width: width - 108,
    height: height - (headerCard.y + headerCard.height + 30) - 54
  };

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.22)";
  context.shadowBlur = 26;
  withRoundedRect(context, headerCard.x, headerCard.y, headerCard.width, headerCard.height, 34);
  context.fillStyle = "rgba(7, 14, 24, 0.86)";
  context.fill();
  context.restore();

  context.save();
  withRoundedRect(context, headerCard.x, headerCard.y, headerCard.width, headerCard.height, 34);
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  drawSourceBadge(context, article, settings, headerCard.x + 30, headerCard.y + 24, 310);

  const copyLayout = fitCopyPair(context, {
    headline,
    subheadline,
    headlineOptions: {
      fontFamily: settings.fontFamily,
      fontWeight: 700,
      maxFontSize: Math.min(settings.fontSize, 72),
      minFontSize: 34,
      maxWidth: headerCard.width - 60,
      maxLines: 3,
      lineHeightRatio: 0.94
    },
    subheadlineOptions: {
      fontFamily: UI_FONT_FAMILY,
      fontWeight: 500,
      maxFontSize: 24,
      minFontSize: 18,
      maxWidth: headerCard.width - 60,
      maxLines: 3,
      lineHeightRatio: 1.28
    },
    gap: 22,
    maxHeight: headerCard.height - 108
  });

  const textX = headerCard.x + 30;
  const headlineTop = headerCard.y + 118;
  context.fillStyle = settings.color;
  context.font = `700 ${copyLayout.headlineLayout.fontSize}px "${settings.fontFamily}"`;
  drawTextLines(context, copyLayout.headlineLayout.lines, textX, headlineTop, copyLayout.headlineLayout.lineHeight);

  const subheadlineTop =
    headlineTop + copyLayout.headlineLayout.lines.length * copyLayout.headlineLayout.lineHeight + 24;
  context.fillStyle = "rgba(255,255,255,0.86)";
  context.font = `500 ${copyLayout.subheadlineLayout.fontSize}px "${UI_FONT_FAMILY}"`;
  drawTextLines(
    context,
    copyLayout.subheadlineLayout.lines,
    textX,
    subheadlineTop,
    copyLayout.subheadlineLayout.lineHeight
  );

  context.save();
  withRoundedRect(context, videoFrame.x, videoFrame.y, videoFrame.width, videoFrame.height, 36);
  context.fillStyle = "rgba(4, 9, 16, 0.82)";
  context.fill();
  context.restore();

  if (media) {
    const mediaPlacement = {
      focusY: 0.5,
      focusX: 0.5,
      zoom: 1
    };

    context.save();
    withRoundedRect(context, videoFrame.x, videoFrame.y, videoFrame.width, videoFrame.height, 36);
    context.clip();
    drawMediaContain(context, media, videoFrame.x, videoFrame.y, videoFrame.width, videoFrame.height, 1);
    softenTextArtifacts(context, media, videoFrame, mediaPlacement, mediaMeta);
    context.restore();
  }

  const frameTint = context.createLinearGradient(0, videoFrame.y, 0, videoFrame.y + videoFrame.height);
  frameTint.addColorStop(0, "rgba(255,255,255,0.02)");
  frameTint.addColorStop(1, "rgba(3,8,15,0.18)");
  context.save();
  withRoundedRect(context, videoFrame.x, videoFrame.y, videoFrame.width, videoFrame.height, 36);
  context.clip();
  context.fillStyle = frameTint;
  context.fillRect(videoFrame.x, videoFrame.y, videoFrame.width, videoFrame.height);
  context.restore();

  context.save();
  withRoundedRect(context, videoFrame.x, videoFrame.y, videoFrame.width, videoFrame.height, 36);
  context.strokeStyle = "rgba(255,255,255,0.1)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

export function drawInstagramTemplate(context, options) {
  const { article, design, settings, media, mediaMeta, mediaSlots = {}, width, height } = options;

  context.clearRect(0, 0, width, height);

  const template = settings.template || "red-alert";

  if (template === "red-alert") {
    drawRedAlertTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  if (template === "split-caption") {
    drawSplitCaptionTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots);
    return;
  }

  if (template === "blue-black") {
    drawBlueBlackTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots);
    return;
  }

  if (template === "brown-bar") {
    drawBrownBarTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  if (template === "circle-montage") {
    drawCircleMontageTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots);
    return;
  }

  if (template === "history-date") {
    drawHistoryDateTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots);
    return;
  }

  if (template === "regional-bold") {
    drawRegionalBoldTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  if (template === "yellow-question") {
    drawYellowQuestionTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots);
    return;
  }

  if (template === "legacy-poster") {
    drawLegacyPosterTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots);
    return;
  }

  if (template === "targeted-card") {
    drawTargetedCardTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  if (template === "cyan-pattern") {
    drawCyanPatternTemplate(context, article, design, settings, media, mediaMeta, width, height, mediaSlots);
    return;
  }

  drawBackdrop(context, media, mediaMeta, width, height);

  if (template === "spotlight") {
    drawSpotlightTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  if (template === "minimal") {
    drawMinimalTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  if (template === "bulletin") {
    drawBulletinTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  if (template === "pulse") {
    drawPulseTemplate(context, article, design, settings, media, mediaMeta, width, height);
    return;
  }

  drawEditorialTemplate(context, article, design, settings, media, mediaMeta, width, height);
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function buildProxyAssetUrl(url) {
  return url ? `/api/asset?url=${encodeURIComponent(url)}` : "";
}
