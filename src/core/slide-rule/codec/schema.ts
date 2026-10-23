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
const face = z.object({ upper: section, slide: section, lower: section });

export const ruleSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  kind: z.literal("linear"),
  basedOn: z.string().max(64).optional(),
  skin: z.object({ light: palette, dark: palette }),
  faces: z.object({ front: face, back: face }),
});

export const stateSchema = z.object({
  face: z.enum(["front", "back"]),
  slideOffset: z.number(),
  cursor: z.number(),
});

export const sessionEnvelope = z.object({ v: z.literal(1), rule: ruleSchema, state: stateSchema });
export const savedEnvelope = z.object({ v: z.literal(1), rules: z.array(ruleSchema).max(200) });
