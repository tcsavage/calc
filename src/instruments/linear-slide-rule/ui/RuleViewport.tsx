import { useGesture } from "@use-gesture/react";
import { useMemo, useRef, useState } from "react";
import {
  computeFaceLayout,
  MARGIN,
  RULE_WIDTH,
  SCALE_LENGTH,
} from "../../../core/slide-rule/geometry/layout";
import type { LinearRule, RuleState } from "../../../core/slide-rule/rule/types";
import {
  DOCKED_LOUPE_HEIGHT,
  FLOATING_LOUPE,
  floatingPosition,
} from "../../slide-rule-kit/ui/loupe";
import { useElementSize } from "../../slide-rule-kit/ui/useElementSize";
import {
  fitView,
  loupeViewBox,
  MAX_ZOOM,
  MIN_ZOOM,
  type View,
  viewBoxFor,
  zoomAt,
} from "../../slide-rule-kit/ui/viewMath";
import { type Part, RuleSvg, type ViewBox } from "./RuleSvg";

interface RuleViewportProps {
  rule: LinearRule;
  state: RuleState;
  loupePinned: boolean;
  onMove(part: Part, delta: number): void;
}

function partAt(target: EventTarget | null): Part | undefined {
  const element = target instanceof Element ? target.closest("[data-part]") : null;
  const part = element?.getAttribute("data-part");
  return part === "slide" || part === "cursor" ? part : undefined;
}

/** Drawing units per screen pixel for an SVG, from its current transform. */
function unitsPerPixel(svg: SVGSVGElement | null, box: ViewBox): number {
  const scale = svg?.getScreenCTM?.()?.a;
  if (scale) return 1 / scale;
  const width = svg?.getBoundingClientRect().width;
  return width ? box.width / width : 1;
}

/** Moves the slide or cursor by pointer drags on the given SVG, converting pixels through its own scale. */
function useRuleDrag(
  svgRef: React.RefObject<SVGSVGElement | null>,
  box: ViewBox,
  onMove: (part: Part, delta: number) => void,
  handlers: {
    onPan?(dx: number, dy: number): void;
    onDragging?(part: Part | undefined, client?: { x: number; y: number }): void;
  } = {},
  enabled = true,
) {
  const pinching = useRef(false);
  useGesture(
    {
      onDrag: ({ first, last, delta: [dx, dy], xy: [x, y], event, memo, cancel }) => {
        if (pinching.current) {
          cancel();
          return memo;
        }
        const part: Part | "pan" = first ? (partAt(event.target) ?? "pan") : memo;
        const scale = unitsPerPixel(svgRef.current, box);
        if (part === "pan") handlers.onPan?.(dx * scale, dy * scale);
        else {
          if (dx !== 0) onMove(part, (dx * scale) / SCALE_LENGTH);
          handlers.onDragging?.(last ? undefined : part, { x, y });
        }
        if (last) handlers.onDragging?.(undefined);
        return part;
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
      enabled,
      drag: { filterTaps: true, pointer: { keys: false } },
      eventOptions: { passive: false },
    },
  );
}

export function RuleViewport({ rule, state, loupePinned, onMove }: RuleViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const loupeRef = useRef<SVGSVGElement>(null);
  const size = useElementSize(containerRef);
  const layout = useMemo(() => computeFaceLayout(rule.faces[state.face]), [rule, state.face]);
  const [view, setView] = useState<View | null>(null);
  const content = useMemo(
    () => ({ x: 0, y: 0, width: RULE_WIDTH, height: layout.height }),
    [layout.height],
  );
  const current = view ?? fitView(content);
  const box = viewBoxFor(current, size, content);
  const [dragging, setDragging] = useState<{ part: Part; x: number; y: number } | null>(null);
  const [focusY, setFocusY] = useState<number | null>(null);

  const toContainer = (client: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: client.x - (rect?.left ?? 0), y: client.y - (rect?.top ?? 0) };
  };

  useRuleDrag(svgRef, box, onMove, {
    onPan: (dx, dy) =>
      setView({ ...current, centreX: current.centreX - dx, centreY: current.centreY - dy }),
    onDragging: (part, client) => {
      if (!part || !client) return setDragging(null);
      setDragging({ part, ...client });
      setFocusY(box.y + (toContainer(client).y / size.height) * box.height);
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

  const zoomBy = (factor: number) =>
    setView(
      zoomAt(
        current,
        current.zoom * factor,
        { x: size.width / 2, y: size.height / 2 },
        size,
        content,
      ),
    );

  const hairline = {
    x: MARGIN + state.cursor * SCALE_LENGTH,
    y: focusY ?? layout.slide.y + layout.slide.height / 2,
  };
  const dockedSize = { width: size.width, height: DOCKED_LOUPE_HEIGHT };
  const dockedBox = loupeViewBox(box, size.width, dockedSize, hairline);
  useRuleDrag(loupeRef, dockedBox, onMove, {}, loupePinned);

  const floating = dragging && !loupePinned ? floatingPosition(dragging) : null;

  return (
    <div className="viewport">
      {loupePinned && (
        <section
          className="loupe loupe-docked"
          aria-label="Loupe"
          style={{ height: DOCKED_LOUPE_HEIGHT }}
        >
          <RuleSvg
            rule={rule}
            state={state}
            viewBox={dockedBox}
            svgRef={loupeRef}
            accessible={false}
          />
        </section>
      )}
      <div
        className="viewport-main"
        ref={containerRef}
        // Proportional to the rule, but tall enough to pinch and pan on a phone.
        style={{
          height: `clamp(200px, calc((100vw - 32px) * ${(layout.height + 48) / (RULE_WIDTH + 32)}), 65vh)`,
        }}
      >
        <RuleSvg
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
            <RuleSvg
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
