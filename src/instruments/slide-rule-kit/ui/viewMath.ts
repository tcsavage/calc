export const MIN_ZOOM = 1;
export const MAX_ZOOM = 24;
export const LOUPE_MAGNIFICATION = 4;
const PADDING = 16;

/** A rectangle in drawing units: an SVG viewBox or the extent of a drawing. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export function fitView(content: Box): View {
  return {
    zoom: 1,
    centreX: content.x + content.width / 2,
    centreY: content.y + content.height / 2,
  };
}

/** The visible region: at zoom 1 the whole drawing fits the container, keeping the container's aspect ratio. */
export function viewBoxFor(view: View, container: Size, content: Box): Box {
  const aspect = container.height / container.width;
  const fitWidth = Math.max(content.width + 2 * PADDING, (content.height + 2 * PADDING) / aspect);
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
  content: Box,
): View {
  const next = clampZoom(zoom);
  const before = viewBoxFor(view, container, content);
  const fx = point.x / container.width;
  const fy = point.y / container.height;
  const ux = before.x + fx * before.width;
  const uy = before.y + fy * before.height;
  const after = viewBoxFor({ ...view, zoom: next }, container, content);
  return {
    zoom: next,
    centreX: ux - fx * after.width + after.width / 2,
    centreY: uy - fy * after.height + after.height / 2,
  };
}

/** A magnified view centred on the hairline, magnified relative to the main view. */
export function loupeViewBox(
  main: Box,
  mainPixelWidth: number,
  loupe: Size,
  centre: { x: number; y: number },
  magnification = LOUPE_MAGNIFICATION,
): Box {
  const width = (main.width * loupe.width) / mainPixelWidth / magnification;
  const height = (width * loupe.height) / loupe.width;
  return { x: centre.x - width / 2, y: centre.y - height / 2, width, height };
}
