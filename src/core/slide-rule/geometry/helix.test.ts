import fc from "fast-check";
import { HELIX_RADIUS, helixCoordinate, project, rowY, turnAngle, visibleSpan } from "./helix";

test("one turn is one standard scale length", () => {
  expect(2 * Math.PI * HELIX_RADIUS).toBeCloseTo(1000);
  expect(helixCoordinate(0.5, 0.1, 10)).toBeCloseTo(6);
});

test("the cursor's own point is at the front, a quarter turn ahead at the right edge", () => {
  expect(project(3.2, 3.2)).toMatchObject({ visible: true, x: 0 });
  expect(project(3.45, 3.2).x).toBeCloseTo(HELIX_RADIUS);
  expect(project(3.0, 3.2).x).toBeCloseTo(-HELIX_RADIUS * Math.sin(0.4 * Math.PI));
  expect(project(3.5, 3.2).visible).toBe(false);
  expect(project(2.8, 3.2).visible).toBe(false);
});

test("a whole turn ahead has the same x and sits one pitch lower", () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 20, noNaN: true }),
      fc.double({ min: 0, max: 20, noNaN: true }),
      fc.integer({ min: -5, max: 5 }),
      (s, cursor, turns) => {
        const here = project(s, cursor);
        const there = project(s + turns, cursor);
        expect(there.visible).toBe(here.visible);
        expect(there.x).toBeCloseTo(here.x, 6);
        expect(rowY(s + turns, 100, 7) - rowY(s, 100, 7)).toBeCloseTo(turns * 100, 6);
      },
    ),
  );
});

test("the span on screen covers every turn with a row in the window", () => {
  expect(visibleSpan({ top: 250, bottom: 650 }, 100)).toEqual({ from: 1.5, to: 7.5 });
});

test("drag angles come from the point's position across the cylinder, clamped near the edges", () => {
  expect(turnAngle(0)).toBe(0);
  expect(turnAngle(HELIX_RADIUS / 2)).toBeCloseTo(1 / 12);
  expect(turnAngle(HELIX_RADIUS * 2)).toBeCloseTo(turnAngle(HELIX_RADIUS * 0.98));
  expect(turnAngle(-HELIX_RADIUS)).toBeCloseTo(-turnAngle(HELIX_RADIUS));
});
