import { normaliseState } from "../rule/state";
import {
  FACES,
  type Face,
  placementsOf,
  type RuleDefinition,
  type ScalePlacement,
  type Session,
  sectionsOf,
} from "../rule/types";
import { getScale, SCALE_ALIASES } from "../scales/library";
import { type Migrations, migrate } from "./migrate";
import { savedEnvelope, sessionEnvelope } from "./schema";

export const CURRENT_VERSION = 1;
export const MIGRATIONS: Migrations = {};

export type DecodeFailure = { ok: false; reason: "invalid" | "newer-version" };
export type DecodeResult<T> = { ok: true; value: T; droppedScales: string[] } | DecodeFailure;

interface CodecOptions {
  current?: number;
  migrations?: Migrations;
  aliases?: Readonly<Record<string, string>>;
}

/** Renames aliased scales and removes scales the library no longer has. */
export function dropUnknownScales<R extends RuleDefinition>(
  rule: R,
  aliases: Readonly<Record<string, string>> = SCALE_ALIASES,
): { rule: R; dropped: string[] } {
  const dropped: string[] = [];
  const fix = (placements: readonly ScalePlacement[]) =>
    placements.flatMap((placement) => {
      const scale = aliases[placement.scale] ?? placement.scale;
      if (getScale(scale)) return [{ ...placement, scale }];
      dropped.push(placement.scale);
      return [];
    });
  const face = (f: Face) =>
    Object.fromEntries(
      sectionsOf(rule.kind).map((section) => [section, fix(placementsOf(rule, f, section))]),
    );
  const faces = Object.fromEntries(FACES.map((f) => [f, face(f)])) as unknown as R["faces"];
  return { rule: { ...rule, faces }, dropped };
}

export function encodeSession({ rule, state }: Session): unknown {
  return { v: CURRENT_VERSION, rule, state };
}

export function decodeSession(raw: unknown, options: CodecOptions = {}): DecodeResult<Session> {
  const migrated = migrate(
    raw,
    options.current ?? CURRENT_VERSION,
    options.migrations ?? MIGRATIONS,
  );
  if (!migrated.ok) return migrated;
  const parsed = sessionEnvelope.safeParse(migrated.value);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { rule, dropped } = dropUnknownScales(parsed.data.rule, options.aliases);
  return {
    ok: true,
    value: { rule, state: normaliseState(rule.kind, parsed.data.state) },
    droppedScales: dropped,
  };
}

export function encodeSavedRules(rules: readonly RuleDefinition[]): unknown {
  return { v: CURRENT_VERSION, rules };
}

export function decodeSavedRules(
  raw: unknown,
  options: CodecOptions = {},
): DecodeResult<RuleDefinition[]> {
  const migrated = migrate(
    raw,
    options.current ?? CURRENT_VERSION,
    options.migrations ?? MIGRATIONS,
  );
  if (!migrated.ok) return migrated;
  const parsed = savedEnvelope.safeParse(migrated.value);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const results = parsed.data.rules.map((rule) => dropUnknownScales(rule, options.aliases));
  return {
    ok: true,
    value: results.map((r) => r.rule),
    droppedScales: results.flatMap((r) => r.dropped),
  };
}
