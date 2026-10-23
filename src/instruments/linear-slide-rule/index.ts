import { createKeyValueStore } from "../../shared/localStorageStore";
import type { InstrumentEntry } from "../types";
import { LINEAR_CONFIG } from "./config";

export const linearSlideRule: InstrumentEntry = {
  id: "linear-slide-rule",
  name: "Linear slide rule",
  description:
    "A straight slide rule with interchangeable scales, from Mannheim to log log duplex.",
  icon: "icon.svg",
  load: () => import("./LinearSlideRule"),
  resetStorage: () => createKeyValueStore().remove(LINEAR_CONFIG.storageKeys.session),
};
