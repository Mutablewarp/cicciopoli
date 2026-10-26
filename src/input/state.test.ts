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

describe('driver mode', () => {
  it('Space brakes (downHeld) instead of jumping; ↓ / S brake too', () => {
    const s = new InputState();
    keyDown(s, 'Space', false, 'driver');
    expect([s.downHeld, s.jumpHeld]).toEqual([true, false]);
    s.reset();
    keyDown(s, 'KeyS', false, 'driver');
    expect(s.downHeld).toBe(true);
  });

  it('braking with the keyboard never replaces a lane press of the same frame', () => {
    const s = new InputState();
    keyDown(s, 'ArrowRight', false, 'driver');
    keyDown(s, 'Space', false, 'driver');
    expect([s.consumeDir(), s.downHeld]).toEqual(['right', true]);
  });

  it('a held ← is one lane press: auto-repeat never fires a second one', () => {
    const s = new InputState();
    keyDown(s, 'ArrowLeft', false, 'driver');
    expect(s.consumeDir()).toBe('left');
    keyDown(s, 'ArrowLeft', true, 'driver');
    keyDown(s, 'ArrowLeft', true, 'driver');
    expect(s.consumeDir()).toBe(null);
  });

  it('a lane tap (pushDir) is one press with no held axis, while the brake stays held', () => {
    const s = new InputState();
    s.press('t:1', 'down'); // FRENA finger
    s.pushDir('right'); // ▶ tap with another finger
    expect([s.axisX, s.downHeld]).toEqual([0, true]);
    expect(s.consumeDir()).toBe('right');
    expect(s.consumeDir()).toBe(null);
    expect(s.downHeld).toBe(true);
  });
});

describe('driver side view (v9: wide screens, the truck drives to the right)', () => {
  const side = (s: InputState, code: string, repeat = false): boolean => keyDown(s, code, repeat, 'driver', true, true);

  it('↑ / W = the lane above (consumeDir left), ↓ / S = the lane below (right): one press each, no brake, no jump', () => {
    const s = new InputState();
    for (const [code, dir] of [['ArrowUp', 'left'], ['KeyW', 'left'], ['ArrowDown', 'right'], ['KeyS', 'right']] as const) {
      expect(side(s, code)).toBe(true);
      expect([s.consumeDir(), s.downHeld, s.consume('jump')]).toEqual([dir, false, false]);
      side(s, code, true); // auto-repeat: still one press
      expect(s.consumeDir()).toBe(null);
      s.release(`k:${code}`);
    }
  });

  it('← / A / Space hold FRENA (downHeld) and never steer; → / D mean nothing', () => {
    const s = new InputState();
    for (const code of ['ArrowLeft', 'KeyA', 'Space']) {
      side(s, code);
      expect([s.downHeld, s.consumeDir()]).toEqual([true, null]);
      s.release(`k:${code}`);
      expect(s.downHeld).toBe(false);
    }
    expect(side(s, 'ArrowRight')).toBe(false);
    expect(side(s, 'KeyD')).toBe(false);
  });

  it('braking never replaces a lane press of the same frame; Esc / P still pause', () => {
    const s = new InputState();
    side(s, 'ArrowDown');
    side(s, 'Space');
    expect([s.consumeDir(), s.downHeld]).toEqual(['right', true]);
    side(s, 'KeyP');
    expect(s.consume('pause')).toBe(true);
  });

  it('the side map is the driver\'s only: other modes keep ↑ = jump', () => {
    const s = new InputState();
    keyDown(s, 'ArrowUp', false, 'platform', true, true);
    expect(s.consume('jump')).toBe(true);
  });
});

describe('kitchen mode', () => {
  it('Enter and Space press the action button once (fire), never jump; a held key does not repeat it', () => {
    const s = new InputState();
    for (const code of ['Enter', 'Space', 'NumpadEnter']) {
      expect(keyDown(s, code, false, 'kitchen')).toBe(true);
      expect([s.consume('fire'), s.jumpHeld]).toEqual([true, false]);
      keyDown(s, code, true, 'kitchen');
      expect(s.consume('fire')).toBe(false);
      s.release(`k:${code}`);
    }
  });

  it('while the button is disabled its keys are swallowed, not latched', () => {
    const s = new InputState();
    expect(keyDown(s, 'Enter', false, 'kitchen', false)).toBe(true);
    expect(s.consume('fire')).toBe(false);
  });

  it('Enter means nothing outside the kitchen', () => {
    expect(keyDown(new InputState(), 'Enter', false, 'platform')).toBe(false);
  });
});

describe('cartoon mode (level 8)', () => {
  const cartoon = (): InputState => {
    const s = new InputState();
    s.upJumps = false;
    return s;
  };

  it('↑ / W / ▲ only aim: upHeld and axisY, never a jump edge or jumpHeld', () => {
    const s = cartoon();
    keyDown(s, 'ArrowUp', false, 'cartoon');
    expect([s.axisY, s.upHeld, s.jumpHeld, s.consume('jump')]).toEqual([-1, true, false, false]);
    s.press('t:4', 'up'); // ▲ finger too
    s.release('k:ArrowUp');
    expect(s.upHeld).toBe(true);
  });

  it('Space / Z jump without aiming up; SALTA held with ▲ held reads as both', () => {
    const s = cartoon();
    for (const code of ['Space', 'KeyZ']) {
      keyDown(s, code, false, 'cartoon');
      expect([s.jumpHeld, s.upHeld, s.consume('jump')]).toEqual([true, false, true]);
      s.release(`k:${code}`);
    }
    s.press('t:1', 'jump');
    s.press('t:2', 'up');
    expect([s.jumpHeld, s.upHeld]).toEqual([true, true]);
  });

  it('dash / swap / super are one latched press each, from their keys', () => {
    const s = cartoon();
    const cases: Array<[string, 'dash' | 'swap' | 'super']> = [
      ['KeyK', 'dash'], ['KeyC', 'dash'], ['ShiftLeft', 'dash'], ['ShiftRight', 'dash'],
      ['KeyQ', 'swap'], ['KeyL', 'swap'], ['KeyE', 'super'], ['KeyV', 'super'],
    ];
    for (const [code, edge] of cases) {
      expect(keyDown(s, code, false, 'cartoon')).toBe(true);
      keyDown(s, code, true, 'cartoon'); // auto-repeat: still one press
      expect([s.consume(edge), s.consume(edge)]).toEqual([true, false]);
      s.release(`k:${code}`);
    }
    expect([s.consume('club'), s.clubHeld]).toEqual([false, false]);
  });

  it('J / X shoot held, Esc / P pause; the level 8 keys mean nothing elsewhere', () => {
    const s = cartoon();
    keyDown(s, 'KeyX', false, 'cartoon');
    keyDown(s, 'KeyP', false, 'cartoon');
    expect([s.fireHeld, s.consume('fire'), s.consume('pause')]).toEqual([true, true, true]);
    const p = new InputState();
    for (const code of ['KeyZ', 'KeyQ', 'KeyE', 'KeyV', 'KeyL', 'ShiftLeft']) expect(keyDown(p, code, false, 'platform')).toBe(false);
    keyDown(p, 'KeyK', false, 'platform');
    expect([p.consume('club'), p.consume('dash')]).toEqual([true, false]);
  });

  it('move + jump + dash + shoot from four fingers at once', () => {
    const s = cartoon();
    s.press('t:1', 'right');
    s.press('t:1:up', 'up');
    s.press('t:2', 'jump');
    s.press('t:3', 'dash');
    s.press('t:5', 'fire');
    expect([s.axisX, s.upHeld, s.jumpHeld, s.fireHeld]).toEqual([1, true, true, true]);
    expect([s.consume('jump'), s.consume('dash'), s.consume('fire')]).toEqual([true, true, true]);
  });

  it('back in the other modes ↑ jumps again', () => {
    const s = cartoon();
    s.upJumps = true;
    s.press('k:ArrowUp', 'up');
    expect([s.jumpHeld, s.consume('jump')]).toEqual([true, true]);
  });
});
