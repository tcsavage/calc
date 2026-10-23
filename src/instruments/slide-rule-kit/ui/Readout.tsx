import type { ReadoutEntry } from "../../../core/slide-rule/readout";
import type { Section } from "../../../core/slide-rule/rule/types";

interface ReadoutProps {
  entries: readonly ReadoutEntry[];
  /** Section names shown as row tooltips. */
  sectionNames: Partial<Record<Section, string>>;
}

export function Readout({ entries, sectionNames }: ReadoutProps) {
  return (
    <table className="readout" aria-label="Readout">
      <tbody>
        {entries.map((entry, index) => (
          // A face may hold the same scale twice, so the position is part of the identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
          <tr key={`${index}-${entry.scale}`} className={`readout-row readout-${entry.section}`}>
            <th scope="row" title={sectionNames[entry.section]}>
              {entry.scale}
            </th>
            <td className={entry.text === "out of range" ? "out-of-range" : undefined}>
              {entry.text}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
