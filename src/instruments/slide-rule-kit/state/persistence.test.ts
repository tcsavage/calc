import { decodeSavedRules, decodeSession } from "../../../core/slide-rule/codec/codec";
import { DEFAULT_PRESET_ID, PRESETS } from "../../../core/slide-rule/rule/presets";
import { memoryPort } from "./memoryPort";
import { startAutosave } from "./persistence";
import { createSlideRuleStore, defaultSession } from "./store";

const config = { kind: "linear" as const, presets: PRESETS, defaultPresetId: DEFAULT_PRESET_ID };

afterEach(() => {
  vi.useRealTimers();
});

test("the session is saved once it stops changing", () => {
  vi.useFakeTimers();
  const store = createSlideRuleStore(config, defaultSession(config));
  const port = memoryPort();
  startAutosave(store, port);
  store.getState().moveSlideBy(0.1);
  vi.advanceTimersByTime(300);
  store.getState().moveSlideBy(0.1);
  vi.advanceTimersByTime(300);
  expect(port.session).toBeNull();
  vi.advanceTimersByTime(300);
  const saved = decodeSession(port.session);
  expect(saved.ok && saved.value.state.slideOffset).toBeCloseTo(0.2);
});

test("saved rules are written immediately", () => {
  const store = createSlideRuleStore(config, defaultSession(config));
  const port = memoryPort();
  startAutosave(store, port);
  store.getState().saveAs("Mine");
  const saved = decodeSavedRules(port.saved);
  expect(saved.ok && saved.value.map((rule) => rule.name)).toEqual(["Mine"]);
});

test("stopping flushes a pending save", () => {
  vi.useFakeTimers();
  const store = createSlideRuleStore(config, defaultSession(config));
  const port = memoryPort();
  const autosave = startAutosave(store, port);
  store.getState().flip();
  autosave.stop();
  const saved = decodeSession(port.session);
  expect(saved.ok && saved.value.state.face).toBe("back");
});
