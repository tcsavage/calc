import { getPreset } from "../../../core/slide-rule/rule/presets";
import { skinStyle } from "./skinStyle";

test("maps both palettes to custom properties", () => {
  const skin = getPreset("rietz")?.skin;
  if (!skin) throw new Error("missing preset");
  const style = skinStyle(skin) as Record<string, string>;
  expect(style["--skin-light-body"]).toBe(skin.light.body);
  expect(style["--skin-dark-redInk"]).toBe(skin.dark.redInk);
});
