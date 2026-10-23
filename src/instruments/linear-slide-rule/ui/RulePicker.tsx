import { PRESETS } from "../../../core/slide-rule/rule/presets";
import type { RuleDefinition } from "../../../core/slide-rule/rule/types";

interface RulePickerProps {
  rule: RuleDefinition;
  savedRules: readonly RuleDefinition[];
  onSelect(rule: RuleDefinition): void;
}

const CURRENT = "current";

export function RulePicker({ rule, savedRules, onSelect }: RulePickerProps) {
  const known = [...PRESETS, ...savedRules].some((candidate) => candidate.id === rule.id);
  const choose = (value: string) => {
    const [kind, id] = value.split(":");
    const list = kind === "preset" ? PRESETS : savedRules;
    const chosen = list.find((candidate) => candidate.id === id);
    if (chosen) onSelect(chosen);
  };
  const selectedValue = () => {
    if (PRESETS.some((preset) => preset.id === rule.id)) return `preset:${rule.id}`;
    if (savedRules.some((saved) => saved.id === rule.id)) return `saved:${rule.id}`;
    return CURRENT;
  };
  return (
    <select
      aria-label="Rule"
      value={selectedValue()}
      onChange={(event) => choose(event.target.value)}
    >
      {!known && <option value={CURRENT}>{rule.name}</option>}
      <optgroup label="Presets">
        {PRESETS.map((preset) => (
          <option key={preset.id} value={`preset:${preset.id}`}>
            {preset.name}
          </option>
        ))}
      </optgroup>
      {savedRules.length > 0 && (
        <optgroup label="Saved">
          {savedRules.map((saved) => (
            <option key={saved.id} value={`saved:${saved.id}`}>
              {saved.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
