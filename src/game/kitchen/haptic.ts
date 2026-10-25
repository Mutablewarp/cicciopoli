/**
 * A short haptic tick. navigator.vibrate(ms) where the phone has it (Android). iPhone Safari has no Vibration API: it
 * gets the system tick of a switch control (iOS 18+), a hidden <input type="checkbox" switch> toggled through its
 * <label>. That tick has no length, and iOS gives it only inside a touch: the grab of a pan, not a drop after a flight.
 */
let tick: HTMLLabelElement | null = null;

export function haptic(ms: number): void {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
    return;
  }
  if (!tick) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    tick = document.createElement('label');
    tick.setAttribute('aria-hidden', 'true');
    // off screen, not display:none (a hidden control gives no tick)
    tick.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    tick.append(input);
    document.body.append(tick);
  }
  tick.click();
}
