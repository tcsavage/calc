import type { ReadoutEntry } from "../../../core/slide-rule/readout";

const SECTION_LABEL = { upper: "Stator", slide: "Slide", lower: "Stator" } as const;

export function Readout({ entries }: { entries: readonly ReadoutEntry[] }) {
  return (
    <table className="readout" aria-label="Readout">
      <tbody>
        {entries.map((entry, index) => (
          // A face may hold the same scale twice, so the position is part of the identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
          <tr key={`${index}-${entry.scale}`} className={`readout-row readout-${entry.section}`}>
            <th scope="row" title={SECTION_LABEL[entry.section]}>
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
