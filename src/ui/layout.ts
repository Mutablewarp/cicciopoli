/**
 * Touch vs desktop mode. Desktop = fine pointer and no touch seen yet: touch controls
 * hidden, key legends shown. The first real touch switches to touch mode for good.
 */
export function trackPointerMode(shell: HTMLElement): void {
  let touch = !window.matchMedia('(pointer: fine)').matches;
  const apply = (): void => {
    shell.classList.toggle('is-touch', touch);
    shell.classList.toggle('is-desktop', !touch);
  };
  const onTouch = (): void => {
    if (touch) return;
    touch = true;
    apply();
  };
  apply();
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') onTouch();
    },
    { capture: true, passive: true },
  );
  window.addEventListener('touchstart', onTouch, { capture: true, passive: true });
}
