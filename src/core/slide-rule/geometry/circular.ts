import { wrapTurn } from "../rule/state";
import type { CircularRule, FaceDefinition, ScalePlacement, Section } from "../rule/types";
import { BAND_HEIGHT, SCALE_LENGTH } from "./layout";

/** Radius of the disc edge, where the fixed and turning scales meet, in drawing units. */
export const DISC_RADIUS = 240;
export const RING_WIDTH = BAND_HEIGHT;
/** The innermost disc ring may not reach inside this radius; shorter rings are too cramped to read. */
export const MIN_RING_RADIUS = 72;
export const MAX_DISC_RINGS = Math.floor((DISC_RADIUS - MIN_RING_RADIUS) / RING_WIDTH);
export const HUB_RADIUS = 28;
/** Plain border beyond the outermost ring. */
export const RIM = 14;

export interface RingLayout {
  placement: ScalePlacement;
  section: "outer" | "disc";
  index: number;
  inner: number;
  outer: number;
  /** Radius the ticks grow from: the ring's edge nearest the disc edge. */
  baseline: number;
  /** Ticks grow outward (1) or inward (-1). */
  direction: 1 | -1;
}

export interface CircularFaceLayout {
  discRadius: number;
  /** Outer edge of the whole rule. */
  radius: number;
  rings: RingLayout[];
}

/** Outer rings stack outward from the disc edge and disc rings inward, in placement order. */
export function computeCircularLayout(face: FaceDefinition<"circular">): CircularFaceLayout {
  const outer = face.outer.map((placement, index): RingLayout => {
    const inner = DISC_RADIUS + index * RING_WIDTH;
    return {
      placement,
      section: "outer",
      index,
      inner,
      outer: inner + RING_WIDTH,
      baseline: inner,
      direction: 1,
    };
  });
  const disc = face.disc.map((placement, index): RingLayout => {
    const outerRadius = DISC_RADIUS - index * RING_WIDTH;
    return {
      placement,
      section: "disc",
      index,
      inner: outerRadius - RING_WIDTH,
      outer: outerRadius,
      baseline: outerRadius,
      direction: -1,
    };
  });
  return {
    discRadius: DISC_RADIUS,
    radius: DISC_RADIUS + face.outer.length * RING_WIDTH + RIM,
    rings: [...outer, ...disc],
  };
}

/** Degrees clockwise from 12 o'clock for a position along a one turn scale. */
export const angleOf = (position: number) => position * 360;
export const positionOf = (degrees: number) => wrapTurn(degrees / 360);

/** A point at the given radius and angle, with the rule's centre at the origin and y pointing down. */
export function polar(radius: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: radius * Math.sin(radians), y: -radius * Math.cos(radians) };
}

/** Length of a ring at the given radius relative to a straight scale. */
export const lengthFactor = (radius: number) => (2 * Math.PI * radius) / SCALE_LENGTH;

export function canAddRing(face: FaceDefinition<"circular">, section: Section): boolean {
  return section !== "disc" || face.disc.length < MAX_DISC_RINGS;
}

/** Removes the innermost disc rings beyond the limit on each face. */
export function fitCircularRule(rule: CircularRule): { rule: CircularRule; removed: string[] } {
  const removed = [rule.faces.front, rule.faces.back].flatMap((face) =>
    face.disc.slice(MAX_DISC_RINGS).map((placement) => placement.scale),
  );
  if (removed.length === 0) return { rule, removed };
  const trim = (face: FaceDefinition<"circular">) => ({
    ...face,
    disc: face.disc.slice(0, MAX_DISC_RINGS),
  });
  return {
    rule: { ...rule, faces: { front: trim(rule.faces.front), back: trim(rule.faces.back) } },
    removed,
  };
}
