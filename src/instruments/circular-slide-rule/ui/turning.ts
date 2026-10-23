import { wrapTurn } from "../../../core/slide-rule/rule/state";

/** What a turning drag grabbed: the disc, the cursor, or the rest of the rule. */
export type TurnPart = "disc" | "cursor" | "rule";

/** Angle of a drawing point around the rule's centre, in turns clockwise from 12 o'clock. */
export function angleAt(point: { x: number; y: number }): number {
  return wrapTurn(Math.atan2(point.x, -point.y) / (2 * Math.PI));
}

/** The change from one angle to the next, unwrapped to the shorter way round (at most half a turn). */
export function sweep(previous: number, next: number): number {
  const change = next - previous;
  return change - Math.round(change);
}

/**
 * Which setting a turning drag changes and by how much. Whatever is under the finger follows it: the
 * disc turns with the finger; otherwise the cursor does, except in rotate view, where the cursor stays
 * at the top and the whole rule turns the other way under it.
 */
export function turnDelta(
  part: TurnPart,
  swept: number,
  rotateView: boolean,
): { part: "slide" | "cursor"; delta: number } {
  if (part === "disc") return { part: "slide", delta: swept };
  return { part: "cursor", delta: rotateView ? -swept : swept };
}
