import { encodeSavedRules, encodeSession } from "../../../core/slide-rule/codec/codec";
import type { SessionPort } from "./ports";
import type { SlideRuleStore } from "./store";

export const AUTOSAVE_DELAY = 500;

/** Saves the working copy shortly after it stops changing, and saved rules immediately. */
export function startAutosave(store: SlideRuleStore, port: SessionPort, delay = AUTOSAVE_DELAY) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    timer = undefined;
    const { rule, state } = store.getState();
    port.saveSession(encodeSession({ rule, state }));
  };
  const flush = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    save();
  };
  const unsubscribe = store.subscribe((next, previous) => {
    if (next.savedRules !== previous.savedRules) port.saveSaved(encodeSavedRules(next.savedRules));
    if (next.rule !== previous.rule || next.state !== previous.state) {
      clearTimeout(timer);
      timer = setTimeout(save, delay);
    }
  });
  return {
    flush,
    stop: () => {
      flush();
      unsubscribe();
    },
  };
}
