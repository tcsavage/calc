import { createStore, type StoreApi } from "zustand/vanilla";
import { defaultRule, getPreset } from "../../../core/slide-rule/rule/presets";
import { clampCursor, clampSlide, defaultRuleState } from "../../../core/slide-rule/rule/state";
import type { RuleDefinition, RuleState, Session } from "../../../core/slide-rule/rule/types";

export interface Notice {
  id: string;
  message: string;
}

export type { Session };

export interface SlideRuleSnapshot extends Session {
  savedRules: readonly RuleDefinition[];
  notices: readonly Notice[];
  loupePinned: boolean;
  editorOpen: boolean;
}

export interface SlideRuleActions {
  moveSlideBy(delta: number): void;
  moveCursorBy(delta: number): void;
  setPosition(position: Partial<Pick<RuleState, "slideOffset" | "cursor">>): void;
  flip(): void;
  resetPosition(): void;
  selectRule(rule: RuleDefinition): void;
  /** Applies an edit to the working copy, forking presets and saved rules into a modified copy. */
  editRule(edit: (rule: RuleDefinition) => RuleDefinition): void;
  saveAs(name: string): void;
  renameSaved(id: string, name: string): void;
  deleteSaved(id: string): void;
  toggleLoupePinned(): void;
  setEditorOpen(open: boolean): void;
  addNotice(message: string): void;
  dismissNotice(id: string): void;
}

export type SlideRuleStoreState = SlideRuleSnapshot & SlideRuleActions;
export type SlideRuleStore = StoreApi<SlideRuleStoreState>;

export interface InitialSession extends Session {
  savedRules?: readonly RuleDefinition[];
  notices?: readonly Notice[];
}

export function defaultSession(): Session {
  return { rule: defaultRule(), state: defaultRuleState() };
}

export function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random.slice(0, 8)}`;
}

export function isPresetId(id: string): boolean {
  return getPreset(id) !== undefined;
}

export function createSlideRuleStore(initial: InitialSession): SlideRuleStore {
  return createStore<SlideRuleStoreState>()((set, get) => ({
    rule: initial.rule,
    state: initial.state,
    savedRules: initial.savedRules ?? [],
    notices: initial.notices ?? [],
    loupePinned: false,
    editorOpen: false,

    moveSlideBy: (delta) =>
      set(({ state }) => ({
        state: { ...state, slideOffset: clampSlide(state.slideOffset + delta) },
      })),
    moveCursorBy: (delta) =>
      set(({ state }) => ({ state: { ...state, cursor: clampCursor(state.cursor + delta) } })),
    setPosition: ({ slideOffset, cursor }) =>
      set(({ state }) => ({
        state: {
          ...state,
          slideOffset: slideOffset === undefined ? state.slideOffset : clampSlide(slideOffset),
          cursor: cursor === undefined ? state.cursor : clampCursor(cursor),
        },
      })),
    flip: () =>
      set(({ state }) => ({
        state: { ...state, face: state.face === "front" ? "back" : "front" },
      })),
    resetPosition: () => set(({ state }) => ({ state: { ...state, slideOffset: 0, cursor: 0 } })),

    selectRule: (rule) => set({ rule }),
    editRule: (edit) => {
      const { rule, savedRules } = get();
      const edited = edit(rule);
      if (edited === rule) return;
      const isStored = isPresetId(rule.id) || savedRules.some((saved) => saved.id === rule.id);
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
      const saved: RuleDefinition = { ...rule, id: existing?.id ?? newId("saved"), name };
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
