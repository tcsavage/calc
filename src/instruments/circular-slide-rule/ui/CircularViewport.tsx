import { useGesture } from "@use-gesture/react";
import { useMemo, useRef, useState } from "react";
import {
  angleOf,
  computeCircularLayout,
  DISC_RADIUS,
  HUB_RADIUS,
  polar,
} from "../../../core/slide-rule/geometry/circular";
import type { CircularRule, RuleState } from "../../../core/slide-rule/rule/types";
import {
  DOCKED_LOUPE_HEIGHT,
  FLOATING_LOUPE,
  floatingPosition,
} from "../../slide-rule-kit/ui/loupe";
import { useElementSize } from "../../slide-rule-kit/ui/useElementSize";
import {
  type Box,
  fitView,
  loupeViewBox,
  MAX_ZOOM,
  MIN_ZOOM,
  type View,
  viewBoxFor,
  zoomAt,
} from "../../slide-rule-kit/ui/viewMath";
import { CircularRuleSvg, CURSOR_OVERHANG, type Part, viewRotation } from "./CircularRuleSvg";
import { angleAt, sweep, type TurnPart, turnDelta } from "./turning";

interface CircularViewportProps {
  rule: CircularRule;
  state: RuleState;
  loupePinned: boolean;
  onMove(part: Part, delta: number): void;
}

const ZOOMED = 1.01;

function partAt(target: EventTarget | null): TurnPart {
  const element = target instanceof Element ? target.closest("[data-part]") : null;
  const part = element?.getAttribute("data-part");
  return part === "disc" || part === "cursor" ? part : "rule";
}

/** A client point in the SVG's own drawing coordinates, which do not turn with the rule. */
function toDrawing(svg: SVGSVGElement | null, x: number, y: number) {
  const matrix = svg?.getScreenCTM?.();
  if (!matrix) return null;
  const inverse = matrix.inverse();
  return {
    x: inverse.a * x + inverse.c * y + inverse.e,
    y: inverse.b * x + inverse.d * y + inverse.f,
  };
}

function unitsPerPixel(svg: SVGSVGElement | null, box: Box): number {
  const scale = svg?.getScreenCTM?.()?.a;
  if (scale) return 1 / scale;
  const width = svg?.getBoundingClientRect().width;
  return width ? box.width / width : 1;
}

type DragMemo = { mode: "pan" } | { mode: "turn"; part: TurnPart; angle: number };

/**
 * Turns the disc or cursor by the angle the pointer sweeps around the rule's centre. Angles are
 * measured in the SVG's own coordinates, so a drawing that turns under a still finger (rotate view)
 * does not feed back into the drag.
 */
function useTurningDrag(
  svgRef: React.RefObject<SVGSVGElement | null>,
  options: {
    rotateView: boolean;
    onMove(part: Part, delta: number): void;
    /** Whether a drag that grabs neither disc nor cursor should pan instead of turning. */
    pans?(): boolean;
    onPan?(dx: number, dy: number): void;
    onDragging?(pointer?: { x: number; y: number; radius: number }): void;
    enabled?: boolean;
    box: Box;
  },
) {
  const pinching = useRef(false);
  useGesture(
    {
      onDrag: ({ first, last, delta: [dx, dy], xy: [x, y], initial, event, memo, cancel }) => {
        if (pinching.current) {
          cancel();
          return memo;
        }
        const point = toDrawing(svgRef.current, x, y);
        let current = memo as DragMemo | undefined;
        if (first || !current) {
          const part = partAt(event.target);
          // Measured from where the pointer went down, so the movement it took to start the drag
          // is not lost and the scale stays under the finger.
          const start = toDrawing(svgRef.current, initial[0], initial[1]) ?? point;
          current =
            part === "rule" && options.pans?.()
              ? { mode: "pan" }
              : { mode: "turn", part, angle: start ? angleAt(start) : 0 };
        }
        if (current.mode === "pan") {
          const scale = unitsPerPixel(svgRef.current, options.box);
          options.onPan?.(dx * scale, dy * scale);
        } else if (point) {
          const angle = angleAt(point);
          const swept = sweep(current.angle, angle);
          if (swept !== 0) {
            const { part, delta } = turnDelta(current.part, swept, options.rotateView);
            options.onMove(part, delta);
          }
          current = { ...current, angle };
          options.onDragging?.(last ? undefined : { x, y, radius: Math.hypot(point.x, point.y) });
        }
        if (last) options.onDragging?.(undefined);
        return current;
      },
      onPinchStart: () => {
        pinching.current = true;
      },
      onPinchEnd: () => {
        pinching.current = false;
      },
    },
    {
      target: svgRef,
      enabled: options.enabled ?? true,
      drag: { filterTaps: true, pointer: { keys: false } },
      eventOptions: { passive: false },
    },
  );
}

export function CircularViewport({ rule, state, loupePinned, onMove }: CircularViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const loupeRef = useRef<SVGSVGElement>(null);
  const size = useElementSize(containerRef);
  const layout = useMemo(() => computeCircularLayout(rule.faces[state.face]), [rule, state.face]);
  const extent = layout.radius + CURSOR_OVERHANG;
  const content = useMemo(
    () => ({ x: -extent, y: -extent, width: 2 * extent, height: 2 * extent }),
    [extent],
  );
  const [view, setView] = useState<View | null>(null);
  const current = view ?? fitView(content);
  const box = viewBoxFor(current, size, content);
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  const [focusRadius, setFocusRadius] = useState<number | null>(null);
  const rotateView = state.rotateView ?? false;

  const toContainer = (client: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: client.x - (rect?.left ?? 0), y: client.y - (rect?.top ?? 0) };
  };

  useTurningDrag(svgRef, {
    rotateView,
    onMove,
    box,
    pans: () => current.zoom > ZOOMED,
    onPan: (dx, dy) =>
      setView({ ...current, centreX: current.centreX - dx, centreY: current.centreY - dy }),
    onDragging: (pointer) => {
      if (!pointer) return setDragging(null);
      setDragging({ x: pointer.x, y: pointer.y });
      setFocusRadius(Math.min(layout.radius, Math.max(HUB_RADIUS, pointer.radius)));
    },
  });

  useGesture(
    {
      onPinch: ({ origin: [ox, oy], offset: [scale] }) =>
        setView(zoomAt(current, scale, toContainer({ x: ox, y: oy }), size, content)),
      onWheel: ({ event, delta: [dx, dy] }) => {
        if (event.ctrlKey) return;
        event.preventDefault();
        const scale = unitsPerPixel(svgRef.current, box);
        setView({
          ...current,
          centreX: current.centreX + dx * scale,
          centreY: current.centreY + dy * scale,
        });
      },
    },
    {
      target: svgRef,
      eventOptions: { passive: false },
      pinch: { scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM }, from: () => [current.zoom, 0] },
    },
  );

  // The loupe looks at the hairline where the finger is, or at the disc edge.
  const hairlineAngle = angleOf(state.cursor) + viewRotation(state);
  const hairline = polar(focusRadius ?? DISC_RADIUS, hairlineAngle);
  // The buttons zoom towards the hairline at the disc edge, where the reading is, not the hub.
  const zoomBy = (factor: number) => {
    const target = polar(DISC_RADIUS, hairlineAngle);
    const point = {
      x: ((target.x - box.x) / box.width) * size.width,
      y: ((target.y - box.y) / box.height) * size.height,
    };
    setView(zoomAt(current, current.zoom * factor, point, size, content));
  };

  const dockedSize = { width: size.width, height: DOCKED_LOUPE_HEIGHT };
  const dockedBox = loupeViewBox(box, size.width, dockedSize, hairline);
  useTurningDrag(loupeRef, { rotateView, onMove, box: dockedBox, enabled: loupePinned });

  const floating = dragging && !loupePinned ? floatingPosition(dragging) : null;

  return (
    <div className="viewport">
      {loupePinned && (
        <section
          className="loupe loupe-docked"
          aria-label="Loupe"
          style={{ height: DOCKED_LOUPE_HEIGHT }}
        >
          <CircularRuleSvg
            rule={rule}
            state={state}
            viewBox={dockedBox}
            svgRef={loupeRef}
            accessible={false}
          />
        </section>
      )}
      <div className="viewport-main viewport-square" ref={containerRef}>
        <CircularRuleSvg
          rule={rule}
          state={state}
          viewBox={box}
          svgRef={svgRef}
          onKeyMove={onMove}
          className="rule-svg"
        />
        {floating && (
          <section
            className="loupe loupe-floating"
            aria-label="Loupe"
            style={{ left: floating.left, top: floating.top, ...FLOATING_LOUPE }}
          >
            <CircularRuleSvg
              rule={rule}
              state={state}
              viewBox={loupeViewBox(box, size.width, FLOATING_LOUPE, hairline)}
              accessible={false}
            />
          </section>
        )}
      </div>
      <div className="zoom-controls">
        <button type="button" onClick={() => zoomBy(1.5)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => setView(null)} aria-label="Fit rule to screen">
          Fit
        </button>
      </div>
    </div>
  );
}
