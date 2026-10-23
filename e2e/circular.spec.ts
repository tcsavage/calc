import { expect, test } from "@playwright/test";
import { encodeSharePayload } from "../src/core/slide-rule/codec/base64url";
import { CIRCULAR_PRESETS } from "../src/core/slide-rule/rule/circularPresets";
import { centreOf, drag, dragArc, readout, sliderValue } from "./helpers";

const ROUTE = "./#/circular-slide-rule";
const rule = (page: import("@playwright/test").Page) =>
  page.getByRole("group", { name: /circular slide rule/ });
const disc = (page: import("@playwright/test").Page) =>
  page.locator("svg.rule-svg circle[data-part=disc]");

/** D should read C times ten to the disc offset, within one decade. */
function expectProduct(values: Record<string, string>, offset: number) {
  let product = Number(values.C) * 10 ** offset;
  if (product >= 10) product /= 10;
  expect(Math.abs(Number(values.D) - product) / product).toBeLessThan(0.01);
}

test.beforeEach(async ({ page }) => {
  await page.goto(ROUTE);
  await expect(rule(page)).toBeVisible();
});

test("opens on the Basic rule at the index", async ({ page }) => {
  await expect(rule(page)).toHaveAccessibleName("Basic circular slide rule, front face");
  expect(await readout(page)).toMatchObject({ D: "1.000", C: "1.000", CI: "10.00" });
});

test("turning the disc by dragging and the cursor by keys multiplies", async ({ page }) => {
  const centre = await centreOf(disc(page));
  await dragArc(page, centre, centre.radius * 0.6, 200, 290);
  const offset = await sliderValue(page.getByRole("slider", { name: "Disc" }));
  expect(offset).toBeCloseTo(0.25, 2);
  const cursor = page.getByRole("slider", { name: "Cursor" });
  await cursor.focus();
  for (let i = 0; i < 200; i++) await page.keyboard.press("ArrowRight");
  expect(await sliderValue(cursor)).toBeCloseTo(0.4, 3);
  expectProduct(await readout(page), offset);
});

test("rotate view keeps the hairline at the top while the cursor turns", async ({ page }) => {
  const hairline = page.locator("svg.rule-svg [data-hairline]");
  await page.getByRole("slider", { name: "Cursor" }).focus();
  for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowRight");
  const centre = await centreOf(disc(page));
  const top = await centreOf(hairline);
  expect(Math.abs(top.x - centre.x)).toBeLessThan(2);
  expect(top.y).toBeLessThan(centre.y);
  await page.getByRole("button", { name: "Rotate view" }).click();
  expect((await centreOf(hairline)).x).toBeGreaterThan(centre.x + 20);
});

test("dragging the rule in rotate view turns it under the fixed hairline", async ({ page }) => {
  const centre = await centreOf(disc(page));
  const outer = (await centreOf(page.locator("svg.rule-svg [data-part=body] circle"))).radius;
  await dragArc(page, centre, outer * 0.95, 20, 80);
  const cursor = await sliderValue(page.getByRole("slider", { name: "Cursor" }));
  expect(cursor).toBeCloseTo(1 - 60 / 360, 2);
  const top = await centreOf(page.locator("svg.rule-svg [data-hairline]"));
  expect(Math.abs(top.x - centre.x)).toBeLessThan(2);
});

test("flipping keeps the computation", async ({ page }) => {
  await page.getByRole("combobox", { name: "Rule" }).selectOption({ label: "Scientific duplex" });
  await page.getByRole("slider", { name: "Disc" }).focus();
  for (let i = 0; i < 150; i++) await page.keyboard.press("ArrowRight");
  await page.getByRole("slider", { name: "Cursor" }).focus();
  for (let i = 0; i < 230; i++) await page.keyboard.press("ArrowRight");
  const front = await readout(page);
  await page.getByRole("button", { name: "Flip to back" }).click();
  const back = await readout(page);
  expect(Object.keys(back)).toEqual(["D", "S", "T", "C", "ST"]);
  expect(back.D).toBe(front.D);
  expect(back.C).toBe(front.C);
  expect(await sliderValue(page.getByRole("slider", { name: "Disc" }))).toBeCloseTo(0.3, 5);
});

const loglog = CIRCULAR_PRESETS[2];
const payload = () => {
  if (!loglog) throw new Error("missing preset");
  return encodeSharePayload({
    rule: loglog,
    state: { face: "front", slideOffset: Math.log10(2), cursor: Math.log10(6), rotateView: true },
  });
};

test("a shared link restores the rule and setting, then drops the payload", async ({ page }) => {
  await page.goto(`${ROUTE}?s=${payload()}`);
  await expect(page.getByRole("combobox", { name: "Rule", exact: true })).toHaveValue(
    "preset:circular-loglog",
  );
  await expect.poll(async () => (await readout(page)).D).toBe("6.000");
  expect((await readout(page)).C).toBe("3.000");
  expect(page.url()).not.toContain("s=");
});

test("a circular link opened from the linear rule opens on the circular rule", async ({ page }) => {
  await page.goto("./#/linear-slide-rule");
  await expect(page.getByRole("group", { name: /Rietz slide rule/ })).toBeVisible();
  await page.goto(`${ROUTE}?s=${payload()}`);
  await expect(rule(page)).toHaveAccessibleName("Log-log duplex circular slide rule, front face");
  await expect.poll(async () => (await readout(page)).D).toBe("6.000");
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("the setting survives a reload", async ({ page }) => {
  await page.getByRole("slider", { name: "Disc" }).focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Rotate view" }).click();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(rule(page)).toBeVisible();
  expect(await sliderValue(page.getByRole("slider", { name: "Disc" }))).toBeCloseTo(0.96, 5);
  await expect(page.getByRole("button", { name: "Rotate view" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("dragging inside the pinned loupe turns four times more finely", async ({ page }) => {
  const cursor = page.getByRole("slider", { name: "Cursor" });
  const centre = await centreOf(disc(page));
  const edge = { x: centre.x, y: centre.y - centre.radius };
  await drag(page, edge, 30);
  const main = await sliderValue(cursor);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "Pin loupe" }).click();
  const loupe = await page.getByRole("region", { name: "Loupe" }).boundingBox();
  if (!loupe) throw new Error("no loupe");
  await drag(page, { x: loupe.x + loupe.width / 2, y: loupe.y + loupe.height / 2 }, 30);
  const fine = await sliderValue(cursor);
  const turned = (value: number) => 1 - value;
  const ratio = turned(main) / turned(fine);
  expect(ratio).toBeGreaterThan(3.6);
  expect(ratio).toBeLessThan(4.4);
});
