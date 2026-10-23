import type { RuleDefinition } from "../../../core/slide-rule/rule/types";

/** What the shared slide rule coordination needs to know about one kind of rule. */
export interface SlideRuleConfig<R extends RuleDefinition = RuleDefinition> {
  kind: R["kind"];
  presets: readonly R[];
  defaultPresetId: string;
  /** Removes scales that do not fit on the rule, returning the removed scale IDs. */
  fitRule?(rule: R): { rule: R; removed: string[] };
}
