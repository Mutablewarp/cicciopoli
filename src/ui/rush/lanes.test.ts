import { describe, expect, it } from 'vitest';
import { InputState } from '../../input/state';
import { bindLane } from './lanes';

/** Minimal stand-in for a lane button (vitest runs in node, like dpad.test.ts). */
function fakeButton(): HTMLElement {
  const classes = new Set<string>();
  return Object.assign(new EventTarget(), {
    setPointerCapture() {},
    classList: {
      add: (c: string) => classes.add(c),
      toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)),
    },
  }) as unknown as HTMLElement;
}

function rig() {
  const input = new InputState();
  const fingers = new Map<number, HTMLElement>();
  const left = fakeButton();
  const right = fakeButton();
  bindLane(left, 'left', input, () => false, fingers);
  bindLane(right, 'right', input, () => false, fingers);
  const send = (b: HTMLElement, type: string, pointerId: number): void => {
    b.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { pointerId, pointerType: 'touch', button: 0 }));
  };
  return { input, left, right, send };
}

describe('lane buttons', () => {
  it('one tap = one lane press, never a held axis', () => {
    const { input, right, send } = rig();
    send(right, 'pointerdown', 1);
    expect(input.axisX).toBe(0);
    expect(input.consumeDir()).toBe('right');
    send(right, 'pointermove', 1);
    expect(input.consumeDir()).toBe(null); // a resting thumb does not repeat
    send(right, 'pointerup', 1);
    send(right, 'click', 1);
    expect(input.consumeDir()).toBe(null); // no second fire on release / click
  });

  it('a second pointerdown of the same finger (synthetic echo) is ignored', () => {
    const { input, left, send } = rig();
    send(left, 'pointerdown', 4);
    send(left, 'pointerdown', 4);
    expect(input.consumeDir()).toBe('left');
    expect(input.consumeDir()).toBe(null);
  });

  it('works while another finger keeps FRENA held', () => {
    const { input, left, right, send } = rig();
    input.press('t:9', 'down', false); // FRENA finger (controls.ts holds it without a direction)
    send(left, 'pointerdown', 1);
    expect([input.consumeDir(), input.downHeld]).toEqual(['left', true]);
    send(left, 'pointerup', 1);
    send(right, 'pointerdown', 2);
    expect([input.consumeDir(), input.downHeld, input.axisX]).toEqual(['right', true, 0]);
  });

  it('is ignored while gameplay input is disabled (an overlay is open)', () => {
    const { input, right, send } = rig();
    input.enabled = false;
    send(right, 'pointerdown', 1);
    input.enabled = true;
    expect(input.consumeDir()).toBe(null);
  });
});
