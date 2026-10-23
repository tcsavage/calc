import { SCALE_LENGTH } from "./layout";

/** Radius of a cylinder whose circumference is one standard scale length. */
export const HELIX_RADIUS = SCALE_LENGTH / (2 * Math.PI);
/** Drags near the cylinder's edges are clamped here, where the angle changes too fast to follow. */
const EDGE = 0.98;

/** Where a scale position lies along the helix, in turns from the start of the stators. */
export const helixCoordinate = (position: number, offset: number, turns: number) =>
  (position + offset) * turns;

export interface Projection {
  /** On the front half of the cylinder, which faces the viewer. */
  visible: boolean;
  /** Angle from the cursor, in turns, from minus half to half. */
  angle: number;
  /** Horizontal position from the cylinder's axis. */
  x: number;
  /** How squarely the surface faces the viewer, 1 at the front and 0 at the edges. */
  depth: number;
}

/** A helix point as seen with the cylinder turned so the cursor faces the viewer. */
export function project(s: number, cursor: number): Projection {
  const relative = s - cursor;
  const angle = relative - Math.round(relative);
  const radians = angle * 2 * Math.PI;
  return {
    visible: Math.abs(angle) <= 0.25,
    angle,
    x: HELIX_RADIUS * Math.sin(radians),
    depth: Math.cos(radians),
  };
}

/** Vertical position of a band at helix coordinate s: turns stack one pitch apart. */
export const rowY = (s: number, pitch: number, bandY: number) => s * pitch + bandY;

/** The helix coordinates with a row inside a vertical window, allowing a whole pitch for band offsets. */
export function visibleSpan(window: { top: number; bottom: number }, pitch: number) {
  return { from: window.top / pitch - 1, to: window.bottom / pitch + 1 };
}

/** The turn angle under a point at horizontal position x, for following a drag round the cylinder. */
export function turnAngle(x: number): number {
  const ratio = Math.min(EDGE, Math.max(-EDGE, x / HELIX_RADIUS));
  return Math.asin(ratio) / (2 * Math.PI);
}
