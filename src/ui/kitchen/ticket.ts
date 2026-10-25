/**
 * Level 7 order ticket (scontrino): burger name and price, SINGOLO / MENÙ and the customer, then the checklist (the burger lines,
 * a dashed MENÙ rule, the menù parts) and the wrong items in red with ✗. Rebuilt only when the order itself changes;
 * ticks, partial counts and new wrong items update in place with a pop / shake.
 */
import type { KitchenTicket } from '../../contracts';
import { el, pixelHtml, setText } from '../dom';
import { crossSvg, tickSvg } from './icons';
import { type LineView, lineView, shortLabel, ticketLabel } from './text';

const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.7)' }, { transform: 'scale(1)' }];
const SHAKE: Keyframe[] = [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'none' }];

interface Row {
  li: HTMLElement;
  box: HTMLElement;
  status: HTMLElement;
}

export interface Ticket {
  readonly paper: HTMLElement;
  /** the customer row: the patience meter docks at its end while a ticket is up */
  readonly meta: HTMLElement;
  /** Returns true when the ticket's size may have changed (new order, wrong items): the slot re-fits it. */
  render(t: KitchenTicket): boolean;
  /** True when a line is wider than its column (a long word in the two-column layout): the slot tries the next layout. */
  overflows(): boolean;
  /** The bins' short names for the longest lines (the tightest layout) or the full ones. */
  short(on: boolean): void;
  /**
   * The customer's full name, or only the last word ("Signora Rosalia" -> "Rosalia") when the full one does not fit
   * beside SINGOLO / MENÙ and the patience meter, else the full name on a row of its own (narrow landscape column);
   * none when not even the last word fits (the tightest ticket's title row).
   */
  fitName(): void;
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
  paper.append(head, meta, list);

  let shape = '';
  let customer = '';
  let rows: Row[] = [];
  let wrong: string[] = [];
  let wrongEls: HTMLElement[] = [];

  function row(v: LineView): Row {
    const li = el('li', 'cc-kline');
    const box = el('i', 'cc-kline__box', tickSvg());
    const qty = text('b', 'cc-kline__qty', v.qty);
    qty.hidden = !v.qty;
    const status = el('em', 'cc-kline__st');
    li.append(box, label(v.label), qty, status);
    return { li, box, status };
  }

  function paint(r: Row, v: LineView, animate: boolean): void {
    const was = r.li.dataset.state;
    if (was === v.state && r.status.textContent === v.status) return;
    r.li.dataset.state = v.state;
    setText(r.status, v.status);
    if (!animate) return;
    if (v.state === 'done') r.box.animate(POP, { duration: 320, easing: 'ease-out' });
    else if (v.state === 'over') r.li.animate(SHAKE, { duration: 300 });
  }

  function build(t: KitchenTicket): void {
    title.innerHTML = pixelHtml(t.title);
    form.innerHTML = pixelHtml(t.form);
    form.classList.toggle('is-menu', t.form === 'MENÙ');
    setText(price, t.price);
    customer = t.customer;
    list.replaceChildren();
    rows = [];
    let sep = false;
    // burger lines first, then the menù parts under their dashed rule, each keeping its index in t.lines
    const order = [...t.lines.keys()].sort((a, b) => Number(t.lines[a].group === 'menu') - Number(t.lines[b].group === 'menu'));
    for (const i of order) {
      const l = t.lines[i];
      if (l.group === 'menu' && !sep) {
        sep = true;
        list.append(el('li', 'cc-ksep', `<span>${pixelHtml('MENÙ')}</span>`));
      }
      rows[i] = row(lineView(l));
      list.append(rows[i].li);
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
      t.lines.forEach((l, i) => paint(rows[i], lineView(l), !fresh));
      const wrongChanged = t.wrong.length !== wrong.length || t.wrong.some((w, i) => w !== wrong[i]);
      if (wrongChanged) renderWrong(t.wrong, !fresh);
      return fresh || wrongChanged;
    },
    overflows: () => [...list.children].some((li) => li.scrollWidth > li.clientWidth),
    short(on) {
      for (const n of list.querySelectorAll<HTMLElement>('.cc-kline__label')) {
        const name = n.dataset.name ?? '';
        const shown = on ? shortLabel(name) : name;
        if (n.dataset.shown === shown) continue;
        n.dataset.shown = shown;
        n.innerHTML = pixelHtml(shown);
      }
    },
    fitName() {
      const cut = (): boolean => who.scrollWidth > who.clientWidth;
      const last = customer.split(' ').pop() ?? customer;
      meta.classList.remove('is-wrap');
      setText(who, customer);
      if (!cut()) return;
      setText(who, last);
      if (!cut()) return;
      meta.classList.add('is-wrap');
      setText(who, customer);
      if (!cut()) return;
      setText(who, last);
      if (cut()) setText(who, '');
    },
  };
}
