export const STYLE_OPTIONS = [
  { key: "professional", label: "Professional" },
  { key: "casual", label: "Casual" },
  { key: "narrative", label: "Narrative" },
  { key: "simple", label: "Simple" }
];

export const TEMPLATE_OPTIONS = [
  {
    value: "red-alert",
    label: "Red Alert",
    description: "Dark photo poster with a red headline strap and bottom question bar."
  },
  {
    value: "split-caption",
    label: "Split Caption",
    description: "White headline top, split image body, and solid color footer caption."
  },
  {
    value: "blue-black",
    label: "Blue Black",
    description: "Bold blue header, image middle, and black explainer panel."
  },
  {
    value: "brown-bar",
    label: "Brown Bar",
    description: "Full-image background with a compact brown headline block."
  },
  {
    value: "circle-montage",
    label: "Circle Montage",
    description: "Stacked news image treatment with circular inset accents."
  },
  {
    value: "history-date",
    label: "History Date",
    description: "Archive-style poster with a large date row and progress accent."
  },
  {
    value: "regional-bold",
    label: "Regional Bold",
    description: "Full-bleed political/news style with large orange and white text."
  },
  {
    value: "yellow-question",
    label: "Yellow Question",
    description: "Dark corporate-style poster with yellow question headline and footer."
  },
  {
    value: "legacy-poster",
    label: "Legacy Poster",
    description: "Dignified lower title block with two circular supporting frames."
  },
  {
    value: "targeted-card",
    label: "Targeted Card",
    description: "Dramatic background, floating quote card, and red takedown strap."
  },
  {
    value: "cyan-pattern",
    label: "Cyan Pattern",
    description: "High-impact split narrative with cyan headline and bottom question band."
  }
];

const TEMPLATE_IMAGE_SLOT_MAP = {
  "split-caption": {
    primary: "Left Image",
    second: "Right Image",
    circle: "Circle Image"
  },
  "blue-black": {
    primary: "Left Image",
    second: "Right Image"
  },
  "circle-montage": {
    primary: "Top Left Image",
    second: "Top Right Image",
    background: "Main Background",
    circle: "Circle Image"
  },
  "history-date": {
    circle: "Circle Image"
  },
  "yellow-question": {
    circle: "Circle Image"
  },
  "legacy-poster": {
    circleLeft: "Left Circle",
    circleRight: "Right Circle"
  },
  "cyan-pattern": {
    primary: "Left Image",
    second: "Right Image"
  }
};

export function getStyleLabel(styleKey) {
  return STYLE_OPTIONS.find((style) => style.key === styleKey)?.label || "Professional";
}

export function getTemplateLabel(templateValue) {
  return TEMPLATE_OPTIONS.find((template) => template.value === templateValue)?.label || "Red Alert";
}

export function getTemplateImageSlots(templateValue) {
  return TEMPLATE_IMAGE_SLOT_MAP[templateValue] || {};
}
