import { PRESETS } from "../rule/presets";
import type { RuleDefinition } from "../rule/types";
import { decodeSharePayload, encodeSharePayload } from "./base64url";
import {
  decodeSavedRules,
  decodeSession,
  dropUnknownScales,
  encodeSavedRules,
  encodeSession,
} from "./codec";
import { migrate } from "./migrate";

const state = { face: "back" as const, slideOffset: 0.30103, cursor: 0.77815 };
const withScale = (rule: RuleDefinition, scale: string): RuleDefinition => ({
  ...rule,
  faces: { ...rule.faces, front: { ...rule.faces.front, upper: [{ scale }] } },
});
const rietz = PRESETS[1] as RuleDefinition;

test.each(PRESETS.map((preset) => [preset.name, preset] as const))("%s round trips", (_, rule) => {
  const decoded = decodeSession(JSON.parse(JSON.stringify(encodeSession({ rule, state }))));
  expect(decoded).toEqual({ ok: true, value: { rule, state }, droppedScales: [] });
});

test("garbage is invalid", () => {
  expect(decodeSession("nope")).toEqual({ ok: false, reason: "invalid" });
  expect(decodeSession({ v: 1, rule: { id: "x" }, state })).toEqual({
    ok: false,
    reason: "invalid",
  });
  expect(decodeSession({ v: 1, rule: rietz, state: { ...state, cursor: "x" } }).ok).toBe(false);
});

test("a newer version is reported as such", () => {
  expect(decodeSession({ v: 2, rule: rietz, state })).toEqual({
    ok: false,
    reason: "newer-version",
  });
});

test("old versions are migrated step by step", () => {
  const v0 = { v: 0, ruleDefinition: rietz, position: state };
  const migrations = {
    0: ({ ruleDefinition, position }: Record<string, unknown>) => ({
      v: 1,
      rule: ruleDefinition,
      state: position,
    }),
  };
  expect(decodeSession(v0, { migrations })).toEqual({
    ok: true,
    value: { rule: rietz, state },
    droppedScales: [],
  });
  expect(migrate(v0, 1, {})).toEqual({ ok: false, reason: "invalid" });
});

test("unknown scales are dropped and reported; aliases are renamed", () => {
  const decoded = decodeSession(encodeSession({ rule: withScale(rietz, "XX"), state }));
  expect(decoded.ok && decoded.droppedScales).toEqual(["XX"]);
  expect(decoded.ok && decoded.value.rule.faces.front.upper).toEqual([]);
  expect(dropUnknownScales(withScale(rietz, "OLD"), { OLD: "K" }).rule.faces.front.upper).toEqual([
    { scale: "K" },
  ]);
});

test("restored positions are clamped", () => {
  const decoded = decodeSession(
    encodeSession({ rule: rietz, state: { ...state, slideOffset: 7 } }),
  );
  expect(decoded.ok && decoded.value.state.slideOffset).toBe(1);
});

test("saved rules round trip", () => {
  expect(decodeSavedRules(encodeSavedRules(PRESETS))).toEqual({
    ok: true,
    value: PRESETS,
    droppedScales: [],
  });
  expect(decodeSavedRules({ v: 1, rules: "x" }).ok).toBe(false);
});

test("share payloads round trip, including names outside ASCII, and stay short", () => {
  for (const rule of PRESETS) {
    const payload = encodeSharePayload({ rule: { ...rule, name: "Règle à calcul ✓" }, state });
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(payload.length).toBeLessThan(1024 * 1.5);
    const decoded = decodeSharePayload(payload);
    expect(decoded.ok && decoded.value.rule.name).toBe("Règle à calcul ✓");
  }
});

test("malformed share payloads are invalid", () => {
  expect(decodeSharePayload("%%%")).toEqual({ ok: false, reason: "invalid" });
  expect(decodeSharePayload("aGVsbG8")).toEqual({ ok: false, reason: "invalid" });
});
