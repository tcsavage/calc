import { memo } from "react";
import type { BandLayout } from "../../../core/slide-rule/geometry/layout";
import { LinearGeometry, MARGIN, SCALE_LENGTH } from "../../../core/slide-rule/geometry/layout";
import { getScale } from "../../../core/slide-rule/scales/library";
import { generateTicks } from "../../../core/slide-rule/scales/ticks";
import type { Tick } from "../../../core/slide-rule/scales/types";

const MAX_TICK = 0.5;
const LABEL_FONT = { large: 7.5, small: 5, mark: 6 } as const;

function tickPaths(ticks: readonly Tick[], baseline: number, direction: number, height: number) {
  const bySize = new Map<number, string[]>();
  for (const tick of ticks) {
    const x = LinearGeometry.toX(tick.position).toFixed(2);
    const end = (baseline + direction * tick.size * MAX_TICK * height).toFixed(2);
    const segment = `M${x} ${baseline}V${end}`;
    const list = bySize.get(tick.size);
    if (list) list.push(segment);
    else bySize.set(tick.size, [segment]);
  }
  return [...bySize.entries()].map(([size, segments]) => ({ size, d: segments.join("") }));
}

interface ScaleBandProps {
  band: BandLayout;
}

/** One graduated scale: ticks grow from the anchored edge, labels sit beyond the tick ends. */
export const ScaleBand = memo(function ScaleBand({ band }: ScaleBandProps) {
  const spec = getScale(band.placement.scale);
  if (!spec) return null;
  const ticks = generateTicks(spec);
  const ink = (band.placement.ink ?? spec.ink) === "red" ? "var(--rule-red)" : "var(--rule-ink)";
  const direction = band.anchor === "top" ? 1 : -1;
  const baseline = band.anchor === "top" ? band.y : band.y + band.height;
  const middle = band.y + band.height / 2;
  const labelY = (tick: Tick) => {
    const size = tick.label?.size ?? "large";
    const reach = size === "large" ? MAX_TICK * band.height : tick.size * MAX_TICK * band.height;
    const font = LABEL_FONT[size];
    const centre = baseline + direction * (reach + font * 0.6 + 0.5);
    return centre + font * 0.35;
  };

  return (
    <g data-scale={spec.id} stroke={ink} fill={ink}>
      {tickPaths(ticks, baseline, direction, band.height).map(({ size, d }) => (
        <path key={size} d={d} fill="none" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
      ))}
      <g stroke="none" textAnchor="middle" fontFamily="var(--rule-font)">
        {ticks
          .filter((tick) => tick.label)
          .map((tick) => (
            <text
              key={`${tick.position}-${tick.label?.text}`}
              x={LinearGeometry.toX(tick.position)}
              y={labelY(tick)}
              fontSize={LABEL_FONT[tick.label?.size ?? "large"]}
              fontStyle={tick.label?.size === "mark" ? "italic" : undefined}
            >
              {tick.label?.text}
            </text>
          ))}
        <text x={MARGIN / 2} y={middle + 3.5} fontSize={10} fontWeight={600}>
          {spec.name}
        </text>
        <text x={MARGIN * 1.5 + SCALE_LENGTH} y={middle + 3} fontSize={8}>
          {spec.formula}
        </text>
      </g>
    </g>
  );
});
