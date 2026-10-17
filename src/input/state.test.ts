import { describe, expect, it } from 'vitest';
import { keyDown } from './keyboard';
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

  it('axisY: last pressed of up/down wins; ↑ also reads as jump, Space is not up', () => {
    const s = new InputState();
    s.press('k:Space', 'jump');
    expect(s.axisY).toBe(0);
    expect(s.jumpHeld).toBe(true);
    s.press('k:ArrowDown', 'down');
    expect(s.axisY).toBe(1);
    s.press('k:ArrowUp', 'up');
    expect(s.axisY).toBe(-1);
    s.release('k:ArrowUp');
    expect(s.axisY).toBe(1);
    s.release('k:ArrowDown');
    s.release('k:Space');
    s.press('k:KeyW', 'up');
    expect([s.axisY, s.jumpHeld, s.upHeld]).toEqual([-1, true, true]);
    expect(s.consume('jump')).toBe(true);
  });

  it('consumeDir latches the most recent direction press once', () => {
    const s = new InputState();
    expect(s.consumeDir()).toBe(null);
    s.press('k:ArrowLeft', 'left');
    s.press('p:1', 'up');
    s.release('p:1');
    expect(s.consumeDir()).toBe('up');
    expect(s.consumeDir()).toBe(null);
    s.press('p:2', 'right');
    s.press('p:2', 'down'); // cross-pad finger slides to another arm
    expect(s.consumeDir()).toBe('down');
    s.pushDir('left'); // swipe
    expect(s.consumeDir()).toBe('left');
    s.press('k:Space', 'jump');
    expect(s.consumeDir()).toBe(null);
  });

  it('consumeDir is masked while disabled and cleared by reset', () => {
    const s = new InputState();
    s.press('p:1', 'up');
    s.enabled = false;
    expect(s.consumeDir()).toBe(null);
    s.enabled = true;
    expect(s.consumeDir()).toBe(null);
    s.enabled = false;
    s.pushDir('left');
    s.enabled = true;
    expect(s.consumeDir()).toBe(null);
    s.pushDir('right');
    s.reset();
    expect(s.consumeDir()).toBe(null);
  });

  it('silent re-acquire holds without latching an edge or a direction', () => {
    const s = new InputState();
    s.press('k:ArrowRight', 'right', false);
    s.press('k:Space', 'jump', false);
    expect([s.axisX, s.jumpHeld]).toEqual([1, true]);
    expect(s.consume('jump')).toBe(false);
    expect(s.consumeDir()).toBe(null);
  });
});

describe('keyDown', () => {
  it('re-acquires a held key after a reset from its auto-repeat (L1-07)', () => {
    const s = new InputState();
    keyDown(s, 'ArrowRight', false, 'platform');
    expect(s.consumeDir()).toBe('right');
    s.reset(); // pause / rotation
    keyDown(s, 'ArrowRight', true, 'platform');
    expect(s.axisX).toBe(1);
    expect(s.consumeDir()).toBe(null);
    keyDown(s, 'ArrowRight', true, 'platform'); // further repeats change nothing
    expect(s.axisX).toBe(1);
  });

  it('never re-acquires pause from a repeat (held Esc must not re-pause)', () => {
    const s = new InputState();
    keyDown(s, 'Escape', true, 'platform');
    expect(s.consume('pause')).toBe(false);
  });

  it('Space is fire in the shooter, jump elsewhere; unmapped keys are ignored', () => {
    const s = new InputState();
    keyDown(s, 'Space', false, 'shooter');
    expect([s.fireHeld, s.jumpHeld]).toEqual([true, false]);
    s.reset();
    keyDown(s, 'Space', false, 'maze');
    expect(s.jumpHeld).toBe(true);
    expect(keyDown(s, 'KeyQ', false, 'platform')).toBe(false);
  });
});
