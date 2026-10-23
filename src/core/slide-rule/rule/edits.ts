import { getScale } from "../scales/library";
import type { Face, RuleDefinition, ScalePlacement, Section } from "./types";

export interface SectionRef {
  face: Face;
  section: Section;
}

function updateSection(
  rule: RuleDefinition,
  { face, section }: SectionRef,
  update: (placements: readonly ScalePlacement[]) => readonly ScalePlacement[],
): RuleDefinition {
  const current = rule.faces[face][section];
  const next = update(current);
  if (next === current) return rule;
  return { ...rule, faces: { ...rule.faces, [face]: { ...rule.faces[face], [section]: next } } };
}

export function addScale(rule: RuleDefinition, ref: SectionRef, scale: string): RuleDefinition {
  return updateSection(rule, ref, (placements) => [...placements, { scale }]);
}

export function removeScale(rule: RuleDefinition, ref: SectionRef, index: number): RuleDefinition {
  return updateSection(rule, ref, (placements) =>
    index in placements ? placements.filter((_, i) => i !== index) : placements,
  );
}

/** Moves a scale one place up (-1) or down (1) within its section; a no-op at the ends. */
export function moveScale(
  rule: RuleDefinition,
  ref: SectionRef,
  index: number,
  direction: -1 | 1,
): RuleDefinition {
  return updateSection(rule, ref, (placements) => {
    const target = index + direction;
    if (!(index in placements) || !(target in placements)) return placements;
    const next = [...placements];
    [next[index], next[target]] = [next[target] as ScalePlacement, next[index] as ScalePlacement];
    return next;
  });
}

/** Switches a scale between its default ink and the other ink. */
export function toggleInk(rule: RuleDefinition, ref: SectionRef, index: number): RuleDefinition {
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
