/** Width of the delete action revealed behind a swiped card. */
export const DELETE_WIDTH = 88;

/** How far ahead (s) a release velocity projects the card when deciding where it settles. */
const PROJECT_S = 0.1;

/** The card's x offset while dragging: from where it rests (open or closed), clamped to the action. */
export function dragOffset(open: boolean, translationX: number): number {
  const x = (open ? -DELETE_WIDTH : 0) + translationX;
  return Math.min(0, Math.max(-DELETE_WIDTH, x));
}

/** Where a released card settles: past halfway (with a little flick momentum) opens it. */
export function settleSwipe(
  open: boolean,
  translationX: number,
  velocityX: number,
): 'open' | 'closed' {
  const projected = dragOffset(open, translationX) + velocityX * PROJECT_S;
  return projected < -DELETE_WIDTH / 2 ? 'open' : 'closed';
}
