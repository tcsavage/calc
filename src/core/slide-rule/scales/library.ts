import { type Cut, graduate } from "./graduation";
import type { Ink, ScaleMark, ScaleSpec } from "./types";

const { E, PI, log10, log, sqrt, sin, tan, asin, atan, exp } = Math;
const RADIANS_PER_DEGREE = PI / 180;
const DEGREES_PER_RADIAN = 180 / PI;

interface Definition {
  id: string;
  formula: string;
  description: string;
  ink?: Ink;
  domain: readonly [number, number];
  toPosition(value: number): number;
  fromPosition(position: number): number;
  displayValue?(value: number): number;
  labelValue?(value: number): number;
  cuts: readonly Cut[];
  marks?: readonly ScaleMark[];
}

function define({ cuts, ink = "black", ...rest }: Definition): ScaleSpec {
  return { ...rest, name: rest.id, ink, cuts, segments: graduate(rest.toPosition, cuts) };
}

const PI_MARK: ScaleMark[] = [{ value: PI, label: "π" }];

const DECADE_CUTS: Cut[] = [
  { from: 1, to: 2, major: 1 },
  { from: 2, to: 4, major: 1 },
  { from: 4, to: 10, major: 1 },
];

/** Cuts for a scale spanning several decades, scaling the single decade cuts by each power of ten. */
function decades(count: number, perDecade: readonly Cut[]): Cut[] {
  return Array.from({ length: count }, (_, decade) =>
    perDecade.map(({ from, to, major, label }) => {
      const factor = 10 ** decade;
      const cut: Cut = { from: from * factor, to: to * factor, major: major * factor };
      if (label !== undefined) cut.label = label * factor;
      return cut;
    }),
  ).flat();
}

const fundamental = (id: string, description: string) =>
  define({
    id,
    formula: "x",
    description,
    domain: [1, 10],
    toPosition: log10,
    fromPosition: (p) => 10 ** p,
    cuts: DECADE_CUTS,
    marks: PI_MARK,
  });

const reciprocal = (id: string, description: string) =>
  define({
    id,
    formula: "1/x",
    description,
    ink: "red",
    domain: [1, 10],
    toPosition: (x) => 1 - log10(x),
    fromPosition: (p) => 10 ** (1 - p),
    cuts: DECADE_CUTS,
  });

const FOLDED_CUTS: Cut[] = [
  { from: PI, to: 4, major: 1 },
  { from: 4, to: 10, major: 1 },
  { from: 10, to: 20, major: 10 },
  { from: 20, to: 10 * PI, major: 10 },
];

const folded = (id: string, description: string) =>
  define({
    id,
    formula: "πx",
    description,
    domain: [PI, 10 * PI],
    toPosition: (x) => log10(x / PI),
    fromPosition: (p) => PI * 10 ** p,
    displayValue: (x) => (x >= 10 ? x / 10 : x),
    cuts: FOLDED_CUTS,
  });

const square = (id: string, description: string) =>
  define({
    id,
    formula: "x²",
    description,
    domain: [1, 100],
    toPosition: (x) => log10(x) / 2,
    fromPosition: (p) => 10 ** (2 * p),
    cuts: decades(2, [
      { from: 1, to: 2, major: 1 },
      { from: 2, to: 5, major: 1 },
      { from: 5, to: 10, major: 1 },
    ]),
    marks: PI_MARK,
  });

const logLog = (id: string, offset: number, from: number, to: number, cuts: Cut[]) =>
  define({
    id,
    formula: `e^${10 ** -offset}x`,
    description: `Powers of e, e to the ${10 ** -offset}x`,
    domain: [from, to],
    toPosition: (x) => offset + log10(log(x)),
    fromPosition: (p) => exp(10 ** (p - offset)),
    cuts,
  });

const negativeLogLog = (id: string, offset: number, from: number, to: number, cuts: Cut[]) =>
  define({
    id,
    formula: `e^-${10 ** -offset}x`,
    description: `Negative powers of e, e to the minus ${10 ** -offset}x`,
    domain: [from, to],
    toPosition: (x) => offset + log10(-log(x)),
    fromPosition: (p) => exp(-(10 ** (p - offset))),
    cuts,
  });

export const SCALES: readonly ScaleSpec[] = [
  fundamental("C", "Fundamental scale on the slide"),
  fundamental("D", "Fundamental scale on the stator"),
  reciprocal("CI", "Reciprocal of C"),
  reciprocal("DI", "Reciprocal of D"),
  folded("CF", "C folded at π"),
  folded("DF", "D folded at π"),
  define({
    id: "CIF",
    formula: "1/πx",
    description: "Reciprocal of CF",
    ink: "red",
    domain: [1 / PI, 10 / PI],
    toPosition: (x) => 1 - log10(PI * x),
    fromPosition: (p) => 10 ** (1 - p) / PI,
    displayValue: (x) => (x < 1 ? x * 10 : x),
    cuts: [
      { from: 1 / PI, to: 0.4, major: 0.1 },
      { from: 0.4, to: 1, major: 0.1 },
      { from: 1, to: 2, major: 1 },
      { from: 2, to: 10 / PI, major: 1 },
    ],
  }),
  square("A", "Squares, on the stator"),
  square("B", "Squares, on the slide"),
  define({
    id: "K",
    formula: "x³",
    description: "Cubes",
    domain: [1, 1000],
    toPosition: (x) => log10(x) / 3,
    fromPosition: (p) => 10 ** (3 * p),
    labelValue: (x) => (x > 100 ? x / 100 : x > 10 ? x / 10 : x),
    cuts: decades(3, [
      { from: 1, to: 3, major: 1 },
      { from: 3, to: 6, major: 1 },
      { from: 6, to: 10, major: 1, label: 1 },
    ]),
  }),
  define({
    id: "R1",
    formula: "√x",
    description: "Square roots, first half",
    domain: [1, sqrt(10)],
    toPosition: (x) => 2 * log10(x),
    fromPosition: (p) => 10 ** (p / 2),
    cuts: [
      { from: 1, to: 2, major: 1 },
      { from: 2, to: sqrt(10), major: 1 },
    ],
  }),
  define({
    id: "R2",
    formula: "√10x",
    description: "Square roots, second half",
    domain: [sqrt(10), 10],
    toPosition: (x) => 2 * log10(x) - 1,
    fromPosition: (p) => 10 ** ((p + 1) / 2),
    cuts: [
      { from: sqrt(10), to: 5, major: 1 },
      { from: 5, to: 10, major: 1 },
    ],
  }),
  define({
    id: "P",
    formula: "√(1-x²)",
    description: "Pythagorean, read against D",
    domain: [0, sqrt(0.99)],
    toPosition: (x) => 1 + log10(1 - x * x) / 2,
    fromPosition: (p) => sqrt(1 - 10 ** (2 * (p - 1))),
    cuts: [
      { from: 0, to: 0.4, major: 0.1 },
      { from: 0.4, to: 0.8, major: 0.1 },
      { from: 0.8, to: 0.9, major: 0.1 },
      { from: 0.9, to: 0.95, major: 0.05 },
      { from: 0.95, to: 0.98, major: 0.01 },
      { from: 0.98, to: 0.99, major: 0.01 },
      { from: 0.99, to: sqrt(0.99), major: 0.001 },
    ],
  }),
  define({
    id: "S",
    formula: "sin",
    description: "Sines, in degrees, read against D",
    domain: [asin(0.1) * DEGREES_PER_RADIAN, 90],
    toPosition: (x) => 1 + log10(sin(x * RADIANS_PER_DEGREE)),
    fromPosition: (p) => asin(10 ** (p - 1)) * DEGREES_PER_RADIAN,
    cuts: [
      { from: asin(0.1) * DEGREES_PER_RADIAN, to: 10, major: 1 },
      { from: 10, to: 20, major: 1 },
      { from: 20, to: 30, major: 5 },
      { from: 30, to: 60, major: 10 },
      { from: 60, to: 80, major: 10 },
      { from: 80, to: 90, major: 10 },
    ],
  }),
  define({
    id: "T",
    formula: "tan",
    description: "Tangents, in degrees, read against D",
    domain: [atan(0.1) * DEGREES_PER_RADIAN, 45],
    toPosition: (x) => 1 + log10(tan(x * RADIANS_PER_DEGREE)),
    fromPosition: (p) => atan(10 ** (p - 1)) * DEGREES_PER_RADIAN,
    cuts: [
      { from: atan(0.1) * DEGREES_PER_RADIAN, to: 10, major: 1 },
      { from: 10, to: 20, major: 1 },
      { from: 20, to: 30, major: 5 },
      { from: 30, to: 45, major: 5 },
    ],
  }),
  define({
    id: "ST",
    formula: "arc",
    description: "Small angles in degrees, as radians, read against D",
    domain: [0.01 * DEGREES_PER_RADIAN, 0.1 * DEGREES_PER_RADIAN],
    toPosition: (x) => 2 + log10(x * RADIANS_PER_DEGREE),
    fromPosition: (p) => 10 ** (p - 2) * DEGREES_PER_RADIAN,
    cuts: [
      { from: 0.01 * DEGREES_PER_RADIAN, to: 1, major: 0.1 },
      { from: 1, to: 2, major: 1 },
      { from: 2, to: 4, major: 1 },
      { from: 4, to: 0.1 * DEGREES_PER_RADIAN, major: 1 },
    ],
  }),
  define({
    id: "L",
    formula: "lg x",
    description: "Common logarithms (mantissa), read against D",
    domain: [0, 1],
    toPosition: (x) => x,
    fromPosition: (p) => p,
    cuts: [{ from: 0, to: 1, major: 0.1 }],
  }),
  logLog("LL1", 2, exp(0.01), exp(0.1), [
    { from: exp(0.01), to: 1.02, major: 0.001 },
    { from: 1.02, to: 1.05, major: 0.005 },
    { from: 1.05, to: exp(0.1), major: 0.01 },
  ]),
  logLog("LL2", 1, exp(0.1), E, [
    { from: exp(0.1), to: 1.2, major: 0.01 },
    { from: 1.2, to: 1.5, major: 0.05 },
    { from: 1.5, to: 2, major: 0.1 },
    { from: 2, to: E, major: 0.1 },
  ]),
  logLog("LL3", 0, E, exp(10), [
    { from: E, to: 4, major: 0.5 },
    { from: 4, to: 6, major: 1 },
    { from: 6, to: 10, major: 1 },
    { from: 10, to: 20, major: 5 },
    { from: 20, to: 50, major: 10 },
    { from: 50, to: 100, major: 50 },
    { from: 100, to: 200, major: 100 },
    { from: 200, to: 500, major: 100 },
    { from: 500, to: 1000, major: 500 },
    { from: 1000, to: 2000, major: 1000 },
    { from: 2000, to: 5000, major: 1000 },
    { from: 5000, to: 10000, major: 5000 },
    { from: 10000, to: exp(10), major: 10000 },
  ]),
  negativeLogLog("LL01", 2, exp(-0.1), exp(-0.01), [
    { from: exp(-0.1), to: 0.95, major: 0.01 },
    { from: 0.95, to: 0.98, major: 0.005 },
    { from: 0.98, to: exp(-0.01), major: 0.001 },
  ]),
  negativeLogLog("LL02", 1, exp(-1), exp(-0.1), [
    { from: exp(-1), to: 0.5, major: 0.05 },
    { from: 0.5, to: 0.8, major: 0.05 },
    { from: 0.8, to: exp(-0.1), major: 0.01 },
  ]),
  negativeLogLog("LL03", 0, exp(-10), exp(-1), [
    { from: exp(-10), to: 0.0001, major: 0.00005 },
    { from: 0.0001, to: 0.001, major: 0.0005 },
    { from: 0.001, to: 0.01, major: 0.005 },
    { from: 0.01, to: 0.1, major: 0.01 },
    { from: 0.1, to: 0.2, major: 0.05 },
    { from: 0.2, to: exp(-1), major: 0.05 },
  ]),
];

const BY_ID = new Map(SCALES.map((scale) => [scale.id, scale]));

/** Old scale ids mapped to their current id, so saved and shared rules survive renames. */
export const SCALE_ALIASES: Readonly<Record<string, string>> = {};

export function getScale(id: string): ScaleSpec | undefined {
  return BY_ID.get(id);
}

export function requireScale(id: string): ScaleSpec {
  const scale = BY_ID.get(id);
  if (!scale) throw new Error(`Unknown scale ${id}`);
  return scale;
}
