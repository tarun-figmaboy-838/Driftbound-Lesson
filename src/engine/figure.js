// The holo-screen diagrams, drawn in SVG.
//
// Geometry is in "units": y points up, angles are in degrees (0 = right, anticlockwise). A figure
// fits a unit box into its host element; strokes, dots and text are sized in screen pixels (scaled a
// little with the figure, by k), so labels stay readable from a phone to a classroom screen.
//
// Drawing is keyed: each draw call names its item, and only items whose markup changed are touched.
// Elements that persist keep their CSS animations and their keyboard focus while the figure moves.

import { esc, reduced } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
// a line or an angle that is highlighted (glowing, blinking, flashing in, or marked 'trace') is traced
// as the highlight comes on: a bright pen line draws itself along it (along an angle's arc only), so the eye
// follows the shape the voice is naming. Two angles side by side are traced like a pair of doors opening:
// both arcs start at the arm they share and swing away from it at the same time, so the first of the pair
// ('blink', or 'trace-rev') is traced backwards
const TRACE = /(^|\s)(glow|blink2?|flash|trace|trace-rev)(\s|$)/;
const BACKWARDS = /(^|\s)(blink|trace-rev)(\s|$)/;

// a label (an angle's name or value) new to the figure pops in calmly: it fades in from a little smaller, from
// its own middle, with no bounce (a bounce read as a jump), as its angle is traced
function appear(g) {
  if (reduced() || !g.querySelector('text') || g.querySelector('[data-drag], .trace-light')) return;
  g.animate([{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' });
}

// the tracing: the pen line draws from one end to the other (out along an arm, round the arc, back along
// the other arm for an angle), stays a moment, then fades into the highlight
// (from: how far into it, in ms, when the figure is redrawn while it runs: it carries on from there)
function trace(g, from = 0) {
  if (reduced()) return;
  if (!from) g._traced = performance.now();
  g.querySelectorAll('.trace-light').forEach((p) => {
    const L = p.getTotalLength?.() || 0;
    if (L < 4) return;
    const tip = p.classList.contains('tip');               // the pen's glowing tip, at the front of the line
    const timing = { duration: Math.min(1700, 900 + L * 1.5), delay: -from, easing: 'ease-in-out', fill: 'both' };
    p.style.strokeDasharray = tip ? `0.1px ${n(L + 2)}px` : `${n(L + 1)}px ${n(L + 1)}px`;
    p.animate(tip ? [
      { strokeDashoffset: '0px', opacity: 1 },
      { strokeDashoffset: `${n(-L)}px`, opacity: 1, offset: 0.62 },
      { strokeDashoffset: `${n(-L)}px`, opacity: 0, offset: 0.72 },
      { strokeDashoffset: `${n(-L)}px`, opacity: 0 },
    ] : [
      { strokeDashoffset: `${n(L + 1)}px`, opacity: 1 },
      { strokeDashoffset: '0px', opacity: 1, offset: 0.62 },
      { strokeDashoffset: '0px', opacity: 1, offset: 0.8 },
      { strokeDashoffset: '0px', opacity: 0 },
    ], timing);
  });
}
const RAD = Math.PI / 180;
export const at = (o, deg, r) => [o[0] + r * Math.cos(deg * RAD), o[1] + r * Math.sin(deg * RAD)];
export const angleOf = ([x, y]) => ((Math.atan2(y, x) / RAD) + 360) % 360;
const n = (v) => Math.round(v * 10) / 10;

class Builder {
  constructor(fig) {
    this.f = fig;
    this.k = fig.k;
    this.items = [];
    this.lights = [];     // the tracing of highlighted lines and angles: drawn on top of everything
    this.handAt = null;   // a drag handle being hinted: the hint hand rests on it
  }

  P(p) { return [n(this.f.ox + p[0] * this.f.s), n(this.f.oy - p[1] * this.f.s)]; }
  push(key, html, opts = {}) { this.items.push({ key, html, cls: opts.cls || '', attrs: opts.attrs || null, style: opts.style || '' }); }

  // the tracing of a highlighted item (its outline d): a pen line and its glowing tip, on the top layer so
  // nothing drawn over the item hides it. It exists only while the item is highlighted, so it is traced as
  // the highlight comes on
  light(key, d, w, color) {
    this.lights.push({ key: `${key}~trace`, cls: 'trace', attrs: null, style: `--glow:${color}`,
      html: `<path class="trace-light" d="${d}" stroke-width="${n(w)}"/><path class="trace-light tip" d="${d}" stroke-width="${n(w * 2.6)}"/>` });
  }

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
    if (!dash && TRACE.test(cls)) this.light(key, d, W * 1.1, color);   // highlighted: traced end to end
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
    // highlighted: its arc is traced (backwards for the first of a pair, so the two open like doors)
    if (sweep < 359.8 && TRACE.test(cls)) {
      const arc = BACKWARDS.test(cls) ? `M${pb[0]} ${pb[1]}A${R} ${R} 0 ${big} 1 ${pa[0]} ${pa[1]}` : `M${pa[0]} ${pa[1]}A${R} ${R} 0 ${big} 0 ${pb[0]} ${pb[1]}`;
      this.light(key, arc, 4.6 * this.k, edge || '#fff');
    }
  }

  // the little square that marks a right angle (a = direction of the first arm)
  square(key, o, a, size = 16, { color = '#ffffff', cls = '' } = {}) {
    const p1 = this.P(at(o, a, size)), p2 = this.P(at(at(o, a, size), a + 90, size)), p3 = this.P(at(o, a + 90, size));
    const d = `M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}`;
    // a thin light line with a faint dark edge (drawn under the rays, so a ray inside the corner crosses it cleanly)
    this.push(key, `<path class="ink" d="${d}" stroke-width="${n(3.6 * this.k)}" stroke-linejoin="round" opacity=".55"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${n(2 * this.k)}" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`, { cls });
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
    // when its room changes on purpose while it is shown (glideNext: a panel comes in beside it) the drawing
    // glides and scales to its new place; otherwise it is redrawn in place. Its room is kept steady (the
    // narration bar and the row under it keep their height), so it does not move about
    this.win = [innerWidth, innerHeight];
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
    const pad = typeof this.pad === 'function' ? this.pad() : this.pad;   // (a function: it can change with the layout)
    const s = Math.max(0.05, Math.min((w - 2 * pad) / (x1 - x0), (h - 2 * pad) / (y1 - y0)));
    this.s = s;
    this.k = Math.min(this.kMax, Math.max(this.kMin, s / this.kRef));
    this.ox = w / 2 - s * (x0 + x1) / 2;
    this.oy = h / 2 + s * (y0 + y1) / 2;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return true;
  }

  draw(fn) { this.fn = fn; this.render(); }

  // the drawing was at screen point `was` (its origin) at scale was.s: it glides from there to where it is now
  glide(was) {
    const r = this.host.getBoundingClientRect();
    const now = { x: r.left + this.ox, y: r.top + this.oy };
    const k = was.s / this.s, dx = was.x - now.x, dy = was.y - now.y;
    if (reduced() || (Math.abs(dx) + Math.abs(dy) < 2 && Math.abs(k - 1) < 0.01)) return;
    this.svg.animate([
      { transform: `translate(${n(dx)}px, ${n(dy)}px) scale(${k.toFixed(4)})`, transformOrigin: `${n(this.ox)}px ${n(this.oy)}px` },
      { transform: 'none', transformOrigin: `${n(this.ox)}px ${n(this.oy)}px` },
    ], { duration: 620, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  }

  render() {
    if (!this.fn) return;
    // where the drawing was (its origin on screen, its scale, the size of its room) before this layout
    const B = this.drawn && this.lastBox;
    const was = B && { x: B.left + this.ox, y: B.top + this.oy, s: this.s, w: B.width, h: B.height };
    if (!this.layout()) return;
    this.lastBox = this.host.getBoundingClientRect();
    this.drawn = true;
    const winChanged = this.win[0] !== innerWidth || this.win[1] !== innerHeight;
    this.win = [innerWidth, innerHeight];
    // its room changed size on purpose (a panel came in beside it: glideNext): it glides over (see glide)
    if (was && this.glideNext && !winChanged && (Math.abs(was.w - this.lastBox.width) > 1 || Math.abs(was.h - this.lastBox.height) > 1)) {
      this.glideNext = false;
      this.glide(was);
    }
    const b = new Builder(this);
    this.fn(b);
    b.items.push(...b.lights);                             // the tracing, over the whole figure
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
      const fresh = !g;                                   // drawn for the first time now
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
      const lit = TRACE.test(cls) && !TRACE.test(g.getAttribute('class') || '');   // the highlight comes on now
      if (g.getAttribute('class') !== cls) g.setAttribute('class', cls);
      if ((g.getAttribute('style') || '') !== it.style) g.setAttribute('style', it.style);
      const attrs = it.attrs || {};
      for (const name of Object.keys(g._attrs)) if (!(name in attrs)) g.removeAttribute(name);
      for (const [name, val] of Object.entries(attrs)) if (g.getAttribute(name) !== val) g.setAttribute(name, val);
      g._attrs = attrs;
      // traced once, as it lights up (not again when the figure only moves or resizes)
      if (g._html !== it.html) {
        g.innerHTML = it.html;
        g._html = it.html;
        const into = g._traced ? performance.now() - g._traced : Infinity;
        if (lit) trace(g);
        else if (into < 1700) trace(g, into);           // redrawn (moved, resized) while being traced: it carries on
        if (fresh && this.fn) appear(g);
      }
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
    this.drawn = false;
    this.root.replaceChildren();
    this.nodes.clear();
    this.onTap = this.onDrag = this.onNudge = null;
    this.dragAll = null;
    this.dragging = null;
    this.svg.classList.remove('draggable');
  }

  destroy() { this.ro.disconnect(); this.svg.remove(); }
}
