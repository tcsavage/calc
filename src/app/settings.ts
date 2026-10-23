import { useCallback, useEffect, useState } from "react";
import type { Settings } from "../instruments/types";
import { createKeyValueStore, type KeyValueStore } from "../shared/localStorageStore";

export const SETTINGS_KEY = "calc.settings";
export const DEFAULT_SETTINGS: Settings = { theme: "system", readoutVisible: true };

export function loadSettings(store: KeyValueStore): Settings {
  const raw = store.get(SETTINGS_KEY);
  if (typeof raw !== "object" || raw === null) return DEFAULT_SETTINGS;
  const { theme, readoutVisible } = raw as Partial<Settings>;
  return {
    theme:
      theme === "light" || theme === "dark" || theme === "system" ? theme : DEFAULT_SETTINGS.theme,
    readoutVisible:
      typeof readoutVisible === "boolean" ? readoutVisible : DEFAULT_SETTINGS.readoutVisible,
  };
}

export function useSettings(store: KeyValueStore = createKeyValueStore()) {
  const [settings, setSettings] = useState(() => loadSettings(store));
  const update = useCallback(
    (patch: Partial<Settings>) =>
      setSettings((current) => {
        const next = { ...current, ...patch };
        store.set(SETTINGS_KEY, next);
        return next;
      }),
    [store],
  );
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
  }, [settings.theme]);
  return [settings, update] as const;
}
