import type { RuleState } from "./types";

export const SLIDE_LIMIT = 1;
export const CURSOR_OVERRUN = 0.05;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const clampSlide = (offset: number) => clamp(offset, -SLIDE_LIMIT, SLIDE_LIMIT);
export const clampCursor = (cursor: number) => clamp(cursor, -CURSOR_OVERRUN, 1 + CURSOR_OVERRUN);

export function clampState(state: RuleState): RuleState {
  return {
    ...state,
    slideOffset: clampSlide(state.slideOffset),
    cursor: clampCursor(state.cursor),
  };
}

export function defaultRuleState(): RuleState {
  return { face: "front", slideOffset: 0, cursor: 0 };
}
