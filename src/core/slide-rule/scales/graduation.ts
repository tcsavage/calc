import type { Cut, GraduationSegment } from "./types";

export type { Cut };

export interface GraduationOptions {
  /** Smallest gap between adjacent ticks, in normalised units. */
  minTick?: number;
  minLargeLabel?: number;
  minSmallLabel?: number;
}

/** Spacing limits for a scale of the standard length. */
export const DEFAULT_SPACING = { minTick: 0.002, minLargeLabel: 0.012, minSmallLabel: 0.02 };

/** True when a divided by b is a whole number. Compares a ratio, so it is safe for decimal steps. */
export function divides(b: number, a: number): boolean {
  const ratio = a / b;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

/** Nice steps (1, 2 or 5 times a power of ten) strictly smaller than major that divide it, largest first. */
function candidateSteps(major: number): number[] {
  const steps: number[] = [];
  for (
    let exponent = Math.floor(Math.log10(major));
    exponent >= Math.floor(Math.log10(major)) - 6;
    exponent--
  ) {
    for (const mantissa of [5, 2, 1]) {
      const step = Number((mantissa * 10 ** exponent).toPrecision(12));
      if (step < major && divides(step, major)) steps.push(step);
    }
  }
  return steps;
}

/** The smaller of the gaps one step in from each end of the interval. */
function spacing(toPosition: (value: number) => number, from: number, to: number, step: number) {
  return Math.min(
    Math.abs(toPosition(from + step) - toPosition(from)),
    Math.abs(toPosition(to) - toPosition(to - step)),
  );
}

function stepChain(major: number, finest: number, candidates: number[]): number[] {
  const chain = [major];
  let current = major;
  while (current > finest) {
    const next = candidates.find(
      (step) => step < current && divides(step, current) && divides(finest, step),
    );
    if (next === undefined) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

/** Turns cut points into graduation segments, choosing tick steps from the minimum physical spacing. */
export function graduate(
  toPosition: (value: number) => number,
  cuts: readonly Cut[],
  options: GraduationOptions = {},
): GraduationSegment[] {
  const { minTick, minLargeLabel, minSmallLabel } = { ...DEFAULT_SPACING, ...options };
  return cuts.map(({ from, to, major, label }) => {
    const candidates = candidateSteps(major);
    const fine = candidates.filter((step) => spacing(toPosition, from, to, step) >= minTick);
    const finest = fine.at(-1) ?? major;
    const steps = stepChain(major, finest, candidates);
    const segment: GraduationSegment = { from, to, steps };
    if (label !== undefined) segment.largeLabelStep = label;
    else if (spacing(toPosition, from, to, major) >= minLargeLabel) segment.largeLabelStep = major;
    const tenth = major / 10;
    if (
      steps.some((step) => divides(step, tenth) && divides(tenth, step)) &&
      spacing(toPosition, from, to, tenth) >= minSmallLabel
    ) {
      segment.smallLabelStep = tenth;
    }
    return segment;
  });
}
