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

export type Section = "upper" | "slide" | "lower";
export type Face = "front" | "back";

export type FaceDefinition = Record<Section, readonly ScalePlacement[]>;

export interface RuleDefinition {
  id: string;
  name: string;
  kind: "linear";
  /** The preset or saved rule this one was derived from. */
  basedOn?: string;
  skin: Skin;
  faces: Record<Face, FaceDefinition>;
}

export interface RuleState {
  face: Face;
  /** Slide offset to the right, in scale lengths. */
  slideOffset: number;
  /** Cursor hairline position, in scale lengths from the left index. */
  cursor: number;
}

export const SECTIONS: readonly Section[] = ["upper", "slide", "lower"];
export const FACES: readonly Face[] = ["front", "back"];

/** A rule together with where its slide and cursor are: what is saved, restored and shared. */
export interface Session {
  rule: RuleDefinition;
  state: RuleState;
}
