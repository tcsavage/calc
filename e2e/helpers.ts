import type { Locator, Page } from "@playwright/test";

export async function readout(page: Page): Promise<Record<string, string>> {
  const rows = page.getByRole("table", { name: "Readout" }).getByRole("row");
  const entries: [string, string][] = [];
  for (const row of await rows.all()) {
    entries.push([
      (await row.locator("th").textContent()) ?? "",
      (await row.locator("td").textContent()) ?? "",
    ]);
  }
  return Object.fromEntries(entries);
}

export async function sliderValue(locator: Locator): Promise<number> {
  return Number(await locator.getAttribute("aria-valuenow"));
}

/** Drags from the middle of a part of the rule by dx pixels with the mouse, in small steps. */
export async function drag(
  page: Page,
  from: { x: number; y: number },
  dx: number,
  hold?: () => Promise<void>,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y, { steps: 12 });
  await hold?.();
  await page.mouse.up();
}

/** Drags round a circle with the mouse, from one angle to another (degrees clockwise from 12 o'clock). */
export async function dragArc(
  page: Page,
  centre: { x: number; y: number },
  radius: number,
  fromDegrees: number,
  toDegrees: number,
) {
  const at = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return { x: centre.x + radius * Math.sin(radians), y: centre.y - radius * Math.cos(radians) };
  };
  const start = at(fromDegrees);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = Math.max(8, Math.ceil(Math.abs(toDegrees - fromDegrees) / 3));
  for (let step = 1; step <= steps; step++) {
    const point = at(fromDegrees + ((toDegrees - fromDegrees) * step) / steps);
    await page.mouse.move(point.x, point.y);
  }
  await page.mouse.up();
}

export async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, radius: box.width / 2 };
}
