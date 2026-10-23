export interface KeyValueStore {
  readonly available: boolean;
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}

const PROBE = "calc.probe";

/** JSON values in Web Storage; any failure (private mode, quota, disabled) degrades to unavailable. */
export function createKeyValueStore(
  storage: Storage | undefined = globalThis.localStorage,
): KeyValueStore {
  let available = storage !== undefined;
  const attempt = <T>(action: () => T, fallback: T): T => {
    if (!available || !storage) return fallback;
    try {
      return action();
    } catch {
      available = false;
      return fallback;
    }
  };
  attempt(() => {
    storage?.setItem(PROBE, "1");
    storage?.removeItem(PROBE);
  }, undefined);
  return {
    get available() {
      return available;
    },
    get: (key) =>
      attempt(() => {
        const text = storage?.getItem(key);
        return text == null ? null : (JSON.parse(text) as unknown);
      }, null),
    set: (key, value) => attempt(() => storage?.setItem(key, JSON.stringify(value)), undefined),
    remove: (key) => attempt(() => storage?.removeItem(key), undefined),
  };
}
