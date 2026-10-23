import { RULE_WIDTH } from "../../../core/slide-rule/geometry/layout";
import { fitView, loupeViewBox, MAX_ZOOM, viewBoxFor, zoomAt } from "./viewMath";

const container = { width: 600, height: 300 };
const rule = (height: number) => ({ x: 0, y: 0, width: RULE_WIDTH, height });

test("at zoom 1 the whole rule is visible and centred", () => {
  const box = viewBoxFor(fitView(rule(168)), container, rule(168));
  expect(box.width).toBeGreaterThanOrEqual(RULE_WIDTH);
  expect(box.x + box.width / 2).toBeCloseTo(RULE_WIDTH / 2);
  expect(box.height / box.width).toBeCloseTo(0.5);
});

test("a tall rule in a wide container is fitted by height", () => {
  const box = viewBoxFor(fitView(rule(800)), { width: 1000, height: 100 }, rule(800));
  expect(box.height).toBeGreaterThanOrEqual(800);
});

test("zooming keeps the point under the pointer fixed and clamps the zoom", () => {
  const view = fitView(rule(168));
  const point = { x: 150, y: 100 };
  const before = viewBoxFor(view, container, rule(168));
  const zoomed = zoomAt(view, 3, point, container, rule(168));
  const after = viewBoxFor(zoomed, container, rule(168));
  const under = (box: typeof before) => box.x + (point.x / container.width) * box.width;
  expect(under(after)).toBeCloseTo(under(before));
  expect(after.width).toBeCloseTo(before.width / 3);
  expect(zoomAt(view, 100, point, container, rule(168)).zoom).toBe(MAX_ZOOM);
});

test("the loupe magnifies four times around the hairline", () => {
  const main = { x: 0, y: 0, width: 1200, height: 600 };
  const box = loupeViewBox(main, 600, { width: 200, height: 100 }, { x: 500, y: 80 });
  expect(box.width).toBe(100);
  expect(box.height).toBe(50);
  expect(box.x + box.width / 2).toBe(500);
  expect(box.y + box.height / 2).toBe(80);
});
