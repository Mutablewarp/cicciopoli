/**
 * Level 7 order ticket (scontrino): burger name and price, SINGOLO / MENÙ and the customer, then the checklist (the burger lines,
 * a dashed MENÙ rule, the menù parts) and the wrong items in red with ✗. Rebuilt only when the order itself changes;
 * ticks, partial counts and new wrong items update in place with a pop / shake. An order longer than its slot scrolls
 * its lines (a finger can drag them) and keeps the next line to do in view, always whole rows (an arrow when rows are
 * hidden above); the menù parts stay pinned at its bottom while one is still to do (the guide sends the player to the
 * fryer and the drinks while the patty cooks).
 */
import type { KitchenTicket } from '../../contracts';
import { el, pixelHtml, setText } from '../dom';
import { crossSvg, tickSvg } from './icons';
import { type LineView, lineView, namedBy, shortLabel, ticketLabel } from './text';

/** Sub-pixel overflow (CSS px) that still counts as fitting. */
const SPILL = 0.5;
/** A row edge this close (CSS px) to the list's top edge is on it: more would show as a device-pixel sliver. */
const EDGE = 0.05;
/** Over the pinned menù parts a scrolling list keeps this many rows of burger lines (the last one under the fade). */
const PIN_ROWS = 1.4;
const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.7)' }, { transform: 'scale(1)' }];
const SHAKE: Keyframe[] = [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'none' }];

interface Row {
  li: HTMLElement;
  box: HTMLElement;
  status: HTMLElement;
  /** the order's label (namedBy) */
  name: string;
  menu: boolean;
}

export interface Ticket {
  readonly paper: HTMLElement;
  /** the customer row: the patience meter docks at its end while a ticket is up */
  readonly meta: HTMLElement;
  /** Returns true when the ticket's size may have changed (new order, wrong items): the slot re-fits it. */
  render(t: KitchenTicket): boolean;
  /**
   * True when the title, the customer's row or a line is wider than its box (a long word in a narrow layout), or the
   * lines need more height than the ticket has left: the slot tries the next layout.
   */
  overflows(): boolean;
  /**
   * The lines scroll when they still do not fit: the finger may drag them, the menù parts still to do are pinned at the
   * bottom, the line the tutorial `hint` names (else the next line to do) is scrolled into view.
   */
  scroll(hint?: string | null): void;
  /** The bins' short names for the longest lines (the tightest layout) or the full ones. */
  short(on: boolean): void;
  /**
   * The customer's full name, or only the last word ("Signora Rosalia" -> "Rosalia") when the full one does not fit
   * beside SINGOLO / MENÙ and the patience meter, else the full name on a row of its own (narrow landscape column);
   * none when not even the last word fits there. `ownRow` false: no row of its own (the lines need that height).
   */
  fitName(ownRow?: boolean): void;
}

const text = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, value: string): HTMLElementTagNameMap[K] => el(tag, cls, pixelHtml(value));

/** A line's name; `data-name` keeps the full one while short() shows the bins' one. */
function label(name: string): HTMLElement {
  const n = text('span', 'cc-kline__label', name);
  n.dataset.name = name;
  n.dataset.shown = name;
  return n;
}

/** The order itself (not its progress): a change rebuilds the list. */
const shapeOf = (t: KitchenTicket): string =>
  JSON.stringify([t.title, t.form, t.price, t.customer, t.lines.map((l) => [l.label, l.count, l.group])]);

export function createTicket(): Ticket {
  const paper = el('div', 'cc-kticket');
  const title = el('b', 'cc-kticket__title');
  const form = el('span', 'cc-kticket__form');
  const price = el('span', 'cc-kticket__price');
  const head = el('div', 'cc-kticket__head');
  head.append(title, price);
  const who = el('span', 'cc-kticket__who');
  const meta = el('div', 'cc-kticket__meta');
  meta.append(form, who);
  const list = el('ul', 'cc-kticket__lines');
  list.dataset.scrollable = ''; // main.ts blocks touch scrolling elsewhere
  // the dashed MENÙ rule and the menù parts: in the list's flow (display: contents) until pinned
  const group = el('li', 'cc-kmenu');
  const groupLines = el('ul', 'cc-kmenu__lines');
  group.append(groupLines);
  paper.append(head, meta, list);
  // more below: the fade (kitchen/hud.css); rows scrolled away above: the arrow on the paper's dashed rule
  const more = (): void => {
    list.classList.toggle('has-more', list.scrollTop + list.clientHeight < list.scrollHeight - 1);
    paper.classList.toggle('has-less', list.classList.contains('is-scroll') && list.scrollTop > 0.5);
  };
  list.addEventListener('scroll', more, { passive: true });

  let shape = '';
  let customer = '';
  let rows: Row[] = [];
  let wrong: string[] = [];
  let wrongEls: HTMLElement[] = [];
  let focus: string | null = null;
  /** CSS px of end padding reveal() added under the list's own, so a row near the end can scroll to the top */
  let extra = 0;
  const unpad = (): void => {
    extra = 0;
    list.style.paddingBottom = '';
  };

  function row(v: LineView, name: string, menu: boolean): Row {
    const li = el('li', 'cc-kline');
    const box = el('i', 'cc-kline__box', tickSvg());
    const qty = text('b', 'cc-kline__qty', v.qty);
    qty.hidden = !v.qty;
    const status = el('em', 'cc-kline__st');
    li.append(box, label(v.label), qty, status);
    return { li, box, status, name, menu };
  }

  /** Returns true when the line changed. */
  function paint(r: Row, v: LineView, animate: boolean): boolean {
    const was = r.li.dataset.state;
    if (was === v.state && r.status.textContent === v.status) return false;
    r.li.dataset.state = v.state;
    setText(r.status, v.status);
    if (!animate) return true;
    if (v.state === 'done') r.box.animate(POP, { duration: 320, easing: 'ease-out' });
    else if (v.state === 'over') r.li.animate(SHAKE, { duration: 300 });
    return true;
  }

  /** How far the last line runs under the list's bottom edge, sub-pixel (scrollHeight is rounded: down on WebKit). */
  function spill(): number {
    const items = list.querySelectorAll('li');
    const last = items[items.length - 1];
    if (!last) return 0;
    const box = list.getBoundingClientRect();
    return last.getBoundingClientRect().bottom + list.scrollTop - (box.top + list.clientTop + list.clientHeight);
  }

  /** A scrolling menù order pins its parts at the bottom while one is still to do and they leave the burger lines room. */
  function pin(): void {
    list.classList.remove('is-stick');
    if (!rows.some((r) => r.menu && r.li.dataset.state !== 'done')) return;
    list.classList.add('is-stick');
    if (list.clientHeight - group.offsetHeight < PIN_ROWS * rows[0].li.offsetHeight) list.classList.remove('is-stick');
  }

  /**
   * The rows the list scrolls (chips side by side share one), in its scroll coordinates (offsetTop may or may not count
   * the list's own scroll, by engine): the burger lines, the wrong items and, unless pinned, the menù parts.
   */
  function spans(pinned: boolean): Array<{ top: number; bottom: number; items: HTMLElement[] }> {
    const y0 = list.getBoundingClientRect().top + list.clientTop - list.scrollTop;
    const out: Array<{ top: number; bottom: number; items: HTMLElement[] }> = [];
    for (const li of list.querySelectorAll<HTMLElement>('li')) {
      if (li === group || (pinned && group.contains(li))) continue;
      const b = li.getBoundingClientRect();
      if (b.height === 0) continue;
      const last = out[out.length - 1];
      if (last && b.top - y0 < last.bottom - 0.5) {
        last.bottom = Math.max(last.bottom, b.bottom - y0);
        last.items.push(li);
      } else out.push({ top: b.top - y0, bottom: b.bottom - y0, items: [li] });
    }
    return out;
  }

  /**
   * Scrolls the row of the line the tutorial names, else of the first line still to do (else of the first wrong item)
   * to the top of a scrolling list, the rest under it, or as far as the last row needs; the pinned menù parts are in
   * view anyway. Always to a whole row: the top padding (kitchen/hud.css: room for the tick's pop) above it, never half
   * a row at the top; the list's end gets the padding a row near it needs to reach the top (kept until the next fit,
   * so a tick does not scroll the view back). A line counts as in view
   * only above the fade at the bottom of the view (the list's own, or the one over the pinned parts).
   */
  function reveal(): void {
    const pinned = list.classList.contains('is-stick');
    const free = rows.filter((r) => !(pinned && r.menu));
    const said = focus;
    const next = (said ? free.find((r) => namedBy(r.name, said)) : undefined) ?? free.find((r) => r.li.dataset.state !== 'done');
    const li = next?.li ?? wrongEls[0];
    const all = spans(pinned);
    const at = list.scrollTop;
    const t = li ? all.findIndex((s) => s.items.includes(li)) : -1;
    // nothing left to show: the row at the top stays, whole
    const keep = t >= 0 ? t : all.findIndex((s) => s.bottom > at + EDGE);
    if (keep >= 0) {
      const cs = getComputedStyle(list);
      const pad = parseFloat(cs.paddingTop) || 0;
      const fade = parseFloat(cs.getPropertyValue('--fade')) || 0;
      const view = list.clientHeight - (pinned ? group.offsetHeight : 0);
      const cut = all.some((s) => s.top < at - EDGE && s.bottom > at + EDGE);
      if (cut || all[keep].top < at - EDGE || all[keep].bottom > at + view - fade) {
        const end = all[all.length - 1].bottom - view;
        const fits = all.findIndex((s) => s.top - pad >= end);
        const s = fits >= 0 ? Math.min(keep, fits) : keep;
        // past the row above (the padding is taller than the gap), rounded up: an engine that keeps whole-pixel offsets
        // would show a sliver of it
        const y = Math.ceil(Math.max(all[s].top - pad, s > 0 ? all[s - 1].bottom : 0));
        const need = Math.max(0, y - (list.scrollHeight - extra - list.clientHeight));
        if (need !== extra) {
          const css = (parseFloat(cs.paddingBottom) || 0) - extra;
          extra = need;
          list.style.paddingBottom = extra ? `${css + extra}px` : '';
        }
        list.scrollTop = y;
      }
    }
    more();
  }

  function build(t: KitchenTicket): void {
    title.innerHTML = pixelHtml(t.title);
    form.innerHTML = pixelHtml(t.form);
    form.classList.toggle('is-menu', t.form === 'MENÙ');
    setText(price, t.price);
    customer = t.customer;
    list.replaceChildren();
    groupLines.replaceChildren();
    rows = [];
    let sep = false;
    // burger lines first, then the menù parts under their dashed rule, each keeping its index in t.lines
    const order = [...t.lines.keys()].sort((a, b) => Number(t.lines[a].group === 'menu') - Number(t.lines[b].group === 'menu'));
    for (const i of order) {
      const l = t.lines[i];
      const menu = l.group === 'menu';
      if (menu && !sep) {
        sep = true;
        groupLines.append(el('li', 'cc-ksep', `<span>${pixelHtml('MENÙ')}</span>`));
        list.append(group);
      }
      rows[i] = row(lineView(l), l.label, menu);
      (menu ? groupLines : list).append(rows[i].li);
    }
    wrong = [];
    wrongEls = [];
  }

  function renderWrong(next: readonly string[], animate: boolean): void {
    for (const n of wrongEls) n.remove();
    wrongEls = next.map((name) => {
      const li = el('li', 'cc-kline is-wrong', `<i class="cc-kline__box">${crossSvg()}</i>`);
      li.append(label(ticketLabel(name)));
      if (animate && !wrong.includes(name)) li.animate(SHAKE, { duration: 320 });
      return li;
    });
    list.append(...wrongEls);
    wrong = [...next];
  }

  return {
    paper,
    meta,
    render(t) {
      const next = shapeOf(t);
      const fresh = next !== shape;
      if (fresh) {
        shape = next;
        build(t);
      }
      let ticked = false;
      t.lines.forEach((l, i) => {
        ticked = paint(rows[i], lineView(l), !fresh) || ticked;
      });
      const wrongChanged = t.wrong.length !== wrong.length || t.wrong.some((w, i) => w !== wrong[i]);
      if (wrongChanged) renderWrong(t.wrong, !fresh);
      // a tick on a scrolling list: the next line to do comes into view (a new size re-fits, then scroll() does it)
      if (ticked && !fresh && !wrongChanged && list.classList.contains('is-scroll')) {
        pin();
        reveal();
      }
      return fresh || wrongChanged;
    },
    overflows() {
      // measured with the menù parts in the flow and no end padding (scroll() pins and pads again)
      list.classList.remove('is-stick');
      unpad();
      return spill() > SPILL || [title, meta, ...list.querySelectorAll('li')].some((n) => n.scrollWidth > n.clientWidth + 1);
    },
    scroll(hint = null) {
      focus = hint;
      list.classList.remove('is-stick');
      const on = spill() > SPILL;
      list.classList.toggle('is-scroll', on);
      if (!on) {
        unpad();
        list.classList.remove('has-more');
        paper.classList.remove('has-less');
        return;
      }
      pin();
      reveal();
    },
    short(on) {
      for (const n of list.querySelectorAll<HTMLElement>('.cc-kline__label')) {
        const name = n.dataset.name ?? '';
        const shown = on ? shortLabel(name) : name;
        if (n.dataset.shown === shown) continue;
        n.dataset.shown = shown;
        n.innerHTML = pixelHtml(shown);
      }
    },
    fitName(ownRow = true) {
      const cut = (): boolean => who.scrollWidth > who.clientWidth;
      const last = customer.split(' ').pop() ?? customer;
      meta.classList.remove('is-wrap');
      setText(who, customer);
      if (!cut()) return;
      setText(who, last);
      if (!cut()) return;
      if (!ownRow) {
        setText(who, '');
        return;
      }
      meta.classList.add('is-wrap');
      setText(who, customer);
      if (!cut()) return;
      setText(who, last);
      if (cut()) setText(who, '');
    },
  };
}
