import { getScale } from "../scales/library";
import {
  type Face,
  placementsOf,
  type RuleDefinition,
  type ScalePlacement,
  type Section,
  sectionsOf,
} from "./types";

export interface SectionRef {
  face: Face;
  section: Section;
}

function updateSection<R extends RuleDefinition>(
  rule: R,
  { face, section }: SectionRef,
  update: (placements: readonly ScalePlacement[]) => readonly ScalePlacement[],
): R {
  if (!sectionsOf(rule.kind).includes(section)) return rule;
  const current = placementsOf(rule, face, section);
  const next = update(current);
  if (next === current) return rule;
  return { ...rule, faces: { ...rule.faces, [face]: { ...rule.faces[face], [section]: next } } };
}

export function addScale<R extends RuleDefinition>(rule: R, ref: SectionRef, scale: string): R {
  return updateSection(rule, ref, (placements) => [...placements, { scale }]);
}

export function removeScale<R extends RuleDefinition>(rule: R, ref: SectionRef, index: number): R {
  return updateSection(rule, ref, (placements) =>
    index in placements ? placements.filter((_, i) => i !== index) : placements,
  );
}

/** Moves a scale one place up (-1) or down (1) within its section; a no-op at the ends. */
export function moveScale<R extends RuleDefinition>(
  rule: R,
  ref: SectionRef,
  index: number,
  direction: -1 | 1,
): R {
  return updateSection(rule, ref, (placements) => {
    const target = index + direction;
    if (!(index in placements) || !(target in placements)) return placements;
    const next = [...placements];
    [next[index], next[target]] = [next[target] as ScalePlacement, next[index] as ScalePlacement];
    return next;
  });
}

/** Switches a scale between its default ink and the other ink. */
export function toggleInk<R extends RuleDefinition>(rule: R, ref: SectionRef, index: number): R {
  return updateSection(rule, ref, (placements) => {
    const placement = placements[index];
    if (!placement) return placements;
    const defaultInk = getScale(placement.scale)?.ink ?? "black";
    const current = placement.ink ?? defaultInk;
    const ink = current === "black" ? "red" : "black";
    const updated: ScalePlacement =
      ink === defaultInk ? { scale: placement.scale } : { scale: placement.scale, ink };
    return placements.map((p, i) => (i === index ? updated : p));
  });
}
