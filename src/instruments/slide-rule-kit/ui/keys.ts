import type { KeyboardEvent } from "react";

export const KEY_STEP = 0.002;
export const FINE_KEY_STEP = 0.0002;

/** How far an arrow key moves a slider: right and up increase, left and down decrease, Shift is finer. */
export function keyDelta(event: KeyboardEvent): number | undefined {
  const step = event.shiftKey ? FINE_KEY_STEP : KEY_STEP;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") return step;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") return -step;
  return undefined;
}
