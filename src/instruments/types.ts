import type { ComponentType } from "react";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  theme: Theme;
  readoutVisible: boolean;
}

export interface InstrumentProps {
  settings: Settings;
  updateSettings(patch: Partial<Settings>): void;
}

/** What the app shell knows about an instrument; everything else is private to its folder. */
export interface InstrumentEntry {
  id: string;
  name: string;
  description: string;
  /** Path to an icon image, relative to the site root. */
  icon: string;
  load(): Promise<{ default: ComponentType<InstrumentProps> }>;
  /** Clears the instrument's working state after a crash, keeping anything the user saved. */
  resetStorage(): void;
}
