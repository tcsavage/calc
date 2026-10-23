import { memo } from "react";
import { project, rowY } from "../../../core/slide-rule/geometry/helix";
import type { BandLayout } from "../../../core/slide-rule/geometry/layout";
import { getScale } from "../../../core/slide-rule/scales/library";
import { generateTicks } from "../../../core/slide-rule/scales/ticks";
import type { Tick } from "../../../core/slide-rule/scales/types";

const MAX_TICK = 0.5;
const LABEL_FONT = { large: 7.5, small: 5, mark: 6 } as const;
/** How squarely the surface must face the viewer for anything but the longest ticks to be drawn. */
const EDGE_DEPTH = 0.3;

export interface Span {
  from: number;
  to: number;
}

/** Index of the first tick at or after a position, in ticks sorted by position. */
function lowerBound(ticks: readonly Tick[], position: number): number {
  let low = 0;
  let high = ticks.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((ticks[middle] as Tick).position < position) low = middle + 1;
    else high = middle;
  }
  return low;
}

interface HelixBandProps {
  band: BandLayout;
  /** Slide offset for slide bands, 0 for stators, in scale lengths. */
  offset: number;
  turns: number;
  pitch: number;
  /** The cursor's helix coordinate, which faces the viewer. */
  cursor: number;
  /** Helix coordinates with a row on screen; plain numbers so the band memoises. */
  from: number;
  to: number;
}

/**
 * One scale wound round the helix, drawn as seen from the front: only ticks on the front half of
 * the turns on screen, crowding towards the cylinder's edges, with labels squeezed to match.
 */
export const HelixBand = memo(function HelixBand({
  band,
  offset,
  turns,
  pitch,
  cursor,
  from,
  to,
}: HelixBandProps) {
  const spec = getScale(band.placement.scale);
  if (!spec) return null;
  const ticks = generateTicks(spec, turns);
  const ink = (band.placement.ink ?? spec.ink) === "red" ? "var(--rule-red)" : "var(--rule-ink)";
  const direction = band.anchor === "top" ? 1 : -1;
  const edge = band.anchor === "top" ? band.y : band.y + band.height;

  const bySize = new Map<number, string[]>();
  const labels: { key: string; x: number; y: number; depth: number; tick: Tick }[] = [];
  const first = lowerBound(ticks, from / turns - offset);
  for (let index = first; index < ticks.length; index++) {
    const tick = ticks[index] as Tick;
    const s = (tick.position + offset) * turns;
    if (s > to) break;
    const { visible, x, depth } = project(s, cursor);
    // Near the edges the finer ticks crowd into a smear, so only the longest are kept there.
    if (!visible || (depth < EDGE_DEPTH && tick.size < 1)) continue;
    const baseline = rowY(s, pitch, edge);
    const end = baseline + direction * tick.size * MAX_TICK * band.height;
    const segment = `M${x.toFixed(2)} ${baseline.toFixed(2)}V${end.toFixed(2)}`;
    const list = bySize.get(tick.size);
    if (list) list.push(segment);
    else bySize.set(tick.size, [segment]);
    if (tick.label && depth > 0.2) {
      const size = tick.label.size;
      const reach = size === "large" ? MAX_TICK * band.height : tick.size * MAX_TICK * band.height;
      const centre = baseline + direction * (reach + LABEL_FONT[size] * 0.6 + 0.5);
      labels.push({ key: `${index}`, x, y: centre + LABEL_FONT[size] * 0.35, depth, tick });
    }
  }

  return (
    <g data-scale={spec.id} stroke={ink} fill={ink}>
      {[...bySize.entries()].map(([size, segments]) => (
        <path
          key={size}
          d={segments.join("")}
          fill="none"
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <g stroke="none" textAnchor="middle" fontFamily="var(--rule-font)">
        {labels.map(({ key, x, y, depth, tick }) => (
          <text
            key={key}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${depth.toFixed(3)} 1)`}
            fontSize={LABEL_FONT[tick.label?.size ?? "large"]}
            fontStyle={tick.label?.size === "mark" ? "italic" : undefined}
          >
            {tick.label?.text}
          </text>
        ))}
      </g>
    </g>
  );
});
