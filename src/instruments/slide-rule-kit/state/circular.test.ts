import { encodeSharePayload } from "../../../core/slide-rule/codec/base64url";
import { encodeSavedRules, encodeSession } from "../../../core/slide-rule/codec/codec";
import { fitCircularRule, MAX_DISC_RINGS } from "../../../core/slide-rule/geometry/circular";
import {
  CIRCULAR_PRESETS,
  DEFAULT_CIRCULAR_PRESET_ID,
} from "../../../core/slide-rule/rule/circularPresets";
import { defaultRule } from "../../../core/slide-rule/rule/presets";
import type { CircularRule } from "../../../core/slide-rule/rule/types";
import type { SlideRuleConfig } from "./config";
import { memoryPort } from "./memoryPort";
import { MESSAGES, openSharedLink, resolveStartup } from "./startup";
import { createSlideRuleStore, defaultSession } from "./store";

const config: SlideRuleConfig<CircularRule> = {
  kind: "circular",
  presets: CIRCULAR_PRESETS,
  defaultPresetId: DEFAULT_CIRCULAR_PRESET_ID,
  fitRule: fitCircularRule,
};
const basic = CIRCULAR_PRESETS[0] as CircularRule;
const state = { face: "front" as const, slideOffset: 0.3, cursor: 0.7 };
const messages = (result: { notices?: readonly { message: string }[] }) =>
  result.notices?.map((n) => n.message);
const store = () => createSlideRuleStore(config, defaultSession(config));

test("a circular rule starts on Basic in rotate view", () => {
  const { rule, state } = store().getState();
  expect(rule.id).toBe("circular-basic");
  expect(state).toEqual({ face: "front", slideOffset: 0, cursor: 0, rotateView: true });
});

test("the disc and cursor wrap round instead of stopping", () => {
  const s = store();
  s.getState().moveSlideBy(-0.25);
  s.getState().moveCursorBy(1.5);
  expect(s.getState().state).toMatchObject({ slideOffset: 0.75, cursor: 0.5 });
  s.getState().setPosition({ cursor: -0.1 });
  expect(s.getState().state.cursor).toBeCloseTo(0.9);
});

test("rotate view toggles and survives a reset", () => {
  const s = store();
  s.getState().toggleRotateView();
  s.getState().resetPosition();
  expect(s.getState().state.rotateView).toBe(false);
});

test("a linear link on the circular rule is refused with its own notice", () => {
  const payload = encodeSharePayload({ rule: defaultRule(), state });
  const result = resolveStartup(config, payload, memoryPort());
  expect(result.rule.id).toBe("circular-basic");
  expect(messages(result)).toEqual([MESSAGES.wrongKind]);

  const running = store();
  openSharedLink(config, running, payload);
  expect(running.getState().rule.id).toBe("circular-basic");
  expect(running.getState().notices.map((n) => n.message)).toEqual([MESSAGES.wrongKind]);
});

test("rings that do not fit on the disc are removed with a notice", () => {
  const crowded: CircularRule = {
    ...basic,
    faces: {
      ...basic.faces,
      front: {
        ...basic.faces.front,
        disc: [...basic.faces.front.disc, ...Array(MAX_DISC_RINGS).fill({ scale: "L" })],
      },
    },
  };
  const result = resolveStartup(config, encodeSharePayload({ rule: crowded, state }), memoryPort());
  expect(result.rule.faces.front.disc).toHaveLength(MAX_DISC_RINGS);
  expect(messages(result)).toEqual([MESSAGES.trimmed(["L"])]);
});

test("saved rules of another kind are ignored", () => {
  const saved = encodeSavedRules([{ ...basic, id: "saved-1", name: "Mine" }, defaultRule()]);
  const port = memoryPort({ saved, session: encodeSession({ rule: basic, state }) });
  const result = resolveStartup(config, null, port);
  expect(result.savedRules?.map((rule) => rule.name)).toEqual(["Mine"]);
  expect(result.state).toEqual(state);
});
