export const STYLE_OPTIONS = [
  { key: "professional", label: "Professional" },
  { key: "casual", label: "Casual" },
  { key: "narrative", label: "Narrative" },
  { key: "simple", label: "Simple" }
];

export const TEMPLATE_OPTIONS = [
  {
    value: "editorial",
    label: "Editorial Split",
    description: "Strong image on top with a grounded newsroom text panel."
  },
  {
    value: "spotlight",
    label: "Spotlight Card",
    description: "Full-bleed visual with a bold glass card for the story angle."
  },
  {
    value: "minimal",
    label: "Minimal Overlay",
    description: "Immersive photo treatment with a clean lower-third headline."
  },
  {
    value: "bulletin",
    label: "Bulletin Frame",
    description: "Structured bulletin layout for sharper, update-driven posts."
  },
  {
    value: "pulse",
    label: "Pulse Angle",
    description: "A more dynamic, high-contrast design for big trending stories."
  }
];

export function getStyleLabel(styleKey) {
  return STYLE_OPTIONS.find((style) => style.key === styleKey)?.label || "Professional";
}

export function getTemplateLabel(templateValue) {
  return TEMPLATE_OPTIONS.find((template) => template.value === templateValue)?.label || "Editorial Split";
}
