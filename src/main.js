// Lines & Angles: the training run before Drone Defense.
//
// A step player. Each step in src/lesson/steps.js is a short async script: it sets the caption, draws on the
// holo-screen, narrates, and waits for the student. Next (under the screen) is the one call to
// action. It pulses once a step is done; on question steps it stays locked until the right answer is
// found, and every miss explains the mistake, so no student is ever stuck.
import { Figure, at, angleOf } from './engine/figure.js';
import { Dialogue } from './engine/dialogue.js';
import { Voice } from './engine/voice.js';
import { Sound } from './engine/audio.js';
import { h, burst, burstAt, esc, angles, reduced, EASE } from './engine/ui.js';
import { createScene } from './engine/scene.js';
import { CHAPTERS, STEPS } from './lesson/steps.js';
import { playIntro } from './intro/intro.js';

const GAME_URL = 'https://zathura-teal.vercel.app';
const CANCEL = Symbol('cancel');
const $ = (id) => document.getElementById(id);

const els = {
  caption: $('caption'), stage: $('view'), fig: $('fig'), custom: $('custom'),
  readout: $('readout'), controls: $('controls'), glassIn: $('glass-in'),
  next: $('next'), nextWrap: $('next-wrap'), back: $('back'), mute: $('mute'),
};

const sound = new Sound();
// the recorded voice (the game's co-pilot, made with Kokoro): its lines are decoded once the audio starts;
// the narration says them in one line beside the AI orb, word by word
const vo = new Voice(sound);
const warm = () => vo.ready.then(() => vo.preload());
window.addEventListener('pointerdown', warm, { once: true });
window.addEventListener('keydown', warm, { once: true });
const dialogue = new Dialogue($('narration'), {
  text: els.caption,
  mouth: document.querySelector('#narration .voice'),
  speaker: vo,
  blip: () => sound.blip('crew'),
  sr: $('sr'),
  reduced,
  muted: () => sound.muted,
});
const fig = new Figure(els.fig);

// praise when the student gets something right, in the narration line: only a word of praise ("Great job!",
// "Well done!", "Amazing work!", in turn), no explanation after it; then the line goes back to the caption.
const PRAISE = ['Great job!', 'Well done!', 'Amazing work!'];   // the only words of praise, in turn
let praiseAt = 0;
function praise() {
  const text = PRAISE[praiseAt++ % PRAISE.length];
  dialogue.dropQueued();                                   // the question is answered: it need not be read now
  dialogue.play([                                         // a short hold after it: the lesson goes on
    { text, mood: 'praise', hold: 0.6 },
  ]);
}

const memory = STEPS.map(() => ({}));   // per step: { done } and anything a step wants to keep
const shared = {};                       // across steps (the mission-check score)
let cur = -1;
let token = null;
let maxCh = 0;
let syncDev = () => {};                  // ?dev=1: keeps the jump list on the step being shown

// Overlays any figure can switch on through its state: a protractor measuring an angle (s.prot), a
// glowing arc sweeping round (s.sweep) and a ghost copy of an angle turning round the vertex (s.spin).
function overlays(b, s) {
  const P = s.prot;
  if (P) {
    const o = P.o || [0, 0];
    b.protractor('pr', o, P.r, P.a0 || 0);
    if (P.needle != null) {
      b.arc('pr-arc', o, Math.min(P.from, P.needle), Math.max(P.from, P.needle), P.r * 0.6, { color: '#fff3b0', w: 4.5 });
      b.line('pr-needle', o, at(o, P.needle, P.r * 1.08), { color: '#ffffff', w: 3 });
    }
  }
  const Sw = s.sweep;
  if (Sw && Sw.at > Sw.from) {
    // the angles' own edge lights up as it turns across them (r: their radius), the size counting up beside it
    b.arc('sw', Sw.o || [0, 0], Sw.from, Sw.at, Sw.r, { color: Sw.color || '#fff3b0', w: 3.5, cls: 'glow' });
    if (Sw.label) b.text('sw-v', at(Sw.o || [0, 0], (Sw.from + Sw.at) / 2, Sw.r + (Sw.lr || 19)), Sw.label, { size: 22, color: '#fff3b0' });
  }
  const G = s.spin;
  if (G) {
    const o = G.o || [0, 0], a = G.a + G.rot, z = G.b + G.rot;
    b.wedge('sp-w', o, a, z, G.r, { fill: 'rgba(255,243,176,.42)', edge: '#fff3b0', cls: G.done ? 'flash' : '' });
    b.line('sp-a', o, at(o, a, G.len), { color: '#fff3b0', w: 3.5, dash: true });
    b.line('sp-b', o, at(o, z, G.len), { color: '#fff3b0', w: 3.5, dash: true });
  }
}


function updateNext() {
  const s = STEPS[cur];
  const locked = !!s.gate && !memory[cur].done;
  els.next.setAttribute('aria-disabled', String(locked));
  els.next.title = locked ? (s.lockHint || 'Answer the question to go on.') : '';
  const ready = !!token?.ready && !locked;
  els.nextWrap.classList.toggle('ready', ready);
  // a step can keep its Next out of sight until it is done (the recall's Launch mission): then it arrives
  const waiting = !!s.nextAfter && !memory[cur].done;
  const hide = s.next === null || waiting;
  if (!hide && els.nextWrap.classList.contains('gone') && s.nextAfter) {
    els.nextWrap.classList.remove('arrive'); void els.nextWrap.offsetWidth; els.nextWrap.classList.add('arrive');
  }
  els.nextWrap.classList.toggle('gone', hide);
  els.next.querySelector('.lbl').textContent = s.next || 'Next';
  els.back.classList.toggle('gone', cur === 0);
}

let lastCaption = '';
function setCaption(text, again = false) {
  const t = text || '';
  if (t === lastCaption && !again) return;
  lastCaption = t;
  dialogue.narrate(t);
}

function resetStage() {
  fig.clear();
  els.custom.replaceChildren();
  els.stage.classList.remove('is-custom', 'is-side');
  els.readout.replaceChildren();
  els.readout.classList.remove('has-label');
  els.controls.replaceChildren();
  setCaption('');
}

// the ghost entrance (see the CSS): see-through and blurred, drifting up, then solid
function ghost(el) {
  if (!el || reduced()) return;
  el.animate?.([
    { opacity: 0, filter: 'blur(10px)', transform: 'translateY(12px) scale(.96)' },
    { opacity: 0.65, filter: 'blur(2px)', offset: 0.5 },
    { opacity: 1, filter: 'none', transform: 'none' },
  ], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' });
}

// entrance wrapper for buttons and cards (removed once played so it never locks transforms)
function entering(el, i = 0) {
  const w = document.createElement('span');
  w.className = 'enter';
  w.style.setProperty('--i', i);
  w.appendChild(el);
  w.addEventListener('animationend', () => w.classList.remove('enter'), { once: true });
  return w;
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// ---------------------------------------------------------------- the right card
// The other cards fade away and the right one glides to the middle of the row (FLIP: it is laid out in
// the middle at once, then moved there from where it was).
async function settleCard(wrap, card) {
  const keep = card.closest('.cards > span');
  const others = [...wrap.children].filter((x) => x !== keep);
  if (!reduced()) {
    await Promise.all(others.map((el) => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.86)' }],
      { duration: 340, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {})));
  }
  const a = keep.getBoundingClientRect();
  keep.classList.add('kept');
  wrap.classList.add('solved');
  const b = keep.getBoundingClientRect();
  if (!reduced() && (a.left !== b.left || a.top !== b.top)) {
    await keep.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }],
      { duration: 650, easing: 'cubic-bezier(.22, 1, .36, 1)' }).finished.catch(() => {});
  }
}

// The card's frame goes and its figure stays, growing to fill the screen: the figure is the start of
// what comes next. Its lines and labels take the size of the main figure's.
async function unframeCard(wrap, card, figure) {
  const keep = card.closest('.cards > span');
  card.tabIndex = -1;
  wrap.classList.add('unframed');
  await new Promise((r) => setTimeout(r, reduced() ? 0 : 420));
  // the drawing's own outline (not the card's box, whose shape changes): it grows evenly, never stretched
  const drawn = () => {
    const rs = [...figure.svg.querySelectorAll('[data-k]')].map((el) => el.getBoundingClientRect()).filter((r) => r.width || r.height);
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
    const r = Math.max(...rs.map((x) => x.right)), bt = Math.max(...rs.map((x) => x.bottom));
    return { cx: (l + r) / 2, cy: (t + bt) / 2, w: r - l };
  };
  const a = drawn();
  wrap.classList.add('fill');
  figure.kMin = 0.8; figure.kMax = 1.3;
  figure.render();
  const b = drawn(), box = keep.getBoundingClientRect();
  if (!reduced() && b.w > 0) {
    const origin = `${b.cx - box.left}px ${b.cy - box.top}px`;
    await keep.animate([
      { transform: `translate(${a.cx - b.cx}px, ${a.cy - b.cy}px) scale(${a.w / b.w})`, transformOrigin: origin },
      { transform: 'none', transformOrigin: origin },
    ], { duration: 750, easing: 'cubic-bezier(.45, 0, .2, 1)' }).finished.catch(() => {});
  }
}

// ---------------------------------------------------------------- the toolkit each step gets
function makeCtx(i, tk) {
  const step = STEPS[i];
  const mem = memory[i];
  const later = (fn) => tk.cleanups.push(fn);
  const guard = (p) => new Promise((res, rej) => { p.then((v) => (tk.dead ? rej(CANCEL) : res(v)), rej); });
  const talk = (msg) => {
    if (!msg || tk.dead) return;
    const lines = Array.isArray(msg) ? msg : [msg];
    dialogue.play(lines.map((l) => (typeof l === 'string' ? { text: l, mood: 'hint' } : l)));
  };

  const c = {
    step, mem, shared, sound, fig, els, GAME_URL,
    get alive() { return !tk.dead; },
    reduced: reduced(),
    until: guard,
    caption: setCaption,
    say: (lines) => guard(dialogue.play(Array.isArray(lines) ? lines : [lines])),
    said: (max = 12000) => guard(dialogue.settled(max)),     // resolves once the narration has been said
    // resolves when the voice says `word` (no word: when the last caption starts), so a part of the figure,
    // a label or a stamp comes in the moment the narration names it, never before
    cue: (word) => guard(dialogue.cue(word)),
    // run fn when the voice says `word`, without holding up the script (for parts that overlap)
    on(word, fn) { c.spawn(async () => { await c.cue(word); await fn(); }); },
    talk,
    wait: (ms) => guard(new Promise((r) => { const id = setTimeout(r, reduced() ? Math.min(ms, 120) : ms); later(() => clearTimeout(id)); })),
    tween(ms, fn, ease = 'inOut') {
      return guard(new Promise((resolve) => {
        if (reduced() || ms <= 0) { fn(1); resolve(); return; }
        const t0 = performance.now();
        let raf = 0;
        const loop = (now) => {
          if (tk.dead) return;
          const t = Math.min(1, (now - t0) / ms);
          fn(EASE[ease](t));
          if (t < 1) raf = requestAnimationFrame(loop); else resolve();
        };
        raf = requestAnimationFrame(loop);
        later(() => cancelAnimationFrame(raf));
      }));
    },
    // a drawing with its own state; to() tweens numbers in the state and redraws every frame
    view(state, draw, f = fig) {
      const s = { ...state };
      const paint = () => f.draw((b) => { draw(b, s); overlays(b, s); });
      paint();
      return {
        s,
        draw: paint,
        set(patch) { Object.assign(s, patch); paint(); },
        to(patch, ms = 600, ease = 'inOut') {
          const from = {};
          for (const key in patch) from[key] = s[key];
          return c.tween(ms, (t) => { for (const key in patch) s[key] = from[key] + (patch[key] - from[key]) * t; paint(); }, ease);
        },
      };
    },
    // a small static figure inside some element (cards, chips, recap)
    mini(host, box, draw, opts = {}) {
      const f = new Figure(host, { kMin: 0.42, kMax: 0.9, pad: 8, ...opts });
      f.box(...box);
      f.draw(draw);
      later(() => f.destroy());
      return f;
    },
    readout(html) {
      const was = els.readout.innerHTML;
      els.readout.classList.remove('has-label');
      els.readout.innerHTML = angles(html || '');
      if (!was && html) ghost(els.readout);
    },
    // a number jumps from one place to another, so the student sees where it goes (out of an angle into the
    // sum, from an answer onto its angle): a copy of it rises from `from`, flies on an arc and lands on `to`
    // (elements or rectangles), where it shrinks into its place; resolves as it lands
    fly(from, to, text, { cls = '', delay = 0, ms = 820 } = {}) {
      const box = (x) => (x?.getBoundingClientRect ? x.getBoundingClientRect() : x);
      const a = box(from), b = box(to);
      if (!a || !b || !a.width || reduced() || tk.dead) return Promise.resolve();
      const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
      const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      const lift = Math.min(140, 50 + Math.abs(dx) * 0.35);          // the higher the jump, the further it goes
      const chip = h(`<span class="fly ${cls}">${angles(esc(text))}</span>`);
      Object.assign(chip.style, { left: `${ax}px`, top: `${ay}px` });
      document.body.appendChild(chip);
      later(() => chip.remove());
      const anim = chip.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 0 },
        { transform: 'translate(0, -10px) scale(1.25)', opacity: 1, offset: 0.15 },
        { transform: `translate(${(dx * 0.5).toFixed(1)}px, ${(dy * 0.5 - lift).toFixed(1)}px) scale(1.15)`, offset: 0.55 },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(.9)`, opacity: 1, offset: 0.9 },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(.5)`, opacity: 0 },
      ], { duration: ms, delay, easing: 'cubic-bezier(.45, 0, .35, 1)', fill: 'both' });
      return guard(anim.finished.then(() => chip.remove(), () => chip.remove()));
    },
    // the result of a sum pops into place (with a little burst), once the numbers have jumped into it
    total(el) {
      if (!el) return;
      sound.pop();
      if (reduced()) return;
      el.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.3)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'ease-out' });
      burstAt(el, { count: 12, spread: 90 });
    },
    // the deck's label box ("ADJACENT ANGLES"), shown where the readout goes
    stamp(text) {
      els.readout.classList.add('has-label');
      els.readout.textContent = text;
      ghost(els.readout);
      sound.stamp();
      c.wait(200).then(() => burstAt(els.readout, { count: 12, spread: 130 })).catch(() => {});
    },
    praise,                                                 // the student did it: say so (see praise() above)
    stage(node) {
      els.custom.replaceChildren(...(node ? [node] : []));
      els.stage.classList.toggle('is-custom', !!node);
    },
    // a panel beside the figure (the figure stays): on the right, or under it on phones
    side(node) {
      els.custom.replaceChildren(...(node ? [node] : []));
      els.stage.classList.toggle('is-side', !!node);
    },
    controls(...items) { els.controls.replaceChildren(...items.map((el, k) => entering(el, k))); },

    // answer buttons; resolves with { wrong } once the right one is tapped
    choose({ options, answer, fmt = (v) => `${v}`, why = {}, onWrong = null }) {
      return guard(new Promise((resolve) => {
        let wrong = 0;
        const btns = options.map((v) => {
          const b = h('<button type="button" class="pill ans"><span class="v"></span></button>');
          b.querySelector('.v').innerHTML = angles(esc(fmt(v)));
          b.dataset.v = String(v);
          b.addEventListener('click', () => {
            if (b.disabled || tk.dead || b.classList.contains('is-right')) return;
            if (v === answer) {
              b.classList.add('is-right');
              b.setAttribute('aria-pressed', 'true');
              btns.forEach((o) => { if (o !== b && !o.disabled) o.classList.add('is-off'); });
              sound.right();
              burstAt(b);
              praise();
              resolve({ wrong, value: v });
            } else {
              wrong++;
              b.classList.add('is-wrong');
              b.disabled = true;
              shake(b);
              sound.wrong();
              talk(typeof why === 'function' ? why(v, wrong) : why[v]);
              onWrong?.(v, wrong);
            }
          });
          return b;
        });
        // the answers come in once the question has been said
        dialogue.settled().then(() => { if (!tk.dead) c.controls(...btns); });
        c.pick = (v) => {
          const b = btns.find((x) => x.dataset.v === String(v));
          if (b) b.click();
          return !!b;
        };
      }));
    },

    // A / B / C cards with a small figure each. On the right card the others fade away and it glides to
    // the middle; then it resolves with { wrong, view, card, unframe }. view is the card's figure;
    // unframe() lets the card's frame go and its figure grow to fill the screen, for a step whose next
    // idea uses that same figure (it carries on from there)
    cards({ items, answer, why = {} }) {
      return guard(new Promise((resolve) => {
        let wrong = 0;
        const wrap = h('<div class="cards"></div>');
        const views = {};
        const cards = items.map((it, k) => {
          const card = h('<button type="button" class="qcard"><span class="qcard__mini"></span></button>');
          card.dataset.id = it.id;
          card.setAttribute('aria-label', `Option ${k + 1}: ${it.label}`);
          const f = new Figure(card.querySelector('.qcard__mini'), { kMin: 0.55, kMax: 0.95, pad: 12 });
          it.figure = f;
          later(() => f.destroy());
          f.box(...it.box);
          views[it.id] = c.view(it.state || {}, it.draw, f);
          card.addEventListener('click', () => {
            if (tk.dead || card.classList.contains('is-right') || card.classList.contains('is-wrong') || wrap.dataset.done) return;
            if (it.id === answer) {
              wrap.dataset.done = '1';
              card.classList.add('is-right');
              cards.forEach((o) => { if (o !== card && !o.classList.contains('is-wrong')) o.classList.add('is-off'); });
              sound.right();
              burstAt(card, { count: 20, spread: 160 });
              praise();
              settleCard(wrap, card).then(() => resolve({ wrong, view: views[it.id], card, unframe: () => unframeCard(wrap, card, it.figure) }));
            } else {
              wrong++;
              card.classList.add('is-wrong');
              card.setAttribute('aria-disabled', 'true');
              shake(card);
              sound.wrong();
              talk(why[it.id]);
            }
          });
          const cell = h('<div class="qcard-wrap"></div>');
          cell.appendChild(card);
          wrap.appendChild(entering(cell, k));
          return card;
        });
        // the cards come in as the question starts being said (not over the sentence before it)
        dialogue.cue().then(() => { if (!tk.dead) c.stage(wrap); });
      }));
    },


    // run something alongside the main script (its cancellation is swallowed)
    spawn(fn) { Promise.resolve().then(fn).catch((e) => { if (e !== CANCEL) console.error(e); }); },
    burst(target, opts) { if (Array.isArray(target)) burst(target[0], target[1], opts); else burstAt(target, opts); },
    ready() {
      if (tk.dead) return;
      mem.done = true;
      tk.ready = true;
      updateNext();
    },
    later,
  };
  return c;
}

// ---------------------------------------------------------------- navigation
async function go(i, { dir = 1 } = {}) {
  if (i < 0 || i >= STEPS.length) return;
  if (token) { token.dead = true; token.cleanups.forEach((f) => f()); }
  const tk = { dead: false, cleanups: [], ready: false };
  token = tk;
  const first = cur === -1;
  cur = i;
  syncDev(i);
  maxCh = Math.max(maxCh, STEPS[i].ch);
  dialogue.clear();
  $('narration').classList.toggle('quiet', !!STEPS[i].quiet);
  updateNext();
  const g = els.glassIn;
  if (!first && !reduced()) {
    g.getAnimations().forEach((a) => a.cancel());
    await g.animate([{ opacity: 1, filter: 'none' }, { opacity: 0, filter: 'brightness(2) saturate(.3)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    if (tk.dead) return;
  }
  resetStage();
  const c = makeCtx(i, tk);
  document.title = `${STEPS[i].title || CHAPTERS[STEPS[i].ch].name} · Lines & Angles`;
  g.getAnimations().forEach((a) => a.cancel());
  // the new step materialises like a hologram: a scan wipes down and the picture flickers in
  if (!reduced()) {
    g.animate([
      { opacity: 0, clipPath: 'inset(0 0 100% 0)', filter: 'brightness(2.2) saturate(.4)' },
      { opacity: 0.85, clipPath: 'inset(0 0 35% 0)', filter: 'brightness(1.6)', offset: 0.45 },
      { opacity: 0.55, offset: 0.6 },
      { opacity: 1, clipPath: 'inset(0 0 0% 0)', filter: 'none' },
    ], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
    $('screen').classList.remove('scan'); void $('screen').offsetWidth; $('screen').classList.add('scan');
  }
  try {
    await STEPS[i].run(c);
    await c.said();                                      // Next lights up once the narration has finished
    if (!tk.dead) c.ready();
  } catch (e) {
    if (e !== CANCEL) console.error(e);
  }
}

function next() {
  const s = STEPS[cur];
  if (s.next === null) return;
  if (s.nextAfter && !memory[cur].done) return;          // not there yet (the keyboard cannot reach it either)
  if (s.gate && !memory[cur].done) {
    sound.locked();
    els.nextWrap.classList.remove('nope');
    void els.nextWrap.offsetWidth;
    els.nextWrap.classList.add('nope');
    dialogue.play([{ text: s.lockHint || 'Answer the question to go on.', mood: 'hint' }]);
    return;
  }
  if (s.launch) { launch(); return; }
  if (cur < STEPS.length - 1) { sound.tap(); go(cur + 1, { dir: 1 }); }
}

// the last step's Next opens the game
function launch() {
  sound.launch();
  burstAt(els.next, { count: 28, spread: 220 });
  const flash = h('<div class="flash-screen"></div>');
  document.body.appendChild(flash);
  flash.animate([{ opacity: 0 }, { opacity: 0.9 }], { duration: 650, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => { location.href = GAME_URL; }, 650);
}
function back() { if (cur > 0) { sound.tap(); go(cur - 1, { dir: -1 }); } }

els.next.addEventListener('click', next);
els.back.addEventListener('click', back);
els.mute.addEventListener('click', () => {
  sound.muted = !sound.muted;
  els.mute.setAttribute('aria-pressed', String(!sound.muted));
  els.mute.setAttribute('aria-label', sound.muted ? 'Sound off' : 'Sound on');
  if (sound.muted) dialogue.hush();
});

// only the tab in front talks: a lesson left open in another tab pauses its voice, and picks up where it was
document.addEventListener('visibilitychange', () => {
  if (!sound.ctx) return;
  if (document.hidden) sound.ctx.suspend?.(); else sound.ctx.resume?.();
});

// keyboard: → / Enter next, ← back, Space finishes the line being typed (or moves to the next one)
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('[data-drag], [data-tap], .fig-svg, .dev')) return;   // arrows there move the figure (or the jump list), not the lesson
  const onButton = e.target.tagName === 'BUTTON';
  if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onButton)) { next(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { back(); e.preventDefault(); }
  else if (e.key === ' ' && !onButton) { dialogue.skip(); e.preventDefault(); }
});

// ---------------------------------------------------------------- the HQ backdrop and the screen layout
const scene = createScene($('room-pic'));

// start once the fonts used on the figures are ready (or after a short wait)
const params = new URLSearchParams(location.search);
const dev = params.get('dev') === '1';
const start = Math.max(0, Math.min(STEPS.length - 1, Number(params.get('step')) || 0));
maxCh = STEPS[start].ch;
const fonts = ['400 20px "Lilita One"', '600 18px "Fredoka"', '400 18px "Noto Sans Math"'];
const fontsIn = Promise.race([Promise.all(fonts.map((f) => document.fonts?.load(f, '∠1°−'))), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
const ready = Promise.race([Promise.all([fontsIn, scene.loaded]), new Promise((r) => setTimeout(r, 4000))]);

// the start banner: the play button starts the intro (src/intro/intro.js: into the satellite, through its gate,
// down the corridor into the hall, where the projector brings the lesson), then the lesson. The tap also lets
// the browser start the voice. A link to a given step (?step=N) or ?dev=1 skips both.
const banner = $('start');
function begin() {
  ready.finally(() => { document.body.classList.add('is-on'); go(start); });
}
if (params.has('step') || dev) { banner.remove(); begin(); }
else {
  // Enter or Space also starts (the button is not focused at load, so no focus ring shows on it)
  const onKey = (e) => {
    if (!banner.isConnected) { window.removeEventListener('keydown', onKey, true); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); window.removeEventListener('keydown', onKey, true); $('play').click(); }
  };
  window.addEventListener('keydown', onKey, true);
  $('play').addEventListener('click', () => {
    if (banner.classList.contains('is-going')) return;
    banner.classList.add('is-going');
    sound.unlock();                                      // inside the tap: lets the voice play in every browser
    warm();
    sound.tap();
    if (reduced()) {                                     // no film: straight into the lesson
      begin();
      banner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => banner.remove();
      return;
    }
    $('play').animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.6)', opacity: 0 }], { duration: 350, easing: 'ease-in', fill: 'forwards' });
    playIntro({ banner, sound }).then(begin);
  });
}

// ---------------------------------------------------------------- ?dev=1: jump to any step
// For the people building the lesson, not for students: a list of every step in the top corner, with
// ‹ › beside it. Picking a step opens it at once, past any locked Next. The address keeps the step
// (?dev=1&step=N), so a reload stays on it.
if (dev) {
  const panel = h(`<nav class="dev" aria-label="Jump to a step">
    <button type="button" data-d="-1" aria-label="Previous step">‹</button>
    <select aria-label="Step">${STEPS.map((s, i) => `<option value="${i}">${i} · ${esc(s.title || CHAPTERS[s.ch].name)}</option>`).join('')}</select>
    <button type="button" data-d="1" aria-label="Next step">›</button>
  </nav>`);
  const pick = panel.querySelector('select');
  const jump = (i) => { if (i >= 0 && i < STEPS.length && i !== cur) go(i, { dir: i < cur ? -1 : 1 }); };
  pick.addEventListener('change', () => { jump(Number(pick.value)); pick.blur(); });
  panel.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => jump(cur + Number(b.dataset.d))));
  syncDev = (i) => {
    pick.value = String(i);
    const q = new URLSearchParams(location.search);
    q.set('step', String(i));
    history.replaceState(null, '', `?${q}`);
  };
  syncDev(start);
  document.body.appendChild(panel);
}

window.lesson = { go, get index() { return cur; }, steps: STEPS, memory, shared, dialogue };   // for testing from the console
