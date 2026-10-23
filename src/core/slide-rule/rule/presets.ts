import type { FaceDefinition, LinearRule, Palette, Skin } from "./types";

const scales = (...ids: string[]) => ids.map((scale) => ({ scale }));

const face = (upper: string[], slide: string[], lower: string[]): FaceDefinition => ({
  upper: scales(...upper),
  slide: scales(...slide),
  lower: scales(...lower),
});

const DARK_BASE: Omit<Palette, "body" | "slide"> = {
  ink: "#e8e4d8",
  redInk: "#ff7b6b",
  hairline: "#ff5a47",
  glass: "rgba(200, 220, 255, 0.10)",
};

export function skin(
  light: Pick<Palette, "body" | "slide">,
  dark: Pick<Palette, "body" | "slide">,
): Skin {
  return {
    light: {
      ...light,
      ink: "#1d1d1b",
      redInk: "#c0392b",
      hairline: "#d0021b",
      glass: "rgba(190, 215, 235, 0.25)",
    },
    dark: { ...dark, ...DARK_BASE },
  };
}

export const PRESETS: readonly LinearRule[] = [
  {
    id: "mannheim",
    name: "Mannheim",
    kind: "linear",
    skin: skin({ body: "#f4efe1", slide: "#ece4cf" }, { body: "#2b2a26", slide: "#34322c" }),
    faces: {
      front: face(["A"], ["B", "CI", "C"], ["D"]),
      back: face([], ["S", "L", "T"], []),
    },
  },
  {
    id: "rietz",
    name: "Rietz",
    kind: "linear",
    skin: skin({ body: "#f7f5ee", slide: "#eef0e6" }, { body: "#25282a", slide: "#2e3235" }),
    faces: {
      front: face(["K", "A"], ["B", "CI", "C"], ["D", "L"]),
      back: face([], ["S", "ST", "T"], []),
    },
  },
  {
    id: "darmstadt",
    name: "Darmstadt",
    kind: "linear",
    skin: skin({ body: "#f3f1ea", slide: "#e3ece4" }, { body: "#242a27", slide: "#2c3530" }),
    faces: {
      front: face(["L", "K", "A"], ["B", "CI", "C"], ["D", "P", "S", "T"]),
      back: face([], ["LL1", "LL2", "LL3"], []),
    },
  },
  {
    id: "loglog-duplex",
    name: "Log Log Duplex",
    kind: "linear",
    skin: skin({ body: "#eef3ea", slide: "#f6f8f2" }, { body: "#232823", slide: "#2b322b" }),
    faces: {
      front: face(["LL02", "LL03", "DF"], ["CF", "CIF", "CI", "C"], ["D", "LL3", "LL2"]),
      back: face(["LL01", "L", "K", "A"], ["B", "T", "ST", "S"], ["D", "DI", "LL1"]),
    },
  },
];

export const DEFAULT_PRESET_ID = "rietz";

export function getPreset(id: string): LinearRule | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export function defaultRule(): LinearRule {
  return getPreset(DEFAULT_PRESET_ID) as LinearRule;
}
