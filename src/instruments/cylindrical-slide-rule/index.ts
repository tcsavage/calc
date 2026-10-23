import { createKeyValueStore } from "../../shared/localStorageStore";
import type { InstrumentEntry } from "../types";
import { CYLINDRICAL_CONFIG } from "./config";

export const cylindricalSlideRule: InstrumentEntry = {
  id: "cylindrical-slide-rule",
  name: "Cylindrical slide rule",
  description: "A long scale wound round a cylinder in a helix, for many times the precision.",
  icon: "cylindrical-slide-rule.svg",
  load: () => import("./CylindricalSlideRule"),
  resetStorage: () => createKeyValueStore().remove(CYLINDRICAL_CONFIG.storageKeys.session),
};
