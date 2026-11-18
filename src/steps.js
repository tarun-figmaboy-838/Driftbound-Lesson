// The lesson, step by step, following the "Lines & Angles · Class 2" deck (its slide numbers are in
// the comments). Each step has a caption (the slide's statement or question), a figure on the
// holo-screen, the narration (read aloud), and one thing for the student to do.
// gate: true keeps Next locked until the step is done; lockHint is what the narration says if Next is
// pressed too early. quiet: true marks steps with no instructions or hints (no second line in the bar).
import { at, angleOf, lerp } from './figure.js';
import { h, esc, angles } from './ui.js';

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
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const upper = (a, lo = 15, hi = 165) => (a > 180 ? (a > 270 ? lo : hi) : clamp(a, lo, hi));   // keep a ray above line AB
const labelR = (sweep, r = 70) => r + Math.max(0, 34 - sweep) * 1.1;                           // thin angles: label further out
const S = (cls, v) => `<span class="${cls}">${v}</span>`;
const OP = (v) => `<span class="op">${v}</span>`;

// ---------------------------------------------------------------- figures

// the straight line AB through O, drawn out from the middle as s.l goes from 0 to 1
function lineAB(b, s, glow = false) {
  if (s.l) b.line('ab', [-150 * s.l, 0], [150 * s.l, 0], { color: C.aqua, start: true, end: true, cls: glow ? 'glow' : '' });
}
function pointsAOB(b, s, oDir = 270) {
  if (s.l > 0.72) {
    b.dot('pa', [-100, 0], { r: 5 });
    b.dot('pb', [100, 0], { r: 5 });
    b.label('na', [-100, 0], 'A', 270, 25);
    b.label('nb', [100, 0], 'B', 270, 25);
  }
  b.dot('po', O, { r: 7 });
  b.label('no', O, 'O', oDir, 26);
}

// ray OC standing on line AB (deck slides 14-23): ∠COB on the right (orange), ∠AOC on the left (aqua)
const LIN_BOX = [-158, -38, 158, 140];
function linearFig(b, s) {
  const t = s.t;
  if (s.w) {
    b.wedge('wr', O, 0, t * s.w, 40, { fill: FILL.orange, edge: C.orange, cls: s.blink ? 'blink' : '' });
    b.wedge('wl', O, 180 - (180 - t) * s.w, 180, 40, { fill: FILL.aqua, edge: C.aqua, cls: s.blink ? 'blink2' : '' });
  }
  lineAB(b, s, s.glow);
  if (s.c) b.ray('oc', O, t, 122 * s.c, { color: C.sun });
  pointsAOB(b, s);
  if (s.c > 0.95) b.label('nc', at(O, t, 122), 'C', t + (s.handle ? 0 : 0), s.handle ? 36 : 25);
  if (s.right != null) b.text('vr', at(O, t / 2, labelR(t)), s.right, { size: 26, color: TXT.orange });
  if (s.left != null) b.text('vl', at(O, (t + 180) / 2, labelR(180 - t)), s.left, { size: 26, color: TXT.aqua });
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
  if (s.q) b.line('pq', at(O, t + 180, 126 * s.q), at(O, t, 126 * s.q), { color: C.sun, start: true, end: true, cls: s.glow === 'pq' ? 'glow' : '' });
  pointsAOB(b, s, 292);
  W.forEach(([a, z], k) => {
    const f = s.fill?.[k];
    if (s.names?.[k]) b.text(`n${k}`, at(O, mid(a, z), 64), `∠${k + 1}`, { font: 'name', size: 21, color: TXT[f] || '#fff' });
    if (s.vals?.[k]) b.text(`v${k}`, at(O, mid(a, z), 103), s.vals[k], { size: 26, color: TXT[f] || '#fff', cls: s.vcls?.[k] || '' });
    if (s.taps) b.tap(`t${k}`, `∠${k + 1}`, { o: O, a: a + 3, b: z - 3, r: 96 }, `Angle ${k + 1}`);
  });
  if (s.handle) b.handle('hp', 'p', at(O, t, 126), { label: 'The end of the line. Drag it, or use the arrow keys, to rotate the line.', now: t, min: 20, max: 160, hint: s.hint });
}

// two separate angles side by side; s.j slides the second one onto the first (sharing an arm)
const PAIR_BOX = [-30, -32, 170, 62];
function pairMini(b, a1, a2, s = {}) {
  const j = s.j || 0, L = 54, v2 = [lerp(106, 0, j), 0], rot = a1 * j;
  b.wedge('w1', O, 0, a1, 24, { fill: FILL.orange, edge: C.orange });
  b.wedge('w2', v2, rot, rot + a2, 24, { fill: FILL.aqua, edge: C.aqua });
  b.ray('a1', O, 0, L, { color: C.aqua, w: 4.5 });
  b.ray('b1', O, a1, L, { color: C.sun, w: 4.5 });
  b.ray('a2', v2, rot, L, { color: C.aqua, w: 4.5 });
  b.ray('b2', v2, rot + a2, L, { color: C.sun, w: 4.5 });
  b.dot('o1', O, { r: 4.5 });
  if (j < 0.98) b.dot('o2', v2, { r: 4.5 });
  if (j < 0.4) {
    b.text('v1', [10, -19], `${a1}°`, { size: 20, color: TXT.orange });
    b.text('v2', [v2[0] + 10, -19], `${a2}°`, { size: 20, color: TXT.aqua });
  } else if (j > 0.92) {
    b.text('v1', at(O, a1 / 2, 40), `${a1}°`, { size: 17, color: TXT.orange });
    b.text('v2', at(O, a1 + a2 / 2, 40), `${a2}°`, { size: 17, color: TXT.aqua });
  }
  if (s.sq) b.square('sq', O, 0, 11);
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

// the delivery drone (Figma AI art); its small screen carries the voice's mouth during the recall
const DRONE = '<img class="drone__img" src="assets/ui/recall/drone.png" alt="" draggable="false"><span class="drone__screen"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><i class="drone__beam"></i>';

const RECALL = [
  {
    term: 'Angles definition', rule: 'Two rays starting from the same point form an angle.',
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
    term: 'Adjacent angles', rule: 'They have the same vertex. They also have one common arm. The two angles do not overlap.',
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

// ---------------------------------------------------------------- the proof panel (deck slides 38-41)

function proofPanel() {
  const el = h('<div><p class="side__tag">Proof via linear pairs</p><ol class="proof"></ol></div>');
  const ol = el.querySelector('ol');
  return {
    el,
    add(html, why, { final = false } = {}) {
      ol.querySelectorAll('li').forEach((li) => li.classList.remove('now'));
      const li = h(`<li class="now${final ? ' final' : ''}">${why ? '<small></small>' : ''}<span class="m"></span></li>`);
      if (why) li.querySelector('small').innerHTML = angles(esc(why));
      li.querySelector('.m').innerHTML = angles(html);
      ol.appendChild(li);
      li.animate?.([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
      li.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      return li;
    },
  };
}

// ---------------------------------------------------------------- shared question pieces

const PAIR_CARDS = (pairs) => Object.entries(pairs).map(([id, [a1, a2]]) => ({
  id, label: `${a1}° and ${a2}°`, box: PAIR_BOX, state: { j: 0, sq: false }, draw: (b, s) => pairMini(b, a1, a2, s),
}));

const TYPE_WHY = {
  52: { Right: 'A right angle is exactly 90°, a square corner. This one is smaller than that.', Obtuse: 'Obtuse angles are bigger than 90°. This one is smaller than a square corner.' },
  90: { Acute: 'Acute angles are smaller than 90°. This one makes a perfect square corner.', Obtuse: 'Obtuse angles are bigger than 90°. This one is exactly a square corner.' },
  128: { Acute: 'Acute angles are smaller than 90°. This one opens wider than a square corner.', Right: 'A right angle is exactly 90°. This one opens wider than that.' },
};



// ---------------------------------------------------------------- the steps
// Captions use the deck's own sentences. The narration only adds an instruction when the student has
// something to do, and explains a wrong answer.

export const STEPS = [
  // ============================================================ WARM-UP
  // deck slide 1: skills covered
  {
    id: 'intro', quiet: true, ch: 0, next: 'Start', title: 'Skills covered',
    async run(c) {
      c.caption('Lines & Angles · Class 2');
      c.stage(h(`<div class="title-card">
        <p class="sub enter" style="--i:0">Skills covered</p>
        <p class="lead enter" style="--i:1">Explain and identify adjacent angles, linear pairs and vertically opposite angles, then solve missing-angle problems.</p>
        <p class="skills enter" style="--i:2">Adjacent angles · Linear pair axiom and converse · Vertically opposite angles</p></div>`));
    },
  },

  // deck slides 2-3: an angle is formed by two rays from one point; the second ray turns away from the first
  {
    id: 'angle', ch: 0, title: 'How an angle is formed',
    async run(c) {
      c.fig.box(-92, -40, 160, 146);
      const L = 132;
      const v = c.view({ o: 0, a: 0, b: 0, t: 0, names: false, ring: false, drag: false, hint: true }, (b, s) => {
        if (s.t > 0.5) b.wedge('w', O, 0, s.t, 36, { fill: FILL.orange, edge: C.orange });
        if (s.a) b.ray('oa', O, 0, L * s.a, { color: C.aqua });
        if (s.b) b.ray('ob', O, s.t, L * s.b, { color: C.sun });
        if (s.o) b.dot('o', O, { r: 7 * Math.max(0, s.o) });
        if (s.ring) b.pulse('ring', O);
        if (s.names) {
          b.label('no', O, 'O', 245, 25);
          b.label('na', [L, 0], 'A', 300, 25);
          b.label('nb', at(O, s.t, L), 'B', s.t, s.drag ? 38 : 26);
        }
        if (s.drag) b.handle('hb', 'b', at(O, s.t, L), { label: 'Point B. Drag it, or use the arrow keys, to turn arm OB.', now: s.t, min: 10, max: 170, hint: s.hint });
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
      await c.wait(600);
      v.set({ drag: true });
      c.ready();
      const setT = (t) => { v.set({ t: Math.round(clamp(t, 10, 170)), hint: false }); };
      c.fig.onDrag = (id, p) => setT(upper(angleOf(p), 10, 170));
      c.fig.onNudge = (id, d) => setT(v.s.t + d);
      c.fig.dragAll = 'b';
      v.draw();
      await c.say(crew('Drag B.'));
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
        { d: 52, t: 'Acute', cap: 'Which type of angle is this?' },
        { d: 90, t: 'Right', cap: 'What type is it now?' },
        { d: 128, t: 'Obtuse', cap: 'And what type is this?' },
      ];
      for (const [k, R] of ROUNDS.entries()) {
        c.caption(R.cap);
        if (k) { v.set({ val: false, sq: false }); await v.to({ t: R.d }, 800, 'inOut'); }
        await c.choose({ options: ['Acute', 'Right', 'Obtuse'], answer: R.t, why: TYPE_WHY[R.d] });
        v.set({ sq: R.d === 90 });
        await c.wait(1200);
      }
    },
  },

  // deck slide 7: complementary (the deck asks without saying what it means, so recall it first)
  {
    id: 'comp', ch: 0, gate: true, title: 'Complementary angles', lockHint: 'Tap the card with the complementary pair.',
    async run(c) {
      c.caption('Which pair is complementary?');
      const res = await c.cards({
        items: PAIR_CARDS({ A: [30, 60], B: [45, 55], C: [35, 65] }),
        answer: 'A',
        why: { B: '45° + 55° = 100°. Complementary angles make exactly 90°.', C: '35° + 65° = 100°. That’s 10° too many.' },
      });
      c.ready();
      await c.wait(400);
      await res.view.to({ j: 1 }, 1100, 'inOut');          // the two angles slide together into a right angle
      res.view.set({ sq: true });
      c.sound.snap();
      await c.wait(900);
    },
  },

  // ============================================================ ADJACENT ANGLES
  // deck slides 8-12: same vertex, common arm, no overlap
  {
    id: 'adjacent', ch: 1, gate: true, title: 'Adjacent angles', lockHint: 'Do what the screen asks to go on.',
    async run(c) {
      c.fig.box(-70, -40, 166, 152);
      const L = 128, TC = 40, TB = 100;
      const v = c.view({ ra: 0, rc: 0, rb: 0, w: 0, names: false, taps: null, ring: false, glowC: false, blink: false, dimArms: false }, (b, s) => {
        if (s.w) {
          b.wedge('w1', O, 0, TC * s.w, 44, { fill: FILL.orange, edge: C.orange, cls: s.blink ? 'blink' : '' });
          b.wedge('w2', O, TC, TC + (TB - TC) * s.w, 44, { fill: FILL.aqua, edge: C.aqua, cls: s.blink ? 'blink2' : '' });
        }
        if (s.ra) b.ray('oa', O, 0, L * s.ra, { color: C.aqua, cls: s.dimArms ? 'dim' : '' });
        if (s.rb) b.ray('ob', O, TB, L * s.rb, { color: C.aqua, cls: s.dimArms ? 'dim' : '' });
        if (s.rc) b.ray('oc', O, TC, L * s.rc, { color: C.sun, cls: s.glowC ? 'glow' : '' });
        b.dot('o', O, { r: 7 });
        if (s.ring) b.pulse('ring', O);
        if (s.names) {
          b.label('no', O, 'O', 245, 25);
          b.label('na', [L, 0], 'A', 300, 25);
          b.label('nc', at(O, TC, L), 'C', TC, 26);
          b.label('nb', at(O, TB, L), 'B', TB, 26);
        }
        if (s.taps === 'points') {
          [['O', O], ['A', [L, 0]], ['C', at(O, TC, L)], ['B', at(O, TB, L)]].forEach(([n, p]) => b.tap(`tp${n}`, n, { c: p, r: 28 }, `Point ${n}`, { cue: true }));
        }
        if (s.taps === 'arms') {
          [['OA', 0], ['OC', TC], ['OB', TB]].forEach(([n, d]) => b.tap(`ta${n}`, n, { p: at(O, d, 34), q: at(O, d, L - 8), w: 34 }, `Arm ${n}`, { cue: true }));
        }
      });
      c.caption('What if these two angles share a point and an arm?');
      await c.wait(250);
      await v.to({ ra: 1 }, 380, 'out');
      await v.to({ rc: 1 }, 380, 'out');
      await v.to({ rb: 1 }, 380, 'out');
      v.set({ names: true });
      await v.to({ w: 1 }, 600, 'out');

      v.set({ taps: 'points' });
      c.talk(crew('Tap the point both angles share.'));
      await c.tapFig({
        answer: 'O',
        why: {
          A: 'Point A is on one angle only. Find the point where both angles start.',
          B: 'Point B is on one angle only. Find the point where both angles start.',
          C: 'C is on the shared arm, but both angles start at the corner. Tap the corner.',
        },
      });
      v.set({ taps: null, ring: true });
      c.caption('They have the same vertex.');
      await c.wait(1500);

      v.set({ ring: false, taps: 'arms' });
      c.talk(crew('Tap the arm both angles share.'));
      await c.tapFig({ answer: 'OC', why: { OA: 'OA is an arm of one angle only.', OB: 'OB is an arm of one angle only.' } });
      v.set({ taps: null, glowC: true, dimArms: true });
      c.caption('They also have one common arm.');
      await c.wait(1500);

      c.ready();
      v.set({ glowC: false, dimArms: false, blink: true });
      c.caption('The two angles do not overlap.');
      await c.wait(1600);
      v.set({ blink: false });
      c.caption('We call these adjacent angles.');
      c.stamp('Adjacent angles');
      await c.wait(900);
    },
  },

  // deck slide 13: which pair is adjacent?
  {
    id: 'adjacentQ', ch: 1, gate: true, title: 'Which pair is adjacent?', lockHint: 'Tap the adjacent pair to go on.',
    async run(c) {
      c.caption('Which pair is adjacent?');
      await c.cards({
        items: ['A', 'B', 'C'].map((id) => ({ id, label: ADJ[id].label, box: ADJ_BOX, draw: (b) => adjMini(b, ADJ[id]) })),
        answer: 'B',
        why: {
          A: 'They share a vertex and an arm, but the orange angle covers the blue one: they overlap.',
          C: 'Same vertex, but no common arm: there’s a gap between the two angles.',
        },
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

  // deck slides 17-18: measure with the protractor, add, then trace the half turn from B to A
  {
    id: 'linearSum', ch: 2, gate: true, title: 'Measure the linear pair', lockHint: 'Add the two angles and pick the total.',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ l: 1, c: 1, w: 1, t: 65, right: null, left: null, prot: null }, linearFig);
      c.caption('Let’s measure both angles.');
      await c.wait(300);
      v.set({ prot: { r: 60, a0: 0, from: 0, needle: 0 } });
      await c.tween(1000, (k) => { v.s.prot.needle = 65 * k; v.s.right = deg(65 * k); v.draw(); }, 'inOut');
      c.sound.pop();
      await c.wait(250);
      v.s.prot = { r: 60, a0: 0, from: 180, needle: 180 };
      await c.tween(1100, (k) => { v.s.prot.needle = 180 - 115 * k; v.s.left = deg(115 * k); v.draw(); }, 'inOut');
      c.sound.pop();
      await c.wait(300);
      v.set({ prot: null });
      c.caption('What do the two angles add up to?');
      c.readout(`${S('o', '65°')}${OP('+')}${S('a', '115°')}${OP('=')}${S('', '?')}`);
      await c.choose({
        options: [170, 180, 190], answer: 180, fmt: deg,
        why: {
          170: 'Not quite. 60 + 110 = 170, and 5 + 5 = 10 more.',
          190: 'A bit too much. 60 + 110 = 170, and 5 + 5 = 10 more.',
        },
      });
      c.readout(`${S('o', '65°')}${OP('+')}${S('a', '115°')}${OP('=')}${S('g', '180°')}`);
      c.talk(crew('Trace from B to A.'));
      await c.trace(v, { r: 100, from: 0, to: 180, auto: null });
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
      const v = c.view({ l: 1, c: 1, w: 1, t: 62, sweep: null }, linearFig);
      c.caption('A linear pair always adds to 180°.');
      c.readout(`${S('a', '∠AOC')}${OP('+')}${S('o', '∠COB')}${OP('=')}${S('g', '180°')}`);
      await c.wait(500);
      v.set({ sweep: { r: 100, from: 0, at: 0, label: '' } });
      await c.tween(1200, (k) => { v.s.sweep.at = 180 * k; v.s.sweep.label = deg(180 * k); v.draw(); }, 'inOut');
      await c.wait(900);
      c.caption('If a ray stands on a straight line, the two adjacent angles formed add up to 180°.');
      c.sound.stamp();
    },
  },

  // deck slide 23: find the missing angle
  {
    id: 'linearFind', ch: 2, gate: true, title: 'Find the missing angle', lockHint: 'Pick the missing angle to go on.',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ l: 1, c: 1, w: 1, t: 52, right: '52°', left: '?' }, linearFig);
      c.caption('Find the missing angle in this linear pair.');
      await c.choose({
        options: [118, 128, 138], answer: 128, fmt: deg,
        why: {
          118: '118° + 52° = 170°. A linear pair must make exactly 180°.',
          138: '138° + 52° = 190°. That’s more than a straight line.',
        },
      });
      v.set({ left: '128°' });
      await c.wait(900);
    },
  },

  // ============================================================ CONVERSE
  // deck slide 24: supplementary (recall what it means first)
  {
    id: 'supp', ch: 3, gate: true, title: 'Supplementary angles', lockHint: 'Tap the card with the supplementary pair.',
    async run(c) {
      c.caption('Which pair is supplementary?');
      await c.cards({
        items: PAIR_CARDS({ A: [110, 70], B: [85, 85], C: [100, 70] }),
        answer: 'A',
        why: { B: '85° + 85° = 170°. Supplementary angles make exactly 180°.', C: '100° + 70° = 170°. That’s 10° short.' },
      });

    },
  },

  // deck slides 25-27: supplementary angles made adjacent form a linear pair
  {
    id: 'join', ch: 3, gate: true, title: 'Make them adjacent', lockHint: 'Tap “Join them” to go on.',
    async run(c) {
      c.fig.box(...LIN_BOX);
      const v = c.view({ j: 0, line: false, names: false, conv: false }, (b, s) => {
        const j = s.j, len = lerp(84, 128, j);
        const pv = [lerp(-112, 0, j), 0], pr = 70 * j;    // the 110° angle slides right and turns 70°
        const qv = [lerp(44, 0, j), 0];                    // the 70° angle slides left
        b.wedge('wp', pv, pr, pr + 110, 40, { fill: FILL.aqua, edge: C.aqua });
        b.wedge('wq', qv, 0, 70, 40, { fill: FILL.orange, edge: C.orange });
        if (s.line) b.line('ab', [-150, 0], [150, 0], { color: C.aqua, start: true, end: true, cls: 'glow' });
        else {
          b.ray('p1', pv, pr + 110, len, { color: C.aqua });
          b.ray('q0', qv, 0, len, { color: C.aqua });
        }
        b.ray('p0', pv, pr, len, { color: C.sun });
        b.ray('q1', qv, 70, len, { color: C.sun });
        b.dot('pv', pv, { r: 6 });
        if (j < 0.98) b.dot('qv', qv, { r: 6 });
        b.text('vp', at(pv, pr + 55, 70), '110°', { size: 26, color: TXT.aqua });
        b.text('vq', at(qv, 35, labelR(70)), '70°', { size: 26, color: TXT.orange });
        if (s.names) {
          b.dot('pa', [-100, 0], { r: 5 }); b.dot('pb', [100, 0], { r: 5 });
          b.label('na', [-100, 0], 'A', 270, 25); b.label('nb', [100, 0], 'B', 270, 25);
          b.label('no', O, 'O', 270, 26); b.label('nc', at(O, 70, 128), 'C', 70, 25);
        }
      });
      c.caption('What if these two supplementary angles become adjacent?');
      await c.button('Join them');
      c.ready();
      c.sound.whoosh();
      await v.to({ j: 1 }, 1400, 'inOut');
      v.set({ line: true, names: true });
      c.sound.snap();
      c.burst(c.fig.center('[data-k="ab"]') || [innerWidth / 2, innerHeight / 2], { count: 18 });
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
          B: '65° + 115° = 180°, but they aren’t adjacent: no shared vertex, no shared arm.',
          C: 'They’re adjacent, but 65° + 95° = 160°, so the outer arms don’t make a straight line.',
        },
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
      c.fig.onTap = (id) => { if (!c.pick?.(id)) c.talk({ text: `That’s ${id} itself. Find the angle facing it across O.`, mood: 'hint' }); };
      c.caption('Which angle is opposite ∠1?');
      await c.choose({
        options: ['∠2', '∠3', '∠4'], answer: '∠3',
        why: {
          '∠2': '∠2 is next to ∠1: they share an arm. Opposite angles only share the vertex.',
          '∠4': '∠4 is next to ∠1: they share an arm. Look straight across the vertex.',
        },
      });
      v.set({ fill: ['orange', 'dim', 'orange', 'dim'] });
      await c.wait(900);
      c.caption('Which angle is opposite ∠2?');
      v.set({ fill: ['orange', 'aqua', 'orange', 'dim'] });
      await c.choose({
        options: ['∠1', '∠3', '∠4'], answer: '∠4',
        why: {
          '∠1': '∠1 is next to ∠2: they share an arm. Look straight across O.',
          '∠3': '∠3 is next to ∠2: they share an arm. Look straight across O.',
        },
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
    id: 'measure', ch: 4, gate: true, title: 'Measure the angles', lockHint: 'Turn the copy of ∠1 round O to go on.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['orange', 'aqua', 'orange', 'aqua'], names: [1, 1, 1, 1], vals: [null, null, null, null], prot: null }, crossFig);
      c.caption('Let’s measure the angles.');
      await c.wait(300);
      // protractor on line AB: above it for ∠1, below it for ∠3
      const MEAS = [[0, 0, 0, 55], [2, 180, 180, 235]];
      for (const [k, a0, from, to] of MEAS) {
        v.s.prot = { r: 60, a0, from, needle: from };
        await c.tween(800, (e) => { v.s.prot.needle = lerp(from, to, e); v.s.vals[k] = deg(Math.abs(to - from) * e); v.draw(); }, 'inOut');
        c.sound.pop();
        await c.wait(200);
      }
      v.set({ prot: null });
      c.caption('Vertically opposite angles are equal.');
      c.readout(`${S('o', '∠1 = ∠3')}${OP('•')}${S('a', '∠2 = ∠4')}`);
      await c.wait(800);
      c.talk(crew('Turn the copy of ∠1 half a turn round O.'));
      await c.spin(v, { a: 0, b: 55, r: 38, len: 118, hr: 70, auto: null });
    },
  },

  // deck slide 36: turn a line
  {
    id: 'rotate', ch: 4, gate: true, title: 'Turn the line', lockHint: 'Drag the line to go on.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['orange', 'aqua', 'orange', 'aqua'], names: [1, 1, 1, 1], handle: true, hint: true }, (b, s) => {
        s.vals = [deg(s.t), null, deg(s.t), null];
        crossFig(b, s);
      });
      let moved = 0, finish;
      const done = new Promise((r) => { finish = r; });
      const setT = (t) => {
        t = Math.round(clamp(t, 20, 160));
        moved += Math.abs(t - v.s.t);
        v.set({ t, hint: false });
        if (moved >= 50) finish();
      };
      c.fig.onDrag = (id, p) => setT(angleOf(p) % 180);
      c.fig.onNudge = (id, d) => setT(v.s.t + d);
      c.fig.dragAll = 'p';
      v.draw();
      c.caption('Does that still happen if we rotate a line?');
      c.talk(crew('Drag the line.'));
      await c.until(done);
      c.ready();
      c.sound.right();
    },
  },

  // deck slides 37-41: why it happens (proof with two linear pairs)
  {
    id: 'proof', quiet: true, ch: 4, gate: true, title: 'Why it works', lockHint: 'Tap “Next step” to finish the proof.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['dim', 'dim', 'dim', 'dim'], names: [1, 1, 1, 1], glow: null, sweep: null }, crossFig);
      const proof = proofPanel();
      c.side(proof.el);
      c.caption('Let’s see why it happens.');
      const PLAN = [
        { cap: '∠1 and ∠2 form a linear pair.', fill: ['orange', 'aqua', null, null], glow: 'ab', arc: [0, 180], m: '∠1 + ∠2 = 180°', why: 'Step 1 · Straight line' },
        { cap: '∠2 and ∠3 form another linear pair.', fill: [null, 'aqua', 'orange', null], glow: 'pq', arc: [55, 235], m: '∠2 + ∠3 = 180°', why: 'Two linear pairs' },
        { cap: 'Both totals include the same ∠2.', fill: ['orange', 'aqua', 'orange', null], glow: null, arc: null, m: '∠1 + ∠2 = ∠2 + ∠3', why: 'Equal to the same 180°' },
        { cap: 'So ∠1 and ∠3 must be equal.', fill: ['orange', null, 'orange', null], glow: null, arc: null, m: '∠1 + <s>∠2</s> = <s>∠2</s> + ∠3', why: 'Subtract ∠2 from both sides.' },
      ];
      for (const [k, P] of PLAN.entries()) {
        await c.button('Next step');
        c.caption(P.cap);
        v.set({ fill: P.fill, glow: P.glow, sweep: null });
        proof.add(P.m, P.why);
        if (P.arc) {                                       // the half turn each linear pair fills
          const [a, z] = P.arc;
          v.s.sweep = { r: 100, from: a, at: a, label: '' };
          await c.tween(1000, (e) => { v.s.sweep.at = lerp(a, z, e); v.s.sweep.label = deg(180 * e); v.draw(); }, 'inOut');
        }
      }
      c.ready();
      await c.wait(700);
      proof.add('∠1 = ∠3', '', { final: true });
      c.sound.right();
      c.burst(c.els.side, { count: 16 });
      await c.wait(800);
    },
  },

  // deck slide 42: find the other three angles
  {
    id: 'findThree', ch: 4, gate: true, title: 'Find all four', lockHint: 'Find the angle on the screen to go on.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 68, pq: true, fill: ['orange', 'dim', 'dim', 'dim'], names: [1, 1, 1, 1], vals: ['68°', '?', '?', '?'], vcls: [] }, crossFig);
      c.caption('Can you find the other three angles if ∠1 is 68°?');
      const QS = [
        { k: 2, name: '∠3', fill: 'orange', opts: [22, 68, 112], ans: 68, why: { 22: 'That’s 90° − 68°. ∠3 is opposite ∠1, so they’re equal.', 112: '112° would make a linear pair with ∠1. But ∠3 is opposite ∠1.' } },
        { k: 1, name: '∠2', fill: 'aqua', opts: [68, 112, 122], ans: 112, why: { 68: '∠2 is next to ∠1, not opposite. Together they make a linear pair: 180°.', 122: '68° + 122° = 190°. A linear pair makes exactly 180°.' } },
        { k: 3, name: '∠4', fill: 'aqua', opts: [68, 112, 132], ans: 112, why: { 68: '∠4 is opposite ∠2, not ∠1.', 132: '68° + 132° = 200°. ∠1 and ∠4 make a linear pair: 180°.' } },
      ];
      for (const Q of QS) {
        v.s.fill[Q.k] = 'sun';
        v.s.vcls = [];
        v.s.vcls[Q.k] = 'blink';
        v.draw();
        await c.choose({ options: Q.opts, answer: Q.ans, fmt: deg, why: Q.why });
        v.s.fill[Q.k] = Q.fill;
        v.s.vals[Q.k] = deg(Q.ans);
        v.s.vcls = [];
        v.draw();
        await c.wait(700);
      }
    },
  },

  // ============================================================ RECALL (the last step launches the game)
  // deck slide 43: recall. A hologram drone drops the five cards into the collection one by one; as each
  // card lands, its diagram shows the idea while the voice says the deck's sentence. After that, tapping
  // a card shows it again.
  {
    id: 'recall', quiet: true, ch: 5, title: 'Recall', next: 'Launch mission', launch: true,
    async run(c) {
      c.caption('Recall');
      const root = h(`<div class="recall"><div class="recall__slots"></div><div class="drone" aria-hidden="true">${DRONE}<i class="drone__beam"></i></div></div>`);
      const slots = root.querySelector('.recall__slots');
      const drone = root.querySelector('.drone');
      c.stage(root);
      // while the drone is here, it is the one talking: the mouth moves to its screen
      const bar = document.getElementById('narration');
      bar.classList.add('mouth-on-drone');
      c.later(() => bar.classList.remove('mouth-on-drone'));
      const cards = RECALL.map((R) => {
        const slot = h('<div class="rslot"><button type="button" class="rcard" disabled><b></b><span class="rcard__fig" aria-hidden="true"></span></button></div>');
        const el = slot.querySelector('.rcard');
        el.querySelector('b').textContent = R.term;
        el.setAttribute('aria-label', `${R.term}: ${R.rule}`);
        slots.appendChild(slot);
        return { R, slot, el };
      });
      await c.wait(60);                                   // let the grid lay out before drawing in it
      cards.forEach((k) => {
        const f = c.mini(k.el.querySelector('.rcard__fig'), k.R.box, () => {}, { kMin: 0.5, kMax: 1.7, pad: 10 });
        k.v = c.view({ ...k.R.start }, k.R.draw, f);
      });

      // the drone: flies over a slot, beams the card down into it
      const place = (x, y) => { drone.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; };
      const over = (slot) => {
        const rr = root.getBoundingClientRect(), sr = slot.getBoundingClientRect();
        const dw = drone.offsetWidth, dh = drone.offsetHeight;
        drone.style.setProperty('--bw', `${sr.width}px`);
        drone.style.setProperty('--bh', `${sr.height + dh * 0.1 + 4}px`);    // from the emitter to the bottom of the card
        return [sr.left - rr.left + sr.width / 2 - dw / 2, sr.top - rr.top - dh - 4];
      };
      drone.style.transition = 'none';
      place(-140, -10);
      void drone.offsetWidth;
      drone.style.transition = '';

      // the card starts small at the drone's emitter, grows as it falls down the beam and lands in its place
      const drop = (el) => {
        el.classList.add('in');
        if (c.reduced) return;
        const d = drone.getBoundingClientRect(), r = el.getBoundingClientRect();
        const dx = d.left + d.width / 2 - (r.left + r.width / 2);
        const dy = d.top + d.height * 0.95 - (r.top + r.height / 2);
        el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0, filter: 'brightness(2.2)' },
          { transform: `translate(${dx}px, ${dy + 8}px) scale(.16)`, opacity: 1, filter: 'brightness(2)', offset: 0.15 },
          { transform: 'translate(0, -6px) scale(1.02)', opacity: 1, filter: 'brightness(1.3)', offset: 0.8 },
          { transform: 'none', opacity: 1, filter: 'none' },
        ], { duration: 620, easing: 'cubic-bezier(.35, .6, .3, 1)' });
      };

      let busy = true;
      const explain = async (k) => {
        cards.forEach((o) => o.el.classList.toggle('is-on', o === k));
        c.caption(k.R.rule, true);
        await Promise.all([k.R.play(k.v, c), c.said()]);
        await c.wait(400);
        k.el.classList.remove('is-on');
      };
      // tapping a card later: the drone flies back over it, scans it and explains it again
      const revisit = async (k) => {
        place(...over(k.slot));
        c.sound.whoosh();
        await c.wait(700);
        drone.classList.add('beam');
        k.el.classList.remove('in'); void k.el.offsetWidth; k.el.classList.add('in');
        await c.wait(420);
        drone.classList.remove('beam');
        await explain(k);
      };

      for (const k of cards) {
        place(...over(k.slot));
        c.sound.whoosh();
        await c.wait(780);
        drone.classList.add('beam');
        await c.wait(300);
        drop(k.el);                                      // the card leaves the drone's emitter and drops into place
        c.sound.pop();
        await c.wait(560);
        c.burst(k.el, { count: 10, spread: 90 });
        drone.classList.remove('beam');
        await explain(k);
      }
      place(root.clientWidth - drone.offsetWidth - 6, 4);   // the drone parks in the corner, clear of the cards
      c.caption('Recall');
      busy = false;
      cards.forEach((k) => {
        k.el.disabled = false;
        k.el.addEventListener('click', () => {
          if (busy) return;
          busy = true;
          c.sound.tap();
          c.spawn(async () => { try { await revisit(k); } finally { busy = false; } });
        });
      });
      c.ready();
    },
  },
];
