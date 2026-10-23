import type { RuleDefinition } from "../../../core/slide-rule/rule/types";

interface RulePickerProps<R extends RuleDefinition> {
  rule: R;
  presets: readonly R[];
  savedRules: readonly R[];
  onSelect(rule: R): void;
}

const CURRENT = "current";

export function RulePicker<R extends RuleDefinition>({
  rule,
  presets,
  savedRules,
  onSelect,
}: RulePickerProps<R>) {
  const known = [...presets, ...savedRules].some((candidate) => candidate.id === rule.id);
  const choose = (value: string) => {
    const [kind, id] = value.split(":");
    const list = kind === "preset" ? presets : savedRules;
    const chosen = list.find((candidate) => candidate.id === id);
    if (chosen) onSelect(chosen);
  };
  const selectedValue = () => {
    if (presets.some((preset) => preset.id === rule.id)) return `preset:${rule.id}`;
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
        {presets.map((preset) => (
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
