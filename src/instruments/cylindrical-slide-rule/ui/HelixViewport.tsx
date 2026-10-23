import { useGesture } from "@use-gesture/react";
import { useMemo, useRef, useState } from "react";
import { HELIX_RADIUS, turnAngle } from "../../../core/slide-rule/geometry/helix";
import { computeFaceLayout } from "../../../core/slide-rule/geometry/layout";
import type { CylindricalRule, RuleState } from "../../../core/slide-rule/rule/types";
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
  viewBoxFor,
  zoomAt,
} from "../../slide-rule-kit/ui/viewMath";
import { cursorY, HelixRuleSvg, NAME_MARGIN, type Part } from "./HelixRuleSvg";

interface HelixViewportProps {
  rule: CylindricalRule;
  state: RuleState;
  loupePinned: boolean;
  onMove(part: Part, delta: number): void;
}

/** Zoom and vertical pan relative to the cursor, which the view follows up and down the helix. */
interface FollowView {
  zoom: number;
  panY: number;
}

/** Turns of the helix in view at zoom 1. */
const TURNS_IN_VIEW = 2;

function partAt(target: EventTarget | null): Part | "rule" {
  const element = target instanceof Element ? target.closest("[data-part]") : null;
  const part = element?.getAttribute("data-part");
  return part === "slide" ? "slide" : "rule";
}

/** A client point in the SVG's own drawing coordinates. */
function toDrawing(svg: SVGSVGElement | null, x: number, y: number) {
  const matrix = svg?.getScreenCTM?.();
  if (!matrix) return null;
  const inverse = matrix.inverse();
  return {
    x: inverse.a * x + inverse.c * y + inverse.e,
    y: inverse.b * x + inverse.d * y + inverse.f,
  };
}

type DragMemo = { part: Part | "rule"; angle: number };

/**
 * Follows a drag round the cylinder: the change in asin(x / radius) is how far the surface under the
 * finger turned. The slide moves with the finger; anything else turns the whole rule under the fixed
 * hairline. Vertical movement on the rule pans.
 */
function useHelixDrag(
  svgRef: React.RefObject<SVGSVGElement | null>,
  options: {
    turns: number;
    onMove(part: Part, delta: number): void;
    /** Pans by a vertical movement in screen pixels. */
    onPan?(dy: number): void;
    onDragging?(pointer?: { x: number; y: number; drawingY: number }): void;
    enabled?: boolean;
  },
) {
  const pinching = useRef(false);
  useGesture(
    {
      onDrag: ({ first, last, xy: [x, y], delta: [, dy], initial, event, memo, cancel }) => {
        if (pinching.current) {
          cancel();
          return memo;
        }
        const point = toDrawing(svgRef.current, x, y);
        let current = memo as DragMemo | undefined;
        if (first || !current) {
          // From where the pointer went down, so the movement that started the drag is not lost.
          const start = toDrawing(svgRef.current, initial[0], initial[1]) ?? point;
          current = { part: partAt(event.target), angle: start ? turnAngle(start.x) : 0 };
        }
        if (point) {
          const angle = turnAngle(point.x);
          const turned = angle - current.angle;
          if (turned !== 0) {
            if (current.part === "slide") options.onMove("slide", turned / options.turns);
            else options.onMove("cursor", -turned / options.turns);
          }
          if (current.part === "rule" && dy !== 0) options.onPan?.(dy);
          current = { ...current, angle };
          options.onDragging?.(last ? undefined : { x, y, drawingY: point.y });
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

export function HelixViewport({ rule, state, loupePinned, onMove }: HelixViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const loupeRef = useRef<SVGSVGElement>(null);
  const size = useElementSize(containerRef);
  const pitch = useMemo(() => computeFaceLayout(rule.faces.front).height, [rule]);
  const followY = cursorY(rule, state);
  const content = useMemo<Box>(() => {
    const height = TURNS_IN_VIEW * pitch;
    return {
      x: -HELIX_RADIUS - NAME_MARGIN,
      y: -height / 2,
      width: 2 * (HELIX_RADIUS + NAME_MARGIN),
      height,
    };
  }, [pitch]);
  const [follow, setFollow] = useState<FollowView>({ zoom: 1, panY: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  const [focusY, setFocusY] = useState<number | null>(null);

  // The view is worked out around the cursor's row, then moved down the helix to it.
  const relative = { ...fitView(content), zoom: follow.zoom, centreY: follow.panY };
  const local = viewBoxFor(relative, size, content);
  const box = { ...local, y: local.y + followY };

  const toContainer = (client: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: client.x - (rect?.left ?? 0), y: client.y - (rect?.top ?? 0) };
  };
  const zoomAround = (zoom: number, point: { x: number; y: number }) => {
    const next = zoomAt(relative, zoom, point, size, content);
    setFollow({ zoom: next.zoom, panY: next.centreY });
  };
  const unitsPerPixel = () => box.height / size.height;

  useHelixDrag(svgRef, {
    turns: rule.turns,
    onMove,
    onPan: (dy) => {
      const scale = unitsPerPixel();
      setFollow((view) => ({ ...view, panY: view.panY - dy * scale }));
    },
    onDragging: (pointer) => {
      if (!pointer) return setDragging(null);
      setDragging({ x: pointer.x, y: pointer.y });
      setFocusY(pointer.drawingY - followY);
    },
  });

  useGesture(
    {
      onPinch: ({ origin: [ox, oy], offset: [scale] }) =>
        zoomAround(scale, toContainer({ x: ox, y: oy })),
      onWheel: ({ event, delta: [, dy] }) => {
        if (event.ctrlKey) return;
        event.preventDefault();
        const scale = unitsPerPixel();
        setFollow((view) => ({ ...view, panY: view.panY + dy * scale }));
      },
    },
    {
      target: svgRef,
      eventOptions: { passive: false },
      pinch: { scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM }, from: () => [follow.zoom, 0] },
    },
  );

  // The buttons zoom about the hairline, which stays where it is on screen.
  const zoomBy = (factor: number) =>
    zoomAround(follow.zoom * factor, {
      x: ((0 - box.x) / box.width) * size.width,
      y: ((followY - box.y) / box.height) * size.height,
    });

  const hairline = { x: 0, y: followY + (focusY ?? 0) };
  const dockedSize = { width: size.width, height: DOCKED_LOUPE_HEIGHT };
  const dockedBox = loupeViewBox(box, size.width, dockedSize, hairline);
  useHelixDrag(loupeRef, { turns: rule.turns, onMove, enabled: loupePinned });

  const floating = dragging && !loupePinned ? floatingPosition(dragging) : null;

  return (
    <div className="viewport">
      {loupePinned && (
        <section
          className="loupe loupe-docked"
          aria-label="Loupe"
          style={{ height: DOCKED_LOUPE_HEIGHT }}
        >
          <HelixRuleSvg
            rule={rule}
            state={state}
            viewBox={dockedBox}
            svgRef={loupeRef}
            accessible={false}
          />
        </section>
      )}
      <div className="viewport-main viewport-square" ref={containerRef}>
        <HelixRuleSvg
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
            <HelixRuleSvg
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
        <button
          type="button"
          onClick={() => setFollow({ zoom: 1, panY: 0 })}
          aria-label="Fit rule to screen"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
