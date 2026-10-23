import { memo } from "react";
import {
  angleOf,
  lengthFactor,
  polar,
  RING_WIDTH,
  type RingLayout,
} from "../../../core/slide-rule/geometry/circular";
import { getScale } from "../../../core/slide-rule/scales/library";
import { generateTicks } from "../../../core/slide-rule/scales/ticks";
import type { Tick } from "../../../core/slide-rule/scales/types";

const MAX_TICK = 0.5;
const LABEL_FONT = { large: 7.5, small: 5, mark: 6 } as const;
const NAME_FONT = 9;
/** Gap between the index and the scale name to its left, in drawing units along the ring. */
const NAME_OFFSET = 12;
const END = 1 - 1e-9;

const point = (radius: number, degrees: number) => {
  const { x, y } = polar(radius, degrees);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
};

function tickPaths(ticks: readonly Tick[], ring: RingLayout) {
  const bySize = new Map<number, string[]>();
  for (const tick of ticks) {
    const angle = angleOf(tick.position);
    const end = ring.baseline + ring.direction * tick.size * MAX_TICK * RING_WIDTH;
    const segment = `M${point(ring.baseline, angle)}L${point(end, angle)}`;
    const list = bySize.get(tick.size);
    if (list) list.push(segment);
    else bySize.set(tick.size, [segment]);
  }
  return [...bySize.entries()].map(([size, segments]) => ({ size, d: segments.join("") }));
}

/** Centre radius of a label: just beyond the end of its tick, away from the disc edge. */
function labelRadius(tick: Tick, ring: RingLayout) {
  const size = tick.label?.size ?? "large";
  const reach = size === "large" ? MAX_TICK * RING_WIDTH : tick.size * MAX_TICK * RING_WIDTH;
  return ring.baseline + ring.direction * (reach + LABEL_FONT[size] * 0.6 + 0.5);
}

/** Text centred on a point and turned with the ring, so its top faces away from the centre. */
function RingText({
  radius,
  angle,
  children,
  ...rest
}: { radius: number; angle: number; children: string } & React.SVGProps<SVGTextElement>) {
  const { x, y } = polar(radius, angle);
  return (
    <text
      x={x}
      y={y}
      transform={`rotate(${angle.toFixed(3)} ${x.toFixed(2)} ${y.toFixed(2)})`}
      dominantBaseline="central"
      {...rest}
    >
      {children}
    </text>
  );
}

/**
 * One scale drawn round a ring: ticks grow from the edge nearest the disc edge, labels sit beyond
 * them, and the scale's name sits just left of the index. A full turn scale ends where it starts, so
 * the end label is left out in favour of the start label.
 */
export const RingScale = memo(function RingScale({ ring }: { ring: RingLayout }) {
  const spec = getScale(ring.placement.scale);
  if (!spec) return null;
  const ticks = generateTicks(spec, lengthFactor(ring.baseline));
  const ink = (ring.placement.ink ?? spec.ink) === "red" ? "var(--rule-red)" : "var(--rule-ink)";
  const middle = (ring.inner + ring.outer) / 2;
  const nameAngle = -((NAME_OFFSET / middle) * 180) / Math.PI;
  const background = ring.section === "disc" ? "var(--rule-slide)" : "var(--rule-body)";

  return (
    <g data-scale={spec.id} stroke={ink} fill={ink}>
      {tickPaths(ticks, ring).map(({ size, d }) => (
        <path key={size} d={d} fill="none" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
      ))}
      <g stroke="none" textAnchor="middle" fontFamily="var(--rule-font)">
        {ticks
          .filter((tick) => tick.label && tick.position < END)
          .map((tick) => (
            <RingText
              key={`${tick.position}-${tick.label?.text}`}
              radius={labelRadius(tick, ring)}
              angle={angleOf(tick.position)}
              fontSize={LABEL_FONT[tick.label?.size ?? "large"]}
              fontStyle={tick.label?.size === "mark" ? "italic" : undefined}
            >
              {tick.label?.text ?? ""}
            </RingText>
          ))}
        <RingText
          radius={middle}
          angle={nameAngle}
          textAnchor="end"
          fontSize={NAME_FONT}
          fontWeight={600}
          stroke={background}
          strokeWidth={3}
          paintOrder="stroke"
        >
          {spec.name}
        </RingText>
      </g>
    </g>
  );
});
