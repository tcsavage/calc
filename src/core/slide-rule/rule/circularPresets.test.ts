import { computeCircularLayout, fitCircularRule } from "../geometry/circular";
import { getScale } from "../scales/library";
import { CIRCULAR_PRESETS, DEFAULT_CIRCULAR_PRESET_ID } from "./circularPresets";
import { FACES, sectionsOf } from "./types";

test.each(CIRCULAR_PRESETS.map((preset) => [preset.name, preset] as const))(
  "%s is a circular rule of known scales that fits the disc",
  (_, preset) => {
    expect(preset.kind).toBe("circular");
    for (const face of FACES) {
      for (const section of sectionsOf("circular")) {
        for (const { scale } of preset.faces[face][section as "outer" | "disc"]) {
          expect(getScale(scale), scale).toBeDefined();
        }
      }
      expect(computeCircularLayout(preset.faces[face]).rings.length).toBeGreaterThanOrEqual(0);
    }
    expect(fitCircularRule(preset).removed).toEqual([]);
  },
);

test("the default is the Basic rule with D and C meeting at the disc edge", () => {
  const basic = CIRCULAR_PRESETS.find((preset) => preset.id === DEFAULT_CIRCULAR_PRESET_ID);
  expect(basic?.name).toBe("Basic");
  expect(basic?.faces.front.outer[0]?.scale).toBe("D");
  expect(basic?.faces.front.disc[0]?.scale).toBe("C");
  expect(CIRCULAR_PRESETS.map((preset) => preset.name)).toEqual([
    "Basic",
    "Scientific duplex",
    "Log-log duplex",
  ]);
});
