import { type KeyboardEvent, type Ref, useMemo } from "react";
import {
  computeFaceLayout,
  MARGIN,
  RULE_WIDTH,
  SCALE_LENGTH,
} from "../../../core/slide-rule/geometry/layout";
import type { LinearRule, RuleState } from "../../../core/slide-rule/rule/types";
import { keyDelta } from "../../slide-rule-kit/ui/keys";
import type { Box } from "../../slide-rule-kit/ui/viewMath";
import { ScaleBand } from "./ScaleBand";

const CURSOR_WIDTH = 44;
const CURSOR_OVERHANG = 6;

export type ViewBox = Box;

export type Part = "slide" | "cursor";

interface RuleSvgProps {
  rule: LinearRule;
  state: RuleState;
  viewBox: ViewBox;
  svgRef?: Ref<SVGSVGElement>;
  /** Accessible sliders with keyboard control; off for secondary views such as the loupe. */
  accessible?: boolean;
  onKeyMove?(part: Part, delta: number): void;
  className?: string;
}

export function RuleSvg({
  rule,
  state,
  viewBox,
  svgRef,
  accessible = true,
  onKeyMove,
  className,
}: RuleSvgProps) {
  const face = rule.faces[state.face];
  const layout = useMemo(() => computeFaceLayout(face), [face]);
  const sliderProps = (part: Part, label: string, value: number, min: number, max: number) =>
    accessible
      ? {
          role: "slider",
          tabIndex: 0,
          "aria-label": label,
          "aria-valuenow": Number(value.toFixed(5)),
          "aria-valuemin": min,
          "aria-valuemax": max,
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
      aria-label={accessible ? `${rule.name} slide rule, ${state.face} face` : undefined}
      aria-hidden={accessible ? undefined : true}
    >
      <g data-part="body">
        <rect
          x={0}
          y={0}
          width={RULE_WIDTH}
          height={layout.upper.height}
          fill="var(--rule-body)"
          rx={2}
        />
        <rect
          x={0}
          y={layout.lower.y}
          width={RULE_WIDTH}
          height={layout.lower.height}
          fill="var(--rule-body)"
          rx={2}
        />
        {[...layout.upper.bands, ...layout.lower.bands].map((band) => (
          <ScaleBand key={`${band.y}-${band.placement.scale}`} band={band} />
        ))}
      </g>
      <g
        data-part="slide"
        className="rule-slide"
        transform={`translate(${state.slideOffset * SCALE_LENGTH} 0)`}
        {...sliderProps("slide", "Slide", state.slideOffset, -1, 1)}
      >
        <rect
          data-part="slide"
          x={0}
          y={layout.slide.y}
          width={RULE_WIDTH}
          height={layout.slide.height}
          fill="var(--rule-slide)"
          stroke="var(--rule-edge)"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {layout.slide.bands.map((band) => (
          <ScaleBand key={`${band.y}-${band.placement.scale}`} band={band} />
        ))}
      </g>
      <g
        data-part="cursor"
        className="rule-cursor"
        transform={`translate(${state.cursor * SCALE_LENGTH} 0)`}
        {...sliderProps("cursor", "Cursor", state.cursor, -0.05, 1.05)}
      >
        <rect
          data-part="cursor"
          x={MARGIN - CURSOR_WIDTH / 2}
          y={-CURSOR_OVERHANG}
          width={CURSOR_WIDTH}
          height={layout.height + 2 * CURSOR_OVERHANG}
          rx={3}
          fill="var(--rule-glass)"
          stroke="var(--rule-edge)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <line
          data-part="cursor"
          x1={MARGIN}
          x2={MARGIN}
          y1={-CURSOR_OVERHANG}
          y2={layout.height + CURSOR_OVERHANG}
          stroke="var(--rule-hairline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
