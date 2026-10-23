import { addScale } from "../../../core/slide-rule/rule/edits";
import { DEFAULT_PRESET_ID, getPreset, PRESETS } from "../../../core/slide-rule/rule/presets";
import { createSlideRuleStore, defaultSession } from "./store";

const config = { kind: "linear" as const, presets: PRESETS, defaultPresetId: DEFAULT_PRESET_ID };
const store = () => createSlideRuleStore(config, defaultSession(config));
const mannheim = getPreset("mannheim");
if (!mannheim) throw new Error("missing preset");

test("starts on the front of the Rietz rule at the left index", () => {
  const { rule, state } = store().getState();
  expect(rule.id).toBe("rietz");
  expect(state).toEqual({ face: "front", slideOffset: 0, cursor: 0 });
});

test("moving the slide and cursor clamps at the limits", () => {
  const s = store();
  s.getState().moveSlideBy(0.4);
  s.getState().moveSlideBy(0.8);
  s.getState().moveCursorBy(-1);
  expect(s.getState().state).toMatchObject({ slideOffset: 1, cursor: -0.05 });
});

test("flipping keeps the slide offset and cursor", () => {
  const s = store();
  s.getState().setPosition({ slideOffset: 0.3, cursor: 0.6 });
  s.getState().flip();
  expect(s.getState().state).toEqual({ face: "back", slideOffset: 0.3, cursor: 0.6 });
});

test("reset returns the slide and cursor to the left index", () => {
  const s = store();
  s.getState().setPosition({ slideOffset: 0.3, cursor: 0.6 });
  s.getState().resetPosition();
  expect(s.getState().state).toMatchObject({ slideOffset: 0, cursor: 0 });
});

test("editing a preset forks a modified copy and leaves the preset alone", () => {
  const s = store();
  s.getState().selectRule(mannheim);
  const ref = { face: "front", section: "upper" } as const;
  s.getState().editRule((rule) => addScale(rule, ref, "K"));
  const first = s.getState().rule;
  expect(first.name).toBe("Mannheim (modified)");
  expect(first.basedOn).toBe("mannheim");
  expect(first.id).not.toBe("mannheim");
  s.getState().editRule((rule) => addScale(rule, ref, "L"));
  expect(s.getState().rule.id).toBe(first.id);
  expect(s.getState().rule.name).toBe("Mannheim (modified)");
  expect(getPreset("mannheim")?.faces.front.upper).toHaveLength(1);
});

test("save as appends, and saving under an existing name replaces that rule", () => {
  const s = store();
  s.getState().saveAs("Mine");
  const [saved] = s.getState().savedRules;
  expect(saved?.name).toBe("Mine");
  expect(s.getState().rule.id).toBe(saved?.id);
  s.getState().editRule((rule) => addScale(rule, { face: "back", section: "upper" }, "D"));
  s.getState().saveAs("Mine");
  expect(s.getState().savedRules).toHaveLength(1);
  expect(s.getState().savedRules[0]?.faces.back.upper).toEqual([{ scale: "D" }]);
});

test("saved rules can be renamed and deleted", () => {
  const s = store();
  s.getState().saveAs("Mine");
  const id = s.getState().rule.id;
  s.getState().renameSaved(id, "Ours");
  expect(s.getState().savedRules[0]?.name).toBe("Ours");
  expect(s.getState().rule.name).toBe("Ours");
  s.getState().deleteSaved(id);
  expect(s.getState().savedRules).toEqual([]);
  expect(s.getState().rule.id).not.toBe(id);
});

test("notices can be added and dismissed", () => {
  const s = store();
  s.getState().addNotice("Hello");
  const [notice] = s.getState().notices;
  expect(notice?.message).toBe("Hello");
  s.getState().dismissNotice(notice?.id ?? "");
  expect(s.getState().notices).toEqual([]);
});

test("the loupe pin toggles", () => {
  const s = store();
  s.getState().toggleLoupePinned();
  expect(s.getState().loupePinned).toBe(true);
});
