import { describe, expect, it } from 'vitest';
import { InputState } from '../input/state';
import { bindPad } from './dpad';

/** Minimal stand-ins for the DOM pieces bindPad touches (vitest runs in node). */
function fakePad(input: InputState) {
  const zone = Object.assign(new EventTarget(), { setPointerCapture() {} }) as unknown as HTMLElement;
  const face = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) } as unknown as HTMLElement;
  const pad = bindPad(zone, face, input, () => false, (dx) => (dx < 0 ? 'left' : 'right'), () => {});
  const send = (type: string, pointerId: number, clientX: number): void => {
    zone.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { pointerId, clientX, clientY: 50, pointerType: 'touch', button: 0 }));
  };
  return { pad, send };
}

describe('touch pad after an input reset', () => {
  it('a finger still down presses again on its next move', () => {
    const input = new InputState();
    const { pad, send } = fakePad(input);
    send('pointerdown', 1, 10);
    expect(input.axisX).toBe(-1);
    input.reset();
    pad.rearm();
    expect(input.axisX).toBe(0); // nothing sticks through the reset
    send('pointermove', 1, 90);
    expect(input.axisX).toBe(1);
    send('pointerup', 1, 90);
    expect(input.axisX).toBe(0);
  });

  it('release() still forgets every finger', () => {
    const input = new InputState();
    const { pad, send } = fakePad(input);
    send('pointerdown', 2, 10);
    pad.release();
    expect(input.axisX).toBe(0);
    send('pointermove', 2, 90);
    expect(input.axisX).toBe(0);
  });
});
