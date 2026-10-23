import { canAddRing, fitCircularRule } from "../../core/slide-rule/geometry/circular";
import {
  CIRCULAR_PRESETS,
  DEFAULT_CIRCULAR_PRESET_ID,
} from "../../core/slide-rule/rule/circularPresets";
import type { CircularRule } from "../../core/slide-rule/rule/types";
import type { EditorOptions } from "../slide-rule-kit/ui/ScaleEditorDrawer";
import type { SlideRuleInstrumentConfig } from "../slide-rule-kit/ui/useSlideRuleInstrument";

export const CIRCULAR_CONFIG: SlideRuleInstrumentConfig<CircularRule> = {
  kind: "circular",
  presets: CIRCULAR_PRESETS,
  defaultPresetId: DEFAULT_CIRCULAR_PRESET_ID,
  fitRule: fitCircularRule,
  route: "/circular-slide-rule",
  storageKeys: {
    session: "calc.circular-slide-rule.session",
    saved: "calc.circular-slide-rule.saved",
  },
  shareTitle: "Circular slide rule",
};

export const SECTION_NAMES = { outer: "Outer rings", disc: "Disc" };

export const EDITOR_OPTIONS: EditorOptions<CircularRule> = {
  sectionNames: SECTION_NAMES,
  canAdd: (rule, face, section) => canAddRing(rule.faces[face], section),
  fullNote: "The disc is full.",
};
