import { RULE_WIDTH } from "../../../core/slide-rule/geometry/layout";
import type { ViewBox } from "./RuleSvg";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 24;
export const LOUPE_MAGNIFICATION = 4;
const PADDING = 16;

export interface View {
  zoom: number;
  centreX: number;
  centreY: number;
}

export interface Size {
  width: number;
  height: number;
}

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export function fitView(ruleHeight: number): View {
  return { zoom: 1, centreX: RULE_WIDTH / 2, centreY: ruleHeight / 2 };
}

/** The visible region: at zoom 1 the whole rule fits the container, keeping the container's aspect ratio. */
export function viewBoxFor(view: View, container: Size, ruleHeight: number): ViewBox {
  const aspect = container.height / container.width;
  const fitWidth = Math.max(RULE_WIDTH + 2 * PADDING, (ruleHeight + 2 * PADDING) / aspect);
  const width = fitWidth / view.zoom;
  const height = width * aspect;
  return { x: view.centreX - width / 2, y: view.centreY - height / 2, width, height };
}

/** Zooms so the drawing point under the given container point stays put. */
export function zoomAt(
  view: View,
  zoom: number,
  point: { x: number; y: number },
  container: Size,
  ruleHeight: number,
): View {
  const next = clampZoom(zoom);
  const before = viewBoxFor(view, container, ruleHeight);
  const fx = point.x / container.width;
  const fy = point.y / container.height;
  const ux = before.x + fx * before.width;
  const uy = before.y + fy * before.height;
  const after = viewBoxFor({ ...view, zoom: next }, container, ruleHeight);
  return {
    zoom: next,
    centreX: ux - fx * after.width + after.width / 2,
    centreY: uy - fy * after.height + after.height / 2,
  };
}

/** A magnified view centred on the hairline, magnified relative to the main view. */
export function loupeViewBox(
  main: ViewBox,
  mainPixelWidth: number,
  loupe: Size,
  centre: { x: number; y: number },
  magnification = LOUPE_MAGNIFICATION,
): ViewBox {
  const width = (main.width * loupe.width) / mainPixelWidth / magnification;
  const height = (width * loupe.height) / loupe.width;
  return { x: centre.x - width / 2, y: centre.y - height / 2, width, height };
}
