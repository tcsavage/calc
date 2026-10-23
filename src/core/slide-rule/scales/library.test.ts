import fc from "fast-check";
import { getScale, requireScale, SCALES } from "./library";
import { generateTicks } from "./ticks";

const { log10, E, PI } = Math;
const position = (id: string, value: number) => requireScale(id).toPosition(value);

test("the library holds exactly the design scales", () => {
  expect(SCALES.map((scale) => scale.id).sort()).toEqual(
    [
      "C",
      "D",
      "CI",
      "DI",
      "CF",
      "DF",
      "CIF",
      "A",
      "B",
      "K",
      "R1",
      "R2",
      "P",
      "S",
      "T",
      "ST",
      "L",
      "LL1",
      "LL2",
      "LL3",
      "LL01",
      "LL02",
      "LL03",
    ].sort(),
  );
});

test.each([
  ["C at 2", position("C", 2), log10(2)],
  ["CI at 2", position("CI", 2), 1 - log10(2)],
  ["A at 4 is C at 2", position("A", 4), log10(2)],
  ["K at 8 is C at 2", position("K", 8), log10(2)],
  ["S at 30 is C at 5", position("S", 30), log10(5)],
  ["T at 45 is the right index", position("T", 45), 1],
  ["ST at 1 degree is C at 1.745", position("ST", 1), log10((PI / 180) * 100)],
  ["LL3 at e cubed is C at 3", position("LL3", E ** 3), log10(3)],
  ["LL2 at e to the 0.3 is C at 3", position("LL2", E ** 0.3), log10(3)],
  ["LL02 at e to the minus 0.3 is C at 3", position("LL02", E ** -0.3), log10(3)],
  ["CF at π is the left index", position("CF", PI), 0],
  ["CIF at 10/π is the left index", position("CIF", 10 / PI), 0],
  ["R2 at 5", position("R2", 5), 2 * log10(5) - 1],
  ["P at 0.6 is D at 8", position("P", 0.6), log10(8)],
  ["L at 0.30103 is C at 2", position("L", log10(2)), log10(2)],
])("%s", (_, actual, expected) => {
  expect(actual).toBeCloseTo(expected, 9);
});

test.each(SCALES.map((scale) => [scale.id, scale] as const))(
  "%s round trips between value and position",
  (_, scale) => {
    const [min, max] = scale.domain;
    // Compared in position space: what matters is that a read value lands where it was read from.
    fc.assert(
      fc.property(fc.double({ min, max, noNaN: true }), (value) => {
        const back = scale.fromPosition(scale.toPosition(value));
        return Math.abs(scale.toPosition(back) - scale.toPosition(value)) <= 1e-9;
      }),
    );
  },
);

test.each(SCALES.map((scale) => [scale.id, scale] as const))(
  "%s ticks are finite, inside the scale and increasing",
  (_, scale) => {
    const ticks = generateTicks(scale);
    expect(ticks.length).toBeGreaterThanOrEqual(20);
    ticks.forEach((tick, index) => {
      expect(tick.position).toBeGreaterThanOrEqual(-1e-9);
      expect(tick.position).toBeLessThanOrEqual(1 + 1e-9);
      const previous = ticks[index - 1];
      if (previous && tick.label?.size !== "mark" && previous.label?.size !== "mark") {
        expect(tick.position).not.toBeCloseTo(previous.position, 9);
      }
    });
  },
);

test("each scale spans the full length", () => {
  for (const scale of SCALES) {
    const ends = scale.domain.map((value) => scale.toPosition(value)).sort((a, b) => a - b);
    expect(ends[0]).toBeCloseTo(0, 6);
    expect(ends[1]).toBeCloseTo(1, 6);
  }
});

test("folded scales display the wrapped decade", () => {
  const cf = requireScale("CF");
  expect(cf.displayValue?.(20)).toBe(2);
  expect(requireScale("CIF").displayValue?.(0.5)).toBe(5);
  expect(getScale("nope")).toBeUndefined();
});
