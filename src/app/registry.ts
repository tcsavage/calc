import { circularSlideRule } from "../instruments/circular-slide-rule";
import { cylindricalSlideRule } from "../instruments/cylindrical-slide-rule";
import { linearSlideRule } from "../instruments/linear-slide-rule";
import type { InstrumentEntry } from "../instruments/types";

export const INSTRUMENTS: readonly InstrumentEntry[] = [
  linearSlideRule,
  circularSlideRule,
  cylindricalSlideRule,
];

export function findInstrument(id: string | undefined): InstrumentEntry | undefined {
  return INSTRUMENTS.find((entry) => entry.id === id);
}
