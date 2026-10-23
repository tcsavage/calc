import { expect, type Page, test } from "@playwright/test";
import { encodeSharePayload } from "../src/core/slide-rule/codec/base64url";
import { CYLINDRICAL_PRESETS } from "../src/core/slide-rule/rule/cylindricalPresets";
import { centreOf, drag, readout, sliderValue } from "./helpers";

const ROUTE = "./#/cylindrical-slide-rule";
const rule = (page: Page) => page.getByRole("group", { name: /cylindrical slide rule/ });
const hairline = (page: Page) => page.locator("svg.rule-svg [data-hairline]");

/** The cylinder's axis and radius on screen, from its body. */
async function cylinder(page: Page) {
  const box = await page.locator("svg.rule-svg [data-part=body] rect").first().boundingBox();
  if (!box) throw new Error("no cylinder");
  return { axis: box.x + box.width / 2, radius: box.width / 2 };
}

test.beforeEach(async ({ page }) => {
  await page.goto(ROUTE);
  await expect(rule(page)).toBeVisible();
});

test("opens on the Short helix at the index, with nothing to flip", async ({ page }) => {
  await expect(rule(page)).toHaveAccessibleName("Short helix cylindrical slide rule");
  expect(await readout(page)).toEqual({ C: "1.000", D: "1.000" });
  await expect(page.getByRole("button", { name: /Flip/ })).toHaveCount(0);
});

test("moving the slide along the helix and the cursor by keys multiplies", async ({ page }) => {
  const { axis, radius } = await cylinder(page);
  const strip = await centreOf(page.locator("svg.rule-svg path[data-part=slide]").nth(1));
  await drag(page, { x: axis - radius / 2, y: strip.y }, radius);
  const offset = await sliderValue(page.getByRole("slider", { name: "Slide" }));
  // Half the radius either side of the axis is a sixth of a turn, on a helix of five turns.
  expect(offset).toBeCloseTo(1 / 30, 2);
  const cursor = page.getByRole("slider", { name: "Cursor" });
  await cursor.focus();
  for (let i = 0; i < 200; i++) await page.keyboard.press("ArrowRight");
  expect(await sliderValue(cursor)).toBeCloseTo(0.08, 4);
  const values = await readout(page);
  const product = Number(values.C) * 10 ** offset;
  expect(Math.abs(Number(values.D) - product) / product).toBeLessThan(0.01);
});

test("a sideways drag turns the rule under the hairline", async ({ page }) => {
  const { axis, radius } = await cylinder(page);
  const line = await centreOf(hairline(page));
  await drag(page, { x: axis + radius * 0.4, y: line.y + 60 }, -radius * 0.8);
  const expected = (2 * Math.asin(0.4)) / (2 * Math.PI) / 5;
  expect(await sliderValue(page.getByRole("slider", { name: "Cursor" }))).toBeCloseTo(expected, 3);
  expect(Math.abs((await centreOf(hairline(page))).x - axis)).toBeLessThan(2);
});

test("the long helix reads to five figures", async ({ page }) => {
  await page.getByRole("combobox", { name: "Rule" }).selectOption({ label: "Long helix" });
  expect(await readout(page)).toEqual({ C: "1.0000", D: "1.0000" });
});

const scientific = CYLINDRICAL_PRESETS[1];
const payload = () => {
  if (!scientific) throw new Error("missing preset");
  return encodeSharePayload({
    rule: scientific,
    state: { face: "front", slideOffset: Math.log10(2), cursor: Math.log10(6) },
  });
};

test("a shared link restores the rule and setting, then drops the payload", async ({ page }) => {
  await page.goto(`${ROUTE}?s=${payload()}`);
  await expect(page.getByRole("combobox", { name: "Rule", exact: true })).toHaveValue(
    "preset:cylindrical-scientific",
  );
  await expect.poll(async () => (await readout(page)).D).toBe("6.0000");
  expect((await readout(page)).C).toBe("3.0000");
  expect(page.url()).not.toContain("s=");
});

test("a cylindrical link opened from the linear rule opens here", async ({ page }) => {
  await page.goto("./#/linear-slide-rule");
  await expect(page.getByRole("group", { name: /Rietz slide rule/ })).toBeVisible();
  await page.goto(`${ROUTE}?s=${payload()}`);
  await expect(rule(page)).toHaveAccessibleName("Scientific helix cylindrical slide rule");
  await expect.poll(async () => (await readout(page)).D).toBe("6.0000");
});

test("the setting survives a reload", async ({ page }) => {
  await page.getByRole("slider", { name: "Slide" }).focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  await page.reload();
  await expect(rule(page)).toBeVisible();
  expect(await sliderValue(page.getByRole("slider", { name: "Slide" }))).toBeCloseTo(0.008, 6);
});

test("dragging inside the pinned loupe turns four times more finely", async ({ page }) => {
  const cursor = page.getByRole("slider", { name: "Cursor" });
  const line = await centreOf(hairline(page));
  await drag(page, line, -30);
  const main = await sliderValue(cursor);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "Pin loupe" }).click();
  const loupe = await page.getByRole("region", { name: "Loupe" }).boundingBox();
  if (!loupe) throw new Error("no loupe");
  await drag(page, { x: loupe.x + loupe.width / 2, y: loupe.y + loupe.height / 2 }, -30);
  const ratio = main / (await sliderValue(cursor));
  expect(ratio).toBeGreaterThan(3.6);
  expect(ratio).toBeLessThan(4.4);
});
