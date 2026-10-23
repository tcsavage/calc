import { getScale } from "../scales/library";
import { PRESETS } from "./presets";
import { FACES, SECTIONS } from "./types";

const placements = (rule: (typeof PRESETS)[number]) =>
  FACES.flatMap((face) => SECTIONS.flatMap((section) => rule.faces[face][section]));

test.each(PRESETS.map((preset) => [preset.name, preset] as const))(
  "%s uses only library scales",
  (_, preset) => {
    for (const placement of placements(preset)) expect(getScale(placement.scale)).toBeDefined();
  },
);

test("simplex presets have empty back stators", () => {
  for (const id of ["mannheim", "rietz", "darmstadt"]) {
    const back = PRESETS.find((preset) => preset.id === id)?.faces.back;
    expect(back?.upper).toEqual([]);
    expect(back?.lower).toEqual([]);
    expect(back?.slide.length).toBeGreaterThan(0);
  }
});

test("the duplex preset has scales on both stators of the back", () => {
  const back = PRESETS.find((preset) => preset.id === "loglog-duplex")?.faces.back;
  expect(back?.upper.length).toBeGreaterThan(0);
  expect(back?.lower.length).toBeGreaterThan(0);
});
