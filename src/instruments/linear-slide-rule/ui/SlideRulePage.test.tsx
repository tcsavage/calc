import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getPreset } from "../../../core/slide-rule/rule/presets";
import type { LinearRule } from "../../../core/slide-rule/rule/types";
import { createKeyValueStore } from "../../../shared/localStorageStore";
import { storageSessionPort } from "../../slide-rule-kit/adapters/sessionPort";
import { startAutosave } from "../../slide-rule-kit/state/persistence";
import { resolveStartup } from "../../slide-rule-kit/state/startup";
import {
  createSlideRuleStore,
  defaultSession,
  type SlideRuleStore,
} from "../../slide-rule-kit/state/store";
import { LINEAR_CONFIG } from "../config";
import { SlideRulePage } from "./SlideRulePage";

const newStore = () => createSlideRuleStore(LINEAR_CONFIG, defaultSession(LINEAR_CONFIG));

function renderPage(store: SlideRuleStore<LinearRule> = newStore()) {
  const view = render(<SlideRulePage store={store} readoutVisible />);
  return { store, ...view };
}

function readout() {
  const table = screen.getByRole("table", { name: "Readout" });
  return Object.fromEntries(
    within(table)
      .getAllByRole("row")
      .map((row) => [row.querySelector("th")?.textContent, row.querySelector("td")?.textContent]),
  );
}

test("renders the default Rietz rule with a readout at the left index", () => {
  renderPage();
  expect(readout()).toMatchObject({ D: "1.000", C: "1.000", CI: "10.00" });
  expect(screen.getByRole("group", { name: /Rietz/ })).toHaveTextContent("K");
});

test("arrow keys move the cursor, finer with Shift", async () => {
  const { store } = renderPage();
  screen.getByRole("slider", { name: "Cursor" }).focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(store.getState().state.cursor).toBeCloseTo(0.002);
  await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
  expect(store.getState().state.cursor).toBeCloseTo(0.0022);
  expect(screen.getByRole("slider", { name: "Cursor" })).toHaveAttribute("aria-valuenow", "0.0022");
});

test("flip shows the back of the slide and keeps the setting; reset returns to the index", async () => {
  const { store } = renderPage();
  act(() => store.getState().setPosition({ slideOffset: 0.2, cursor: 0.5 }));
  await userEvent.click(screen.getByRole("button", { name: "Flip to back" }));
  expect(Object.keys(readout())).toEqual(["S", "ST", "T"]);
  expect(screen.getByRole("slider", { name: "Slide" })).toHaveAttribute("aria-valuenow", "0.2");
  await userEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(store.getState().state).toMatchObject({ slideOffset: 0, cursor: 0 });
});

test("choosing the duplex preset shows its faces", async () => {
  renderPage();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Rule" }), "Log Log Duplex");
  expect(Object.keys(readout()).slice(0, 3)).toEqual(["LL02", "LL03", "DF"]);
  await userEvent.click(screen.getByRole("button", { name: "Flip to back" }));
  expect(Object.keys(readout())[0]).toBe("LL01");
});

test("the editor changes scales live and forks the preset", async () => {
  const { store } = renderPage();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Rule" }), "Mannheim");
  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  const editor = screen.getByRole("complementary", { name: "Scale editor" });
  await userEvent.selectOptions(
    within(editor).getByRole("combobox", { name: "Add scale to upper stator" }),
    "K",
  );
  const slide = within(editor).getByRole("region", { name: "Front slide" });
  await userEvent.click(within(slide).getByRole("button", { name: "Remove CI" }));
  await userEvent.click(within(slide).getByRole("button", { name: "Move C up" }));
  await userEvent.click(within(slide).getByRole("button", { name: "Toggle ink of C" }));
  expect(Object.keys(readout())).toEqual(["A", "K", "C", "B", "D"]);
  expect(store.getState().rule.faces.front.slide[0]).toEqual({ scale: "C", ink: "red" });
  expect(screen.getByRole("combobox", { name: "Rule" })).toHaveDisplayValue("Mannheim (modified)");
  expect(getPreset("mannheim")?.faces.front.slide.map((p) => p.scale)).toEqual(["B", "CI", "C"]);
});

test("a rule saved in the editor appears under Saved", async () => {
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  const name = screen.getByRole("textbox", { name: "Rule name" });
  await userEvent.clear(name);
  await userEvent.type(name, "Mine");
  await userEvent.click(screen.getByRole("button", { name: "Save as" }));
  const picker = screen.getByRole("combobox", { name: "Rule" });
  expect(within(picker).getByRole("group", { name: "Saved" })).toHaveTextContent("Mine");
  expect(picker).toHaveDisplayValue("Mine");
});

test("the setting and saved rules survive a reload", () => {
  vi.useFakeTimers();
  const port = storageSessionPort(createKeyValueStore(localStorage), LINEAR_CONFIG.storageKeys);
  const first = createSlideRuleStore(LINEAR_CONFIG, resolveStartup(LINEAR_CONFIG, null, port));
  const autosave = startAutosave(first, port);
  first.getState().setPosition({ slideOffset: 0.25 });
  first.getState().saveAs("Mine");
  vi.advanceTimersByTime(600);
  autosave.stop();
  vi.useRealTimers();

  renderPage(createSlideRuleStore(LINEAR_CONFIG, resolveStartup(LINEAR_CONFIG, null, port)));
  expect(screen.getByRole("slider", { name: "Slide" })).toHaveAttribute("aria-valuenow", "0.25");
  expect(screen.getByRole("combobox", { name: "Rule" })).toHaveDisplayValue("Mine");
});
