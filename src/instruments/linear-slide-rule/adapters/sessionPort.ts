import type { KeyValueStore } from "../../../shared/localStorageStore";
import type { SessionPort } from "../state/ports";

export const SESSION_KEY = "calc.linear-slide-rule.session";
export const SAVED_KEY = "calc.linear-slide-rule.saved";

export function storageSessionPort(store: KeyValueStore): SessionPort {
  return {
    get available() {
      return store.available;
    },
    loadSession: () => store.get(SESSION_KEY),
    saveSession: (envelope) => store.set(SESSION_KEY, envelope),
    clearSession: () => store.remove(SESSION_KEY),
    loadSaved: () => store.get(SAVED_KEY),
    saveSaved: (envelope) => store.set(SAVED_KEY, envelope),
  };
}
