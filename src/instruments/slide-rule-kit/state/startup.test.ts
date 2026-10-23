import { encodeSharePayload } from "../../../core/slide-rule/codec/base64url";
import { encodeSavedRules, encodeSession } from "../../../core/slide-rule/codec/codec";
import { DEFAULT_PRESET_ID, getPreset, PRESETS } from "../../../core/slide-rule/rule/presets";
import type { LinearRule } from "../../../core/slide-rule/rule/types";
import { memoryPort } from "./memoryPort";
import { MESSAGES, openSharedLink, resolveStartup } from "./startup";
import { createSlideRuleStore, defaultSession } from "./store";

const config = { kind: "linear" as const, presets: PRESETS, defaultPresetId: DEFAULT_PRESET_ID };
const duplex = getPreset("loglog-duplex") as LinearRule;
const mannheim = getPreset("mannheim") as LinearRule;
const sharedState = { face: "back" as const, slideOffset: 0.3, cursor: 0.7 };
const messages = (result: { notices?: readonly { message: string }[] }) =>
  result.notices?.map((n) => n.message);

test("with nothing stored, starts on the default rule", () => {
  const result = resolveStartup(config, null, memoryPort());
  expect(result.rule.id).toBe("rietz");
  expect(result.state).toEqual({ face: "front", slideOffset: 0, cursor: 0 });
  expect(messages(result)).toEqual([]);
});

test("a valid shared link wins over the stored session", () => {
  const port = memoryPort({ session: encodeSession({ rule: mannheim, state: sharedState }) });
  const result = resolveStartup(
    config,
    encodeSharePayload({ rule: duplex, state: sharedState }),
    port,
  );
  expect(result.rule.id).toBe("loglog-duplex");
  expect(result.state).toEqual(sharedState);
});

test("an invalid shared link falls back to the session with a notice", () => {
  const port = memoryPort({ session: encodeSession({ rule: mannheim, state: sharedState }) });
  const result = resolveStartup(config, "garbage", port);
  expect(result.rule.id).toBe("mannheim");
  expect(messages(result)).toEqual([MESSAGES.invalidShare]);
});

test("a shared link from a newer version says so", () => {
  const payload = btoa(JSON.stringify({ v: 9 })).replace(/=+$/, "");
  expect(messages(resolveStartup(config, payload, memoryPort()))).toEqual([MESSAGES.newerShare]);
});

test("a corrupt session falls back to the default with a notice", () => {
  const result = resolveStartup(config, null, memoryPort({ session: { v: 1, rule: 3 } }));
  expect(result.rule.id).toBe("rietz");
  expect(messages(result)).toEqual([MESSAGES.invalidSession]);
});

test("unknown scales are listed in a notice", () => {
  const rule = {
    ...mannheim,
    faces: { ...mannheim.faces, front: { ...mannheim.faces.front, upper: [{ scale: "ZZ" }] } },
  };
  const result = resolveStartup(
    config,
    null,
    memoryPort({ session: encodeSession({ rule, state: sharedState }) }),
  );
  expect(messages(result)).toEqual([MESSAGES.dropped(["ZZ"])]);
});

test("saved rules are loaded, and unavailable storage is reported", () => {
  const saved = { ...mannheim, id: "saved-1", name: "Mine" };
  expect(
    resolveStartup(config, null, memoryPort({ saved: encodeSavedRules([saved]) })).savedRules,
  ).toEqual([saved]);
  expect(messages(resolveStartup(config, null, memoryPort({ available: false })))).toEqual([
    MESSAGES.storageUnavailable,
  ]);
});

test("a shared link opened while running replaces the rule and setting", () => {
  const store = createSlideRuleStore(config, defaultSession(config));
  openSharedLink(config, store, encodeSharePayload({ rule: duplex, state: sharedState }));
  expect(store.getState().rule.id).toBe("loglog-duplex");
  expect(store.getState().state).toEqual(sharedState);
  openSharedLink(config, store, "garbage");
  expect(store.getState().notices.map((n) => n.message)).toEqual([MESSAGES.invalidShare]);
});
