import { skin } from "./presets";
import type { CircularRule, FaceDefinition } from "./types";

const scales = (...ids: string[]) => ids.map((scale) => ({ scale }));

/** Outer rings listed from the disc edge outward; disc rings from the edge inward. */
const face = (outer: string[], disc: string[]): FaceDefinition<"circular"> => ({
  outer: scales(...outer),
  disc: scales(...disc),
});

const BASIC_FRONT = face(["D", "A", "K"], ["C", "CI", "B"]);

export const CIRCULAR_PRESETS: readonly CircularRule[] = [
  {
    id: "circular-basic",
    name: "Basic",
    kind: "circular",
    skin: skin({ body: "#f5f1e6", slide: "#fbf8f0" }, { body: "#2a2824", slide: "#33302a" }),
    faces: { front: BASIC_FRONT, back: face([], []) },
  },
  {
    id: "circular-scientific",
    name: "Scientific duplex",
    kind: "circular",
    skin: skin({ body: "#eef1f5", slide: "#f8f9fb" }, { body: "#23272c", slide: "#2c3137" }),
    faces: {
      front: face(["D", "A", "K", "L"], ["C", "CI", "B"]),
      back: face(["D", "S", "T"], ["C", "ST"]),
    },
  },
  {
    id: "circular-loglog",
    name: "Log-log duplex",
    kind: "circular",
    skin: skin({ body: "#f1f4ec", slide: "#f9faf5" }, { body: "#242823", slide: "#2d322b" }),
    faces: {
      front: BASIC_FRONT,
      back: face(["D", "LL1", "LL2", "LL3"], ["C", "LL01", "LL02", "LL03"]),
    },
  },
];

export const DEFAULT_CIRCULAR_PRESET_ID = "circular-basic";
