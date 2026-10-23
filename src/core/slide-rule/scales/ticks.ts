import { formatLabel } from "./format";
import { DEFAULT_SPACING, divides, graduate } from "./graduation";
import type { GraduationSegment, ScaleSpec, Tick } from "./types";

const EPSILON = 1e-9;
const cache = new WeakMap<ScaleSpec, Map<number, readonly Tick[]>>();

/** Relative tick length by level: the major step is longest and the finest step shortest. */
function tickSize(level: number, levels: number): number {
  if (level === 0) return 1;
  if (levels === 2) return 0.45;
  return 0.72 - ((level - 1) * (0.72 - 0.36)) / (levels - 2);
}

function segmentTicks(spec: ScaleSpec, segment: GraduationSegment): Tick[] {
  const { steps, largeLabelStep, smallLabelStep } = segment;
  const finest = steps.at(-1) as number;
  const display = spec.labelValue ?? spec.displayValue ?? ((value: number) => value);
  const ticks: Tick[] = [];
  const first = Math.ceil(segment.from / finest - EPSILON);
  const last = Math.floor(segment.to / finest + EPSILON);
  for (let index = first; index <= last; index++) {
    const value = Number((index * finest).toPrecision(12));
    const position = spec.toPosition(value);
    if (!Number.isFinite(position) || position < -EPSILON || position > 1 + EPSILON) {
      if (import.meta.env?.DEV) console.warn(`Scale ${spec.id}: skipped tick at ${value}`);
      continue;
    }
    const level = steps.findIndex((step) => divides(step, value));
    const tick: Tick = { position, value, size: tickSize(level, steps.length) };
    if (largeLabelStep !== undefined && divides(largeLabelStep, value)) {
      tick.label = { text: formatLabel(display(value)), size: "large" };
    } else if (smallLabelStep !== undefined && divides(smallLabelStep, value)) {
      tick.label = { text: String(Math.round(value / smallLabelStep) % 10), size: "small" };
    }
    ticks.push(tick);
  }
  return ticks;
}

/** Keeps one tick per position, preferring the longer tick and any label. */
function mergeCoincident(ticks: Tick[]): Tick[] {
  const merged: Tick[] = [];
  for (const tick of ticks) {
    const previous = merged.at(-1);
    if (previous && Math.abs(previous.position - tick.position) < EPSILON) {
      const winner = tick.size > previous.size ? tick : previous;
      merged[merged.length - 1] = {
        ...winner,
        label: winner.label ?? tick.label ?? previous.label,
      };
    } else {
      merged.push(tick);
    }
  }
  return merged;
}

/** Graduation for a scale drawn lengthFactor times the standard length, with the same physical spacing. */
function segmentsFor(spec: ScaleSpec, lengthFactor: number): readonly GraduationSegment[] {
  if (lengthFactor === 1) return spec.segments;
  return graduate(spec.toPosition, spec.cuts, {
    minTick: DEFAULT_SPACING.minTick / lengthFactor,
    minLargeLabel: DEFAULT_SPACING.minLargeLabel / lengthFactor,
    minSmallLabel: DEFAULT_SPACING.minSmallLabel / lengthFactor,
  });
}

/**
 * All ticks of a scale in position order. lengthFactor is the drawn length relative to the standard
 * scale length (a short inner ring of a circular rule is below 1). Memoised per scale and factor,
 * rounded to hundredths.
 */
export function generateTicks(spec: ScaleSpec, lengthFactor = 1): readonly Tick[] {
  const factor = Math.round(lengthFactor * 100) / 100;
  let byFactor = cache.get(spec);
  if (!byFactor) {
    byFactor = new Map();
    cache.set(spec, byFactor);
  }
  const cached = byFactor.get(factor);
  if (cached) return cached;
  const ticks = mergeCoincident(
    segmentsFor(spec, factor)
      .flatMap((segment) => segmentTicks(spec, segment))
      .sort((a, b) => a.position - b.position),
  );
  const marks: Tick[] = (spec.marks ?? []).map(({ value, label }) => ({
    position: spec.toPosition(value),
    value,
    size: 0.6,
    label: { text: label, size: "mark" },
  }));
  const result = [...ticks, ...marks].sort((a, b) => a.position - b.position);
  byFactor.set(factor, result);
  return result;
}
