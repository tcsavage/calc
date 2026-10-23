import type { RuleKind, RuleState } from "./types";

export const SLIDE_LIMIT = 1;
export const CURSOR_OVERRUN = 0.05;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const clampSlide = (offset: number) => clamp(offset, -SLIDE_LIMIT, SLIDE_LIMIT);
export const clampCursor = (cursor: number) => clamp(cursor, -CURSOR_OVERRUN, 1 + CURSOR_OVERRUN);

/** A whole number of turns removed, leaving a value from 0 up to but not including 1. */
export function wrapTurn(turns: number): number {
  const wrapped = turns - Math.floor(turns);
  return wrapped >= 1 ? 0 : wrapped;
}

export function clampState(state: RuleState): RuleState {
  return {
    ...state,
    slideOffset: clampSlide(state.slideOffset),
    cursor: clampCursor(state.cursor),
  };
}

/** Clamps a straight or helical rule's slide and cursor to their travel; wraps a circular rule's to one turn. */
export function normaliseState(kind: RuleKind, state: RuleState): RuleState {
  // A cylinder has only a front.
  if (kind === "cylindrical") return { ...clampState(state), face: "front" };
  if (kind !== "circular") return clampState(state);
  return { ...state, slideOffset: wrapTurn(state.slideOffset), cursor: wrapTurn(state.cursor) };
}

export function moveBy(
  kind: RuleKind,
  state: RuleState,
  part: "slide" | "cursor",
  delta: number,
): RuleState {
  const key = part === "slide" ? "slideOffset" : "cursor";
  return normaliseState(kind, { ...state, [key]: state[key] + delta });
}

export function defaultRuleState(kind: RuleKind = "linear"): RuleState {
  const state: RuleState = { face: "front", slideOffset: 0, cursor: 0 };
  return kind === "circular" ? { ...state, rotateView: true } : state;
}
