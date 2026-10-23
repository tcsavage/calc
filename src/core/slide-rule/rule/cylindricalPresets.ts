import { skin } from "./presets";
import type { CylindricalRule, FaceDefinition } from "./types";

const scales = (...ids: string[]) => ids.map((scale) => ({ scale }));

const face = (
  upper: string[],
  slide: string[],
  lower: string[],
): FaceDefinition<"cylindrical"> => ({
  upper: scales(...upper),
  slide: scales(...slide),
  lower: scales(...lower),
});

/** A cylinder has no back, so every preset leaves the back face empty. */
const EMPTY = face([], [], []);

export const CYLINDRICAL_PRESETS: readonly CylindricalRule[] = [
  {
    id: "cylindrical-short",
    name: "Short helix",
    kind: "cylindrical",
    turns: 5,
    skin: skin({ body: "#efe9dc", slide: "#f8f4ea" }, { body: "#2b2925", slide: "#34312b" }),
    faces: { front: face([], ["C"], ["D"]), back: EMPTY },
  },
  {
    id: "cylindrical-scientific",
    name: "Scientific helix",
    kind: "cylindrical",
    turns: 10,
    skin: skin({ body: "#e9eef2", slide: "#f6f8fa" }, { body: "#23272b", slide: "#2c3136" }),
    faces: { front: face(["K", "A"], ["B", "CI", "C"], ["D", "L"]), back: EMPTY },
  },
  {
    id: "cylindrical-long",
    name: "Long helix",
    kind: "cylindrical",
    turns: 25,
    skin: skin({ body: "#ece7df", slide: "#f7f3ec" }, { body: "#29262a", slide: "#322e33" }),
    faces: { front: face([], ["C"], ["D"]), back: EMPTY },
  },
];

export const DEFAULT_CYLINDRICAL_PRESET_ID = "cylindrical-short";
