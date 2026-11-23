// The lesson, step by step, following the "Lines & Angles · Class 2" deck (its slide numbers are in
// the comments). Each step has a caption (the slide's statement or question), a figure on the
// holo-screen, the narration (read aloud), and one thing for the student to do.
// gate: true keeps Next locked until the step is done; lockHint is what the narration says if Next is
// pressed too early. quiet: true marks steps with no instructions or hints (no second line in the bar).
import { at, angleOf } from '../engine/figure.js';
import { h, esc, angles, lerp, clamp, droneMarkup } from '../engine/ui.js';

export const CHAPTERS = [
  { name: 'Warm-up', color: 'aqua' },
  { name: 'Adjacent angles', color: 'pink' },
  { name: 'Linear pair', color: 'sun' },
  { name: 'Converse', color: 'lime' },
  { name: 'Vertically opposite', color: 'violet' },
  { name: 'Recall', color: 'coral' },
];

const O = [0, 0];
const RAD = Math.PI / 180;
const C = { aqua: '#3ddcf2', sun: '#ffc531', orange: '#ff9f1c', coral: '#ff6a4f', white: '#ffffff' };
const FILL = { orange: 'rgba(255, 159, 28, .5)', aqua: 'rgba(61, 220, 242, .34)', dim: 'rgba(160, 185, 255, .17)', white: 'rgba(255, 255, 255, .2)', sun: 'rgba(255, 224, 102, .5)' };
const EDGE = { orange: C.orange, aqua: C.aqua, dim: null, white: '#ffffff', sun: '#ffe066' };
const TXT = { orange: '#ffc46b', aqua: '#a8f6ff', dim: '#ffffff', white: '#ffffff', sun: '#fff3b0' };
const crew = (text, mood) => ({ who: 'crew', text, mood });
const deg = (v) => `${Math.round(v)}°`;
const mid = (a, b) => (a + b) / 2;
const upper = (a, lo = 15, hi = 165) => (a > 180 ? (a > 270 ? lo : hi) : clamp(a, lo, hi));   // keep a ray above line AB
const labelR = (sweep, r = 70) => r + Math.max(0, 34 - sweep) * 1.1;                           // thin angles: label further out
const S = (cls, v) => `<span class="${cls}">${v}</span>`;
const OP = (v) => `<span class="op">${v}</span>`;

// ---------------------------------------------------------------- figures

// the straight line through O, drawn out from the middle as s.l goes from 0 to 1
function lineAB(b, s, glow = false) {
  if (s.l) b.line('ab', [-150 * s.l, 0], [150 * s.l, 0], { color: C.aqua, start: true, end: true, cls: glow ? 'glow' : '' });
}
// the vertex O
function pointO(b, oDir = 270) {
  b.dot('po', O, { r: 7 });
  b.label('no', O, 'O', oDir, 26);
}
// a value or a name in an angle: a number (26), the unknown x (30) or a name like ∠1 (22)
const tagOpts = (v, color) => (v === 'x' ? { size: 30, color, font: 'x' } : v.startsWith('∠') ? { size: 22, color, font: 'name' } : { size: 26, color });

// ray OC standing on a straight line (deck slides 14-23): the right angle (orange) and the left one (aqua)
const LIN_BOX = [-158, -38, 158, 140];
function linearFig(b, s) {
  const t = s.t;
  if (s.w) {
    b.wedge('wr', O, 0, t * s.w, 40, { fill: FILL.orange, edge: C.orange, cls: s.blink ? 'blink' : '' });
    b.wedge('wl', O, 180 - (180 - t) * s.w, 180, 40, { fill: FILL.aqua, edge: C.aqua, cls: s.blink ? 'blink2' : '' });
  }
  lineAB(b, s, s.glow);
  if (s.c) b.ray('oc', O, t, 122 * s.c, { color: C.sun, end: !s.handle });   // the knob stands in for the arrowhead
  pointO(b);
  if (s.c > 0.95) b.label('nc', at(O, t, 122), 'C', t, s.handle ? 36 : 25);
  if (s.right != null) b.text('vr', at(O, t / 2, labelR(t)), s.right, tagOpts(s.right, TXT.orange));
  if (s.left != null) b.text('vl', at(O, (t + 180) / 2, labelR(180 - t)), s.left, tagOpts(s.left, TXT.aqua));
  if (s.handle) b.handle('hc', 'c', at(O, t, 122), { label: 'Point C. Drag it, or use the arrow keys, to move ray OC.', now: t, min: 15, max: 165, hint: s.hint });
}

// two lines crossing at O (deck slides 29-42): AB (aqua) and PQ (sun). ∠1..∠4 go anticlockwise from OB.
const CROSS_BOX = [-158, -130, 158, 130];
function crossFig(b, s) {
  const t = s.t;
  const W = [[0, t], [t, 180], [180, 180 + t], [180 + t, 360]];
  W.forEach(([a, z], k) => {
    const f = s.fill?.[k];
    if (f) b.wedge(`w${k}`, O, a, z, 38, { fill: FILL[f], edge: EDGE[f], cls: s.wcls?.[k] || '' });
  });
  if (s.l) b.line('ab', [-150 * s.l, 0], [150 * s.l, 0], { color: C.aqua, start: true, end: true, cls: s.glow === 'ab' ? 'glow' : '' });
  if (s.q) b.line('pq', at(O, t + 180, 126 * s.q), at(O, t, 126 * s.q), { color: C.sun, start: true, end: !s.handle, cls: s.glow === 'pq' ? 'glow' : '' });
  pointO(b, 292);
  W.forEach(([a, z], k) => {
    const f = s.fill?.[k];
    if (s.names?.[k]) b.text(`n${k}`, at(O, mid(a, z), 64), `∠${k + 1}`, { font: 'name', size: 21, color: TXT[f] || '#fff' });
    if (s.vals?.[k]) b.text(`v${k}`, at(O, mid(a, z), 103), s.vals[k], { size: s.vals[k] === 'x' ? 30 : 26, color: TXT[f] || '#fff', cls: s.vcls?.[k] || '', font: s.vals[k] === 'x' ? 'x' : 'num' });
    if (s.taps) b.tap(`t${k}`, `∠${k + 1}`, { o: O, a: a + 3, b: z - 3, r: 96 }, `Angle ${k + 1}`);
  });
  if (s.handle) b.handle('hp', 'p', at(O, t, 126), { label: 'The end of the line. Drag it, or use the arrow keys, to rotate the line.', now: t, min: 20, max: 160, hint: s.hint });
}

// two separate angles, a1 on the left (aqua) and a2 on the right (orange); as s.j goes to 1 the left one
// slides over and turns onto the right one (sharing an arm). s.line: the outer arms as one line (they make
// a straight line only if a1 + a2 = 180°); s.names: the points O and C
const JOIN_BOX = [-158, -38, 158, 140];
function joinFig(a1, a2) {
  return (b, s) => {
    const j = s.j || 0, len = lerp(84, 128, j);
    const pv = [lerp(-112, 0, j), 0], pr = a2 * j;
    const qv = [lerp(44, 0, j), 0];
    b.wedge('wp', pv, pr, pr + a1, 40, { fill: FILL.aqua, edge: C.aqua });
    b.wedge('wq', qv, 0, a2, 40, { fill: FILL.orange, edge: C.orange });
    if (s.line) b.line('ab', [-150, 0], [150, 0], { color: C.aqua, start: true, end: true, cls: 'glow' });
    else {
      b.ray('p1', pv, pr + a1, len, { color: C.aqua });
      b.ray('q0', qv, 0, len, { color: C.aqua });
    }
    b.ray('p0', pv, pr, len, { color: C.sun });
    b.ray('q1', qv, a2, len, { color: C.sun });
    b.dot('pv', pv, { r: 6 });
    if (j < 0.98) b.dot('qv', qv, { r: 6 });
    b.text('vp', at(pv, pr + a1 / 2, 70), `${a1}°`, { size: 26, color: TXT.aqua });
    b.text('vq', at(qv, a2 / 2, labelR(a2)), `${a2}°`, { size: 26, color: TXT.orange });
    if (s.names) {
      b.label('no', O, 'O', 270, 26); b.label('nc', at(O, a2, 128), 'C', a2, 25);
    }
  };
}

// two separate angles side by side; s.j slides the second one onto the first (sharing an arm).
// Once joined: s.ring rings the shared vertex, s.arm lights the shared arm (the outer arms dim),
// s.blink blinks the two angles in turn
const PAIR_BOX = [-30, -32, 170, 62];
function pairMini(b, a1, a2, s = {}) {
  const j = s.j || 0;
  // as the two angles join, the pair glides to the middle of the card and grows to fill it
  const grow = lerp(1, 1.3, j), L = 54 * grow, R = 24 * grow, rot = a1 * j;
  const ends = [0, a1, a1 + a2].map((d) => at(O, d, L)).concat([O]);
  const xs = ends.map((p) => p[0]), ys = ends.map((p) => p[1]);
  const mid = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const box = [(PAIR_BOX[0] + PAIR_BOX[2]) / 2, (PAIR_BOX[1] + PAIR_BOX[3]) / 2];
  const o = [(box[0] - mid[0]) * j, (box[1] - mid[1]) * j];
  const v2 = [lerp(106, 0, j) + o[0], o[1]];
  const outer = s.arm ? 'dim' : '', shared = s.arm ? 'glow' : '';
  b.wedge('w1', o, 0, a1, R, { fill: FILL.orange, edge: C.orange, cls: s.blink ? 'blink' : '' });
  b.wedge('w2', v2, rot, rot + a2, R, { fill: FILL.aqua, edge: C.aqua, cls: s.blink ? 'blink2' : '' });
  b.ray('a1', o, 0, L, { color: C.aqua, w: 4.5, cls: outer });
  b.ray('b1', o, a1, L, { color: C.sun, w: 4.5, cls: shared });
  b.ray('a2', v2, rot, L, { color: C.sun, w: 4.5, cls: shared });
  b.ray('b2', v2, rot + a2, L, { color: C.aqua, w: 4.5, cls: outer });
  b.dot('o1', o, { r: 4.5 });
  if (s.ring) b.pulse('ring', o);
  if (j < 0.98) b.dot('o2', v2, { r: 4.5 });
  if (j < 0.4) {
    b.text('v1', [o[0] + 10, o[1] - 19], `${a1}°`, { size: 20, color: TXT.orange });
    b.text('v2', [v2[0] + 10, -19], `${a2}°`, { size: 20, color: TXT.aqua });
  } else if (j > 0.92) {
    b.text('v1', at(o, a1 / 2, R + 17), `${a1}°`, { size: 18, color: TXT.orange });
    b.text('v2', at(o, a1 + a2 / 2, R + 17), `${a2}°`, { size: 18, color: TXT.aqua });
  }
  if (s.sq) b.square('sq', o, 0, 7);            // the right-angle mark, small inside the arcs
}

// three or four rays from one vertex with two tinted angles (deck slide 13)
const ADJ_BOX = [-64, -16, 66, 62];
const ADJ = {
  A: { rays: [0, 45, 105], wedges: [[0, 105, 'orange', 30], [0, 45, 'aqua', 19]], label: 'rays at 0°, 45° and 105°; one angle from 0° to 105°, the other from 0° to 45°' },
  B: { rays: [0, 50, 115], wedges: [[0, 50, 'orange', 26], [50, 115, 'aqua', 26]], label: 'rays at 0°, 50° and 115°; one angle from 0° to 50°, the other from 50° to 115°' },
  C: { rays: [0, 40, 125, 165], wedges: [[0, 40, 'orange', 26], [125, 165, 'aqua', 26]], label: 'rays at 0°, 40°, 125° and 165°; one angle from 0° to 40°, the other from 125° to 165°' },
};
function adjMini(b, o) {
  o.wedges.forEach(([a, z, f, r], k) => b.wedge(`w${k}`, O, a, z, r, { fill: FILL[f], edge: EDGE[f] }));
  o.rays.forEach((d, k) => b.ray(`r${k}`, O, d, 56, { color: C.aqua, w: 4.5 }));
  b.dot('o', O, { r: 4.5 });
}

// a ray on a line (other = 180) or on a tilted arm (deck slide 28)
const LINM_BOX = [-72, -16, 72, 62];
function lineMini(b, { t = 65, other = 180, right = '', left = '' } = {}) {
  b.wedge('wr', O, 0, t, 24, { fill: FILL.orange, edge: C.orange });
  b.wedge('wl', O, t, other, 24, { fill: FILL.aqua, edge: C.aqua });
  if (other === 180) b.full('ab', O, 0, 64, { color: C.aqua, w: 4.5 });
  else { b.ray('oa', O, 0, 62, { color: C.aqua, w: 4.5 }); b.ray('ob', O, other, 62, { color: C.aqua, w: 4.5 }); }
  b.ray('oc', O, t, 56, { color: C.sun, w: 4.5 });
  b.dot('o', O, { r: 4.5 });
  if (right) b.text('vr', at(O, t / 2, 42), right, { size: 17, color: TXT.orange });
  if (left) b.text('vl', at(O, mid(t, other), 42), left, { size: 17, color: TXT.aqua });
}

// ---------------------------------------------------------------- the recall (deck slide 43)

const RECALL = [
  {
    term: 'Angles', rule: 'Two rays starting from the same point form an angle.',
    box: [-18, -18, 78, 70], start: { t: 0, ring: 0 },
    draw(b, s) {
      if (s.t > 0.5) b.wedge('w', O, 0, s.t, 28, { fill: FILL.orange, edge: C.orange });
      b.ray('oa', O, 0, 68, { color: C.aqua, w: 4.5 });
      b.ray('ob', O, s.t, 68, { color: C.sun, w: 4.5 });
      b.dot('o', O, { r: 5 });
      if (s.ring) b.pulse('ring', O);
    },
    async play(v, c) {                       // the second ray turns away from the first: the turn is the angle
      v.set({ t: 0, ring: 0 });
      await c.wait(200);
      await v.to({ t: 55 }, 1100, 'inOut');
      v.set({ ring: 1 });
      c.sound.pop();
      await c.wait(1200);
      v.set({ ring: 0 });
    },
  },
  {
    term: 'Adjacent angles', rule: ['They have the same vertex.', 'They also have one common arm.', 'The two angles do not overlap.'],
    box: [-64, -16, 70, 70], start: { a: 0, b: 0, ring: 0, glow: 0, blink: 0 },
    draw(b, s) {
      if (s.a) b.wedge('w1', O, 0, 50 * s.a, 30, { fill: FILL.orange, edge: C.orange, cls: s.blink ? 'blink' : '' });
      if (s.b) b.wedge('w2', O, 50, 50 + 65 * s.b, 30, { fill: FILL.aqua, edge: C.aqua, cls: s.blink ? 'blink2' : '' });
      b.ray('r0', O, 0, 64, { color: C.aqua, w: 4.5 });
      b.ray('r2', O, 115, 64, { color: C.aqua, w: 4.5 });
      b.ray('r1', O, 50, 64, { color: C.sun, w: 4.5, cls: s.glow ? 'glow' : '' });
      b.dot('o', O, { r: 5 });
      if (s.ring) b.pulse('ring', O);
    },
    async play(v, c) {                       // same vertex, one common arm, no overlap
      v.set({ a: 0, b: 0, ring: 0, glow: 0, blink: 0 });
      await v.to({ a: 1 }, 500, 'out');
      await v.to({ b: 1 }, 500, 'out');
      v.set({ ring: 1 });
      await c.wait(1300);
      v.set({ ring: 0, glow: 1 });
      await c.wait(1500);
      v.set({ glow: 0, blink: 1 });
      await c.wait(1400);
      v.set({ blink: 0 });
    },
  },
  {
    term: 'Linear pair', rule: 'A linear pair always adds to 180°.',
    box: [-76, -22, 76, 76], start: { w: 0, sw: 0 },
    draw(b, s) {
      if (s.w) {
        b.wedge('wr', O, 0, 65 * s.w, 26, { fill: FILL.orange, edge: C.orange });
        b.wedge('wl', O, 65, 65 + 115 * s.w, 26, { fill: FILL.aqua, edge: C.aqua });
      }
      b.full('ab', O, 0, 72, { color: C.aqua, w: 4.5 });
      b.ray('oc', O, 65, 66, { color: C.sun, w: 4.5 });
      if (s.sw > 1) {
        b.arc('sw', O, 0, s.sw, 46, { color: '#fff3b0', w: 4, cls: 'glow' });
        b.text('swv', at(O, s.sw / 2, 62), deg(s.sw), { size: 17, color: '#fff3b0' });
      }
      b.dot('o', O, { r: 5 });
    },
    async play(v, c) {                       // the two angles fill the straight line: half a turn
      v.set({ w: 0, sw: 0 });
      await v.to({ w: 1 }, 700, 'out');
      await v.to({ sw: 180 }, 1200, 'inOut');
      c.sound.pop();
    },
  },
  {
    term: 'Linear pair converse', rule: 'Adjacent angles that add to 180° form a linear pair.',
    box: [-100, -18, 78, 66], start: { j: 0, line: 0 },
    draw(b, s) {
      const j = s.j, len = 54;
      const pv = [lerp(-44, 0, j), 0], pr = 70 * j;          // the 110° angle slides right and turns 70°
      const qv = [lerp(20, 0, j), 0];                         // the 70° angle slides left
      b.wedge('wp', pv, pr, pr + 110, 22, { fill: FILL.aqua, edge: C.aqua });
      b.wedge('wq', qv, 0, 70, 22, { fill: FILL.orange, edge: C.orange });
      if (s.line) b.full('ab', O, 0, 72, { color: C.aqua, w: 4.5, cls: 'glow' });
      else {
        b.ray('p1', pv, pr + 110, len, { color: C.aqua, w: 4.5 });
        b.ray('q0', qv, 0, len, { color: C.aqua, w: 4.5 });
      }
      b.ray('p0', pv, pr, len, { color: C.sun, w: 4.5 });
      b.ray('q1', qv, 70, len, { color: C.sun, w: 4.5 });
      b.dot('pv', pv, { r: 4.5 });
      if (j < 0.98) b.dot('qv', qv, { r: 4.5 });
      b.text('vp', at(pv, pr + 55, 40), '110°', { size: 15, color: TXT.aqua });
      b.text('vq', at(qv, 35, 42), '70°', { size: 15, color: TXT.orange });
    },
    async play(v, c) {                       // 110° and 70° slide together: the outer arms make a straight line
      v.set({ j: 0, line: 0 });
      await c.wait(300);
      await v.to({ j: 1 }, 1200, 'inOut');
      v.set({ line: 1 });
      c.sound.snap();
    },
  },
  {
    term: 'Vertically opposite angles', rule: 'Vertically opposite angles are equal.',
    box: [-74, -58, 74, 58], start: { sp: -1, eq: 0 },
    draw(b, s) {
      [[0, 50, 'orange'], [50, 180, 'aqua'], [180, 230, 'orange'], [230, 360, 'aqua']].forEach(([a, z, f], k) => {
        b.wedge(`w${k}`, O, a, z, 24, { fill: FILL[f], edge: EDGE[f], cls: s.eq && f === 'orange' ? 'blink' : '' });
      });
      b.full('ab', O, 0, 70, { color: C.aqua, w: 4.5 });
      b.full('pq', O, 50, 66, { color: C.sun, w: 4.5 });
      if (s.sp >= 0) b.wedge('gc', O, s.sp, s.sp + 50, 34, { fill: 'rgba(255, 243, 176, .38)', edge: '#fff3b0' });
      if (s.eq) {
        b.text('e1', at(O, 25, 46), '50°', { size: 15, color: TXT.orange });
        b.text('e3', at(O, 205, 46), '50°', { size: 15, color: TXT.orange });
      }
      b.dot('o', O, { r: 4.5 });
    },
    async play(v, c) {                       // a copy of one angle turns half a turn and lands on the opposite one
      v.set({ sp: -1, eq: 0 });
      await c.wait(250);
      v.set({ sp: 0 });
      await v.to({ sp: 180 }, 1400, 'inOut');
      v.set({ sp: -1, eq: 1 });
      c.sound.snap();
      await c.wait(1200);
    },
  },
];

// ---------------------------------------------------------------- the proof's working (deck slides 38-41)
// Written the classic way, one line under another. Each term keeps its key from one step to the next and
// glides to its new place; a term that leaves either merges into another (glides into it and fades) or
// folds away where it was.
function eqnBoard() {
  const el = h('<div class="eqn"></div>');
  const toks = new Map();
  return {
    el,
    // lines: [[key, text, cls], ...] per line; merge: { leavingKey: keyItMergesInto }
    show(lines, { merge = {}, reduced = false } = {}) {
      const before = new Map([...toks].map(([k, t]) => [k, t.getBoundingClientRect()]));
      const w0 = el.isConnected ? el.getBoundingClientRect().width : 0;   // measured before the terms move into new lines
      const keep = new Set();
      const rows = lines.map((line) => {
        const row = document.createElement('div');
        row.className = 'eqn__line';
        line.forEach(([k, text, cls = '']) => {
          let t = toks.get(k);
          if (!t) { t = document.createElement('span'); toks.set(k, t); }
          t.className = cls;
          t.innerHTML = angles(esc(text));
          row.appendChild(t);
          keep.add(k);
        });
        return row;
      });
      const gone = [...toks.keys()].filter((k) => !keep.has(k));
      el.replaceChildren(...rows);
      if (reduced) { gone.forEach((k) => toks.delete(k)); return Promise.resolve(); }
      const box = el.getBoundingClientRect();
      const anims = [];
      // the box glides to its new width: it grows before the terms move in, and shrinks only once they have
      if (w0 && box.width > w0 + 1) {
        anims.push(el.animate([{ width: `${w0}px` }, { width: `${box.width}px` }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }));
      } else if (w0 && box.width < w0 - 1) {
        anims.push(el.animate([{ width: `${w0}px` }, { width: `${w0}px`, offset: 0.66 }, { width: `${box.width}px` }], { duration: 1150, easing: 'ease-in-out' }));
      }
      keep.forEach((k) => {
        const t = toks.get(k), r = t.getBoundingClientRect(), o = before.get(k);
        if (o) {
          if (Math.abs(o.left - r.left) + Math.abs(o.top - r.top) > 0.5) {
            anims.push(t.animate([{ transform: `translate(${o.left - r.left}px, ${o.top - r.top}px)` }, { transform: 'none' }], { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)' }));
          }
        } else {
          anims.push(t.animate([{ opacity: 0, transform: 'translateY(8px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' }));
        }
      });
      gone.forEach((k) => {
        const t = toks.get(k), o = before.get(k);
        toks.delete(k);
        if (!o) return;
        t.classList.add('eqn__ghost');
        t.style.left = `calc(50% + ${o.left - (box.left + box.width / 2)}px)`;   // from the centre: steady while the box resizes
        t.style.top = `${o.top - box.top}px`;
        el.appendChild(t);
        const to = merge[k] && toks.get(merge[k])?.getBoundingClientRect();
        const end = to ? `translate(${to.left + to.width / 2 - (o.left + o.width / 2)}px, ${to.top + to.height / 2 - (o.top + o.height / 2)}px) scale(.5)` : 'scale(.3)';
        const a = t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: end }], { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
        a.finished.then(() => t.remove(), () => t.remove());
        anims.push(a);
      });
      return Promise.all(anims.map((a) => a.finished.catch(() => {})));
    },
  };
}

// ---------------------------------------------------------------- shared question pieces

const PAIR_CARDS = (pairs) => Object.entries(pairs).map(([id, [a1, a2]]) => ({
  id, label: `${a1}° and ${a2}°`, box: PAIR_BOX, state: { j: 0, sq: false }, draw: (b, s) => pairMini(b, a1, a2, s),
}));

const TYPE_WHY = {
  52: { Right: ['A right angle is exactly 90°, a square corner.', 'This one is smaller than that.'], Obtuse: ['Obtuse angles are bigger than 90°.', 'This one is smaller than a square corner.'] },
  90: { Acute: ['Acute angles are smaller than 90°.', 'This one makes a perfect square corner.'], Obtuse: ['Obtuse angles are bigger than 90°.', 'This one is exactly a square corner.'] },
  128: { Acute: ['Acute angles are smaller than 90°.', 'This one opens wider than a square corner.'], Right: ['A right angle is exactly 90°.', 'This one opens wider than that.'] },
};



// ---------------------------------------------------------------- the steps
// Captions use the deck's own sentences. The narration only adds an instruction when the student has
// something to do, and explains a wrong answer.

export const STEPS = [
  // ============================================================ WARM-UP
  // deck slides 2-3: an angle is formed by two rays from one point; the second ray turns away from the first
  {
    id: 'angle', ch: 0, title: 'How an angle is formed',
    async run(c) {
      c.fig.box(-92, -40, 160, 146);
      const L = 132;
      const v = c.view({ o: 0, a: 0, b: 0, t: 0, names: false, ring: false }, (b, s) => {
        if (s.t > 0.5) b.wedge('w', O, 0, s.t, 36, { fill: FILL.orange, edge: C.orange });
        if (s.a) b.ray('oa', O, 0, L * s.a, { color: C.aqua });
        if (s.b) b.ray('ob', O, s.t, L * s.b, { color: C.sun });
        if (s.o) b.dot('o', O, { r: 7 * Math.max(0, s.o) });
        if (s.ring) b.pulse('ring', O);
        if (s.names) {
          b.label('no', O, 'O', 245, 25);
          b.label('na', [L, 0], 'A', 300, 25);
          b.label('nb', at(O, s.t, L), 'B', s.t, 26);
        }
      });
      c.caption('Do you remember how an angle is formed?');
      await c.wait(300);
      await v.to({ o: 1 }, 420, 'back');                   // the point
      await v.to({ a: 1 }, 520, 'out');                    // the first ray
      await v.to({ b: 1 }, 480, 'out');                    // the second ray, lying on the first
      await v.to({ t: 48 }, 900, 'inOut');                 // ... turns away: the turn is the angle
      await c.wait(350);
      c.caption('Two rays starting from the same point form an angle.');
      v.set({ names: true, ring: true });
      c.sound.pop();
      await c.wait(1600);
      v.set({ ring: false });
    },
  },

  // deck slides 4-6: acute, right or obtuse (arm OB turns between the questions)
  {
    id: 'types', ch: 0, gate: true, title: 'Angle types', lockHint: 'Tap a name for the angle to go on.',
    async run(c) {
      c.fig.box(-92, -40, 160, 146);
      const L = 132;
      const v = c.view({ t: 52, val: false, sq: false }, (b, s) => {
        b.wedge('w', O, 0, s.t, 36, { fill: FILL.orange, edge: C.orange });
        b.ray('oa', O, 0, L, { color: C.aqua });
        b.ray('ob', O, s.t, L, { color: C.sun });
        b.dot('o', O, { r: 7 });
        b.label('no', O, 'O', 245, 25);
        b.label('na', [L, 0], 'A', 300, 25);
        b.label('nb', at(O, s.t, L), 'B', s.t, 26);
        if (s.sq) b.square('sq', O, 0, 17);
      });
      const ROUNDS = [
        { d: 52, t: 'Acute', cap: 'Which type of angle is this?', got: 'Acute: less than 90°.' },
        { d: 90, t: 'Right', cap: 'What type is it now?', got: 'A right angle: exactly 90°.' },
        { d: 128, t: 'Obtuse', cap: 'And what type is this?', got: 'Obtuse: more than 90°.' },
      ];
      for (const [k, R] of ROUNDS.entries()) {
        c.caption(R.cap);
        if (k) { v.set({ val: false, sq: false }); await v.to({ t: R.d }, 800, 'inOut'); }
        await c.choose({ options: ['Acute', 'Right', 'Obtuse'], answer: R.t, why: TYPE_WHY[R.d], got: R.got });
        v.set({ sq: R.d === 90 });
        await c.wait(1200);
      }
    },
  },

  // deck slides 7-12: complementary, then adjacent. The pair found is the pair that then shares a point and
  // an arm (its card goes, the two angles stay and fill the screen, slide together, and are named adjacent).
  // The deck asks about complementary angles without saying what they are, so that is said first.
  {
    id: 'comp', ch: 0, gate: true, title: 'Complementary and adjacent angles', lockHint: 'Tap the card with the complementary pair.',
    async run(c) {
      c.caption('Complementary angles add up to 90°.');
      c.caption('Which pair is complementary?');
      const res = await c.cards({
        items: PAIR_CARDS({ A: [30, 60], B: [45, 55], C: [35, 65] }),
        answer: 'A',
        why: { B: ['45° + 55° = 100°.', 'Complementary angles make exactly 90°.'], C: ['35° + 65° = 100°.', 'Complementary angles make exactly 90°.'] },
        got: '30° + 60° = 90°.',
      });
      c.ready();
      await c.wait(500);
      await res.unframe();                                 // the card goes; 30° and 60° stay and fill the screen
      const v = res.view;
      c.caption('What if these two angles share a point and an arm?');
      await c.said();
      await c.wait(300);
      c.sound.whoosh();
      await v.to({ j: 1 }, 1100, 'inOut');                 // the 60° angle slides over and turns onto the 30° one
      v.set({ sq: true });                                 // still 90° together: a square corner
      c.sound.snap();
      await c.wait(700);

      v.set({ ring: true });                               // the shared vertex rings while it is named
      c.caption('They have the same vertex.');
      await c.said(); await c.wait(700);

      v.set({ ring: false, arm: true });                   // the shared arm lights up, the outer arms dim
      c.caption('They also have one common arm.');
      await c.said(); await c.wait(700);

      v.set({ arm: false, blink: true });                  // the two angles blink in turn, side by side
      c.caption('The two angles do not overlap.');
      await c.said(); await c.wait(600);
      v.set({ blink: false });
      c.caption('We call these adjacent angles.');
      c.stamp('Adjacent angles');
      await c.wait(900);
    },
  },

  // ============================================================ ADJACENT ANGLES
  // deck slide 13: which pair is adjacent?
  {
    id: 'adjacentQ', ch: 1, gate: true, title: 'Which pair is adjacent?', lockHint: 'Tap the adjacent pair to go on.',
    async run(c) {
      c.caption('Which pair is adjacent?');
      await c.cards({
        items: ['A', 'B', 'C'].map((id) => ({ id, label: ADJ[id].label, box: ADJ_BOX, draw: (b) => adjMini(b, ADJ[id]) })),
        answer: 'B',
        why: {
          A: ['They share a vertex and an arm,', 'but the orange angle covers the blue one: they overlap.'],
          C: 'Same vertex, but no common arm: there’s a gap between the two angles.',
        },
        got: 'Same vertex, a common arm, no overlap.',
      });
    },
  },

  // ============================================================ LINEAR PAIR
  // deck slides 14-16: a ray on a straight line
  {
    id: 'linear', quiet: true, ch: 2, title: 'Linear pair',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ l: 0, c: 0, w: 0, t: 58, glow: false }, linearFig);
      c.caption('What happens if a ray starts from a point on a straight line?');
      await c.wait(250);
      await v.to({ l: 1 }, 700, 'out');                    // line AB draws out from O
      await c.wait(150);
      await v.to({ c: 1 }, 650, 'out');                    // ray OC grows from O
      await c.wait(600);
      c.caption('We get a pair of adjacent angles.');
      await v.to({ w: 1 }, 700, 'out');
      await c.wait(1500);
      c.caption('As both angles lie on a straight line, we call them a linear pair.');
      v.set({ glow: true });
      c.stamp('Linear pair');
      await c.wait(900);
    },
  },

  // deck slides 17-18: the protractor measures both angles, then the student adds them
  {
    id: 'linearSum', ch: 2, gate: true, title: 'Measure the linear pair', lockHint: 'Add the two angles and pick the total.',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ l: 1, c: 1, w: 1, t: 65, right: null, left: null, prot: null }, linearFig);
      c.caption('Let’s measure both angles.');
      await c.wait(300);
      v.s.prot = { r: 60, a0: 0, from: 0, needle: 0 };     // ∠COB: from OB (0°) round to OC
      await c.tween(1000, (k) => { v.s.prot.needle = 65 * k; v.s.right = deg(65 * k); v.draw(); }, 'inOut');
      c.sound.pop();
      await c.wait(250);
      v.s.prot = { r: 60, a0: 0, from: 180, needle: 180 }; // ∠AOC: from OA (180°) back to OC
      await c.tween(1100, (k) => { v.s.prot.needle = 180 - 115 * k; v.s.left = deg(115 * k); v.draw(); }, 'inOut');
      c.sound.pop();
      await c.wait(300);
      v.set({ prot: null });
      c.caption('What do the two angles add up to?');
      c.readout(`${S('o', '65°')}${OP('+')}${S('a', '115°')}${OP('=')}${S('x', 'x')}`);
      await c.choose({
        options: [170, 180, 190], answer: 180, fmt: deg,
        why: {
          170: ['Not quite.', '60 + 110 = 170, and 5 + 5 = 10 more.'],
          190: ['A bit too much.', '60 + 110 = 170, and 5 + 5 = 10 more.'],
        },
        got: '65° + 115° = 180°.',
      });
      c.readout(`${S('o', '65°')}${OP('+')}${S('a', '115°')}${OP('=')}${S('g', '180°')}`);
      await c.wait(900);
    },
  },

  // deck slides 19-20: move the ray, the total stays 180°
  {
    id: 'linearMove', ch: 2, gate: true, title: 'Move the ray', lockHint: 'Drag point C to go on.',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ l: 1, c: 1, w: 1, t: 65, handle: true, hint: true }, (b, s) => {
        s.right = deg(s.t);
        s.left = deg(180 - s.t);
        linearFig(b, s);
      });
      const sum = () => c.readout(`${S('a', deg(180 - v.s.t))}${OP('+')}${S('o', deg(v.s.t))}${OP('=')}${S('g', '180°')}`);
      sum();
      let moved = 0, finish;
      const done = new Promise((r) => { finish = r; });
      const setT = (t) => {
        t = Math.round(clamp(t, 15, 165));
        moved += Math.abs(t - v.s.t);
        v.set({ t, hint: false });
        sum();
        if (moved >= 60) finish();
      };
      c.fig.onDrag = (id, p) => setT(upper(angleOf(p)));
      c.fig.onNudge = (id, d) => setT(v.s.t + d);
      c.fig.dragAll = 'c';
      v.draw();
      c.caption('What happens if we move the ray?');
      c.talk(crew('Drag point C.'));
      await c.until(done);
      c.ready();
      c.praise(true, 'You moved ray OC.');
      c.caption('The angles change, but their total stays 180°.');
      c.sound.right();
      await c.wait(1200);
    },
  },

  // deck slides 21-22: the linear pair axiom
  {
    id: 'axiom', quiet: true, ch: 2, title: 'Linear pair axiom',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ l: 1, c: 1, w: 1, t: 62, sweep: null, right: '∠1', left: '∠2' }, linearFig);
      c.caption('A linear pair always adds to 180°.');
      c.readout(`${S('o', '∠1')}${OP('+')}${S('a', '∠2')}${OP('=')}${S('g', '180°')}`);
      await c.wait(500);
      v.set({ sweep: { r: 40, from: 0, at: 0, label: '' } });   // along the two angles' edge
      await c.tween(1200, (k) => { v.s.sweep.at = 180 * k; v.s.sweep.label = deg(180 * k); v.draw(); }, 'inOut');
      await c.wait(900);
      c.caption('If a ray stands on a straight line,');                // the rule in two parts; the second joins the line
      c.say(crew('the two adjacent angles formed add up to 180°.')).catch(() => {});
      c.sound.stamp();
    },
  },

  // deck slide 23: find the missing angle
  {
    id: 'linearFind', ch: 2, gate: true, title: 'Find the missing angle', lockHint: 'Pick the missing angle to go on.',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ l: 1, c: 1, w: 1, t: 52, right: '52°', left: 'x' }, linearFig);
      c.caption('Find the missing angle in this linear pair.');
      await c.choose({
        options: [118, 128, 138], answer: 128, fmt: deg,
        why: {
          118: ['118° + 52° = 170°.', 'A linear pair must make exactly 180°.'],
          138: ['138° + 52° = 190°.', 'That’s more than a straight line.'],
        },
        got: '52° + 128° = 180°.',
      });
      v.set({ left: '128°' });
      await c.wait(900);
    },
  },

  // ============================================================ CONVERSE
  // deck slides 24-27: supplementary angles; the pair found is the pair that then becomes adjacent (its card
  // goes, the two angles stay, fill the screen, slide together and form a linear pair)
  {
    id: 'supp', ch: 3, gate: true, title: 'Supplementary angles', lockHint: 'Tap the card with the supplementary pair.',
    async run(c) {
      c.caption('Supplementary angles add up to 180°.');
      c.caption('Which pair is supplementary?');
      const PAIRS = { A: [110, 70], B: [85, 85], C: [100, 70] };
      const res = await c.cards({
        items: Object.entries(PAIRS).map(([id, [a1, a2]]) => ({ id, label: `${a1}° and ${a2}°`, box: JOIN_BOX, state: { j: 0 }, draw: joinFig(a1, a2) })),
        answer: 'A',
        why: { B: ['85° + 85° = 170°.', 'Supplementary angles make exactly 180°.'], C: ['100° + 70° = 170°.', 'Supplementary angles make exactly 180°.'] },
        got: '110° + 70° = 180°.',
      });
      c.ready();
      await c.wait(500);
      await res.unframe();                                 // the card goes; 110° and 70° stay and fill the screen
      c.caption('What if these two supplementary angles become adjacent?');
      await c.said();
      await c.wait(300);
      c.sound.whoosh();
      await res.view.to({ j: 1 }, 1400, 'inOut');          // the 110° angle slides over and turns onto the 70° one
      res.view.set({ line: true, names: true });
      c.sound.snap();
      c.burst(res.card.querySelector('[data-k="ab"]') || res.card, { count: 18 });
      c.caption('Their outer arms lie on a straight line.');
      await c.wait(1700);
      c.caption('Adjacent angles that add to 180° form a linear pair.');
      c.readout(`${S('o', '70°')}${OP('+')}${S('a', '110°')}${OP('=')}${S('g', '180°')}`);
    },
  },

  // deck slide 28: which pair must form a linear pair?
  {
    id: 'linearQ', ch: 3, gate: true, title: 'Which is a linear pair?', lockHint: 'Tap the pair that must form a linear pair.',
    async run(c) {
      c.caption('Which pair must form a linear pair?');
      await c.cards({
        items: [
          { id: 'A', label: 'adjacent angles of 115° and 65° on one line', box: LINM_BOX, draw: (b) => lineMini(b, { t: 65, other: 180, right: '65°', left: '115°' }) },
          { id: 'B', label: 'separate angles of 65° and 115°', box: PAIR_BOX, draw: (b) => pairMini(b, 65, 115) },
          { id: 'C', label: 'adjacent angles of 65° and 95°', box: LINM_BOX, draw: (b) => lineMini(b, { t: 65, other: 160, right: '65°', left: '95°' }) },
        ],
        answer: 'A',
        why: {
          B: ['65° + 115° = 180°,', 'but they aren’t adjacent: no shared vertex, no shared arm.'],
          C: ['They’re adjacent, but 65° + 95° = 160°,', 'so the outer arms don’t make a straight line.'],
        },
        got: 'Adjacent, and 115° + 65° = 180°.',
      });
    },
  },

  // ============================================================ VERTICALLY OPPOSITE
  // deck slides 29-30: two lines cross, four angles
  {
    id: 'cross', quiet: true, ch: 4, title: 'Two lines cross',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 0, q: 0, t: 55, pq: false, fill: [null, null, null, null], names: [0, 0, 0, 0], wcls: [] }, crossFig);
      c.caption('What happens when two straight lines cross?');
      await c.wait(250);
      await v.to({ l: 1 }, 650, 'out');
      await v.to({ q: 1 }, 650, 'out');
      v.set({ pq: true });
      await c.wait(700);
      c.caption('Four angles are formed.');
      for (let k = 0; k < 4; k++) {                      // counted round O one by one
        v.s.fill[k] = 'dim';
        v.s.wcls[k] = 'flash';
        v.draw();
        c.sound.tick(k);
        await c.wait(520);
      }
      await c.wait(400);
    },
  },

  // deck slides 31-33: which angle is opposite?
  {
    id: 'opposite', ch: 4, gate: true, title: 'Opposite angles', lockHint: 'Find the opposite angle to go on.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['orange', 'dim', 'dim', 'dim'], names: [1, 1, 1, 1], taps: true }, crossFig);
      c.fig.onTap = (id) => { if (!c.pick?.(id)) c.talk([{ text: `That’s ${id} itself.`, mood: 'hint' }, { text: 'Find the angle facing it across O.', mood: 'hint' }]); };
      c.caption('Which angle is opposite ∠1?');
      await c.choose({
        options: ['∠2', '∠3', '∠4'], answer: '∠3',
        why: {
          '∠2': ['∠2 is next to ∠1: they share an arm.', 'Opposite angles only share the vertex.'],
          '∠4': ['∠4 is next to ∠1: they share an arm.', 'Look straight across the vertex.'],
        },
        got: '∠3 faces ∠1 across O.',
      });
      v.set({ fill: ['orange', 'dim', 'orange', 'dim'] });
      await c.wait(900);
      c.caption('Which angle is opposite ∠2?');
      v.set({ fill: ['orange', 'aqua', 'orange', 'dim'] });
      await c.choose({
        options: ['∠1', '∠3', '∠4'], answer: '∠4',
        why: {
          '∠1': ['∠1 is next to ∠2: they share an arm.', 'Look straight across O.'],
          '∠3': ['∠3 is next to ∠2: they share an arm.', 'Look straight across O.'],
        },
        got: '∠4 faces ∠2 across O.',
      });
      c.ready();
      v.set({ fill: ['orange', 'aqua', 'orange', 'aqua'], taps: false });
      c.fig.onTap = null;
      c.caption('These are vertically opposite angle pairs.');
      c.stamp('Vertically opposite');
    },
  },

  // deck slides 34-35: measure all four, then turn ∠1 half a turn: it lands exactly on ∠3
  {
    id: 'measure', ch: 4, title: 'Measure the angles',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['orange', 'aqua', 'orange', 'aqua'], names: [1, 1, 1, 1], vals: [null, null, null, null], prot: null }, crossFig);
      c.caption('Let’s measure the angles.');
      await c.wait(300);
      // the protractor on line AB: above it for ∠1 and ∠2, below it for ∠3 and ∠4; the needle swings from
      // line AB to line PQ (at 55° and 235°)
      const MEAS = [[0, 0, 0, 55], [1, 0, 180, 55], [2, 180, 180, 235], [3, 180, 360, 235]];
      for (const [k, a0, from, to] of MEAS) {
        v.s.prot = { r: 60, a0, from, needle: from };
        await c.tween(800, (e) => { v.s.prot.needle = lerp(from, to, e); v.s.vals[k] = deg(Math.abs(to - from) * e); v.draw(); }, 'inOut');
        c.sound.pop();
        await c.wait(200);
      }
      await c.wait(300);
      v.set({ prot: null });
      c.caption('Vertically opposite angles are equal.');
      c.readout(`${S('o', '∠1 = ∠3 = 55°')}${OP('•')}${S('a', '∠2 = ∠4 = 125°')}`);
      await c.wait(800);
      // a copy of ∠1 turns half a turn round O and lands exactly on ∠3 (the values step aside for it; the
      // readout keeps them)
      const vals = [...v.s.vals], names = [...v.s.names];
      v.set({ vals: [null, null, null, null], names: [1, 0, 1, 0] });
      v.s.spin = { o: O, a: 0, b: 55, r: 38, len: 118, rot: 0, done: false };
      await c.tween(1600, (e) => { v.s.spin.rot = 180 * e; v.draw(); }, 'inOut');
      v.s.spin.done = true;
      v.draw();
      c.sound.snap();
      c.burst(c.fig.center('[data-k="sp-w"]') || [innerWidth / 2, innerHeight / 2], { count: 16, spread: 120 });
      await c.wait(1300);
      v.set({ spin: null, vals, names });
    },
  },

  // deck slide 36: turn a line
  {
    id: 'rotate', ch: 4, gate: true, title: 'Turn the line', lockHint: 'Drag the line to go on.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['orange', 'aqua', 'orange', 'aqua'], names: [1, 1, 1, 1], handle: true, hint: true }, (b, s) => {
        const t = deg(s.t), u = deg(180 - s.t);
        s.vals = s.hint ? [null, null, null, null] : [t, u, t, u];   // the values come with the first drag (the hint hand stands there)
        crossFig(b, s);
      });
      const sums = () => c.readout(`${S('o', `∠1 = ∠3 = ${deg(v.s.t)}`)}${OP('•')}${S('a', `∠2 = ∠4 = ${deg(180 - v.s.t)}`)}`);
      let moved = 0, finish;
      const done = new Promise((r) => { finish = r; });
      const setT = (t) => {
        t = Math.round(clamp(t, 20, 160));
        moved += Math.abs(t - v.s.t);
        v.set({ t, hint: false });
        sums();
        if (moved >= 50) finish();
      };
      c.fig.onDrag = (id, p) => setT(angleOf(p) % 180);
      c.fig.onNudge = (id, d) => setT(v.s.t + d);
      c.fig.dragAll = 'p';
      v.draw();
      sums();
      c.caption('Does that still happen if we rotate a line?');
      c.talk(crew('Drag the line.'));
      await c.until(done);
      c.ready();
      c.praise(true, 'You turned the line.');
      c.caption('Yes: vertically opposite angles stay equal.');
      c.sound.right();
    },
  },

  // deck slides 37-41: why it happens (proof with two linear pairs)
  {
    id: 'proof', quiet: true, ch: 4, title: 'Why it works',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['dim', 'dim', 'dim', 'dim'], names: [1, 1, 1, 1], glow: null, sweep: null }, crossFig);
      const eq = eqnBoard();
      const show = (lines, merge) => c.until(eq.show(lines, { merge, reduced: c.reduced }));
      // the terms; each keeps its key, so it glides from one line of the working to the next
      const L1 = [['a1', '∠1', 'o'], ['p1', '+', 'op'], ['b1', '∠2', 'a'], ['e1', '=', 'op'], ['t1', '180°', 'g']];
      const L2 = [['b2', '∠2', 'a'], ['p2', '+', 'op'], ['c2', '∠3', 'o'], ['e2', '=', 'op'], ['t2', '180°', 'g']];
      const BOTH = [L1[0], L1[1], L1[2], L1[3], L2[0], L2[1], L2[2]];
      c.caption('Let’s see why it happens.');
      const PLAN = [
        { cap: '∠1 and ∠2 form a linear pair.', fill: ['orange', 'aqua', null, null], glow: 'ab', arc: [0, 180],
          go: () => show([L1]) },
        { cap: '∠2 and ∠3 form another linear pair.', fill: [null, 'aqua', 'orange', null], glow: 'pq', arc: [55, 235],
          go: () => show([L1, L2]) },
        // both lines equal the same 180°: the two totals merge, and ∠2 + ∠3 moves up beside ∠1 + ∠2
        { cap: 'Both totals include the same ∠2.', fill: ['orange', 'aqua', 'orange', null], glow: null, arc: null,
          go: () => show([BOTH], { t1: 'e1', t2: 'e1', e2: 'e1' }) },
        // ∠2 is struck out on both sides, folds away, and ∠1 and ∠3 slide together
        { cap: 'So ∠1 and ∠3 must be equal.', fill: ['orange', null, 'orange', null], glow: null, arc: null,
          go: async () => {
            await show([BOTH.map(([k, t, cls]) => [k, t, k === 'b1' || k === 'b2' ? `${cls} cut` : cls])]);
            await c.wait(750);
            await show([[L1[0], L1[3], L2[2]]]);
          } },
      ];
      for (const P of PLAN) {
        await c.said();                                    // the line before has been said
        await c.wait(P === PLAN[0] ? 300 : 1100);          // a moment to look at the working
        c.caption(P.cap);
        v.set({ fill: P.fill, glow: P.glow, sweep: null });
        if (!eq.el.isConnected) c.els.readout.replaceChildren(eq.el);
        const working = P.go();
        working.catch(() => {});                           // a step left mid-way: its working stops quietly
        if (P.arc) {                                       // the half turn each linear pair fills
          const [a, z] = P.arc;
          v.s.sweep = { r: 38, from: a, at: a, label: '' };   // along the pair's edge
          await c.tween(1000, (e) => { v.s.sweep.at = lerp(a, z, e); v.s.sweep.label = deg(180 * e); v.draw(); }, 'inOut');
        }
        await working;
      }
      eq.el.classList.add('done');
      c.sound.right();
      c.burst(c.els.readout, { count: 16 });
      await c.wait(800);
    },
  },

  // deck slide 42: find the other three angles
  {
    id: 'findThree', ch: 4, gate: true, title: 'Find all four', lockHint: 'Find the angle on the screen to go on.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 68, pq: true, fill: ['orange', 'dim', 'dim', 'dim'], names: [1, 1, 1, 1], vals: ['68°', null, null, null], vcls: [] }, crossFig);
      c.caption('Can you find the other three angles if ∠1 is 68°?');
      const QS = [
        { k: 2, name: '∠3', fill: 'orange', opts: [22, 68, 112], ans: 68, why: { 22: ['That’s 90° − 68°.', '∠3 is opposite ∠1, so they’re equal.'], 112: ['112° would make a linear pair with ∠1.', 'But ∠3 is opposite ∠1.'] }, got: '∠3 is opposite ∠1: 68°.' },
        { k: 1, name: '∠2', fill: 'aqua', opts: [68, 112, 122], ans: 112, why: { 68: ['∠2 is next to ∠1, not opposite.', 'Together they make a linear pair: 180°.'], 122: ['68° + 122° = 190°.', 'A linear pair makes exactly 180°.'] }, got: '180° − 68° = 112°.' },
        { k: 3, name: '∠4', fill: 'aqua', opts: [68, 112, 132], ans: 112, why: { 68: '∠4 is opposite ∠2, not ∠1.', 132: ['68° + 132° = 200°.', '∠1 and ∠4 make a linear pair: 180°.'] }, got: '∠4 is opposite ∠2: 112°.' },
      ];
      for (const Q of QS) {
        v.s.fill[Q.k] = 'sun';
        v.s.vals[Q.k] = 'x';
        v.s.vcls = [];
        v.s.vcls[Q.k] = 'blink';
        v.draw();
        await c.choose({ options: Q.opts, answer: Q.ans, fmt: deg, why: Q.why, got: Q.got });
        v.s.fill[Q.k] = Q.fill;
        v.s.vals[Q.k] = deg(Q.ans);
        v.s.vcls = [];
        v.draw();
        await c.wait(700);
      }
    },
  },

  // ============================================================ RECALL (the last step launches the game)
  // deck slide 43: recall. A drone flies in and stops in the middle; it projects the five cards one by one
  // as holograms in its beam, each card's diagram shows the idea while the voice says the deck's sentence,
  // and the card flies down into the tray. When all five are collected the drone leaves and the tray
  // opens into the collection; tapping a card brings the drone back to explain it again.
  {
    id: 'recall', quiet: true, ch: 5, title: 'Recall', next: 'Launch mission', launch: true, nextAfter: true,   // Launch mission arrives once the recall is done
    async run(c) {
      c.caption('Recall');
      const root = h(`<div class="recall"><div class="recall__beam" aria-hidden="true"><i></i></div><div class="recall__stage"></div><div class="recall__slots"></div><div class="drone" aria-hidden="true">${droneMarkup()}</div></div>`);
      const slots = root.querySelector('.recall__slots');
      const stage = root.querySelector('.recall__stage');
      const beam = root.querySelector('.recall__beam');
      const drone = root.querySelector('.drone');
      c.stage(root);
      // while the drone is here, it is the one talking: the mouth moves to its screen (and back when it leaves)
      const bar = document.getElementById('narration');
      const mouthOnDrone = (on) => bar.classList.toggle('mouth-on-drone', on);
      c.later(() => mouthOnDrone(false));
      // each card's place in the collection (invisible until the card lands); while the drone works, four of
      // them wait at the sides (data-pos 0-3: left and right, top row then bottom row) and the last card
      // stays in the middle. Each card waits off stage until the drone brings it
      const cards = RECALL.map((R, i) => {
        const slot = h('<div class="rslot"></div>');
        if (i < 4) slot.dataset.pos = String(i);
        const el = h('<button type="button" class="rcard" disabled><b></b><span class="rcard__fig" aria-hidden="true"></span></button>');
        el.querySelector('b').textContent = R.term;
        el.setAttribute('aria-label', `${R.term}: ${[].concat(R.rule).join(' ')}`);
        slots.appendChild(slot);
        return { R, slot, el };
      });

      // ---- the drone: flies in from the left, hovers, flies out to the right
      const W = () => root.clientWidth;
      const place = (x, y, { now = false, tilt = 0 } = {}) => {
        if (now) drone.style.transition = 'none';
        drone.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        drone.style.setProperty('--tilt', `${tilt}deg`);
        if (now) { void drone.offsetWidth; drone.style.transition = ''; }
      };
      const hoverOver = (el) => {                         // where the drone hovers to project onto el
        const rr = root.getBoundingClientRect(), r = el.getBoundingClientRect();
        return [r.left - rr.left + r.width / 2 - drone.offsetWidth / 2, Math.max(0, r.top - rr.top - drone.offsetHeight - 40)];
      };
      const flyIn = async (to) => {
        mouthOnDrone(true);
        place(-drone.offsetWidth - 40, to[1], { now: true, tilt: 9 });
        c.sound.whoosh();
        place(to[0], to[1], { tilt: 8 });
        await c.wait(700);
        drone.style.setProperty('--tilt', '0deg');         // levels out as it slows into the hover
        await c.wait(800);
      };
      const flyOut = () => {
        const y = parseFloat(drone.style.transform.split(',')[1]) || 0;
        place(W() + 40, y, { tilt: 9 });
        mouthOnDrone(false);
      };

      // ---- the projection: a cone of light from the drone's emitter down over the card
      const beamOn = (el) => {
        const rr = root.getBoundingClientRect(), d = drone.getBoundingClientRect(), r = el.getBoundingClientRect();
        const top = d.top - rr.top + d.height * 0.95;    // the emitter: the glowing tip under the drone's body
        const pad = r.width * 0.12;
        Object.assign(beam.style, {
          left: `${r.left - rr.left - pad}px`, width: `${r.width + 2 * pad}px`,
          top: `${top}px`, height: `${r.bottom - rr.top + pad * 2.2 - top}px`,
        });
        beam.style.setProperty('--e', `${d.width * 0.11}px`);
        root.classList.add('beam-on');
        drone.classList.add('beam');
      };
      const beamOff = () => { root.classList.remove('beam-on'); drone.classList.remove('beam'); };

      // ---- the card forms in the light: from a speck at the emitter, growing down the beam, flickering in
      const release = async (el) => {
        el.classList.add('in', 'is-holo');
        if (c.reduced) return;
        const d = drone.getBoundingClientRect(), r = el.getBoundingClientRect();
        const dx = d.left + d.width / 2 - (r.left + r.width / 2);
        const dy = d.top + d.height * 0.92 - (r.top + r.height / 2);
        await c.until(el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(.04, .02)`, opacity: 0, filter: 'brightness(3) saturate(0)' },
          { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(.3, .12)`, opacity: 0.9, filter: 'brightness(2.6) saturate(.2)', offset: 0.3 },
          { transform: 'scale(1.02, .9)', opacity: 0.55, filter: 'brightness(1.8) saturate(.5)', offset: 0.62 },
          { transform: 'scale(1)', opacity: 0.95, filter: 'brightness(1.3)', offset: 0.78 },
          { transform: 'none', opacity: 0.7, offset: 0.86 },
          { transform: 'none', opacity: 1, filter: 'none' },
        ], { duration: 900, easing: 'cubic-bezier(.3, .6, .3, 1)' }).finished.catch(() => {}));
      };

      // ---- then the card's shape draws itself: each line grows from where it starts (a ray from its
      // vertex), and the filled parts (angles, arrowheads, points, labels) come in as the lines finish
      const drawIn = async (fig) => {
        fig.classList.remove('is-waiting');
        if (c.reduced) return;
        const ms = 750;
        const anims = [...fig.querySelectorAll('svg [data-k] *')].map((el) => {
          const fill = el.getAttribute('fill');
          if (el.tagName === 'path' && (!fill || fill === 'none') && el.getTotalLength) {
            const L = el.getTotalLength() + 1;
            return el.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }],
              { duration: ms * 0.8, easing: 'ease-in-out' });
          }
          return el.tagName === 'g' ? null : el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.78 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' });
        }).filter(Boolean);
        await c.until(Promise.all(anims.map((a) => a.finished.catch(() => {}))));
      };

      // ---- the card flies down into its slot in the tray and is collected
      const collect = async (k) => {
        const el = k.el;
        el.classList.remove('is-holo', 'is-on');
        // its place opens in the tray: the row stays centred, the cards already there slide over
        const there = cards.filter((o) => o !== k && o.slot.classList.contains('got') && o.slot.contains(o.el)).map((o) => [o.el, o.el.getBoundingClientRect()]);
        k.slot.classList.add('got');
        if (!c.reduced) {
          there.forEach(([e, r0]) => {
            const r1 = e.getBoundingClientRect();
            e.animate([{ transform: `translate(${r0.left - r1.left}px, 0)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)' });
          });
          const a = el.getBoundingClientRect(), b = k.slot.getBoundingClientRect();
          await c.until(el.animate([
            { transform: 'none', transformOrigin: '0 0' },
            { transform: `translate(${(b.left - a.left) * 0.5}px, ${(b.top - a.top) * 0.35}px) scale(${lerp(1, b.width / a.width, 0.5)})`, transformOrigin: '0 0', offset: 0.45 },
            { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})`, transformOrigin: '0 0' },
          ], { duration: 720, easing: 'cubic-bezier(.55, 0, .3, 1)', fill: 'forwards' }).finished.catch(() => {}));
          el.getAnimations().forEach((an) => an.cancel());
        }
        k.slot.appendChild(el);
        c.sound.snap();
        if (!c.reduced) c.burst(k.slot, { count: 10, spread: 70 });
      };

      // move every card at once (fn changes the layout), each gliding from where it was to its new place
      const relayout = async (fn, { stagger = 50 } = {}) => {
        const was = cards.map((k) => k.el.getBoundingClientRect());
        fn();
        if (c.reduced) return;
        await Promise.all(cards.map((k, i) => {
          const a = was[i], b = k.el.getBoundingClientRect();
          if (!b.width) return null;
          return k.el.animate([
            { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`, transformOrigin: '0 0' },
            { transform: 'none', transformOrigin: '0 0' },
          ], { duration: 650, delay: i * stagger, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }).finished.catch(() => {});
        }));
      };

      const explain = async (k) => {
        k.el.classList.add('is-on');
        const [first, ...more] = [].concat(k.R.rule);     // a rule can come in pieces: the rest join the line
        c.caption(first, true);
        if (more.length) c.say(more.map((t) => crew(t))).catch(() => {});
        await Promise.all([k.R.play(k.v, c), c.said()]);
        await c.wait(450);
      };

      // the drone flies in once and stops in the middle; it projects each card in turn, the card is
      // explained, then flies to its place at the side (the last stays in the middle). The drone leaves
      // when all five have been explained.
      stage.appendChild(cards[0].el);
      if (!c.reduced) await flyIn(hoverOver(stage));
      for (const k of cards) {
        stage.appendChild(k.el);
        if (!k.v) {                                       // the card's diagram, drawn once it has a size
          await c.wait(30);
          const f = c.mini(k.el.querySelector('.rcard__fig'), k.R.box, () => {}, { kMin: 0.5, kMax: 1.7, pad: 10 });
          k.v = c.view({ ...k.R.start }, k.R.draw, f);
        }
        beamOn(stage);
        c.sound.pop();
        const fig = k.el.querySelector('.rcard__fig');
        fig.classList.add('is-waiting');                 // the card comes first, empty
        await release(k.el);
        await drawIn(fig);                               // then its shape draws in
        await explain(k);
        beamOff();                                       // the light goes back into the emitter
        await c.wait(c.reduced ? 0 : 280);
        if (k.slot.dataset.pos) { await collect(k); await c.wait(c.reduced ? 0 : 200); }
      }
      if (!c.reduced) { flyOut(); await c.wait(1000); } else mouthOnDrone(false);

      // the drone gone: the cards grow into the big collection, the last one from the middle to its place
      const home = (k) => { k.el.classList.remove('is-holo', 'is-on'); k.slot.appendChild(k.el); k.slot.classList.add('got'); k.slot.classList.remove('away'); };
      const last = cards[cards.length - 1];
      await relayout(() => { home(last); root.classList.add('is-done'); });
      c.caption('You learned all about angles!');
      c.sound.right();
      await c.wait(700);
      c.ready();                                        // Launch mission arrives
      c.sound.pop();

      // tapping a card later: the drone flies back, projects onto it and explains it again
      let busy = false;
      cards.forEach((k) => {
        k.el.disabled = false;
        k.el.addEventListener('click', () => {
          if (busy) return;
          busy = true;
          c.sound.tap();
          c.spawn(async () => {
            try {
              // while the drone is here the cards stay small: the card goes to the middle and the other four
              // to the places at the sides; the drone comes back and projects it; when the drone has gone,
              // all grows back into the collection
              let p = 0;
              cards.forEach((o) => { if (o !== k) o.slot.dataset.pos = String(p++); });
              k.el.classList.add('is-on');
              await relayout(() => { stage.appendChild(k.el); k.slot.classList.add('away'); root.classList.remove('is-done'); }, { stagger: 30 });
              if (!c.reduced) await flyIn(hoverOver(stage));
              beamOn(stage);
              k.el.classList.add('is-holo');
              await explain(k);
              beamOff();
              k.el.classList.remove('is-holo', 'is-on');
              await c.wait(c.reduced ? 0 : 280);
              if (!c.reduced) { flyOut(); await c.wait(1000); } else mouthOnDrone(false);
              await relayout(() => { home(k); root.classList.add('is-done'); }, { stagger: 30 });
            } finally { busy = false; }
          });
        });
      });
    },
  },
];
