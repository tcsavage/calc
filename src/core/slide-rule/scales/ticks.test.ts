import fc from "fast-check";
import { graduate } from "./graduation";
import { requireScale, SCALES } from "./library";
import { generateTicks } from "./ticks";
import type { ScaleSpec } from "./types";

const log = Math.log10;

const CUTS = [
  { from: 1, to: 2, major: 1 },
  { from: 2, to: 4, major: 1 },
  { from: 4, to: 10, major: 1 },
];

function spec(overrides: Partial<ScaleSpec> = {}): ScaleSpec {
  return {
    id: "test",
    name: "T",
    formula: "x",
    description: "test scale",
    ink: "black",
    domain: [1, 10],
    toPosition: log,
    fromPosition: (p) => 10 ** p,
    cuts: CUTS,
    segments: graduate(log, CUTS),
    ...overrides,
  };
}

test("major ticks fall exactly on the integers and carry labels", () => {
  const majors = generateTicks(spec()).filter((tick) => tick.size === 1);
  expect(majors.map((tick) => tick.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(majors.map((tick) => tick.label?.text)).toEqual([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
  ]);
});

test("ticks are finite, inside the scale and strictly increasing", () => {
  const ticks = generateTicks(spec());
  ticks.forEach((tick, index) => {
    expect(Number.isFinite(tick.position)).toBe(true);
    expect(tick.position).toBeGreaterThanOrEqual(0);
    expect(tick.position).toBeLessThanOrEqual(1);
    if (index > 0)
      expect(tick.position).toBeGreaterThan((ticks[index - 1] as { position: number }).position);
  });
});

test("tenths between 1 and 2 get single digit labels", () => {
  const labelled = generateTicks(spec()).filter((tick) => tick.label?.size === "small");
  expect(labelled.slice(0, 3).map((tick) => [tick.value, tick.label?.text])).toEqual([
    [1.1, "1"],
    [1.2, "2"],
    [1.3, "3"],
  ]);
});

test("values whose position is not a number are skipped rather than thrown", () => {
  const ticks = generateTicks(spec({ toPosition: (x) => (x > 5 ? Number.NaN : log(x)) }));
  expect(ticks.at(-1)?.value).toBe(5);
});

test("marks are added with their own label", () => {
  const ticks = generateTicks(spec({ marks: [{ value: Math.PI, label: "π" }] }));
  expect(ticks.find((tick) => tick.label?.text === "π")?.position).toBeCloseTo(log(Math.PI), 12);
});

describe("graduating for a ring's length", () => {
  const c = requireScale("C");
  const gaps = (ticks: readonly { position: number; label?: unknown }[]) =>
    ticks.slice(1).map((tick, index) => tick.position - (ticks[index]?.position ?? 0));

  test("a length factor of 1 gives the ticks of a straight rule", () => {
    expect(generateTicks(c, 1)).toBe(generateTicks(c));
    expect(generateTicks(c, 1).length).toBe(generateTicks(c).length);
  });

  test("ticks are never closer than the minimum spacing in the ring's own length", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.4, max: 3, noNaN: true }), (factor) => {
        const ticks = generateTicks(c, factor).filter((tick) => tick.label?.size !== "mark");
        const smallest = Math.min(...gaps(ticks));
        expect((smallest * Math.round(factor * 100)) / 100).toBeGreaterThanOrEqual(0.002 - 1e-9);
      }),
      { numRuns: 25 },
    );
  });

  test("longer rings get at least as many ticks on every scale", () => {
    for (const scale of SCALES) {
      expect(generateTicks(scale, 2).length).toBeGreaterThanOrEqual(generateTicks(scale).length);
      expect(generateTicks(scale, 0.5).length).toBeLessThanOrEqual(generateTicks(scale).length);
    }
  });
});
