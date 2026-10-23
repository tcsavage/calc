import type { Ink } from "../scales/types";

export interface Palette {
  body: string;
  slide: string;
  ink: string;
  redInk: string;
  hairline: string;
  glass: string;
}

export interface Skin {
  light: Palette;
  dark: Palette;
}

export interface ScalePlacement {
  scale: string;
  /** Overrides the scale's default ink. */
  ink?: Ink;
}

/** The scale sections of each kind of rule, in reading order. */
export const SECTIONS_BY_KIND = {
  linear: ["upper", "slide", "lower"],
  circular: ["outer", "disc"],
  cylindrical: ["upper", "slide", "lower"],
} as const;

export type RuleKind = keyof typeof SECTIONS_BY_KIND;
export type SectionOf<K extends RuleKind> = (typeof SECTIONS_BY_KIND)[K][number];
export type Section = SectionOf<RuleKind>;
export type Face = "front" | "back";

export type FaceDefinition<K extends RuleKind = "linear"> = Record<
  SectionOf<K>,
  readonly ScalePlacement[]
>;

export interface RuleOf<K extends RuleKind> {
  id: string;
  name: string;
  kind: K;
  /** The preset or saved rule this one was derived from. */
  basedOn?: string;
  skin: Skin;
  faces: Record<Face, FaceDefinition<K>>;
}

export type LinearRule = RuleOf<"linear">;
export type CircularRule = RuleOf<"circular">;
/** A straight rule's face wound onto a helix of the given number of turns. */
export type CylindricalRule = RuleOf<"cylindrical"> & { turns: number };
export type RuleDefinition = LinearRule | CircularRule | CylindricalRule;

export interface RuleState {
  face: Face;
  /** Slide offset to the right in scale lengths, or disc rotation clockwise in turns. */
  slideOffset: number;
  /** Cursor hairline position, in scale lengths from the left index or turns from 12 o'clock. */
  cursor: number;
  /** Circular rules only: turn the drawing so the hairline points straight up. */
  rotateView?: boolean;
}

/** The section that moves with the slide or disc. */
export const MOVING_SECTION = {
  linear: "slide",
  circular: "disc",
  cylindrical: "slide",
} as const satisfies {
  [K in RuleKind]: SectionOf<K>;
};

export const SECTIONS: readonly SectionOf<"linear">[] = SECTIONS_BY_KIND.linear;
export const FACES: readonly Face[] = ["front", "back"];

export function sectionsOf(kind: RuleKind): readonly Section[] {
  return SECTIONS_BY_KIND[kind];
}

/** The scales in one section of a face, or none when the section does not belong to the rule's kind. */
export function placementsOf(
  rule: RuleDefinition,
  face: Face,
  section: Section,
): readonly ScalePlacement[] {
  return (rule.faces[face] as Partial<Record<Section, readonly ScalePlacement[]>>)[section] ?? [];
}

/** A rule together with where its slide and cursor are: what is saved, restored and shared. */
export interface Session<R extends RuleDefinition = RuleDefinition> {
  rule: R;
  state: RuleState;
}
