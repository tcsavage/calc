import type { FaceDefinition, ScalePlacement, Section } from "../rule/types";

/** Length of every scale, in drawing units. */
export const SCALE_LENGTH = 1000;
/** Space at each end of the rule for scale names and formulas. */
export const MARGIN = 60;
export const RULE_WIDTH = SCALE_LENGTH + 2 * MARGIN;
export const BAND_HEIGHT = 24;
export const EMPTY_STATOR_HEIGHT = 12;

export type Anchor = "top" | "bottom";

export interface BandLayout {
  placement: ScalePlacement;
  index: number;
  y: number;
  height: number;
  /** Edge the ticks grow from: the edge nearest the stator and slide boundary. */
  anchor: Anchor;
}

export interface SectionLayout {
  section: Section;
  y: number;
  height: number;
  bands: BandLayout[];
}

export interface FaceLayout {
  upper: SectionLayout;
  slide: SectionLayout;
  lower: SectionLayout;
  height: number;
}

/** Maps normalised positions to x coordinates on a straight rule. */
export const LinearGeometry = {
  toX: (position: number) => MARGIN + position * SCALE_LENGTH,
};

function anchorFor(section: Section, index: number, count: number): Anchor {
  if (section === "upper") return "bottom";
  if (section === "lower") return "top";
  return index < Math.floor(count / 2) ? "top" : "bottom";
}

function layoutSection(
  section: Section,
  placements: readonly ScalePlacement[],
  y: number,
): SectionLayout {
  const bands = placements.map((placement, index) => ({
    placement,
    index,
    y: y + index * BAND_HEIGHT,
    height: BAND_HEIGHT,
    anchor: anchorFor(section, index, placements.length),
  }));
  const emptyHeight = section === "slide" ? BAND_HEIGHT : EMPTY_STATOR_HEIGHT;
  const height = bands.length > 0 ? bands.length * BAND_HEIGHT : emptyHeight;
  return { section, y, height, bands };
}

export function computeFaceLayout(face: FaceDefinition): FaceLayout {
  const upper = layoutSection("upper", face.upper, 0);
  const slide = layoutSection("slide", face.slide, upper.height);
  const lower = layoutSection("lower", face.lower, upper.height + slide.height);
  return { upper, slide, lower, height: upper.height + slide.height + lower.height };
}
