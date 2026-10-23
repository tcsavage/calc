import type { ReactNode } from "react";
import { HashRouter, Link, Route, Routes } from "react-router";
import type { Theme } from "../instruments/types";
import { Home } from "./Home";
import { InstrumentRoute } from "./InstrumentRoute";
import { useSettings } from "./settings";
import "./theme.css";

export function App({ updatePrompt }: { updatePrompt?: ReactNode }) {
  const [settings, updateSettings] = useSettings();
  return (
    <HashRouter>
      <div className="app">
        <header className="app-header">
          <h1>
            <Link to="/">Calc</Link>
          </h1>
          <label className="theme-picker">
            <span className="visually-hidden">Theme</span>
            <select
              aria-label="Theme"
              value={settings.theme}
              onChange={(event) => updateSettings({ theme: event.target.value as Theme })}
            >
              <option value="system">System theme</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </header>
        {updatePrompt}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/:instrumentId"
            element={<InstrumentRoute settings={settings} updateSettings={updateSettings} />}
          />
        </Routes>
      </div>
    </HashRouter>
  );
}
