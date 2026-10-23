import type { KeyValueStore } from "../../../shared/localStorageStore";
import type { SessionPort } from "../state/ports";

export interface StorageKeys {
  session: string;
  saved: string;
}

export function storageSessionPort(store: KeyValueStore, keys: StorageKeys): SessionPort {
  return {
    get available() {
      return store.available;
    },
    loadSession: () => store.get(keys.session),
    saveSession: (envelope) => store.set(keys.session, envelope),
    clearSession: () => store.remove(keys.session),
    loadSaved: () => store.get(keys.saved),
    saveSaved: (envelope) => store.set(keys.saved, envelope),
  };
}
