import { createKeyValueStore } from "../../shared/localStorageStore";
import type { InstrumentEntry } from "../types";
import { SESSION_KEY } from "./adapters/sessionPort";

export const linearSlideRule: InstrumentEntry = {
  id: "linear-slide-rule",
  name: "Linear slide rule",
  description:
    "A straight slide rule with interchangeable scales, from Mannheim to log log duplex.",
  icon: "icon.svg",
  load: () => import("./LinearSlideRule"),
  resetStorage: () => createKeyValueStore().remove(SESSION_KEY),
};
