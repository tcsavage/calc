/** Formats a label value with up to four significant digits and no trailing zeros. */
export function formatLabel(value: number): string {
  return String(Number(value.toPrecision(4)));
}

/** Formats a readout value to four significant figures without exponent notation. */
export function formatReadout(value: number): string {
  if (Math.abs(value) >= 10000) return value.toFixed(0);
  return value.toPrecision(4);
}
