import { DEFAULT_PRESET_ID, PRESETS } from "../../core/slide-rule/rule/presets";
import type { LinearRule } from "../../core/slide-rule/rule/types";
import type { SlideRuleInstrumentConfig } from "../slide-rule-kit/ui/useSlideRuleInstrument";

export const LINEAR_CONFIG: SlideRuleInstrumentConfig<LinearRule> = {
  kind: "linear",
  presets: PRESETS,
  defaultPresetId: DEFAULT_PRESET_ID,
  route: "/linear-slide-rule",
  storageKeys: {
    session: "calc.linear-slide-rule.session",
    saved: "calc.linear-slide-rule.saved",
  },
  shareTitle: "Slide rule",
};

export const SECTION_NAMES = {
  upper: "Upper stator",
  slide: "Slide",
  lower: "Lower stator",
};
