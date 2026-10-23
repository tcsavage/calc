import { getPreset } from "../rule/presets";
import {
  BAND_HEIGHT,
  computeFaceLayout,
  EMPTY_STATOR_HEIGHT,
  LinearGeometry,
  MARGIN,
} from "./layout";

const rietz = getPreset("rietz");
if (!rietz) throw new Error("missing preset");

test("bands anchor towards the boundary between stator and slide", () => {
  const layout = computeFaceLayout(rietz.faces.front);
  expect(layout.upper.bands.map((band) => band.anchor)).toEqual(["bottom", "bottom"]);
  expect(layout.slide.bands.map((band) => band.anchor)).toEqual(["top", "bottom", "bottom"]);
  expect(layout.lower.bands.map((band) => band.anchor)).toEqual(["top", "top"]);
});

test("sections stack without gaps", () => {
  const layout = computeFaceLayout(rietz.faces.front);
  expect(layout.slide.y).toBe(2 * BAND_HEIGHT);
  expect(layout.lower.y).toBe(5 * BAND_HEIGHT);
  expect(layout.height).toBe(7 * BAND_HEIGHT);
});

test("empty stators keep a thin body", () => {
  const layout = computeFaceLayout(rietz.faces.back);
  expect(layout.upper.height).toBe(EMPTY_STATOR_HEIGHT);
  expect(layout.lower.height).toBe(EMPTY_STATOR_HEIGHT);
});

test("positions map onto the drawing between the margins", () => {
  expect(LinearGeometry.toX(0)).toBe(MARGIN);
  expect(LinearGeometry.toX(0.5)).toBe(MARGIN + 500);
});
