import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MAX_DISC_RINGS } from "../../../core/slide-rule/geometry/circular";
import type { CircularRule } from "../../../core/slide-rule/rule/types";
import {
  createSlideRuleStore,
  defaultSession,
  type SlideRuleStore,
} from "../../slide-rule-kit/state/store";
import { CIRCULAR_CONFIG } from "../config";
import { CircularSlideRulePage } from "./CircularSlideRulePage";

const newStore = () => createSlideRuleStore(CIRCULAR_CONFIG, defaultSession(CIRCULAR_CONFIG));

function renderPage(store: SlideRuleStore<CircularRule> = newStore()) {
  const view = render(<CircularSlideRulePage store={store} readoutVisible />);
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

test("opens on the Basic rule at the index, in rotate view", () => {
  renderPage();
  expect(readout()).toMatchObject({ D: "1.000", C: "1.000", CI: "10.00", A: "1.000" });
  expect(
    screen.getByRole("group", { name: "Basic circular slide rule, front face" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "Disc" })).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByRole("button", { name: "Rotate view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("arrow keys turn the disc and wrap past 12 o'clock", async () => {
  const { store } = renderPage();
  screen.getByRole("slider", { name: "Disc" }).focus();
  await userEvent.keyboard("{ArrowLeft}");
  expect(store.getState().state.slideOffset).toBeCloseTo(0.998);
  await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
  expect(store.getState().state.slideOffset).toBeCloseTo(0.9982);
});

test("disc and cursor settings multiply on the readout", () => {
  const { store } = renderPage();
  act(() => store.getState().setPosition({ slideOffset: Math.log10(2), cursor: Math.log10(6) }));
  expect(readout()).toMatchObject({ D: "6.000", C: "3.000" });
});

test("rotate view turns the drawing so the hairline points up", async () => {
  const { store, container } = renderPage();
  act(() => store.getState().setPosition({ cursor: 0.25 }));
  const rotor = container.querySelector("[data-rotor]");
  expect(rotor).toHaveAttribute("transform", "rotate(-90)");
  await userEvent.click(screen.getByRole("button", { name: "Rotate view" }));
  expect(container.querySelector("[data-rotor]")).not.toHaveAttribute("transform");
  expect(store.getState().state.rotateView).toBe(false);
});

test("flipping shows the empty back of the Basic rule and keeps the setting", async () => {
  const { store } = renderPage();
  act(() => store.getState().setPosition({ slideOffset: 0.2 }));
  await userEvent.click(screen.getByRole("button", { name: "Flip to back" }));
  expect(within(screen.getByRole("table", { name: "Readout" })).queryAllByRole("row")).toEqual([]);
  expect(screen.getByRole("slider", { name: "Disc" })).toHaveAttribute("aria-valuenow", "0.2");
});

test("the editor names the rings and refuses scales once the disc is full", async () => {
  const { store } = renderPage();
  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  const editor = screen.getByRole("complementary", { name: "Scale editor" });
  expect(within(editor).getByRole("region", { name: "Front outer rings" })).toBeInTheDocument();
  const add = within(editor).getByRole("combobox", { name: "Add scale to disc" });
  for (let i = store.getState().rule.faces.front.disc.length; i < MAX_DISC_RINGS; i++) {
    await userEvent.selectOptions(add, "L");
  }
  expect(add).toBeDisabled();
  expect(within(editor).getByText("The disc is full.")).toBeInTheDocument();
  expect(store.getState().rule.faces.front.disc).toHaveLength(MAX_DISC_RINGS);
});
