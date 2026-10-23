export type Envelope = { v: number } & Record<string, unknown>;
export type Migration = (envelope: Envelope) => Envelope;
export type Migrations = Readonly<Record<number, Migration>>;

export type MigrateResult =
  | { ok: true; value: Envelope }
  | { ok: false; reason: "invalid" | "newer-version" };

const isEnvelope = (raw: unknown): raw is Envelope =>
  typeof raw === "object" && raw !== null && Number.isInteger((raw as { v?: unknown }).v);

/** Upgrades an envelope one version at a time until it reaches the current version. */
export function migrate(raw: unknown, current: number, migrations: Migrations): MigrateResult {
  if (!isEnvelope(raw)) return { ok: false, reason: "invalid" };
  if (raw.v > current) return { ok: false, reason: "newer-version" };
  let value = raw;
  while (value.v < current) {
    const step = migrations[value.v];
    if (!step) return { ok: false, reason: "invalid" };
    const next = step(value);
    if (!isEnvelope(next) || next.v <= value.v) return { ok: false, reason: "invalid" };
    value = next;
  }
  return { ok: true, value };
}
