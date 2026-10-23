import fc from "fast-check";
import { CIRCULAR_PRESETS } from "../rule/circularPresets";
import type { CircularRule } from "../rule/types";
import {
  angleOf,
  canAddRing,
  computeCircularLayout,
  DISC_RADIUS,
  fitCircularRule,
  MAX_DISC_RINGS,
  MIN_RING_RADIUS,
  polar,
  positionOf,
} from "./circular";

const placements = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ scale: index % 2 ? "C" : "D" }));
const face = (outer: number, disc: number) => ({
  outer: placements(outer),
  disc: placements(disc),
});

test("positions map to angles clockwise from 12 o'clock and back", () => {
  expect(angleOf(0.25)).toBe(90);
  fc.assert(
    fc.property(fc.double({ min: 0, max: 0.999999, noNaN: true }), (position) => {
      expect(positionOf(angleOf(position))).toBeCloseTo(position, 9);
    }),
  );
  expect(positionOf(-90)).toBeCloseTo(0.75);
});

test("polar points put 0 degrees at the top and 90 degrees to the right", () => {
  expect(polar(100, 0).x).toBeCloseTo(0);
  expect(polar(100, 0).y).toBeCloseTo(-100);
  expect(polar(100, 90).x).toBeCloseTo(100);
  expect(polar(100, 90).y).toBeCloseTo(0);
});

test("rings stack outward from the disc edge and inward on the disc without overlapping", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 16 }),
      fc.integer({ min: 0, max: MAX_DISC_RINGS }),
      (outer, disc) => {
        const layout = computeCircularLayout(face(outer, disc));
        const rings = [...layout.rings].sort((a, b) => a.inner - b.inner);
        rings.slice(1).forEach((ring, index) => {
          expect(ring.inner).toBeGreaterThanOrEqual(rings[index]?.outer ?? 0);
        });
        for (const ring of layout.rings) {
          if (ring.section === "outer") expect(ring.inner).toBeGreaterThanOrEqual(DISC_RADIUS);
          else expect(ring.outer).toBeLessThanOrEqual(DISC_RADIUS);
          expect(ring.inner).toBeGreaterThanOrEqual(MIN_RING_RADIUS);
          expect(ring.outer).toBeLessThanOrEqual(layout.radius);
        }
      },
    ),
  );
});

test("the first scale of each section sits at the disc edge, with ticks growing from it", () => {
  const layout = computeCircularLayout(face(2, 2));
  const [d, c] = [layout.rings[0], layout.rings[2]];
  expect(d).toMatchObject({ section: "outer", inner: DISC_RADIUS, baseline: DISC_RADIUS });
  expect(c).toMatchObject({ section: "disc", outer: DISC_RADIUS, baseline: DISC_RADIUS });
});

test("the disc refuses rings once its innermost ring would be too small", () => {
  expect(canAddRing(face(0, MAX_DISC_RINGS - 1), "disc")).toBe(true);
  expect(canAddRing(face(0, MAX_DISC_RINGS), "disc")).toBe(false);
  expect(canAddRing(face(16, MAX_DISC_RINGS), "outer")).toBe(true);
});

test("fitting removes the innermost disc rings that do not fit", () => {
  const rule: CircularRule = {
    ...(CIRCULAR_PRESETS[0] as CircularRule),
    faces: { front: face(1, MAX_DISC_RINGS + 2), back: face(0, 1) },
  };
  const fitted = fitCircularRule(rule);
  expect(fitted.rule.faces.front.disc).toHaveLength(MAX_DISC_RINGS);
  expect(fitted.removed).toEqual(["C", "D"]);
  const again = fitCircularRule(fitted.rule);
  expect(again.rule).toBe(fitted.rule);
  expect(again.removed).toEqual([]);
});
