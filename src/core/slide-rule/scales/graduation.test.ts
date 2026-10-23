import { divides, graduate } from "./graduation";

const log = Math.log10;

test("C between 1 and 2 is graduated in hundredths with a nested chain", () => {
  const [segment] = graduate(log, [{ from: 1, to: 2, major: 1 }]);
  expect(segment?.steps).toEqual([1, 0.5, 0.1, 0.05, 0.01]);
  expect(segment?.largeLabelStep).toBe(1);
  expect(segment?.smallLabelStep).toBe(0.1);
});

test("finer steps are dropped where ticks would crowd", () => {
  const [low, high] = graduate(log, [
    { from: 2, to: 4, major: 1 },
    { from: 4, to: 10, major: 1 },
  ]);
  expect(low?.steps).toEqual([1, 0.5, 0.1, 0.02]);
  expect(high?.steps).toEqual([1, 0.5, 0.1, 0.05]);
});

test("each step divides the previous one", () => {
  const segments = graduate(log, [
    { from: 1, to: 2, major: 1 },
    { from: 5, to: 10, major: 5 },
    { from: 10, to: 100, major: 10 },
  ]);
  for (const { steps } of segments) {
    steps.slice(1).forEach((step, index) => {
      expect(divides(step, steps[index] as number)).toBe(true);
    });
  }
});

test("decreasing scales get the same steps as increasing ones", () => {
  const [inverted] = graduate((x) => 1 - log(x), [{ from: 1, to: 2, major: 1 }]);
  expect(inverted?.steps).toEqual([1, 0.5, 0.1, 0.05, 0.01]);
});

test("an explicit label step overrides the spacing rule", () => {
  const [segment] = graduate(log, [{ from: 9, to: 10, major: 1, label: 1 }], { minLargeLabel: 1 });
  expect(segment?.largeLabelStep).toBe(1);
});
