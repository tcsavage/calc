import { type KeyboardEvent, type Ref, useMemo } from "react";
import {
  angleOf,
  computeCircularLayout,
  DISC_RADIUS,
  HUB_RADIUS,
} from "../../../core/slide-rule/geometry/circular";
import type { CircularRule, RuleState } from "../../../core/slide-rule/rule/types";
import { keyDelta } from "../../slide-rule-kit/ui/keys";
import type { Box } from "../../slide-rule-kit/ui/viewMath";
import { RingScale } from "./RingScale";

const CURSOR_WIDTH = 36;
export const CURSOR_OVERHANG = 10;

export type Part = "slide" | "cursor";

interface CircularRuleSvgProps {
  rule: CircularRule;
  state: RuleState;
  viewBox: Box;
  svgRef?: Ref<SVGSVGElement>;
  /** Accessible sliders with keyboard control; off for secondary views such as the loupe. */
  accessible?: boolean;
  onKeyMove?(part: Part, delta: number): void;
  className?: string;
}

/** Degrees the whole drawing turns by, so that in rotate view the hairline points straight up. */
export const viewRotation = (state: RuleState) => (state.rotateView ? -angleOf(state.cursor) : 0);

export function CircularRuleSvg({
  rule,
  state,
  viewBox,
  svgRef,
  accessible = true,
  onKeyMove,
  className,
}: CircularRuleSvgProps) {
  const face = rule.faces[state.face];
  const layout = useMemo(() => computeCircularLayout(face), [face]);
  const outer = layout.rings.filter((ring) => ring.section === "outer");
  const disc = layout.rings.filter((ring) => ring.section === "disc");
  const armLength = layout.radius + CURSOR_OVERHANG;
  const rotation = viewRotation(state);
  const sliderProps = (part: Part, label: string, value: number) =>
    accessible
      ? {
          role: "slider",
          tabIndex: 0,
          "aria-label": label,
          "aria-valuenow": Number(value.toFixed(5)),
          "aria-valuemin": 0,
          "aria-valuemax": 1,
          "aria-orientation": "horizontal" as const,
          onKeyDown: (event: KeyboardEvent) => {
            const delta = keyDelta(event);
            if (delta === undefined) return;
            event.preventDefault();
            onKeyMove?.(part, delta);
          },
        }
      : {};

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      role={accessible ? "group" : undefined}
      aria-label={accessible ? `${rule.name} circular slide rule, ${state.face} face` : undefined}
      aria-hidden={accessible ? undefined : true}
    >
      <g data-rotor="" transform={rotation ? `rotate(${rotation})` : undefined}>
        <g data-part="body">
          <circle
            r={layout.radius}
            fill="var(--rule-body)"
            stroke="var(--rule-edge)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
          {outer.map((ring) => (
            <RingScale key={`${ring.index}-${ring.placement.scale}`} ring={ring} />
          ))}
        </g>
        <g
          data-part="disc"
          className="rule-disc"
          transform={`rotate(${angleOf(state.slideOffset)})`}
          {...sliderProps("slide", "Disc", state.slideOffset)}
        >
          <circle
            data-part="disc"
            r={DISC_RADIUS}
            fill="var(--rule-slide)"
            stroke="var(--rule-edge)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
          {disc.map((ring) => (
            <RingScale key={`${ring.index}-${ring.placement.scale}`} ring={ring} />
          ))}
        </g>
        <circle
          r={HUB_RADIUS}
          fill="var(--rule-body)"
          stroke="var(--rule-edge)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <g
          data-part="cursor"
          className="rule-cursor"
          transform={`rotate(${angleOf(state.cursor)})`}
          {...sliderProps("cursor", "Cursor", state.cursor)}
        >
          <rect
            data-part="cursor"
            x={-CURSOR_WIDTH / 2}
            y={-armLength}
            width={CURSOR_WIDTH}
            height={armLength - HUB_RADIUS}
            rx={4}
            fill="var(--rule-glass)"
            stroke="var(--rule-edge)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <line
            data-part="cursor"
            data-hairline=""
            x1={0}
            x2={0}
            y1={-armLength}
            y2={-HUB_RADIUS}
            stroke="var(--rule-hairline)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    </svg>
  );
}
