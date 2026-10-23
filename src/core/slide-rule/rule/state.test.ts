import { clampCursor, clampSlide, clampState } from "./state";

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
