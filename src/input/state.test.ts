import { describe, expect, it } from 'vitest';
import { InputState } from './state';

describe('InputState', () => {
  it('axisX follows the most recently pressed direction while both are held', () => {
    const s = new InputState();
    s.press('k:ArrowLeft', 'left');
    expect(s.axisX).toBe(-1);
    s.press('p:2', 'right');
    expect(s.axisX).toBe(1);
    s.release('p:2');
    expect(s.axisX).toBe(-1);
    s.release('k:ArrowLeft');
    expect(s.axisX).toBe(0);
  });

  it('a d-pad pointer switching direction becomes the newest press', () => {
    const s = new InputState();
    s.press('p:1', 'left');
    s.press('k:KeyD', 'right');
    expect(s.axisX).toBe(1);
    s.press('p:1', 'right');
    s.press('p:1', 'left');
    expect(s.axisX).toBe(-1);
    s.press('p:1', 'left'); // same action again: no new seq, still newest
    expect(s.axisX).toBe(-1);
  });

  it('releasing one pointer never cancels another holding the same action', () => {
    const s = new InputState();
    s.press('p:1', 'jump');
    s.press('p:2', 'jump');
    s.release('p:1');
    expect(s.jumpHeld).toBe(true);
    expect(s.upHeld).toBe(true);
    s.release('p:2');
    expect(s.jumpHeld).toBe(false);
  });

  it('independent fingers: move + jump + fire held together', () => {
    const s = new InputState();
    s.press('p:1', 'right');
    s.press('p:2', 'jump');
    s.press('p:3', 'fire');
    expect([s.axisX, s.jumpHeld, s.fireHeld]).toEqual([1, true, true]);
    s.release('p:2');
    expect([s.axisX, s.jumpHeld, s.fireHeld]).toEqual([1, false, true]);
  });

  it('latches a tap shorter than a frame and consumes it once', () => {
    const s = new InputState();
    s.press('p:5', 'jump');
    s.release('p:5');
    expect(s.jumpHeld).toBe(false);
    expect(s.consume('jump')).toBe(true);
    expect(s.consume('jump')).toBe(false);
    expect(s.consume('fire')).toBe(false);
  });

  it('does not latch again while the same source keeps holding (key repeat safe)', () => {
    const s = new InputState();
    s.press('k:Space', 'jump');
    expect(s.consume('jump')).toBe(true);
    s.press('k:Space', 'jump');
    expect(s.consume('jump')).toBe(false);
  });

  it('reset (cancel / blur) drops holds and latches and notifies listeners', () => {
    const s = new InputState();
    let notified = 0;
    s.onReset(() => notified++);
    s.press('p:1', 'left');
    s.press('k:KeyJ', 'fire');
    s.reset();
    expect(s.axisX).toBe(0);
    expect(s.fireHeld).toBe(false);
    expect(s.consume('fire')).toBe(false);
    expect(s.has('p:1')).toBe(false);
    expect(notified).toBe(1);
    s.release('p:1'); // late pointerup after a reset is harmless
    expect(s.axisX).toBe(0);
  });

  it('enabled=false masks held states and edges, but pause still latches', () => {
    const s = new InputState();
    s.press('k:ArrowRight', 'right');
    s.enabled = false;
    expect(s.axisX).toBe(0);
    s.press('k:Space', 'jump');
    s.press('k:Escape', 'pause');
    expect(s.jumpHeld).toBe(false);
    expect(s.consume('jump')).toBe(false);
    expect(s.consume('pause')).toBe(true);
    s.enabled = true;
    expect(s.axisX).toBe(1);
    expect(s.consume('jump')).toBe(false);
  });

  it('a latch taken while enabled is not delivered after disabling', () => {
    const s = new InputState();
    s.press('k:KeyK', 'club');
    s.enabled = false;
    expect(s.consume('club')).toBe(false);
    s.enabled = true;
    expect(s.consume('club')).toBe(false);
  });
});
