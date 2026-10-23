export type Ink = "black" | "red";

/** A value range graduated with a chain of tick steps, coarsest first; each step divides the previous one. */
export interface GraduationSegment {
  from: number;
  to: number;
  steps: readonly number[];
  largeLabelStep?: number;
  smallLabelStep?: number;
}

/** An interval of a scale's values with the step between its longest, labelled ticks. */
export interface Cut {
  from: number;
  to: number;
  /** Step between the longest, labelled ticks. */
  major: number;
  /** Overrides the large label step chosen from spacing. */
  label?: number;
}

export interface ScaleMark {
  value: number;
  label: string;
}

export interface ScaleSpec {
  id: string;
  name: string;
  /** Short formula shown at the right end of the scale, for example "x²". */
  formula: string;
  description: string;
  ink: Ink;
  /** Smallest and largest value on the scale. */
  domain: readonly [number, number];
  /** Maps a value to a normalised position, where 0 is the left index and 1 the right index. */
  toPosition(value: number): number;
  fromPosition(position: number): number;
  /** Maps a value to what is printed and read out, for folded scales that wrap a decade. */
  displayValue?(value: number): number;
  /** Maps a value to its printed label when that differs from the read value, for example K's repeated 1 to 10. */
  labelValue?(value: number): number;
  /** The cut points the segments were graduated from, kept to re-graduate for other lengths. */
  cuts: readonly Cut[];
  /** Graduation for a straight scale of the standard length. */
  segments: readonly GraduationSegment[];
  marks?: readonly ScaleMark[];
}

export interface Tick {
  position: number;
  value: number;
  /** Relative tick length, 1 for the longest. */
  size: number;
  label?: { text: string; size: "large" | "small" | "mark" };
}
