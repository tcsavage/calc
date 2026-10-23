import { act, renderHook } from "@testing-library/react";
import { createKeyValueStore } from "../shared/localStorageStore";
import { DEFAULT_SETTINGS, loadSettings, useSettings } from "./settings";

test("settings persist and the theme is applied to the document", () => {
  const store = createKeyValueStore(localStorage);
  const { result } = renderHook(() => useSettings(store));
  act(() => result.current[1]({ theme: "dark", readoutVisible: false }));
  expect(loadSettings(store)).toEqual({ theme: "dark", readoutVisible: false });
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("invalid stored settings fall back to the defaults", () => {
  const store = createKeyValueStore(localStorage);
  store.set("calc.settings", { theme: "purple", readoutVisible: "yes" });
  expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
});
