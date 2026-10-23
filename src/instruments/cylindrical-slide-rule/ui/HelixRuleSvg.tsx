import { type KeyboardEvent, type Ref, useId, useMemo } from "react";
import { HELIX_RADIUS, project, rowY, visibleSpan } from "../../../core/slide-rule/geometry/helix";
import { computeFaceLayout } from "../../../core/slide-rule/geometry/layout";
import type { CylindricalRule, RuleState } from "../../../core/slide-rule/rule/types";
import { getScale } from "../../../core/slide-rule/scales/library";
import { keyDelta } from "../../slide-rule-kit/ui/keys";
import type { Box } from "../../slide-rule-kit/ui/viewMath";
import { HelixBand, type Span } from "./HelixBand";

const CURSOR_WIDTH = 30;
const CURSOR_OVERHANG = 4;
/** Room to the left of the cylinder for the scale names. */
export const NAME_MARGIN = 44;
/** Samples per quarter turn when drawing the curved edges of the slide strip. */
const STRIP_SAMPLES = 16;

export type Part = "slide" | "cursor";

interface HelixRuleSvgProps {
  rule: CylindricalRule;
  state: RuleState;
  viewBox: Box;
  svgRef?: Ref<SVGSVGElement>;
  /** Accessible sliders with keyboard control; off for secondary views such as the loupe. */
  accessible?: boolean;
  onKeyMove?(part: Part, delta: number): void;
  className?: string;
}

/** The helix coordinate the cursor sits at, which the cylinder turns to face the viewer. */
export const cursorTurn = (rule: CylindricalRule, state: RuleState) => state.cursor * rule.turns;

/** Vertical centre of the cursor's turn, which the view follows. */
export function cursorY(rule: CylindricalRule, state: RuleState) {
  const pitch = computeFaceLayout(rule.faces.front).height;
  return rowY(cursorTurn(rule, state), pitch, pitch / 2);
}

/** The visible parts of a stretch of helix: its overlap with the front half of each turn on screen. */
function frontIntervals(from: number, to: number, cursor: number): Span[] {
  const intervals: Span[] = [];
  for (let turn = Math.floor(from - cursor) - 1; cursor + turn - 0.25 <= to; turn++) {
    const start = Math.max(from, cursor + turn - 0.25);
    const end = Math.min(to, cursor + turn + 0.25);
    if (end > start) intervals.push({ from: start, to: end });
  }
  return intervals;
}

/** A closed outline of a helical strip between two band offsets, over one visible interval. */
function stripPath(interval: Span, cursor: number, pitch: number, top: number, bottom: number) {
  const steps = Math.max(2, Math.ceil(((interval.to - interval.from) / 0.25) * STRIP_SAMPLES));
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const s = interval.from + ((interval.to - interval.from) * index) / steps;
    return { x: project(s, cursor).x, s };
  });
  const edge = (y: (s: number) => number, list: typeof points) =>
    list.map(({ x, s }) => `${x.toFixed(2)} ${y(s).toFixed(2)}`).join("L");
  const upper = edge((s) => rowY(s, pitch, top), points);
  const lower = edge((s) => rowY(s, pitch, bottom), [...points].reverse());
  return `M${upper}L${lower}Z`;
}

export function HelixRuleSvg({
  rule,
  state,
  viewBox,
  svgRef,
  accessible = true,
  onKeyMove,
  className,
}: HelixRuleSvgProps) {
  const gradient = useId();
  const face = rule.faces.front;
  const layout = useMemo(() => computeFaceLayout(face), [face]);
  const pitch = layout.height;
  const { turns } = rule;
  const cursor = cursorTurn(rule, state);
  const window = visibleSpan({ top: viewBox.y, bottom: viewBox.y + viewBox.height }, pitch);
  // Rounded so the stator bands are not redrawn for scrolls smaller than a hundredth of a turn.
  const span = { from: Math.floor(window.from * 100) / 100, to: Math.ceil(window.to * 100) / 100 };
  const slideStart = state.slideOffset * turns;
  const slideEnd = slideStart + turns;
  const stators = [...layout.upper.bands, ...layout.lower.bands];
  const top = rowY(Math.max(0, span.from), pitch, 0) - CURSOR_OVERHANG;
  const bottom = rowY(Math.min(turns + 1, span.to), pitch, 0);
  const cursorTop = rowY(cursor, pitch, 0) - CURSOR_OVERHANG;
  const cursorHeight = pitch + 2 * CURSOR_OVERHANG;

  const sliderProps = (part: Part, label: string, value: number, min: number, max: number) =>
    accessible
      ? {
          role: "slider",
          tabIndex: 0,
          "aria-label": label,
          "aria-valuenow": Number(value.toFixed(6)),
          "aria-valuemin": min,
          "aria-valuemax": max,
          "aria-orientation": "horizontal" as const,
          onKeyDown: (event: KeyboardEvent) => {
            const delta = keyDelta(event);
            if (delta === undefined) return;
            event.preventDefault();
            // The same arc length as a straight rule's step.
            onKeyMove?.(part, delta / turns);
          },
        }
      : {};

  // Scale names beside the left edge of each turn on screen that has scales there.
  const names = [];
  for (let turn = Math.floor(span.from - cursor); cursor + turn - 0.25 <= span.to; turn++) {
    const start = cursor + turn - 0.25;
    if (start < 0 || start > turns) continue;
    for (const band of [...stators, ...layout.slide.bands]) {
      names.push({
        key: `${turn}-${band.y}`,
        y: rowY(start, pitch, band.y + band.height / 2),
        text: getScale(band.placement.scale)?.name ?? band.placement.scale,
      });
    }
  }

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      role={accessible ? "group" : undefined}
      aria-label={accessible ? `${rule.name} cylindrical slide rule` : undefined}
      aria-hidden={accessible ? undefined : true}
    >
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.25" stopColor="#000" stopOpacity="0.04" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <g data-part="body">
        <rect
          x={-HELIX_RADIUS}
          y={top}
          width={2 * HELIX_RADIUS}
          height={Math.max(0, bottom - top)}
          fill="var(--rule-body)"
        />
        {stators.map((band) => (
          <HelixBand
            key={`${band.y}-${band.placement.scale}`}
            band={band}
            offset={0}
            turns={turns}
            pitch={pitch}
            cursor={cursor}
            from={span.from}
            to={span.to}
          />
        ))}
        <g
          stroke="none"
          fill="var(--text)"
          textAnchor="end"
          fontFamily="var(--rule-font)"
          fontSize={9}
          fontWeight={600}
        >
          {names.map((name) => (
            <text key={name.key} data-name="" x={-HELIX_RADIUS - 8} y={name.y + 3}>
              {name.text}
            </text>
          ))}
        </g>
      </g>
      <g
        data-part="slide"
        className="rule-slide"
        {...sliderProps("slide", "Slide", state.slideOffset, -1, 1)}
      >
        {frontIntervals(Math.max(span.from, slideStart), Math.min(span.to, slideEnd), cursor).map(
          (interval) => (
            <path
              key={`${interval.from.toFixed(3)}`}
              data-part="slide"
              d={stripPath(
                interval,
                cursor,
                pitch,
                layout.slide.y,
                layout.slide.y + layout.slide.height,
              )}
              fill="var(--rule-slide)"
              stroke="var(--rule-edge)"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
        {layout.slide.bands.map((band) => (
          <HelixBand
            key={`${band.y}-${band.placement.scale}`}
            band={band}
            offset={state.slideOffset}
            turns={turns}
            pitch={pitch}
            cursor={cursor}
            from={Math.max(span.from, slideStart)}
            to={Math.min(span.to, slideEnd)}
          />
        ))}
      </g>
      <rect
        x={-HELIX_RADIUS}
        y={top}
        width={2 * HELIX_RADIUS}
        height={Math.max(0, bottom - top)}
        fill={`url(#${gradient})`}
        pointerEvents="none"
      />
      <g
        data-part="cursor"
        className="rule-cursor"
        {...sliderProps("cursor", "Cursor", state.cursor, -0.05, 1.05)}
      >
        <rect
          data-part="cursor"
          x={-CURSOR_WIDTH / 2}
          y={cursorTop}
          width={CURSOR_WIDTH}
          height={cursorHeight}
          rx={3}
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
          y1={cursorTop}
          y2={cursorTop + cursorHeight}
          stroke="var(--rule-hairline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
