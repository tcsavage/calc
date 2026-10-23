import fc from "fast-check";
import { angleAt, sweep, turnDelta } from "./turning";

test("angles are turns clockwise from 12 o'clock around the centre", () => {
  expect(angleAt({ x: 0, y: -10 })).toBe(0);
  expect(angleAt({ x: 10, y: 0 })).toBeCloseTo(0.25);
  expect(angleAt({ x: 0, y: 10 })).toBeCloseTo(0.5);
  expect(angleAt({ x: -10, y: 0 })).toBeCloseTo(0.75);
});

test("a sweep across 12 o'clock is small in either direction", () => {
  expect(sweep(0.98, 0.02)).toBeCloseTo(0.04);
  expect(sweep(0.02, 0.98)).toBeCloseTo(-0.04);
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 1, noNaN: true }),
      fc.double({ min: 0, max: 1, noNaN: true }),
      (a, b) => {
        const s = sweep(a, b);
        expect(Math.abs(s)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(a + s - b - Math.round(a + s - b))).toBeLessThan(1e-9);
      },
    ),
  );
});

test("dragging the disc turns it with the finger in either view", () => {
  expect(turnDelta("disc", 0.1, false)).toEqual({ part: "slide", delta: 0.1 });
  expect(turnDelta("disc", 0.1, true)).toEqual({ part: "slide", delta: 0.1 });
});

test("dragging the cursor moves it with the finger, or turns the rule under it in rotate view", () => {
  expect(turnDelta("cursor", 0.1, false)).toEqual({ part: "cursor", delta: 0.1 });
  expect(turnDelta("cursor", 0.1, true)).toEqual({ part: "cursor", delta: -0.1 });
  expect(turnDelta("rule", 0.1, true)).toEqual({ part: "cursor", delta: -0.1 });
});
