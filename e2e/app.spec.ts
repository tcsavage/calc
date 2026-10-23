import { expect, test } from "@playwright/test";
import { encodeSharePayload } from "../src/core/slide-rule/codec/base64url";
import { getPreset } from "../src/core/slide-rule/rule/presets";
import { drag, readout, sliderValue } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./#/linear-slide-rule");
  await expect(page.getByRole("group", { name: /slide rule/ })).toBeVisible();
});

test("opens on the Rietz rule at the left index", async ({ page }) => {
  expect(await readout(page)).toMatchObject({ D: "1.000", C: "1.000", CI: "10.00" });
});

test("dragging the slide and moving the cursor multiplies", async ({ page }) => {
  const slide = page.getByRole("slider", { name: "Slide" });
  const cursor = page.getByRole("slider", { name: "Cursor" });
  const box = await page.locator("svg.rule-svg [data-part=slide] rect").first().boundingBox();
  if (!box) throw new Error("no slide");
  await drag(page, { x: box.x + box.width * 0.5, y: box.y + box.height / 2 }, box.width * 0.2);
  const offset = await sliderValue(slide);
  expect(offset).toBeGreaterThan(0.1);
  await cursor.focus();
  for (let i = 0; i < 200; i++) await page.keyboard.press("ArrowRight");
  const values = await readout(page);
  const product = Number(values.C) * 10 ** offset;
  expect(Math.abs(Number(values.D) - product) / product).toBeLessThan(0.01);
  expect(await sliderValue(cursor)).toBeCloseTo(0.4, 3);
});

test("flipping shows the back and keeps the slide where it was", async ({ page }) => {
  const slide = page.getByRole("slider", { name: "Slide" });
  await slide.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Flip to back" }).click();
  expect(Object.keys(await readout(page))).toEqual(["S", "ST", "T"]);
  expect(await sliderValue(slide)).toBeCloseTo(0.002, 5);
});

test("a shared link restores the rule and setting, then drops the payload", async ({ page }) => {
  const rule = getPreset("loglog-duplex");
  if (!rule) throw new Error("missing preset");
  const payload = encodeSharePayload({
    rule,
    state: { face: "front", slideOffset: Math.log10(2), cursor: Math.log10(6) },
  });
  await page.goto(`./#/linear-slide-rule?s=${payload}`);
  await expect(page.getByRole("combobox", { name: "Rule", exact: true })).toHaveValue(
    "preset:loglog-duplex",
  );
  await expect.poll(async () => (await readout(page)).D).toBe("6.000");
  expect((await readout(page)).C).toBe("3.000");
  expect(page.url()).not.toContain("s=");
});

test("the loupe follows a drag and can be pinned", async ({ page }) => {
  const box = await page.locator("svg.rule-svg [data-part=cursor] rect").boundingBox();
  if (!box) throw new Error("no cursor");
  const loupe = page.getByRole("region", { name: "Loupe" });
  await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 60, async () => {
    await expect(loupe).toBeVisible();
  });
  await expect(loupe).toBeHidden();
  await page.getByRole("button", { name: "Pin loupe" }).click();
  await expect(loupe).toBeVisible();
});

test("the setting survives a reload", async ({ page }) => {
  await page.getByRole("slider", { name: "Cursor" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  await page.reload();
  expect(await sliderValue(page.getByRole("slider", { name: "Cursor" }))).toBeCloseTo(0.002, 5);
});

test("works offline once loaded", async ({ page, context, browserName }) => {
  test.skip(
    browserName !== "chromium",
    "service workers are only reliable in Chromium under Playwright",
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("group", { name: /slide rule/ })).toBeVisible();
});

test("the floating loupe sits above the finger and inside the window", async ({ page }) => {
  const box = await page.locator("svg.rule-svg [data-part=cursor] rect").boundingBox();
  if (!box) throw new Error("no cursor");
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await drag(page, start, 40, async () => {
    const loupe = await page.getByRole("region", { name: "Loupe" }).boundingBox();
    const window = page.viewportSize();
    if (!loupe || !window) throw new Error("no loupe");
    expect(loupe.y + loupe.height).toBeLessThan(start.y);
    expect(loupe.x).toBeGreaterThanOrEqual(0);
    expect(loupe.x + loupe.width).toBeLessThanOrEqual(window.width);
    expect(loupe.y).toBeGreaterThanOrEqual(0);
  });
});

test("dragging inside the pinned loupe moves the cursor four times more finely", async ({
  page,
}) => {
  const cursor = page.getByRole("slider", { name: "Cursor" });
  const main = await page.locator("svg.rule-svg [data-part=cursor] rect").boundingBox();
  if (!main) throw new Error("no cursor");
  await drag(page, { x: main.x + main.width / 2, y: main.y + main.height / 2 }, 100);
  const coarse = await sliderValue(cursor);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "Pin loupe" }).click();
  const hairline = await page.locator(".loupe-docked [data-part=cursor] line").boundingBox();
  const loupe = await page.getByRole("region", { name: "Loupe" }).boundingBox();
  if (!hairline || !loupe) throw new Error("no loupe cursor");
  await drag(page, { x: hairline.x + 2, y: loupe.y + loupe.height / 2 }, 100);
  const fine = await sliderValue(cursor);
  expect(coarse / fine).toBeGreaterThan(3.6);
  expect(coarse / fine).toBeLessThan(4.4);
});
