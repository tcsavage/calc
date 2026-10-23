import { wrapTurn } from "./rule/state";
import {
  MOVING_SECTION,
  placementsOf,
  type RuleDefinition,
  type RuleState,
  type Section,
  sectionsOf,
} from "./rule/types";
import { formatReadout } from "./scales/format";
import { getScale } from "./scales/library";

export interface ReadoutEntry {
  scale: string;
  section: Section;
  text: string;
}

const TOLERANCE = 1e-9;

/** Significant figures worth reading: a helix of ten or more turns reads one figure finer. */
export function readoutDigits(rule: RuleDefinition): number {
  return rule.kind === "cylindrical" ? 4 + Math.floor(Math.log10(rule.turns)) : 4;
}

/**
 * The value under the hairline for every scale on the visible face, in section order. Straight
 * scales beyond their ends read "out of range"; circular scales wrap round.
 */
export function computeReadout(rule: RuleDefinition, state: RuleState): ReadoutEntry[] {
  const moving = MOVING_SECTION[rule.kind];
  const digits = readoutDigits(rule);
  return sectionsOf(rule.kind).flatMap((section) =>
    placementsOf(rule, state.face, section).map(({ scale: id }) => {
      const scale = getScale(id);
      const offset = section === moving ? state.cursor - state.slideOffset : state.cursor;
      const position = rule.kind === "circular" ? wrapTurn(offset) : offset;
      if (!scale || position < -TOLERANCE || position > 1 + TOLERANCE) {
        return { scale: id, section, text: "out of range" };
      }
      const clamped = Math.min(1, Math.max(0, position));
      const value = scale.fromPosition(clamped);
      const shown = scale.displayValue ? scale.displayValue(value) : value;
      return { scale: id, section, text: formatReadout(shown, digits) };
    }),
  );
}
