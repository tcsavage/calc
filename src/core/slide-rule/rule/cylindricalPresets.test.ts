import { getScale } from "../scales/library";
import { generateTicks } from "../scales/ticks";
import { CYLINDRICAL_PRESETS, DEFAULT_CYLINDRICAL_PRESET_ID } from "./cylindricalPresets";
import { sectionsOf } from "./types";

test.each(CYLINDRICAL_PRESETS.map((preset) => [preset.name, preset] as const))(
  "%s is a one faced cylindrical rule of known scales",
  (_, preset) => {
    expect(preset.kind).toBe("cylindrical");
    expect(preset.turns).toBeGreaterThanOrEqual(2);
    expect(preset.turns).toBeLessThanOrEqual(40);
    for (const section of sectionsOf("cylindrical")) {
      const key = section as "upper" | "slide" | "lower";
      expect(preset.faces.back[key]).toEqual([]);
      for (const { scale } of preset.faces.front[key]) {
        const spec = getScale(scale);
        expect(spec, scale).toBeDefined();
        if (spec) expect(generateTicks(spec, preset.turns).length).toBeLessThan(12000);
      }
    }
  },
);

test("the presets run from short to long, starting on Short helix", () => {
  expect(DEFAULT_CYLINDRICAL_PRESET_ID).toBe("cylindrical-short");
  expect(CYLINDRICAL_PRESETS.map((p) => [p.name, p.turns])).toEqual([
    ["Short helix", 5],
    ["Scientific helix", 10],
    ["Long helix", 25],
  ]);
});
