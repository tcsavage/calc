import type { FaceDefinition, RuleState, Section } from "./rule/types";
import { SECTIONS } from "./rule/types";
import { formatReadout } from "./scales/format";
import { getScale } from "./scales/library";

export interface ReadoutEntry {
  scale: string;
  section: Section;
  text: string;
}

const TOLERANCE = 1e-9;

/** The value under the hairline for every scale on a face, top to bottom. */
export function computeReadout(face: FaceDefinition, state: RuleState): ReadoutEntry[] {
  return SECTIONS.flatMap((section) =>
    face[section].map(({ scale: id }) => {
      const scale = getScale(id);
      const position = section === "slide" ? state.cursor - state.slideOffset : state.cursor;
      if (!scale || position < -TOLERANCE || position > 1 + TOLERANCE) {
        return { scale: id, section, text: "out of range" };
      }
      const clamped = Math.min(1, Math.max(0, position));
      const value = scale.fromPosition(clamped);
      const shown = scale.displayValue ? scale.displayValue(value) : value;
      return { scale: id, section, text: formatReadout(shown) };
    }),
  );
}
