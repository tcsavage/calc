import { createKeyValueStore } from "../../shared/localStorageStore";
import type { InstrumentEntry } from "../types";
import { CIRCULAR_CONFIG } from "./config";

export const circularSlideRule: InstrumentEntry = {
  id: "circular-slide-rule",
  name: "Circular slide rule",
  description: "A rotating disc inside fixed rings, with a radial cursor and endless scales.",
  icon: "circular-slide-rule.svg",
  load: () => import("./CircularSlideRule"),
  resetStorage: () => createKeyValueStore().remove(CIRCULAR_CONFIG.storageKeys.session),
};
