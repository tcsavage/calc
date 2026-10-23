import {
  CYLINDRICAL_PRESETS,
  DEFAULT_CYLINDRICAL_PRESET_ID,
} from "../../core/slide-rule/rule/cylindricalPresets";
import type { CylindricalRule } from "../../core/slide-rule/rule/types";
import type { EditorOptions } from "../slide-rule-kit/ui/ScaleEditorDrawer";
import type { SlideRuleInstrumentConfig } from "../slide-rule-kit/ui/useSlideRuleInstrument";

export const CYLINDRICAL_CONFIG: SlideRuleInstrumentConfig<CylindricalRule> = {
  kind: "cylindrical",
  presets: CYLINDRICAL_PRESETS,
  defaultPresetId: DEFAULT_CYLINDRICAL_PRESET_ID,
  route: "/cylindrical-slide-rule",
  storageKeys: {
    session: "calc.cylindrical-slide-rule.session",
    saved: "calc.cylindrical-slide-rule.saved",
  },
  shareTitle: "Cylindrical slide rule",
};

export const SECTION_NAMES = {
  upper: "Upper stator",
  slide: "Slide",
  lower: "Lower stator",
};

/** A cylinder has only a front. */
export const EDITOR_OPTIONS: EditorOptions<CylindricalRule> = {
  sectionNames: SECTION_NAMES,
  faces: ["front"],
};
