// The lesson, step by step, following the "Lines & Angles · Class 2" deck (its slide numbers are in
// the comments). Each step has a caption (the slide's statement or question), a figure on the
// holo-screen, the narration (read aloud), and one thing for the student to do.
// gate: true keeps Next locked until the step is done; lockHint is what the narration says if Next is
// pressed too early. quiet: true marks steps with no instructions or hints (no second line in the bar).
import { at, angleOf, lerp } from './figure.js';
import { h } from './ui.js';

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
  if (s.names) {
    b.text('mr', at(O, t / 2, labelR(t, 74)), '∠COB', { font: 'name', size: 19, color: TXT.orange });
    b.text('ml', at(O, (t + 180) / 2, labelR(180 - t, 74)), '∠AOC', { font: 'name', size: 19, color: TXT.aqua });
  }
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
  if (s.pq && s.q > 0.95) {
    b.label('np', at(O, t, 126), 'P', t - 50, s.handle ? 38 : 28);
    b.label('nq', at(O, t + 180, 126), 'Q', t + 130, 28);
  }
  W.forEach(([a, z], k) => {
    const f = s.fill?.[k];
    if (s.names?.[k]) b.text(`n${k}`, at(O, mid(a, z), 64), `∠${k + 1}`, { font: 'name', size: 21, color: TXT[f] || '#fff' });
    if (s.vals?.[k]) b.text(`v${k}`, at(O, mid(a, z), 103), s.vals[k], { size: 26, color: TXT[f] || '#fff', cls: s.vcls?.[k] || '' });
    if (s.taps) b.tap(`t${k}`, `∠${k + 1}`, { o: O, a: a + 3, b: z - 3, r: 96 }, `Angle ${k + 1}`);
  });
  if (s.handle) b.handle('hp', 'p', at(O, t, 126), { label: 'Point P. Drag it, or use the arrow keys, to turn line PQ.', now: t, min: 20, max: 160, hint: s.hint });
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
const CROSSM_BOX = [-66, -50, 66, 50];
function crossMini(b) {
  [[0, 55, 'orange'], [55, 180, 'aqua'], [180, 235, 'orange'], [235, 360, 'aqua']].forEach(([a, z, f], k) => b.wedge(`w${k}`, O, a, z, 22, { fill: FILL[f], edge: EDGE[f] }));
  b.full('ab', O, 0, 62, { color: C.aqua, w: 4.5 });
  b.full('pq', O, 55, 58, { color: C.sun, w: 4.5 });
  b.dot('o', O, { r: 4.5 });
}
const ANGM_BOX = [-14, -14, 70, 60];
function angleMini(b) {
  b.wedge('w', O, 0, 50, 24, { fill: FILL.orange, edge: C.orange });
  b.ray('oa', O, 0, 62, { color: C.aqua, w: 4.5 });
  b.ray('ob', O, 50, 62, { color: C.sun, w: 4.5 });
  b.dot('o', O, { r: 5 });
}

// ---------------------------------------------------------------- the proof panel (deck slides 38-41)

function proofPanel() {
  const el = h('<div><p class="side__tag">Proof via linear pairs</p><ol class="proof"></ol></div>');
  const ol = el.querySelector('ol');
  return {
    el,
    add(html, why, { final = false } = {}) {
      ol.querySelectorAll('li').forEach((li) => li.classList.remove('now'));
      const li = h(`<li class="now${final ? ' final' : ''}"><small></small><span class="m"></span></li>`);
      li.querySelector('small').textContent = why;
      li.querySelector('.m').innerHTML = html;
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
          b.text('m1', at(O, TC / 2, 80), '∠AOC', { font: 'name', size: 18, color: TXT.orange });
          b.text('m2', at(O, mid(TC, TB), 82), '∠COB', { font: 'name', size: 18, color: TXT.aqua });
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
          A: 'Point A is only on ∠AOC. Find the point where both angles start.',
          B: 'Point B is only on ∠COB. Find the point where both angles start.',
          C: 'C is on the shared arm, but both angles start at the corner. Tap the corner.',
        },
      });
      v.set({ taps: null, ring: true });
      c.caption('They have the same vertex.');
      await c.wait(1500);

      v.set({ ring: false, taps: 'arms' });
      c.talk(crew('Tap the arm both angles share.'));
      await c.tapFig({ answer: 'OC', why: { OA: 'OA is an arm of ∠AOC only.', OB: 'OB is an arm of ∠COB only.' } });
      v.set({ taps: null, glowC: true, dimArms: true });
      c.caption('They also have one common arm.');
      await c.wait(1500);

      v.set({ glowC: false, dimArms: false });
      c.caption('Do the two angles overlap?');
      await c.choose({ options: ['Yes', 'No'], answer: 'No', why: { Yes: 'Look again: the orange and blue parts sit side by side. Neither covers the other.' } });
      c.ready();
      v.set({ blink: true });
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
      const v = c.view({ l: 0, c: 0, w: 0, t: 58, names: false, glow: false }, linearFig);
      c.caption('What happens if a ray starts from a point on a straight line?');
      await c.wait(250);
      await v.to({ l: 1 }, 700, 'out');                    // line AB draws out from O
      await c.wait(150);
      await v.to({ c: 1 }, 650, 'out');                    // ray OC grows from O
      await c.wait(600);
      c.caption('We get a pair of adjacent angles.');
      await v.to({ w: 1 }, 700, 'out');
      v.set({ names: true });
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
      await c.trace(v, { r: 96, from: 0, to: 180, auto: null });
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
      const v = c.view({ l: 1, c: 1, w: 1, t: 62, names: true, sweep: null }, linearFig);
      c.caption('A linear pair always adds up to 180°.');
      c.readout(`${S('a', '∠AOC')}${OP('+')}${S('o', '∠COB')}${OP('=')}${S('g', '180°')}`);
      await c.wait(500);
      v.set({ sweep: { r: 96, from: 0, at: 0, label: '' } });
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
        v.s.names[k] = 1;
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
      // protractor on line AB: above it for ∠1 and ∠2, below it for ∠3 and ∠4
      const MEAS = [[0, 0, 0, 55], [2, 180, 180, 235], [1, 0, 180, 55], [3, 180, 360, 235]];
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
    id: 'rotate', ch: 4, gate: true, title: 'Turn the line', lockHint: 'Drag point P to go on.',
    async run(c) {
      c.fig.box(...CROSS_BOX);
      const v = c.view({ l: 1, q: 1, t: 55, pq: true, fill: ['orange', 'aqua', 'orange', 'aqua'], names: [1, 1, 1, 1], handle: true, hint: true }, (b, s) => {
        s.vals = [deg(s.t), deg(180 - s.t), deg(s.t), deg(180 - s.t)];
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
      c.talk(crew('Drag point P.'));
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
        { cap: '∠1 and ∠2 form a linear pair.', fill: ['orange', 'aqua', 'dim', 'dim'], glow: 'ab', arc: [0, 180], m: '∠1 + ∠2 = 180°', why: 'Linear pair on line AB' },
        { cap: '∠2 and ∠3 form another linear pair.', fill: ['dim', 'aqua', 'orange', 'dim'], glow: 'pq', arc: [55, 235], m: '∠2 + ∠3 = 180°', why: 'Linear pair on line PQ' },
        { cap: 'Both totals include the same ∠2.', fill: ['orange', 'aqua', 'orange', 'dim'], glow: null, arc: null, m: '∠1 + ∠2 = ∠2 + ∠3', why: 'Both equal 180°' },
        { cap: 'So ∠1 and ∠3 must be equal.', fill: ['orange', 'dim', 'orange', 'dim'], glow: null, arc: null, m: '∠1 + <s>∠2</s> = <s>∠2</s> + ∠3', why: 'Subtract ∠2 from both sides' },
      ];
      for (const [k, P] of PLAN.entries()) {
        await c.button(k === 0 ? 'Next step' : `Next step (${k + 1}/4)`);
        c.caption(P.cap);
        v.set({ fill: P.fill, glow: P.glow, sweep: null });
        proof.add(P.m, P.why);
        if (P.arc) {                                       // the half turn each linear pair fills
          const [a, z] = P.arc;
          v.s.sweep = { r: 86, from: a, at: a, label: '' };
          await c.tween(1000, (e) => { v.s.sweep.at = lerp(a, z, e); v.s.sweep.label = deg(180 * e); v.draw(); }, 'inOut');
        }
      }
      c.ready();
      await c.wait(700);
      proof.add('∠1 = ∠3', 'Proved', { final: true });
      c.sound.right();
      c.burst(c.els.side, { count: 16 });
      await c.wait(1400);
      v.set({ fill: ['dim', 'aqua', 'dim', 'aqua'] });
      proof.add('∠2 = ∠4', 'The same way', { final: true });
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
  // deck slide 43: recall
  {
    id: 'recall', quiet: true, ch: 5, title: 'Recall', next: 'Launch mission', launch: true,
    async run(c) {
      c.caption('Recall');
      const CARDS = [
        ['Angle', 'Two rays starting from the same point form an angle.', ANGM_BOX, angleMini],
        ['Adjacent angles', 'Same vertex, one common arm, no overlap.', ADJ_BOX, (b) => adjMini(b, ADJ.B)],
        ['Linear pair', 'A linear pair always adds to 180°.', LINM_BOX, (b) => lineMini(b, {})],
        ['Linear pair converse', 'Adjacent angles that add to 180° form a linear pair.', LINM_BOX, (b) => lineMini(b, { t: 70, right: '70°', left: '110°' })],
        ['Vertically opposite angles', 'Vertically opposite angles are equal.', CROSSM_BOX, crossMini],
      ];
      const grid = h('<div class="recall"></div>');
      CARDS.forEach(([term, rule, box, draw], k) => {
        const card = h(`<div class="rcard enter" style="--i:${k}"><span class="mini" aria-hidden="true"></span><div><b></b><p></p></div></div>`);
        card.querySelector('b').textContent = term;
        card.querySelector('p').textContent = rule;
        grid.appendChild(card);
        c.mini(card.querySelector('.mini'), box, draw, { kMin: 0.42, pad: 6 });
      });
      c.stage(grid);
    },
  },
];
