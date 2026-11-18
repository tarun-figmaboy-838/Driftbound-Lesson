// The game's battle radar, drawn in SVG so it stays crisp at any size:
//  - a thin cyan ring with tick marks and a dark glass inside
//  - the cannon beam (bright cyan, the reference line) with its dot on the ring
//  - the line to the enemy (red), dotted extensions when a rule needs them
//  - the given angle as an orange arc with its number, the unknown as a white arc labelled x
// Every line is a thin stroke of fixed screen width with a dark outline under it, like the game.
//
// Angles are in degrees, 0 = pointing right, anticlockwise positive.

const NS = 'http://www.w3.org/2000/svg';
export const RING = 80;                                  // ring radius in view units (view: -100..100)
const RAD = Math.PI / 180;
export const norm = (d) => ((d % 360) + 360) % 360;
export const pt = (deg, r) => [r * Math.cos(deg * RAD), -r * Math.sin(deg * RAD)];
const n2 = (v) => v.toFixed(2);
const P = (deg, r) => pt(deg, r).map(n2).join(' ');

const COLORS = {
  cyan: '#38d6ff', red: '#ff3b2f', orange: '#ffa62b', white: '#ffffff', green: '#5dff8a', violet: '#c58bff',
};
const OUTLINE = 'rgba(2, 6, 23, 0.7)';

// a line with a dark outline under it (non-scaling strokes keep a fixed pixel width)
function line(a, b, color, w, { dotted = false, part = '', cls = '' } = {}) {
  const dash = dotted ? ` stroke-dasharray="0 ${w * 3}" stroke-linecap="round"` : ' stroke-linecap="round"';
  const d = `M ${a} L ${b}`;
  return `<g class="part ${cls}" data-part="${part}">`
    + (dotted ? '' : `<path d="${d}" stroke="${OUTLINE}" stroke-width="${w + 3}" fill="none" vector-effect="non-scaling-stroke"${dash}/>`)
    + `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" vector-effect="non-scaling-stroke"${dash}/></g>`;
}

// arc from angle a anticlockwise to b at radius r (b may be > 360)
function arcPath(a, b, r) {
  const sweep = b - a;
  if (sweep >= 359.9) return `M ${P(a, r)} A ${r} ${r} 0 1 0 ${P(a + 180, r)} A ${r} ${r} 0 1 0 ${P(a + 359.9, r)}`;
  return `M ${P(a, r)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${P(b, r)}`;
}
function wedgePath(a, b, r) {
  const sweep = b - a;
  if (sweep >= 359.9) return `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`;
  return `M 0 0 L ${P(a, r)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${P(b, r)} Z`;
}

// label text with an ink outline; x is set like in a maths book (italic serif)
function label(x, y, text, color, { big = false, part = '' } = {}) {
  const isX = text === 'x';
  const cls = isX ? 'lbl lbl-x' : 'lbl';
  return `<text class="${cls}${big ? ' big' : ''}" data-part="${part}" x="${n2(x)}" y="${n2(y)}" fill="${color}" text-anchor="middle" dominant-baseline="central">${text}</text>`;
}

function raiderGlyph(deg, r) {
  const [x, y] = pt(deg, r);
  const rot = -deg + 180;                                  // nose points at the ship
  const body = 'M 7 0 L -5 -5.5 L -2.5 0 L -5 5.5 Z';
  const c = 'M -9 -6 L -9 -9 L -6 -9 M 6 -9 L 9 -9 L 9 -6 M 9 6 L 9 9 L 6 9 M -6 9 L -9 9 L -9 6';
  return `<g class="part" data-part="enemy" transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(rot)})">`
    + `<path d="${body}" fill="#ff5a3c" stroke="${OUTLINE}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`
    + `<path d="${c}" fill="none" stroke="#ffb08a" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>`;
}

export class Radar {
  constructor(host) {
    this.host = host;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', '-100 -100 200 200');
    this.svg.setAttribute('class', 'radar-svg');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('tabindex', '-1');
    host.appendChild(this.svg);
    this.onDrag = null;        // (deg) => void, while the student drags on the radar
    this.onNudge = null;       // (delta) => void, arrow keys when the radar has focus
    let dragging = false;
    const angleAt = (e) => {
      const b = this.svg.getBoundingClientRect();
      return norm(Math.atan2(-(e.clientY - (b.top + b.height / 2)), e.clientX - (b.left + b.width / 2)) / RAD);
    };
    this.svg.addEventListener('pointerdown', (e) => {
      if (!this.onDrag) return;
      dragging = true;
      this.svg.setPointerCapture(e.pointerId);
      this.onDrag(angleAt(e));
      e.preventDefault();
    });
    this.svg.addEventListener('pointermove', (e) => { if (dragging && this.onDrag) this.onDrag(angleAt(e)); });
    const up = () => { if (dragging) { dragging = false; this.onDragEnd?.(); } };
    this.svg.addEventListener('pointerup', up);
    this.svg.addEventListener('pointercancel', up);
    this.svg.addEventListener('keydown', (e) => {
      if (!this.onNudge) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { this.onNudge(step); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { this.onNudge(-step); e.preventDefault(); e.stopPropagation(); }
    });
  }

  // interactive: draggable cursor + keyboard focus
  interactive(on, ariaLabel = '') {
    this.svg.classList.toggle('drag', on);
    this.svg.setAttribute('tabindex', on ? '0' : '-1');
    if (ariaLabel) this.svg.setAttribute('aria-label', ariaLabel);
  }

  // s: { beam, beamExt, rest, enemy, enemyExt, raider, rays[], arcs[], square, tri, highlight, aria }
  draw(s) {
    const out = [];
    // glass, ring, ticks
    out.push(`<defs><radialGradient id="glass"><stop offset="0" stop-color="#0a1a3a" stop-opacity="0.78"/><stop offset="1" stop-color="#040b1f" stop-opacity="0.86"/></radialGradient></defs>`);
    out.push(`<circle r="${RING + 2}" fill="url(#glass)"/>`);
    // keyboard focus: a round dashed ring (a rectangle outline would look wrong around the radar)
    out.push(`<circle class="focus-ring" r="${RING + 8}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/>`);
    out.push(`<circle r="${RING}" fill="none" stroke="${OUTLINE}" stroke-width="5" vector-effect="non-scaling-stroke"/>`);
    out.push(`<circle r="${RING}" fill="none" stroke="${COLORS.cyan}" stroke-opacity="0.9" stroke-width="2" vector-effect="non-scaling-stroke"/>`);
    let ticks = '';
    for (let d = 0; d < 360; d += 10) {
      const long = d % 30 === 0;
      ticks += `<path d="M ${P(d, RING - (long ? 7 : 3.6))} L ${P(d, RING)}"/>`;
    }
    out.push(`<g stroke="${COLORS.cyan}" stroke-opacity="0.75" stroke-width="1.4" vector-effect="non-scaling-stroke" fill="none">${ticks}</g>`);

    // arc fills first, then lines, then arc strokes and labels on top
    // arcs are centred on the cannon, or on another corner (a.at = [x, y], for the triangle)
    const at = (a) => (a.at ? ` transform="translate(${n2(a.at[0])} ${n2(a.at[1])})"` : '');
    for (const a of s.arcs || []) {
      if (a.fill === false) continue;
      out.push(`<path class="part" data-part="${a.part || ''}"${at(a)} d="${wedgePath(a.a, a.b, a.r || 24)}" fill="${COLORS[a.color] || a.color}" fill-opacity="${a.color === 'white' ? 0.1 : 0.14}"/>`);
    }
    if (s.full) out.push(`<path d="${wedgePath(0, 360, s.full)}" fill="#fff" fill-opacity="0.08"/>`);

    for (const r of s.rays || []) out.push(line(P(r.deg, 9), P(r.deg, r.len || RING), COLORS[r.color] || r.color, r.w || 2.5, { dotted: r.dotted, part: r.part || '' }));
    if (s.rest !== undefined && s.rest !== null) out.push(line(P(s.rest, 9), P(s.rest, RING), COLORS.cyan, 2.5, { dotted: true, part: 'rest' }));
    if (s.beamExt) out.push(line(P(s.beam + 180, 9), P(s.beam + 180, RING), COLORS.cyan, 2.6, { dotted: true, part: 'beam' }));
    if (s.enemyExt) out.push(line(P(s.enemy + 180, 9), P(s.enemy + 180, RING), COLORS.red, 2.6, { dotted: true, part: 'enemy' }));
    if (s.enemy !== undefined && s.enemy !== null) {
      out.push(line(P(s.enemy, 9), P(s.enemy, s.raider ? RING + 6 : RING), COLORS.red, 2.6, { part: 'enemy' }));
    }
    if (s.tri) {
      const [p, q] = [pt(s.tri.pDeg, s.tri.pLen), pt(s.tri.qDeg, s.tri.qLen)];
      out.push(line(p.map(n2).join(' '), q.map(n2).join(' '), COLORS.white, 2.4, { part: 'tri' }));
    }
    if (s.beam !== undefined && s.beam !== null) {
      out.push(`<g class="part" data-part="beam">`
        + `<path d="M ${P(s.beam, 9)} L ${P(s.beam, RING)}" stroke="${COLORS.cyan}" stroke-opacity="0.22" stroke-width="10" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`
        + `</g>`);
      out.push(line(P(s.beam, 9), P(s.beam, RING), COLORS.cyan, 3.4, { part: 'beam' }));
      const [tx, ty] = pt(s.beam, RING);
      out.push(`<g class="part" data-part="beam"><circle cx="${n2(tx)}" cy="${n2(ty)}" r="3.4" fill="${OUTLINE}"/><circle cx="${n2(tx)}" cy="${n2(ty)}" r="2.3" fill="${COLORS.cyan}"/></g>`);
    }

    for (const a of s.arcs || []) {
      const r = a.r || 24;
      out.push(`<g class="part" data-part="${a.part || ''}"${at(a)}>`
        + `<path d="${arcPath(a.a, a.b, r)}" stroke="${OUTLINE}" stroke-width="5.5" fill="none" vector-effect="non-scaling-stroke"/>`
        + `<path d="${arcPath(a.a, a.b, r)}" stroke="${COLORS[a.color] || a.color}" stroke-width="2.6" fill="none" vector-effect="non-scaling-stroke"/></g>`);
    }
    if (s.full) {
      out.push(`<path d="${arcPath(0, 360, s.full)}" stroke="${OUTLINE}" stroke-width="5.5" fill="none" vector-effect="non-scaling-stroke"/>`
        + `<path d="${arcPath(0, 360, s.full)}" stroke="#fff" stroke-width="2.6" fill="none" vector-effect="non-scaling-stroke"/>`);
    }
    if (s.square) {
      const S = s.square.size || 11;
      const a = pt(s.square.a, S), c = pt(s.square.a + 90, S);
      const b = [a[0] + c[0], a[1] + c[1]];
      const d = `M ${a.map(n2).join(' ')} L ${b.map(n2).join(' ')} L ${c.map(n2).join(' ')}`;
      out.push(`<path d="${d}" stroke="${OUTLINE}" stroke-width="5" fill="none" vector-effect="non-scaling-stroke"/><path d="${d}" stroke="#fff" stroke-width="2.2" fill="none" vector-effect="non-scaling-stroke"/>`);
    }

    // the cannon turret at the centre (the angle's corner)
    const oct = Array.from({ length: 8 }, (_, i) => P(22.5 + i * 45, 8.5)).join(' L ');
    out.push(`<path d="M ${oct} Z" fill="#0d1a38" stroke="${OUTLINE}" stroke-width="4.5" vector-effect="non-scaling-stroke"/>`
      + `<path d="M ${oct} Z" fill="none" stroke="#9fe9ff" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`);
    if (s.beam !== undefined && s.beam !== null) {
      out.push(`<path d="M ${P(s.beam, 2)} L ${P(s.beam, 13)}" stroke="#dfe8f2" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
    }
    out.push(`<circle r="2.4" fill="#ffffff"/>`);

    if (s.raider && s.enemy !== undefined && s.enemy !== null) out.push(raiderGlyph(s.enemy, RING + 11));

    // labels last, on top of everything
    for (const a of s.arcs || []) {
      if (!a.label) continue;
      const mid = (a.a + a.b) / 2;
      const [x, y] = pt(mid, a.labelR ?? (a.r || 24) + (a.label === 'x' ? 12 : 14));
      const [ox, oy] = a.at || [0, 0];
      out.push(label(x + ox, y + oy, a.label, COLORS[a.labelColor || a.color] || '#fff', { part: a.part || '' }));
    }
    for (const t of s.texts || []) out.push(label(t.x, t.y, t.text, COLORS[t.color] || t.color || '#fff', { big: t.big }));

    this.svg.innerHTML = out.join('');
    if (s.aria) this.svg.setAttribute('aria-label', s.aria);
    for (const el of this.svg.querySelectorAll('[data-part]')) {
      el.classList.toggle('hl', !!s.highlight && el.dataset.part === s.highlight);
      el.classList.toggle('dim', !!s.highlight && el.dataset.part && el.dataset.part !== s.highlight);
    }
  }
}

// smooth number tween on the animation clock; returns a cancel function
export function tween(from, to, seconds, onUpdate, onDone) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || seconds <= 0) { onUpdate(to); onDone?.(); return () => {}; }
  const t0 = performance.now();
  let raf = 0, live = true;
  const step = (now) => {
    if (!live) return;
    const k = Math.min(1, (now - t0) / (seconds * 1000));
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    onUpdate(from + (to - from) * e);
    if (k < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => { live = false; cancelAnimationFrame(raf); };
}
