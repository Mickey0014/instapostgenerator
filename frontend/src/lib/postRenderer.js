const UI_FONT_FAMILY = "Inter";

export const INSTAGRAM_EXPORT_WIDTH = 1080;
export const INSTAGRAM_EXPORT_HEIGHT = 1350;
export const INSTAGRAM_EXPORT_ASPECT_CLASS = "aspect-[4/5]";

export function buildDisplayCopy(article, design) {
  const headline = trimDisplayText(
    design.headline || article.title || "Top story",
    72
  );
  const subheadline = trimDisplayText(
    design.subheadline || article.excerpt || "Swipe-ready summary generated automatically.",
    96
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
  const { article, design, settings, media, mediaMeta, width, height } = options;

  context.clearRect(0, 0, width, height);
  drawBackdrop(context, media, mediaMeta, width, height);

  const template = settings.template || "editorial";

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
