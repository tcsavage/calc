import { computeReadout, readoutDigits } from "./readout";
import { CIRCULAR_PRESETS } from "./rule/circularPresets";
import { CYLINDRICAL_PRESETS } from "./rule/cylindricalPresets";
import { getPreset } from "./rule/presets";
import type { CircularRule, CylindricalRule } from "./rule/types";

const rietz = getPreset("rietz");
if (!rietz) throw new Error("missing preset");

const read = (slideOffset: number, cursor: number) =>
  Object.fromEntries(
    computeReadout(rietz, { face: "front", slideOffset, cursor }).map((entry) => [
      entry.scale,
      entry.text,
    ]),
  );

test("at the left index D and C read 1 and CI reads 10", () => {
  const values = read(0, 0);
  expect(values.D).toBe("1.000");
  expect(values.C).toBe("1.000");
  expect(values.CI).toBe("10.00");
  expect(values.L).toBe("0.000");
});

test("multiplication: C index over D 2, cursor over C 3 reads 6 on D", () => {
  const values = read(Math.log10(2), Math.log10(6));
  expect(values.D).toBe("6.000");
  expect(values.C).toBe("3.000");
});

test("squares: A reads the square of D", () => {
  expect(read(0, Math.log10(3)).A).toBe("9.000");
});

test("slide scales outside the hairline read out of range", () => {
  const values = read(Math.log10(2), 0);
  expect(values.C).toBe("out of range");
  expect(values.D).toBe("1.000");
});

test("entries come in order from the top of the face", () => {
  expect(
    computeReadout(rietz, { face: "front", slideOffset: 0, cursor: 0 }).map((entry) => entry.scale),
  ).toEqual(["K", "A", "B", "CI", "C", "D", "L"]);
});

describe("circular rules", () => {
  const basic = CIRCULAR_PRESETS[0] as CircularRule;
  const readCircular = (slideOffset: number, cursor: number) =>
    Object.fromEntries(
      computeReadout(basic, { face: "front", slideOffset, cursor }).map((entry) => [
        entry.scale,
        entry.text,
      ]),
    );

  test("multiplication: disc index on D 2, cursor over C 3 reads 6 on D", () => {
    const values = readCircular(Math.log10(2), Math.log10(6));
    expect(values.D).toBe("6.000");
    expect(values.C).toBe("3.000");
  });

  test("the disc wraps past 12 o'clock instead of going out of range", () => {
    const values = readCircular(Math.log10(5), Math.log10(2));
    expect(values.C).toBe("4.000");
    expect(values.D).toBe("2.000");
  });

  test("entries run from the outer rings to the disc", () => {
    expect(Object.keys(readCircular(0, 0))).toEqual(["D", "A", "K", "C", "CI", "B"]);
  });
});

describe("cylindrical rules", () => {
  const short = CYLINDRICAL_PRESETS[0] as CylindricalRule;
  const scientific = CYLINDRICAL_PRESETS[1] as CylindricalRule;
  const values = (rule: CylindricalRule, slideOffset: number, cursor: number) =>
    Object.fromEntries(
      computeReadout(rule, { face: "front", slideOffset, cursor }).map((e) => [e.scale, e.text]),
    );

  test("read like a straight rule, to more figures as the helix gets longer", () => {
    expect(readoutDigits(short)).toBe(4);
    expect(readoutDigits(scientific)).toBe(5);
    expect(values(short, Math.log10(2), Math.log10(6))).toMatchObject({ D: "6.000", C: "3.000" });
    expect(values(scientific, Math.log10(2), Math.log10(6))).toMatchObject({
      D: "6.0000",
      C: "3.0000",
    });
    expect(values(scientific, Math.log10(2), 0).C).toBe("out of range");
  });
});
