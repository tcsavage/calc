import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { InstrumentErrorBoundary } from "./InstrumentErrorBoundary";

afterEach(() => {
  window.location.hash = "";
});

test("renders the app heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Calc" })).toBeInTheDocument();
});

test("the home page links to the slide rule, which opens on the default rule", async () => {
  render(<App />);
  await userEvent.click(screen.getByRole("link", { name: /Linear slide rule/ }));
  expect(await screen.findByRole("group", { name: /Rietz slide rule/ })).toBeInTheDocument();
});

test("an unknown instrument shows not found", () => {
  window.location.hash = "#/abacus";
  render(<App />);
  expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
});

let crash = true;

function Bomb() {
  if (crash) throw new Error("boom");
  return <p>Recovered</p>;
}

test("a crashing instrument offers a reset", async () => {
  let resets = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <InstrumentErrorBoundary
      onReset={() => {
        resets++;
        crash = false;
      }}
    >
      <Bomb />
    </InstrumentErrorBoundary>,
  );
  expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reset to default rule" }));
  expect(screen.getByText("Recovered")).toBeInTheDocument();
  expect(resets).toBe(1);
});
