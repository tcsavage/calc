import { createStore, type StoreApi } from "zustand/vanilla";
import { defaultRuleState, moveBy, normaliseState } from "../../../core/slide-rule/rule/state";
import type { RuleDefinition, RuleState, Session } from "../../../core/slide-rule/rule/types";
import type { SlideRuleConfig } from "./config";

export interface Notice {
  id: string;
  message: string;
}

export type { Session };

export interface SlideRuleSnapshot<R extends RuleDefinition> extends Session<R> {
  savedRules: readonly R[];
  notices: readonly Notice[];
  loupePinned: boolean;
  editorOpen: boolean;
}

export interface SlideRuleActions<R extends RuleDefinition> {
  moveSlideBy(delta: number): void;
  moveCursorBy(delta: number): void;
  setPosition(position: Partial<Pick<RuleState, "slideOffset" | "cursor">>): void;
  flip(): void;
  resetPosition(): void;
  toggleRotateView(): void;
  selectRule(rule: R): void;
  /** Applies an edit to the working copy, forking presets and saved rules into a modified copy. */
  editRule(edit: (rule: R) => R): void;
  saveAs(name: string): void;
  renameSaved(id: string, name: string): void;
  deleteSaved(id: string): void;
  toggleLoupePinned(): void;
  setEditorOpen(open: boolean): void;
  addNotice(message: string): void;
  dismissNotice(id: string): void;
}

export type SlideRuleStoreState<R extends RuleDefinition = RuleDefinition> = SlideRuleSnapshot<R> &
  SlideRuleActions<R>;
export type SlideRuleStore<R extends RuleDefinition = RuleDefinition> = StoreApi<
  SlideRuleStoreState<R>
>;

export interface InitialSession<R extends RuleDefinition> extends Session<R> {
  savedRules?: readonly R[];
  notices?: readonly Notice[];
}

export function defaultSession<R extends RuleDefinition>(config: SlideRuleConfig<R>): Session<R> {
  const rule = config.presets.find((preset) => preset.id === config.defaultPresetId);
  if (!rule) throw new Error(`Unknown default preset ${config.defaultPresetId}`);
  return { rule, state: defaultRuleState(config.kind) };
}

export function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random.slice(0, 8)}`;
}

export function createSlideRuleStore<R extends RuleDefinition>(
  config: SlideRuleConfig<R>,
  initial: InitialSession<R>,
): SlideRuleStore<R> {
  const isPreset = (id: string) => config.presets.some((preset) => preset.id === id);
  return createStore<SlideRuleStoreState<R>>()((set, get) => ({
    rule: initial.rule,
    state: initial.state,
    savedRules: initial.savedRules ?? [],
    notices: initial.notices ?? [],
    loupePinned: false,
    editorOpen: false,

    moveSlideBy: (delta) =>
      set(({ state }) => ({ state: moveBy(config.kind, state, "slide", delta) })),
    moveCursorBy: (delta) =>
      set(({ state }) => ({ state: moveBy(config.kind, state, "cursor", delta) })),
    setPosition: (position) =>
      set(({ state }) => ({ state: normaliseState(config.kind, { ...state, ...position }) })),
    flip: () =>
      set(({ state }) => ({
        state: { ...state, face: state.face === "front" ? "back" : "front" },
      })),
    resetPosition: () => set(({ state }) => ({ state: { ...state, slideOffset: 0, cursor: 0 } })),
    toggleRotateView: () =>
      set(({ state }) => ({ state: { ...state, rotateView: !state.rotateView } })),

    selectRule: (rule) => set({ rule }),
    editRule: (edit) => {
      const { rule, savedRules } = get();
      const edited = edit(rule);
      if (edited === rule) return;
      const isStored = isPreset(rule.id) || savedRules.some((saved) => saved.id === rule.id);
      set({
        rule: isStored
          ? { ...edited, id: newId("custom"), basedOn: rule.id, name: `${rule.name} (modified)` }
          : edited,
      });
    },
    saveAs: (rawName) => {
      const name = rawName.trim();
      if (!name) return;
      const { rule, savedRules } = get();
      const existing = savedRules.find((saved) => saved.name === name);
      const saved: R = { ...rule, id: existing?.id ?? newId("saved"), name };
      set({
        rule: saved,
        savedRules: existing
          ? savedRules.map((rule) => (rule.id === existing.id ? saved : rule))
          : [...savedRules, saved],
      });
    },
    renameSaved: (id, rawName) => {
      const name = rawName.trim();
      if (!name) return;
      set(({ rule, savedRules }) => ({
        rule: rule.id === id ? { ...rule, name } : rule,
        savedRules: savedRules.map((saved) => (saved.id === id ? { ...saved, name } : saved)),
      }));
    },
    deleteSaved: (id) =>
      set(({ rule, savedRules }) => ({
        savedRules: savedRules.filter((saved) => saved.id !== id),
        // The working copy stays on screen but no longer claims to be the deleted rule.
        rule: rule.id === id ? { ...rule, id: newId("custom") } : rule,
      })),

    toggleLoupePinned: () => set(({ loupePinned }) => ({ loupePinned: !loupePinned })),
    setEditorOpen: (editorOpen) => set({ editorOpen }),
    addNotice: (message) =>
      set(({ notices }) => ({ notices: [...notices, { id: newId("notice"), message }] })),
    dismissNotice: (id) =>
      set(({ notices }) => ({ notices: notices.filter((notice) => notice.id !== id) })),
  }));
}
