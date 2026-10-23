import fc from "fast-check";
import {
  clampCursor,
  clampSlide,
  clampState,
  defaultRuleState,
  moveBy,
  normaliseState,
  wrapTurn,
} from "./state";

test("the slide can be pulled out by up to one scale length either way", () => {
  expect(clampSlide(1.5)).toBe(1);
  expect(clampSlide(-1.5)).toBe(-1);
  expect(clampSlide(0.3)).toBe(0.3);
});

test("the cursor can overrun the indices slightly", () => {
  expect(clampCursor(2)).toBe(1.05);
  expect(clampCursor(-2)).toBe(-0.05);
});

test("clampState clamps both positions and keeps the face", () => {
  expect(clampState({ face: "back", slideOffset: 9, cursor: -9 })).toEqual({
    face: "back",
    slideOffset: 1,
    cursor: -0.05,
  });
});

test("circular positions wrap into one turn", () => {
  fc.assert(
    fc.property(fc.double({ min: -100, max: 100, noNaN: true }), (turns) => {
      const wrapped = wrapTurn(turns);
      expect(wrapped).toBeGreaterThanOrEqual(0);
      expect(wrapped).toBeLessThan(1);
      expect(Math.abs(turns - wrapped - Math.round(turns - wrapped))).toBeLessThan(1e-9);
    }),
  );
});

test("normalising wraps a circular rule and clamps a straight one", () => {
  const state = { face: "front" as const, slideOffset: 1.25, cursor: -0.25 };
  expect(normaliseState("circular", state)).toMatchObject({ slideOffset: 0.25, cursor: 0.75 });
  expect(normaliseState("linear", state)).toMatchObject({ slideOffset: 1, cursor: -0.05 });
});

test("moving a circular disc past a full turn wraps", () => {
  const state = defaultRuleState("circular");
  expect(state.rotateView).toBe(true);
  expect(moveBy("circular", state, "slide", -0.1).slideOffset).toBeCloseTo(0.9);
  expect(moveBy("linear", defaultRuleState(), "cursor", 2).cursor).toBe(1.05);
});
