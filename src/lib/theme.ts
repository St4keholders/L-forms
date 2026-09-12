import clsx from "clsx";
import type { FormTheme } from "./types";

export const CARD_STYLE_CLASS: Record<string, string> = {
  "liquid-glass": "card-style-liquid-glass",
  "apple-clean": "card-style-apple-clean",
  metallic: "card-style-metallic",
  "dark-titanium": "card-style-metallic",
  embossed: "card-style-embossed",
  bordered: "card-style-bordered",
  bento: "card-style-apple-clean",
  flat: "card-style-apple-clean",
};

export const RADIUS_CLASS: Record<string, string> = {
  sm: "radius-sm",
  md: "radius-md",
  lg: "radius-lg",
  full: "radius-full",
};

export const FONT_CLASS: Record<string, string> = {
  "sf-pro": "font-theme-sf-pro",
  inter: "font-theme-inter",
  "space-grotesk": "font-theme-grotesk",
  grotesk: "font-theme-grotesk",
  serif: "font-theme-serif",
  mono: "font-theme-mono",
  lora: "font-theme-serif",
};

export const PATTERN_CLASS: Record<string, string> = {
  none: "",
  mesh: "bg-pattern-mesh",
  "mesh-gradient": "bg-pattern-mesh",
  "soft-glow": "bg-pattern-soft-glow",
  dots: "bg-pattern-dots",
  "subtle-dots": "bg-pattern-dots",
  "grid-lines": "bg-pattern-grid-lines",
  "aurora-orbs": "",
  "floating-shapes": "",
};

export function getThemeCardClass(theme?: FormTheme | null): string {
  if (!theme) return "card-style-apple-clean radius-lg";
  const cardStyle = theme.cardStyle ?? "apple-clean";
  const borderRadius = theme.borderRadius ?? "lg";
  return clsx(
    CARD_STYLE_CLASS[cardStyle] || "card-style-apple-clean",
    RADIUS_CLASS[borderRadius] || "radius-lg",
    theme.cardGlow && "card-glow",
  );
}
