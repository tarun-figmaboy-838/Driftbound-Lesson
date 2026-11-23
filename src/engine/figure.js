// The holo-screen diagrams, drawn in SVG.
//
// Geometry is in "units": y points up, angles are in degrees (0 = right, anticlockwise). A figure
// fits a unit box into its host element; strokes, dots and text are sized in screen pixels (scaled a
// little with the figure, by k), so labels stay readable from a phone to a classroom screen.
//
// Drawing is keyed: each draw call names its item, and only items whose markup changed are touched.
// Elements that persist keep their CSS animations and their keyboard focus while the figure moves.

import { esc } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180;
export const at = (o, deg, r) => [o[0] + r * Math.cos(deg * RAD), o[1] + r * Math.sin(deg * RAD)];
export const angleOf = ([x, y]) => ((Math.atan2(y, x) / RAD) + 360) % 360;
const n = (v) => Math.round(v * 10) / 10;

class Builder {
  constructor(fig) {
    this.f = fig;
    this.k = fig.k;
    this.items = [];
    this.handAt = null;   // a drag handle being hinted: the hint hand rests on it
  }

  P(p) { return [n(this.f.ox + p[0] * this.f.s), n(this.f.oy - p[1] * this.f.s)]; }
  push(key, html, opts = {}) { this.items.push({ key, html, cls: opts.cls || '', attrs: opts.attrs || null, style: opts.style || '' }); }

  // a straight stroke from p to q with a navy outline under it; arrowheads optional
  line(key, p, q, { color = '#3ddcf2', w = 5, start = false, end = false, cls = '', dash = false } = {}) {
    const k = this.k, W = w * k, H = 17 * k;
    const [x1, y1] = this.P(p), [x2, y2] = this.P(q);
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) return;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const head = (tx, ty, dx, dy) => {
      const bx = tx - dx * H, by = ty - dy * H, w2 = H * 0.58;
      return `M${n(tx)} ${n(ty)}L${n(bx - dy * w2)} ${n(by + dx * w2)}L${n(bx + dy * w2)} ${n(by - dx * w2)}Z`;
    };
    const heads = [];
    let a = [x1, y1], b = [x2, y2];
    if (end && L > H * 1.6) { heads.push(head(x2, y2, ux, uy)); b = [x2 - ux * H * 0.7, y2 - uy * H * 0.7]; }
    if (start && L > H * 1.6) { heads.push(head(x1, y1, -ux, -uy)); a = [x1 + ux * H * 0.7, y1 + uy * H * 0.7]; }
    const d = `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`;
    let html = '';
    if (!dash) {
      html += `<path class="ink" d="${d}" stroke-width="${n(W * 1.9)}"/>`;
      html += heads.map((hd) => `<path class="ink-h" d="${hd}" stroke-width="${n(W * 0.9)}"/>`).join('');
    }
    const da = dash ? ` stroke-dasharray="0.1 ${n(W * 2.6)}"` : '';
    html += `<path d="${d}" stroke="${color}" stroke-width="${n(W)}" fill="none" stroke-linecap="round"${da}/>`;
    html += heads.map((hd) => `<path d="${hd}" fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`).join('');
    this.push(key, html, { cls, style: `--glow:${color}` });
  }

  ray(key, o, deg, len, opts = {}) { this.line(key, o, at(o, deg, len), { end: true, ...opts }); }
  full(key, o, deg, len, opts = {}) { this.line(key, at(o, deg + 180, len), at(o, deg, len), { start: true, end: true, ...opts }); }

  // a filled angle sector from a to b (anticlockwise) at radius r, with an optional arc edge
  wedge(key, o, a, b, r, { fill = 'rgba(255,159,28,.45)', edge = null, cls = '' } = {}) {
    const sweep = b - a;
    if (sweep <= 0.3) return;
    const R = n(r * this.f.s);
    const [cx, cy] = this.P(o);
    const pa = this.P(at(o, a, r)), pb = this.P(at(o, b, r));
    const big = sweep > 180 ? 1 : 0;
    const d = sweep >= 359.8
      ? `M${n(cx - R)} ${cy}A${R} ${R} 0 1 0 ${n(cx + R)} ${cy}A${R} ${R} 0 1 0 ${n(cx - R)} ${cy}Z`
      : `M${cx} ${cy}L${pa[0]} ${pa[1]}A${R} ${R} 0 ${big} 0 ${pb[0]} ${pb[1]}Z`;
    let html = `<path d="${d}" fill="${fill}"/>`;
    if (edge && sweep < 359.8) html += `<path d="M${pa[0]} ${pa[1]}A${R} ${R} 0 ${big} 0 ${pb[0]} ${pb[1]}" fill="none" stroke="${edge}" stroke-width="${n(2.6 * this.k)}" stroke-linecap="round"/>`;
    this.push(key, html, { cls, style: `--glow:${edge || '#fff'}` });
  }

  // the little square that marks a right angle (a = direction of the first arm)
  square(key, o, a, size = 16, { color = '#ffffff', cls = '' } = {}) {
    const p1 = this.P(at(o, a, size)), p2 = this.P(at(at(o, a, size), a + 90, size)), p3 = this.P(at(o, a + 90, size));
    const d = `M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}`;
    this.push(key, `<path class="ink" d="${d}" stroke-width="${n(6 * this.k)}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${n(2.8 * this.k)}" stroke-linejoin="round" stroke-linecap="round"/>`, { cls });
  }

  dot(key, p, { r = 6, color = '#ffffff', cls = '' } = {}) {
    const R = Math.max(0, r * this.k);
    const [x, y] = this.P(p);
    this.push(key, `<circle class="ink-f" cx="${x}" cy="${y}" r="${n(R + 2.6 * this.k)}"/><circle cx="${x}" cy="${y}" r="${n(R)}" fill="${color}"/>`, { cls });
  }

  // an expanding ring that calls attention to a point
  pulse(key, p, { r = 16, color = '#ffe066' } = {}) {
    const [x, y] = this.P(p);
    this.push(key, `<circle class="pulse-ring" cx="${x}" cy="${y}" r="${n(r * this.k)}" stroke="${color}" stroke-width="${n(3.5 * this.k)}"/>`);
  }

  // text with an ink outline; dx, dy are pixel nudges (scaled by k)
  text(key, p, str, { size = 20, color = '#ffffff', font = 'num', dx = 0, dy = 0, anchor = 'middle', cls = '' } = {}) {
    const [x, y] = this.P(p);
    const fs = size * this.k;
    const at = `x="${n(x + dx * this.k)}" y="${n(y + dy * this.k)}" font-size="${n(fs)}" text-anchor="${anchor}" dominant-baseline="central"`;
    let svg = `<text class="t t-${font}" ${at} fill="${color}" stroke-width="${n(Math.max(2.5, fs * 0.24))}">${esc(str)}</text>`;
    // the borrowed angle sign is thin: draw it once more on top, stroked in its own colour
    if (String(str).includes('∠')) {
      // (each piece repeats the centring: Safari does not hand dominant-baseline down to a tspan)
      const parts = String(str).split('∠').map((p) => `<tspan dominant-baseline="central" fill="transparent">${esc(p)}</tspan>`);
      svg += `<text class="t-${font} t-ang" ${at}>${parts.join(`<tspan dominant-baseline="central" fill="${color}" stroke="${color}" stroke-width="${n(fs * 0.07)}">∠</tspan>`)}</text>`;
    }
    this.push(key, svg, { cls });
  }

  // an arc stroke from a to b (anticlockwise) at radius r: traced turns, measured angles
  arc(key, o, a, b, r, { color = '#fff3b0', w = 5, cls = '' } = {}) {
    const sweep = b - a;
    if (sweep <= 0.3) return;
    const R = n(r * this.f.s), pa = this.P(at(o, a, r)), pb = this.P(at(o, b, r));
    const d = sweep >= 359.8
      ? `M${pa[0]} ${pa[1]}A${R} ${R} 0 1 0 ${this.P(at(o, a + 180, r)).join(' ')}A${R} ${R} 0 1 0 ${pa[0]} ${pa[1]}`
      : `M${pa[0]} ${pa[1]}A${R} ${R} 0 ${sweep > 180 ? 1 : 0} 0 ${pb[0]} ${pb[1]}`;
    const W = w * this.k;
    this.push(key, `<path class="ink" d="${d}" stroke-width="${n(W * 1.9)}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${n(W)}" stroke-linecap="round"/>`, { cls, style: `--glow:${color}` });
  }

  // a holo protractor: a half ring from a0 to a0 + 180 with a tick every 10°
  protractor(key, o, r, a0 = 0) {
    const k = this.k, ri = r * 0.74;
    const pa = this.P(at(o, a0, r)), pb = this.P(at(o, a0 + 180, r)), qa = this.P(at(o, a0 + 180, ri)), qb = this.P(at(o, a0, ri));
    const R = n(r * this.f.s), Ri = n(ri * this.f.s);
    const band = `M${pa[0]} ${pa[1]}A${R} ${R} 0 0 0 ${pb[0]} ${pb[1]}L${qa[0]} ${qa[1]}A${Ri} ${Ri} 0 0 1 ${qb[0]} ${qb[1]}Z`;
    let ticks = '';
    for (let t = 0; t <= 180; t += 10) {
      const len = (t % 90 === 0 ? 0.24 : t % 30 === 0 ? 0.16 : 0.09) * r;
      const p1 = this.P(at(o, a0 + t, r)), p2 = this.P(at(o, a0 + t, r - len));
      ticks += `M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}`;
    }
    this.push(key, `<path d="${band}" fill="rgba(127,243,255,.14)" stroke="rgba(160,248,255,.85)" stroke-width="${n(1.8 * k)}"/>`
      + `<path d="${ticks}" stroke="rgba(210,252,255,.9)" stroke-width="${n(1.7 * k)}" stroke-linecap="round"/>`, { cls: 'flash' });
  }

  // a point name, placed dist pixels from p in direction dir
  label(key, p, str, dir, dist = 24, opts = {}) {
    this.text(key, p, str, { font: 'name', size: 22, dx: Math.cos(dir * RAD) * dist, dy: -Math.sin(dir * RAD) * dist, ...opts });
  }

  // a small pill tag ("vertex", "arm")
  tag(key, p, str, { color = '#7ff3ff', dx = 0, dy = 0, size = 15 } = {}) {
    const k = this.k, fs = size * k, w = str.length * fs * 0.6 + 20 * k, h = fs + 12 * k;
    const [x0, y0] = this.P(p), x = x0 + dx * k, y = y0 + dy * k;
    this.push(key, `<rect x="${n(x - w / 2)}" y="${n(y - h / 2)}" width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}" fill="${color}" stroke="var(--ink)" stroke-width="${n(2.6 * k)}"/>`
      + `<text class="t-tag" x="${n(x)}" y="${n(y + fs * 0.04)}" font-size="${n(fs)}" text-anchor="middle" dominant-baseline="central">${esc(str)}</text>`, { cls: 'tagpop' });
  }

  // an angle the student can tap, the sector {o, a, b, r}. Its outline glows on hover and keyboard focus.
  tap(key, id, { o, a, b, r }, label) {
    const R = n(r * this.f.s), [cx, cy] = this.P(o), pa = this.P(at(o, a, r)), pb = this.P(at(o, b, r));
    const d = `M${cx} ${cy}L${pa[0]} ${pa[1]}A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 0 ${pb[0]} ${pb[1]}Z`;
    this.push(key, `<path class="glow-t" d="${d}"/><path class="hit" d="${d}"/>`, { cls: 'tap', attrs: { tabindex: '0', role: 'button', 'aria-label': label, 'data-tap': id } });
  }

  // the hint hand (Figma AI art): rests on the hinted target (the first one) and presses it, with a
  // ripple where the finger lands. It never travels.
  hand(key, pts) {
    const H = n(64 * this.k), W = n(H * 0.615);
    const [x0, y0] = this.P(pts[0]);
    const pic = `<image href="assets/ui/hint/hand.webp" x="${n(x0 - W * 0.207)}" y="${n(y0 + 6)}" width="${W}" height="${H}"/>`;
    const ripple = `<circle class="hand-ripple" cx="${x0}" cy="${y0}" r="${n(14 * this.k)}"/>`;
    this.push(key, `${ripple}<g class="hint-hand" style="transform-origin:${x0}px ${y0}px">${pic}</g>`, { cls: 'hint-hand-wrap' });
  }

  // a draggable knob at the end of a ray that turns round O (a slider for keyboards and screen readers):
  // a glowing ring with a bright core, and two curved arrows either side, along the path it turns on.
  // While it is hinted the arrows pop in and nudge the way they point.
  handle(key, id, p, { label = 'Handle', now = 0, min = 0, max = 180, hint = false, color = '#ffc531' } = {}) {
    const k = this.k, R = 13 * k;
    const [x, y] = this.P(p);
    if (hint) this.handAt = p;
    const a = angleOf(p), rr = Math.hypot(p[0], p[1]), px = rr * this.f.s, H = 10 * k, W = 4 * k;
    const deg = (len) => len / px / RAD;                   // a length on screen as degrees round O
    const arrow = (side) => {
      const a0 = a + side * deg(R + 7 * k), a1 = a + side * deg(R + 27 * k), aS = a1 - side * deg(H * 0.6);
      const p0 = this.P(at([0, 0], a0, rr)), pS = this.P(at([0, 0], aS, rr)), [tx, ty] = this.P(at([0, 0], a1, rr));
      const shaft = `M${p0[0]} ${p0[1]}A${n(px)} ${n(px)} 0 0 ${side > 0 ? 0 : 1} ${pS[0]} ${pS[1]}`;
      const t = (a1 + side * 90) * RAD, dx = Math.cos(t), dy = -Math.sin(t), w2 = H * 0.62;
      const bx = tx - dx * H, by = ty - dy * H;
      const head = `M${n(tx)} ${n(ty)}L${n(bx - dy * w2)} ${n(by + dx * w2)}L${n(bx + dy * w2)} ${n(by - dx * w2)}Z`;
      return `<g class="knob-arrow" style="--dx:${n(dx * 4 * k)}px;--dy:${n(dy * 4 * k)}px">`
        + `<path class="ink" d="${shaft}" stroke-width="${n(W * 2)}"/><path class="ink-h" d="${head}" stroke-width="${n(W)}"/>`
        + `<path d="${shaft}" fill="none" stroke="#fff" stroke-width="${n(W)}" stroke-linecap="round"/>`
        + `<path d="${head}" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></g>`;
    };
    const html = `<circle class="hit" cx="${x}" cy="${y}" r="${n(R * 2.6)}"/>`
      + arrow(1) + arrow(-1)
      + `<circle class="ink-f" cx="${x}" cy="${y}" r="${n(R + 3 * k)}"/>`
      + `<circle class="knob-ring" cx="${x}" cy="${y}" r="${n(R - 1.2 * k)}" stroke="${color}" stroke-width="${n(3.2 * k)}"/>`
      + `<circle cx="${x}" cy="${y}" r="${n(R * 0.42)}" fill="#fff"/>`
      + `<circle class="focus" cx="${x}" cy="${y}" r="${n(R + 9 * k)}"/>`;
    this.push(key, html, {
      cls: `drag${hint ? ' is-hint' : ''}`,
      attrs: { tabindex: '0', role: 'slider', 'aria-label': label, 'aria-valuemin': String(min), 'aria-valuemax': String(max), 'aria-valuenow': String(Math.round(now)), 'aria-valuetext': `${Math.round(now)} degrees`, 'data-drag': id },
    });
  }
}

export class Figure {
  constructor(host, { kMin = 0.8, kMax = 1.3, kRef = 1.65, pad = 16, label = '' } = {}) {
    this.host = host;
    this.kMin = kMin;
    this.kMax = kMax;
    this.kRef = kRef;
    this.pad = pad;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'fig-svg');
    this.svg.setAttribute('role', 'group');
    this.svg.setAttribute('tabindex', '-1');      // keeps keyboard focus on the figure when a handle goes away
    if (label) this.svg.setAttribute('aria-label', label);
    this.root = document.createElementNS(NS, 'g');
    this.svg.appendChild(this.root);
    host.appendChild(this.svg);
    this.nodes = new Map();
    this.fn = null;
    this.bx = [-100, -100, 100, 100];
    this.s = 1; this.k = 1; this.ox = 0; this.oy = 0;
    this.onTap = null;          // (id) => void
    this.onDrag = null;         // (id, unitPoint, phase) => void
    this.onNudge = null;        // (id, delta) => void   arrow keys on a handle
    this.dragAll = null;        // handle id that any press on the figure drags (easier on phones)
    this.dragging = null;
    this.ro = new ResizeObserver(() => this.render());
    this.ro.observe(host);

    const svg = this.svg;
    svg.addEventListener('pointerdown', (e) => {
      if (!this.onDrag) return;
      const h = e.target.closest('[data-drag]');
      const id = h?.dataset.drag || (this.dragAll && !e.target.closest('[data-tap]') ? this.dragAll : null);
      if (!id) return;
      this.dragging = id;
      try { svg.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      e.preventDefault();
      this.onDrag(id, this.unit(e), 'start');
    });
    svg.addEventListener('pointermove', (e) => { if (this.dragging) this.onDrag?.(this.dragging, this.unit(e), 'move'); });
    const end = (e) => { if (!this.dragging) return; const id = this.dragging; this.dragging = null; this.onDrag?.(id, this.unit(e), 'end'); };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tap]');
      if (t && this.onTap) this.onTap(t.dataset.tap, t);
    });
    svg.addEventListener('keydown', (e) => {
      const t = e.target.closest?.('[data-tap]');
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.onTap?.(t.dataset.tap, t); return; }
      const h = e.target.closest?.('[data-drag]');
      if (h && this.onNudge) {
        const step = e.shiftKey ? 10 : 1;
        const d = { ArrowRight: -step, ArrowDown: -step, ArrowLeft: step, ArrowUp: step }[e.key];
        if (d) { e.preventDefault(); e.stopPropagation(); this.onNudge(h.dataset.drag, d); }
      }
    });
  }

  box(x0, y0, x1, y1) { this.bx = [x0, y0, x1, y1]; this.render(); }

  layout() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return false;
    const [x0, y0, x1, y1] = this.bx;
    const s = Math.max(0.05, Math.min((w - 2 * this.pad) / (x1 - x0), (h - 2 * this.pad) / (y1 - y0)));
    this.s = s;
    this.k = Math.min(this.kMax, Math.max(this.kMin, s / this.kRef));
    this.ox = w / 2 - s * (x0 + x1) / 2;
    this.oy = h / 2 + s * (y0 + y1) / 2;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return true;
  }

  draw(fn) { this.fn = fn; this.render(); }

  render() {
    if (!this.fn || !this.layout()) return;
    const b = new Builder(this);
    this.fn(b);
    if (b.handAt) b.hand('zz-hand', [b.handAt]);          // the hint hand, on a drag handle
    this.commit(b.items);
    this.svg.classList.toggle('draggable', !!(this.onDrag && (this.dragAll || b.items.some((i) => i.attrs?.['data-drag']))));
  }

  commit(items) {
    const seen = new Set();
    let prev = null;
    for (const it of items) {
      seen.add(it.key);
      let g = this.nodes.get(it.key);
      if (!g) {
        g = document.createElementNS(NS, 'g');
        g.setAttribute('data-k', it.key);
        g._html = null;
        g._attrs = {};
        this.nodes.set(it.key, g);
      }
      const want = prev ? prev.nextSibling : this.root.firstChild;
      if (g !== want) this.root.insertBefore(g, want);
      const cls = `it ${it.cls}`.trim();
      if (g.getAttribute('class') !== cls) g.setAttribute('class', cls);
      if ((g.getAttribute('style') || '') !== it.style) g.setAttribute('style', it.style);
      const attrs = it.attrs || {};
      for (const name of Object.keys(g._attrs)) if (!(name in attrs)) g.removeAttribute(name);
      for (const [name, val] of Object.entries(attrs)) if (g.getAttribute(name) !== val) g.setAttribute(name, val);
      g._attrs = attrs;
      if (g._html !== it.html) { g.innerHTML = it.html; g._html = it.html; }
      prev = g;
    }
    for (const [key, g] of this.nodes) if (!seen.has(key)) { g.remove(); this.nodes.delete(key); }
  }

  // the centre of an item on screen (for particle bursts)
  center(selector) {
    const el = this.root.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  unit(e) {
    const r = this.svg.getBoundingClientRect();
    return [(e.clientX - r.left - this.ox) / this.s, (this.oy - (e.clientY - r.top)) / this.s];
  }

  clear() {
    this.fn = null;
    this.root.replaceChildren();
    this.nodes.clear();
    this.onTap = this.onDrag = this.onNudge = null;
    this.dragAll = null;
    this.dragging = null;
    this.svg.classList.remove('draggable');
  }

  destroy() { this.ro.disconnect(); this.svg.remove(); }
}
