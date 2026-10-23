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
