import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CylindricalRule } from "../../../core/slide-rule/rule/types";
import {
  createSlideRuleStore,
  defaultSession,
  type SlideRuleStore,
} from "../../slide-rule-kit/state/store";
import { KEY_STEP } from "../../slide-rule-kit/ui/keys";
import { CYLINDRICAL_CONFIG } from "../config";
import { CylindricalSlideRulePage } from "./CylindricalSlideRulePage";

const newStore = () => createSlideRuleStore(CYLINDRICAL_CONFIG, defaultSession(CYLINDRICAL_CONFIG));

function renderPage(store: SlideRuleStore<CylindricalRule> = newStore()) {
  const view = render(<CylindricalSlideRulePage store={store} readoutVisible />);
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

test("opens on the Short helix at the left index, with no back to flip to", () => {
  renderPage();
  expect(readout()).toEqual({ C: "1.000", D: "1.000" });
  expect(
    screen.getByRole("group", { name: "Short helix cylindrical slide rule" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Flip/ })).not.toBeInTheDocument();
});

test("arrow keys move the same arc length as on a straight rule", async () => {
  const { store } = renderPage();
  screen.getByRole("slider", { name: "Cursor" }).focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(store.getState().state.cursor).toBeCloseTo(KEY_STEP / 5, 9);
  screen.getByRole("slider", { name: "Slide" }).focus();
  await userEvent.keyboard("{Shift>}{ArrowLeft}{/Shift}");
  expect(store.getState().state.slideOffset).toBeCloseTo(-KEY_STEP / 50, 9);
});

test("the longer helix reads to five figures", async () => {
  const { store } = renderPage();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Rule" }), "Long helix");
  act(() => store.getState().setPosition({ slideOffset: Math.log10(2), cursor: Math.log10(6) }));
  expect(readout()).toEqual({ C: "3.0000", D: "6.0000" });
});

test("the scale names of the turns on screen are printed beside the cylinder", () => {
  const { container } = renderPage();
  const names = [...container.querySelectorAll("svg.rule-svg [data-name]")].map(
    (name) => name.textContent,
  );
  expect(names).toContain("C");
  expect(names).toContain("D");
});

test("the editor has no face tabs", async () => {
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  const editor = screen.getByRole("complementary", { name: "Scale editor" });
  expect(within(editor).queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  expect(within(editor).getByRole("region", { name: "Front slide" })).toBeInTheDocument();
});
