import { addScale, moveScale, removeScale, toggleInk } from "./edits";
import { getPreset } from "./presets";

const mannheim = getPreset("mannheim");
if (!mannheim) throw new Error("missing preset");
const slide = { face: "front", section: "slide" } as const;
const ids = (rule: typeof mannheim) => rule.faces.front.slide.map((p) => p.scale);

test("addScale appends to the section without touching the original", () => {
  const next = addScale(mannheim, { face: "front", section: "upper" }, "K");
  expect(next.faces.front.upper.map((p) => p.scale)).toEqual(["A", "K"]);
  expect(mannheim.faces.front.upper.map((p) => p.scale)).toEqual(["A"]);
});

test("removeScale removes by index and ignores indices outside the list", () => {
  expect(ids(removeScale(mannheim, slide, 1))).toEqual(["B", "C"]);
  expect(removeScale(mannheim, slide, 7)).toBe(mannheim);
});

test("moveScale swaps neighbours and is a no-op at the ends", () => {
  expect(ids(moveScale(mannheim, slide, 2, -1))).toEqual(["B", "C", "CI"]);
  expect(ids(moveScale(mannheim, slide, 0, 1))).toEqual(["CI", "B", "C"]);
  expect(moveScale(mannheim, slide, 0, -1)).toBe(mannheim);
  expect(moveScale(mannheim, slide, 2, 1)).toBe(mannheim);
});

test("toggleInk flips between the default ink and the other one", () => {
  const red = toggleInk(mannheim, slide, 2);
  expect(red.faces.front.slide[2]).toEqual({ scale: "C", ink: "red" });
  expect(toggleInk(red, slide, 2).faces.front.slide[2]).toEqual({ scale: "C" });
  expect(toggleInk(mannheim, slide, 1).faces.front.slide[1]).toEqual({ scale: "CI", ink: "black" });
});
