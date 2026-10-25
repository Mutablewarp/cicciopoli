/**
 * The customer's speech bubble at the counter (KitchenHud.say). Anchored to the top of the customer's head
 * (game-host px), placed above it (wider for a long line) or beside it inside the free area (never over the ticket or
 * the action button, under the neon when there is room: text.ts placeBubble), tail on the head. The line is typed in
 * (all at once with reduced motion); the hidden rest of the line keeps the bubble at its final size from the first
 * letter, so it never grows or jumps while typing.
 */
import type { KitchenHud } from '../../contracts';
import { el, pixelHtml } from '../dom';
import { type Box, type MeasureBubble, placeBubble } from './text';

type Say = NonNullable<KitchenHud['say']>;

const CHAR_MS = 28;
const SHAKE: Keyframe[] = [{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }];
const POP: Keyframe[] = [{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'none' }];

export interface Bubble {
  readonly root: HTMLElement;
  /** null hides it; `free` gives the game host minus the covered strips, host px (read only when the bubble moves) */
  render(say: Say | null, free: () => Box): void;
  /** re-places the current bubble (resize, rotation) */
  place(free: Box): void;
  setCalm(calm: boolean): void;
}

export function createBubble(): Bubble {
  const root = el('div', 'cc-kbubble');
  root.hidden = true;
  root.setAttribute('role', 'status');
  const shown = el('span', 'cc-kbubble__shown');
  const rest = el('span', 'cc-kbubble__rest');
  rest.setAttribute('aria-hidden', 'true');
  root.append(shown, rest);

  let cur: Say | null = null;
  let typed = 0;
  let timer = 0;
  let calm = false;

  function type(): void {
    const full = cur?.text ?? '';
    typed = calm ? full.length : Math.min(full.length, typed + 1);
    shown.innerHTML = pixelHtml(full.slice(0, typed));
    rest.innerHTML = pixelHtml(full.slice(typed));
    if (typed < full.length) timer = window.setTimeout(type, CHAR_MS);
  }

  /** Size with up to `room` px of width (CSS `--room`, kitchen/play.css); scrollWidth counts a word wider than that. */
  const measure: MeasureBubble = (room) => {
    if (Number.isFinite(room)) root.style.setProperty('--room', `${Math.floor(room)}px`);
    else root.style.removeProperty('--room');
    return { w: Math.max(root.offsetWidth, root.scrollWidth), h: root.offsetHeight };
  };

  function place(free: Box): void {
    if (!cur) return;
    // measured at the origin: a bubble left at the far right would shrink-wrap to the room left there
    root.style.left = '0px';
    root.style.top = '0px';
    const p = placeBubble(free, cur.anchor, measure);
    measure(p.room);
    root.style.left = `${Math.round(p.x)}px`;
    root.style.top = `${Math.round(p.y)}px`;
    root.dataset.side = p.side;
    root.style.setProperty('--tail', `${Math.round(p.tail)}px`);
  }

  return {
    root,
    render(say, free) {
      if (!say) {
        cur = null;
        window.clearTimeout(timer);
        root.hidden = true;
        return;
      }
      const prev = cur;
      cur = say;
      if (!prev || prev.text !== say.text) {
        window.clearTimeout(timer);
        typed = 0;
        root.hidden = false;
        type();
        place(free());
        if (!calm) root.animate(POP, { duration: 260, easing: 'ease-out' });
      } else if (prev.anchor.x !== say.anchor.x || prev.anchor.y !== say.anchor.y) {
        place(free());
      }
      if (!prev || prev.mood !== say.mood || prev.text !== say.text) {
        root.dataset.mood = say.mood;
        if (say.mood === 'angry' && !calm) root.animate(SHAKE, { duration: 360 });
      }
    },
    place,
    setCalm(c) {
      calm = c;
    },
  };
}
