import { z } from "zod";

const colour = z.string().max(64);
const palette = z.object({
  body: colour,
  slide: colour,
  ink: colour,
  redInk: colour,
  hairline: colour,
  glass: colour,
});
const placement = z.object({
  scale: z.string().min(1).max(16),
  ink: z.enum(["black", "red"]).optional(),
});
const section = z.array(placement).max(16);
const linearFace = z.object({ upper: section, slide: section, lower: section });
const circularFace = z.object({ outer: section, disc: section });
const common = {
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  basedOn: z.string().max(64).optional(),
  skin: z.object({ light: palette, dark: palette }),
};

export const ruleSchema = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("linear"),
    faces: z.object({ front: linearFace, back: linearFace }),
  }),
  z.object({
    ...common,
    kind: z.literal("circular"),
    faces: z.object({ front: circularFace, back: circularFace }),
  }),
  z.object({
    ...common,
    kind: z.literal("cylindrical"),
    turns: z.number().int().min(2).max(40),
    faces: z.object({ front: linearFace, back: linearFace }),
  }),
]);

export const stateSchema = z.object({
  face: z.enum(["front", "back"]),
  slideOffset: z.number(),
  cursor: z.number(),
  rotateView: z.boolean().optional(),
});

export const sessionEnvelope = z.object({ v: z.literal(1), rule: ruleSchema, state: stateSchema });
export const savedEnvelope = z.object({ v: z.literal(1), rules: z.array(ruleSchema).max(200) });
