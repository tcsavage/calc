export const FLOATING_LOUPE = { width: 240, height: 110 };
export const DOCKED_LOUPE_HEIGHT = 120;
const FINGER_GAP = 28;

/**
 * In window coordinates, above the finger so it is not covered (or below it at the very top of the
 * window), and kept inside the window. Fixed positioning lets it overlap the toolbar on short viewports.
 */
export function floatingPosition(pointer: { x: number; y: number }) {
  const maxLeft = window.innerWidth - FLOATING_LOUPE.width - 4;
  const left = Math.min(Math.max(4, pointer.x - FLOATING_LOUPE.width / 2), maxLeft);
  const above = pointer.y - FLOATING_LOUPE.height - FINGER_GAP;
  const top = above >= 0 ? above : pointer.y + FINGER_GAP;
  return { left, top };
}
