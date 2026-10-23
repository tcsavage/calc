import { linearSlideRule } from "../instruments/linear-slide-rule";
import type { InstrumentEntry } from "../instruments/types";

export const INSTRUMENTS: readonly InstrumentEntry[] = [linearSlideRule];

export function findInstrument(id: string | undefined): InstrumentEntry | undefined {
  return INSTRUMENTS.find((entry) => entry.id === id);
}
