/** Formats a label value with up to four significant digits and no trailing zeros. */
export function formatLabel(value: number): string {
  return String(Number(value.toPrecision(4)));
}

/** Formats a readout value to the given significant figures without exponent notation. */
export function formatReadout(value: number, digits = 4): string {
  if (Math.abs(value) >= 10 ** digits) return value.toFixed(0);
  return value.toPrecision(digits);
}
