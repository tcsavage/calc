import { computeReadout } from "./readout";
import { getPreset } from "./rule/presets";

const rietz = getPreset("rietz");
if (!rietz) throw new Error("missing preset");
const front = rietz.faces.front;

const read = (slideOffset: number, cursor: number) =>
  Object.fromEntries(
    computeReadout(front, { face: "front", slideOffset, cursor }).map((entry) => [
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
    computeReadout(front, { face: "front", slideOffset: 0, cursor: 0 }).map((entry) => entry.scale),
  ).toEqual(["K", "A", "B", "CI", "C", "D", "L"]);
});
