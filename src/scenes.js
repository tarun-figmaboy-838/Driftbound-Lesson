// The lesson, scene by scene. Each scene sets up the radar and its controls, plays the co-pilot's
// lines, reacts to the student, and calls ctx.ready() once its point has landed (Next starts to
// pulse; Next always works, so nobody is ever stuck).
//
// Radar convention: degrees, 0 = right, anticlockwise. As in the game, the unknown angle x is the
// turn from the cannon beam to the enemy line (white arc); the given angle is orange.

const crew = (text, mood = '', hold) => ({ who: 'crew', text, mood, hold });
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clampHalf = (deg, lo = 8, hi = 172) => (deg > 180 ? (deg > 270 ? lo : hi) : Math.min(hi, Math.max(lo, deg)));
const X = '<span class="x">x</span>';

// the two rules, drawn the way the game draws them
export function linear(beam, x, { xLabel = `${x}°`, raider = false } = {}) {
  return {
    beam, beamExt: true, enemy: beam + x, raider,
    arcs: [
      { a: beam, b: beam + x, color: 'white', label: xLabel, part: 'x' },
      { a: beam + x, b: beam + 180, color: 'orange', label: `${180 - x}°`, part: 'given' },
    ],
  };
}
export function opposite(beam, x, { xLabel = `${x}°`, raider = false } = {}) {
  return {
    beam, beamExt: true, enemy: beam + x, enemyExt: true, raider,
    arcs: [
      { a: beam, b: beam + x, color: 'white', label: xLabel, part: 'x' },
      { a: beam + 180, b: beam + 180 + x, color: 'orange', label: `${x}°`, part: 'given' },
    ],
  };
}

// a row of the game's answer capsules
function capsules(ctx, values, onPick, { word = false, fmt = (v) => `${v}°` } = {}) {
  ctx.controls.replaceChildren();
  const buttons = values.map((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `opt${word ? ' word' : ''}`;
    b.style.animationDelay = `${0.05 + i * 0.06}s`;
    b.innerHTML = `<span>${fmt(v)}</span>`;
    b.addEventListener('click', () => { if (!b.disabled) onPick(v, b, buttons); });
    ctx.controls.appendChild(b);
    return b;
  });
  return buttons;
}

function chip(label, color, onTap) {
  const c = document.createElement('button');
  c.type = 'button';
  c.className = 'chip';
  c.style.setProperty('--chip', color);
  c.innerHTML = `<i></i>${label}`;
  if (onTap) c.addEventListener('click', () => onTap(c)); else c.classList.add('static');
  return c;
}

const FIND = '<b class="find">Find <i class="xv">x</i></b>';
const prompt = (type, given) => (type === 'linear'
  ? `${FIND}It makes a straight line with <span class="deg">${given}°</span>`
  : `${FIND}It is opposite the <span class="deg">${given}°</span> angle`);

export const SCENES = [
  // 1 ------------------------------------------------------------ the strategy meeting
  {
    title: 'Strategy meeting', next: 'Start',
    enter(ctx) {
      ctx.radar.draw({ aria: 'The holo-table radar' });
      ctx.warden(true);
      ctx.sound.whoosh();
      ctx.say([
        crew('Welcome to the strategy meeting, pilot.'),
        { who: 'warden', text: 'Nobody gets past the Warden!', mood: 'taunt', hold: 1.6 },
        crew('Our cannon turns by angles. Find x to aim.'),
      ], () => ctx.ready());
    },
    leave(ctx) { ctx.warden(false); },
  },

  // 2 ------------------------------------------------------------ what an angle is
  {
    title: 'What is an angle?',
    enter(ctx) {
      let b = 50, moved = 0;
      const draw = () => ctx.radar.draw({
        rest: 0, beam: b, aria: `The cannon has turned ${b} degrees`,
        arcs: [{ a: 0, b, color: 'white', label: `${b}°` }],
      });
      const set = (deg) => {
        const nb = Math.round(deg) % 360;
        moved += Math.abs(nb - b);
        b = nb;
        draw();
        if (moved > 90 && !this.cheered) { this.cheered = true; ctx.say(crew('Bigger turn, bigger angle!', 'cheer'), () => ctx.ready()); }
      };
      this.cheered = false;
      draw();
      ctx.radar.interactive(true, 'Cannon beam. Drag it, or use the arrow keys, to turn it.');
      ctx.radar.onDrag = set;
      ctx.radar.onNudge = (d) => set((b + d + 360) % 360);
      ctx.say([crew('An angle is how far a line turns.'), crew('Drag the cannon beam around the radar.')]);
    },
  },

  // 3 ------------------------------------------------------------ degrees and the three landmarks
  {
    title: 'Degrees',
    enter(ctx) {
      let b = 30;
      const done = new Set();
      const LINES = {
        90: crew('A quarter turn is 90°: a right angle. See the little square?'),
        180: crew('A half turn is 180°. It makes a straight line.'),
        360: crew('A full turn is 360°. All the way round.', 'cheer'),
      };
      const draw = () => {
        const s = { rest: 0, beam: b % 360 === 0 && b > 0 ? 0 : b, arcs: [], aria: `The cannon has turned ${Math.round(b)} degrees` };
        if (b >= 359.5) s.full = 26;
        else s.arcs.push({ a: 0, b, color: 'white', label: `${Math.round(b)}°` });
        if (Math.abs(b - 90) < 0.5) s.square = { a: 0 };
        if (b >= 359.5) s.texts = [{ x: 0, y: -42, text: '360°', color: 'white' }];
        ctx.radar.draw(s);
      };
      draw();
      capsules(ctx, [90, 180, 360], (v, btn) => {
        ctx.sound.tap();
        ctx.tween(b, v, 0.7, (k) => { b = k; draw(); }, () => {
          b = v; draw();
          done.add(v);
          ctx.say(LINES[v], () => { if (done.size === 3) ctx.ready(); });
        });
        btn.blur();
      });
      ctx.say([crew('We measure turns in degrees.'), crew('Tap a landmark to turn the cannon.')]);
    },
  },

  // 4 ------------------------------------------------------------ angle types, quick sort
  {
    title: 'Angle types',
    enter(ctx) {
      const DEF = {
        Acute: 'Acute is less than 90°.', Right: 'Right is exactly 90°.', Obtuse: 'Obtuse is between 90° and 180°.',
        Straight: 'Straight is exactly 180°.', Reflex: 'Reflex is more than 180°.',
      };
      const rounds = shuffle([{ d: 35, t: 'Acute' }, { d: 90, t: 'Right' }, { d: 128, t: 'Obtuse' }, { d: 180, t: 'Straight' }, { d: 245, t: 'Reflex' }]);
      let i = 0;
      const show = () => {
        const { d } = rounds[i];
        const s = { rest: 0, beam: d, arcs: [{ a: 0, b: d, color: 'white', label: `${d}°` }], aria: `An angle of ${d} degrees` };
        if (d === 90) s.square = { a: 0 };
        ctx.radar.draw(s);
        capsules(ctx, Object.keys(DEF), (name, btn, all) => {
          if (name === rounds[i].t) {
            btn.classList.add('correct');
            all.forEach((o) => { o.disabled = true; });
            ctx.sound.right();
            const last = i === rounds.length - 1;
            ctx.say(crew(`${name}! ${DEF[name]}`, 'cheer', 0.9), () => {
              if (last) ctx.say(crew('All five sorted. Nice!', 'cheer'), () => ctx.ready());
              else { i++; show(); }
            });
          } else {
            btn.classList.add('wrong');
            btn.disabled = true;
            ctx.sound.wrong();
            ctx.say(crew(`Not quite. ${DEF[name]}`));
          }
        }, { word: true, fmt: (v) => v });
      };
      ctx.say([crew('Every angle has a name.'), crew('Tap the right name for each one.')]);
      show();
    },
  },

  // 5 ------------------------------------------------------------ rule 1: a straight line
  {
    title: 'Rule 1: straight line',
    enter(ctx) {
      let x = 104, example = false;
      const draw = () => {
        ctx.radar.draw({ ...linear(0, x, { xLabel: example ? 'x' : `${x}°` }), aria: `Straight line split into ${180 - x} and ${x} degrees` });
        ctx.readout(example
          ? `<span class="o">76°</span><span class="op">+</span>${X}<span class="op">=</span><span class="c">180°</span>`
          : `<span class="o">${180 - x}°</span><span class="op">+</span><span>${x}°</span><span class="op">=</span><span class="c">180°</span>`);
      };
      const set = (deg) => { example = false; x = Math.round(clampHalf(deg)); draw(); };
      draw();
      ctx.radar.interactive(true, 'Red enemy line. Drag it, or use the arrow keys.');
      ctx.radar.onDrag = set;
      ctx.radar.onNudge = (d) => set(x + d);
      capsules(ctx, ['Show me'], (v, btn) => {
        ctx.sound.tap();
        btn.blur();
        ctx.tween(x, 104, 0.6, (k) => { x = Math.round(k); draw(); }, () => {
          x = 104; example = true; draw();
          ctx.say([crew('76° + x = 180°'), crew('So x = 180° − 76° = 104°.', 'cheer')], () => {
            ctx.readout(`${X}<span class="op">=</span><span class="c">180°</span><span class="op">−</span><span class="o">76°</span><span class="op">=</span><span class="g">104°</span>`);
            ctx.ready();
          });
        });
      }, { word: true, fmt: (v) => v });
      ctx.say([crew('Rule 1: angles on a straight line add up to 180°.'), crew('Drag the red line. They always make 180°.')]);
    },
  },

  // 6 ------------------------------------------------------------ rule 2: vertically opposite
  {
    title: 'Rule 2: opposite angles',
    enter(ctx) {
      let x = 68, example = false;
      const draw = () => {
        ctx.radar.draw({ ...opposite(0, x, { xLabel: example ? 'x' : `${x}°` }), aria: `Two crossing lines; opposite angles are both ${x} degrees` });
        ctx.readout(example
          ? `${X}<span class="op">=</span><span class="o">68°</span>`
          : `<span>${x}°</span><span class="op">=</span><span class="o">${x}°</span>`);
      };
      const set = (deg) => { example = false; x = Math.round(clampHalf(deg)); draw(); };
      draw();
      ctx.radar.interactive(true, 'Red enemy line. Drag it, or use the arrow keys.');
      ctx.radar.onDrag = set;
      ctx.radar.onNudge = (d) => set(x + d);
      capsules(ctx, ['Show me'], (v, btn) => {
        ctx.sound.tap();
        btn.blur();
        ctx.tween(x, 68, 0.6, (k) => { x = Math.round(k); draw(); }, () => {
          x = 68; example = true; draw();
          ctx.say([crew('The 68° angle is opposite x.'), crew('So x = 68°.', 'cheer'), crew('Angles next to each other still make 180°.')], () => ctx.ready());
        });
      }, { word: true, fmt: (v) => v });
      ctx.say([crew('Rule 2: vertically opposite angles are equal.'), crew('Drag the red line. Opposite angles stay the same.')]);
    },
  },

  // 7 ------------------------------------------------------------ traps in the answers
  {
    title: 'Watch out for traps',
    enter(ctx) {
      const ROUNDS = [
        { given: 58, opts: [122, 58, 32, 180], why: {
          58: "That's the given angle. x is the other one.",
          32: "That's 90° − 58°. A straight line is 180°, not 90°.",
          180: '180° is the whole line. x is only part of it.' } },
        { given: 88, opts: [92, 88, 2, 180], why: {
          88: "So close! That's the given angle. 88° + 88° = 176°, not 180°.",
          2: "That's 90° − 88°. Use 180°.",
          180: '180° is the whole line. x is only part of it.' } },
      ];
      let r = 0;
      const show = () => {
        const R = ROUNDS[r], x = 180 - R.given;
        ctx.qbar(prompt('linear', R.given));
        ctx.radar.draw({ ...linear(0, x, { xLabel: 'x' }), aria: `Find x. It makes a straight line with ${R.given} degrees` });
        capsules(ctx, shuffle(R.opts), (v, btn, all) => {
          if (v === x) {
            btn.classList.add('correct');
            all.forEach((o) => { o.disabled = true; });
            ctx.qbar.flash('ok');
            ctx.sound.right();
            ctx.say(crew(`Yes! ${R.given}° + ${x}° = 180°.`, 'cheer', 0.9), () => {
              if (++r < ROUNDS.length) { ctx.say(crew('Another one. This one is sneaky.')); show(); return; }
              ctx.qbar(null);
              ctx.controls.replaceChildren(chip('<b>1</b> Estimate', '#ffe066'), chip('<b>2</b> Check', '#5dff8a'));
              ctx.say([crew('Estimate first: is x more or less than 90°?'), crew('Then check: do they add up to 180°?', 'cheer')], () => ctx.ready());
            });
          } else {
            btn.classList.add('wrong');
            btn.disabled = true;
            ctx.qbar.flash('bad');
            ctx.sound.wrong();
            ctx.say(crew(R.why[v]));
          }
        });
      };
      ctx.say([crew('The game hides traps in the answers.'), crew('Try one. Wrong answers show the trap.')]);
      show();
    },
    leave(ctx) { ctx.qbar(null); },
  },

  // 8 ------------------------------------------------------------ reading the battle radar
  {
    title: 'Read the radar',
    enter(ctx) {
      const PARTS = [
        { key: 'beam', label: 'Cannon', color: '#38d6ff', line: 'The bright line is your cannon.' },
        { key: 'enemy', label: 'Enemy', color: '#ff5a4a', line: 'The red line points at the enemy.' },
        { key: 'given', label: 'Given', color: '#ffa62b', line: 'The orange angle is given.' },
        { key: 'x', label: 'x', color: '#ffffff', line: 'The white angle is x. Find it!' },
      ];
      const tapped = new Set();
      let hl = null;
      const draw = () => {
        ctx.radar.draw({ ...linear(270, 118, { xLabel: 'x', raider: true }), highlight: hl, aria: 'The battle radar from the game' });
      };
      ctx.qbar(prompt('linear', 62));
      draw();
      ctx.controls.replaceChildren(...PARTS.map((p) => chip(p.key === 'x' ? '<span style="font:italic 700 18px Cambria,serif">x</span>' : p.label, p.color, (c) => {
        ctx.controls.querySelectorAll('.chip').forEach((o) => o.classList.toggle('on', o === c));
        hl = p.key;
        draw();
        ctx.sound.tap();
        tapped.add(p.key);
        const lines = [crew(p.line)];
        if (tapped.size === PARTS.length && !this.told) {
          this.told = true;
          lines.push(crew('Wrong answer? The enemy fires back.'), crew('Too slow? The raider blasts your ship. Estimate first, then tap!'));
          ctx.say(lines, () => ctx.ready());
        } else ctx.say(lines);
      })));
      this.told = false;
      ctx.say([crew('This is the battle radar from the game.'), crew('Tap each part to learn it.')]);
    },
    leave(ctx) { ctx.qbar(null); },
  },

  // 9 ------------------------------------------------------------ practice round
  {
    title: 'Practice',
    enter(ctx) {
      const QS = shuffle([
        { type: 'linear', given: 64, x: 116, opts: [116, 64, 26, 180] },
        { type: 'opposite', given: 72, x: 72, opts: [72, 108, 18, 144] },
        { type: 'linear', given: 131, x: 49, opts: [49, 131, 41, 229] },
        { type: 'opposite', given: 118, x: 118, opts: [118, 62, 28, 236] },
      ]);
      const BEAMS = shuffle([90, 200, 300, 20]);
      let q = 0, first = 0, tries = 0;
      const raider = (key) => ({ who: 'raider', mood: key === 'hit' ? 'panic' : 'laugh',
        text: key === 'hit' ? pick(['Ow! Lucky shot!', 'Hey! That one stung!', 'Not my paint job!']) : pick(['Ha! Missed!', 'Wrong way, cadet!', 'Is that your best angle?']), hold: 1.1 });
      const show = () => {
        const Q = QS[q];
        tries = 0;
        ctx.qbar(prompt(Q.type, Q.given));
        const setup = Q.type === 'linear' ? linear(BEAMS[q], Q.x, { xLabel: 'x', raider: true }) : opposite(BEAMS[q], Q.x, { xLabel: 'x', raider: true });
        ctx.radar.draw({ ...setup, aria: `Practice ${q + 1} of 4` });
        ctx.readout(`<span class="op">${q + 1} / 4</span>`);
        capsules(ctx, shuffle(Q.opts), (v, btn, all) => {
          if (v === Q.x) {
            if (tries === 0) first++;
            btn.classList.add('correct');
            all.forEach((o) => { o.disabled = true; });
            ctx.qbar.flash('ok');
            ctx.sound.right();
            const working = Q.type === 'linear' ? `${Q.given}° + ${Q.x}° = 180°` : `Opposite angles are equal: ${Q.x}°`;
            ctx.say([raider('hit'), crew(working, 'cheer', 0.8)], () => {
              if (++q < QS.length) { show(); return; }
              ctx.data.practice = first;
              ctx.radar.draw({ aria: 'The holo-table radar' });
              ctx.qbar(null);
              ctx.readout('');
              ctx.controls.replaceChildren();
              ctx.say(crew(`Practice done: ${first} of 4 on the first try!`, 'cheer'), () => ctx.ready());
            });
          } else {
            tries++;
            btn.classList.add('wrong');
            btn.disabled = true;
            ctx.qbar.flash('bad');
            ctx.sound.wrong();
            const hint = Q.type === 'linear'
              ? (tries >= 2 ? `x = 180° − ${Q.given}°` : 'Angles on a straight line add up to 180°.')
              : (tries >= 2 ? `So x = ${Q.given}°` : 'Opposite angles are equal.');
            ctx.say([raider('miss'), crew(hint)]);
          }
        });
      };
      ctx.say([{ who: 'raider', text: "Practice? You'll never hit me!", mood: 'taunt', hold: 1.3 }, crew('Four targets. Estimate, then check.')]);
      show();
    },
    leave(ctx) { ctx.qbar(null); },
  },

  // 10 ----------------------------------------------------------- ready check and launch
  {
    title: 'Ready check', next: null,
    enter(ctx) {
      ctx.holo(false);
      const first = ctx.data.practice;
      const stars = first === undefined ? 0 : first === 4 ? 3 : first / 4 >= 0.6 ? 2 : 1;
      const starsEl = document.createElement('div');
      starsEl.className = 'stars';
      starsEl.innerHTML = '<i></i><i></i><i></i>';
      const cards = document.createElement('div');
      cards.className = 'controls';
      cards.innerHTML = `<div class="rule-card"><b>RULE 1</b><span>a + <span class="x">x</span> = 180°</span></div>`
        + `<div class="rule-card"><b>RULE 2</b><span><span class="x">x</span> = opposite angle</span></div>`;
      const launch = document.createElement('button');
      launch.type = 'button';
      launch.className = 'opt launch';
      launch.innerHTML = '<span>Launch mission</span>';
      launch.addEventListener('click', () => { ctx.sound.whoosh(); location.href = ctx.GAME_URL; });
      const extra = chip('Extra training', '#c58bff', () => ctx.go(10));
      const col = document.createElement('div');
      col.className = 'controls';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'center';
      col.style.gap = '18px';
      col.append(starsEl, cards, launch, extra);
      ctx.controls.replaceChildren(col);
      starsEl.querySelectorAll('i').forEach((el, i) => {
        if (i < stars) ctx.later(() => { el.className = 'on'; ctx.sound.star(i); }, 350 + i * 320);
      });
      const cheer = stars === 3 ? 'Perfect practice! You are ready, pilot.' : stars === 2 ? 'Great work! You are ready, pilot.'
        : stars === 1 ? 'Good start! I have your back out there.' : 'Ready when you are, pilot.';
      ctx.say([crew(cheer, 'cheer'), crew('Remember: estimate, then check.')], () => ctx.ready());
    },
  },

  // 11 ----------------------------------------------------------- extra training (optional)
  {
    title: 'Extra training', next: null, extra: true,
    enter(ctx) {
      let mode = '90', e = 34;
      const RAD = Math.PI / 180;
      const ang = (vx, vy) => ((Math.atan2(-vy, vx) / RAD) + 360) % 360;      // screen vector -> degrees
      const corner = (c, u, v) => {                                          // interior angle at c between rays to u and v
        let a = ang(u[0] - c[0], u[1] - c[1]), b = ang(v[0] - c[0], v[1] - c[1]);
        let sweep = (b - a + 360) % 360;
        if (sweep > 180) { [a, b] = [b, a]; sweep = 360 - sweep; }
        return { a, b: a + sweep, deg: Math.round(sweep) };
      };
      const pt = (deg, r) => [r * Math.cos(deg * RAD), -r * Math.sin(deg * RAD)];
      const draw = () => {
        if (mode === '90') {
          ctx.radar.draw({ beam: 0, enemy: e, rays: [{ deg: 90, color: 'cyan', dotted: true }], square: { a: 0, size: 9 },
            arcs: [{ a: 0, b: e, color: 'white', label: `${e}°` }, { a: e, b: 90, color: 'orange', label: `${90 - e}°`, r: 34 }], aria: 'A right angle split in two' });
          ctx.readout(`<span class="o">${90 - e}°</span><span class="op">+</span><span>${e}°</span><span class="op">=</span><span class="c">90°</span>`);
        } else if (mode === '360') {
          ctx.radar.draw({ beam: 0, enemy: e, rays: [{ deg: 250, color: 'cyan', dotted: true }],
            arcs: [{ a: 0, b: e, color: 'white', label: `${e}°` }, { a: e, b: 250, color: 'orange', label: `${250 - e}°` }, { a: 250, b: 360, color: 'violet', label: '110°' }], aria: 'Three angles around a point' });
          ctx.readout(`<span>${e}°</span><span class="op">+</span><span class="o">${250 - e}°</span><span class="op">+</span><span style="color:#c58bff">110°</span><span class="op">=</span><span class="c">360°</span>`);
        } else {
          const O = [0, 0], Pp = pt(0, 60), Q = pt(e, 54);
          const at = corner(O, Pp, Q), bp = corner(Pp, O, Q), cq = corner(Q, O, Pp);
          const third = 180 - at.deg - bp.deg;   // keep the shown numbers summing exactly to 180
          // the corner labels sit just outside their corners, clear of the sides
          ctx.radar.draw({ beam: 0, enemy: e, tri: { pDeg: 0, pLen: 60, qDeg: e, qLen: 54 },
            arcs: [{ a: at.a, b: at.b, color: 'white', label: `${at.deg}°`, r: 14, labelR: 26 },
              { a: bp.a, b: bp.b, color: 'orange', label: `${bp.deg}°`, r: 10, labelR: -13, at: Pp },
              { a: cq.a, b: cq.b, color: 'violet', label: `${third}°`, r: 10, labelR: -13, at: Q }], aria: 'A triangle at the cannon' });
          ctx.readout(`<span>${at.deg}°</span><span class="op">+</span><span class="o">${bp.deg}°</span><span class="op">+</span><span style="color:#c58bff">${third}°</span><span class="op">=</span><span class="c">180°</span>`);
        }
      };
      const LIMITS = { 90: [8, 82], 360: [20, 220], tri: [45, 115] };
      const set = (deg) => {
        const [lo, hi] = LIMITS[mode];
        if (deg > 300) deg = lo;
        e = Math.round(Math.min(hi, Math.max(lo, deg)));
        draw();
      };
      const TABS = [
        { k: '90', label: 'Right angle', line: 'The two parts of a right angle add up to 90°.', start: 34 },
        { k: '360', label: 'Around a point', line: 'Angles around a point add up to 360°.', start: 100 },
        { k: 'tri', label: 'Triangle', line: 'The three angles of a triangle add up to 180°.', start: 70 },
      ];
      ctx.controls.replaceChildren(...TABS.map((t) => chip(t.label, '#c58bff', (c) => {
        ctx.controls.querySelectorAll('.chip').forEach((o) => o.classList.toggle('on', o === c));
        mode = t.k; e = t.start; draw();
        ctx.sound.tap();
        ctx.say([crew(t.line), crew('Drag the red line to try it.')]);
      })));
      ctx.controls.firstChild.classList.add('on');
      ctx.radar.interactive(true, 'Red line. Drag it, or use the arrow keys.');
      ctx.radar.onDrag = set;
      ctx.radar.onNudge = (d) => set(e + d);
      draw();
      ctx.say([crew('Bonus training, for curious pilots.'), crew(TABS[0].line)], () => ctx.ready());
    },
  },
];
