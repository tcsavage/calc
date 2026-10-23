import type { CSSProperties } from "react";
import type { Palette, Skin } from "../../../core/slide-rule/rule/types";

const FIELDS: (keyof Palette)[] = ["body", "slide", "ink", "redInk", "hairline", "glass"];

/** CSS custom properties for both palettes; the stylesheet picks one from the theme. */
export function skinStyle(skin: Skin): CSSProperties {
  const style: Record<string, string> = {};
  for (const field of FIELDS) {
    style[`--skin-light-${field}`] = skin.light[field];
    style[`--skin-dark-${field}`] = skin.dark[field];
  }
  return style as CSSProperties;
}
