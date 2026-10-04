import { DELETE_WIDTH, dragOffset, settleSwipe } from './swipe';

describe('dragOffset', () => {
  it('follows the finger from closed', () => {
    expect(dragOffset(false, -40)).toBe(-40);
  });

  it('starts from the open position when already open', () => {
    expect(dragOffset(true, 30)).toBe(-DELETE_WIDTH + 30);
  });

  it('never goes past the action or to the right of the card', () => {
    expect(dragOffset(false, -500)).toBe(-DELETE_WIDTH);
    expect(dragOffset(false, 60)).toBe(0);
    expect(dragOffset(true, -500)).toBe(-DELETE_WIDTH);
  });
});

describe('settleSwipe', () => {
  it('opens past the halfway point', () => {
    expect(settleSwipe(false, -DELETE_WIDTH / 2 - 1, 0)).toBe('open');
  });

  it('closes short of the halfway point', () => {
    expect(settleSwipe(false, -DELETE_WIDTH / 2 + 1, 0)).toBe('closed');
  });

  it('opens on a fast left flick even from a short drag', () => {
    expect(settleSwipe(false, -10, -1500)).toBe('open');
  });

  it('closes on a fast right flick from open', () => {
    expect(settleSwipe(true, 10, 1500)).toBe('closed');
  });

  it('stays open when an open card is nudged a little', () => {
    expect(settleSwipe(true, 10, 0)).toBe('open');
  });

  it('closes an open card dragged back past halfway', () => {
    expect(settleSwipe(true, DELETE_WIDTH / 2 + 1, 0)).toBe('closed');
  });
});
