// Lines & Angles: the training run before Driftbound.
//
// A step player. Each step in src/steps.js is a short async script: it sets the caption, draws on the
// holo-screen, narrates, and waits for the student. Next (under the screen) is the one call to
// action. It pulses once a step is done; on question steps it stays locked until the right answer is
// found, and every miss explains the mistake, so no student is ever stuck.
import { Figure, at, angleOf } from './figure.js';
import { Dialogue } from './dialogue.js';
import { Sound } from './audio.js';
import { h, burst, burstAt } from './ui.js';
import { CHAPTERS, STEPS } from './steps.js';
import { createScene } from './scene.js';

const GAME_URL = 'https://zathura-teal.vercel.app';
const CANCEL = Symbol('cancel');
const $ = (id) => document.getElementById(id);
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reduceMQ.matches;

const els = {
  caption: $('caption'), stage: $('view'), fig: $('fig'), custom: $('custom'), side: $('side'),
  readout: $('readout'), controls: $('controls'), glassIn: $('glass-in'),
  next: $('next'), nextWrap: $('next-wrap'), back: $('back'), mute: $('mute'),
};

const sound = new Sound();
// the narration bar reads each caption aloud and shows instructions and hints on its second line
// (speech synthesis, when the device has a voice and the sound is on); its wave moves while it talks
const dialogue = new Dialogue($('narration'), {
  voice: () => { if (!dialogue.speech) sound.blip('crew'); },
  sr: $('sr'),
  reduced,
  muted: () => sound.muted,
});
const fig = new Figure(els.fig);
const memory = STEPS.map(() => ({}));   // per step: { done } and anything a step wants to keep
const shared = {};                       // across steps (the mission-check score)
let cur = -1;
let token = null;
let maxCh = 0;

// Overlays any figure can switch on through its state: a protractor measuring an angle (s.prot), a
// glowing arc sweeping round (s.sweep), the student's trace along an arc (s.trace) and a ghost copy
// of an angle that the student spins round the vertex (s.spin).
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
    b.arc('sw', Sw.o || [0, 0], Sw.from, Sw.at, Sw.r, { color: Sw.color || '#fff3b0', w: 5, cls: 'glow' });
    if (Sw.label) b.text('sw-v', at(Sw.o || [0, 0], (Sw.from + Sw.at) / 2, Sw.r + (Sw.lr || 24)), Sw.label, { size: 24, color: '#fff3b0' });
  }
  const T = s.trace;
  if (T) {
    const o = T.o || [0, 0];
    b.arc('tr-path', o, T.from, T.to, T.r, { color: 'rgba(255,243,176,.35)', w: 3, cls: 'dashy' });
    b.arc('tr', o, T.from, T.at, T.r, { color: '#fff3b0', w: 6, cls: 'glow' });
    if (T.at > T.from + 4) b.text('tr-v', at(o, (T.from + T.at) / 2, T.r + 26), `${Math.round(T.at - T.from)}°`, { size: 26, color: '#fff3b0' });
    if (!T.done) b.handle('tr-h', 'tr', at(o, T.at, T.r), { label: 'Trace the turn. Drag, or use the arrow keys.', now: T.at - T.from, min: 0, max: T.to - T.from, hint: T.hint });
  }
  const G = s.spin;
  if (G) {
    const o = G.o || [0, 0], a = G.a + G.rot, z = G.b + G.rot;
    b.wedge('sp-w', o, a, z, G.r, { fill: 'rgba(255,243,176,.42)', edge: '#fff3b0', cls: G.done ? 'flash' : '' });
    b.line('sp-a', o, at(o, a, G.len), { color: '#fff3b0', w: 3.5, dash: true });
    b.line('sp-b', o, at(o, z, G.len), { color: '#fff3b0', w: 3.5, dash: true });
    if (!G.done) {
      b.arc('sp-path', o, (G.a + G.b) / 2, (G.a + G.b) / 2 + 180, G.hr, { color: 'rgba(255,243,176,.3)', w: 3 });
      b.handle('sp-h', 'sp', at(o, (G.a + G.b) / 2 + G.rot, G.hr), { label: 'Turn the copy round O. Drag, or use the arrow keys.', now: G.rot, min: 0, max: 180, hint: G.hint });
    }
  }
}

const EASE = {
  linear: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
};

function updateNext() {
  const s = STEPS[cur];
  const locked = !!s.gate && !memory[cur].done;
  els.next.setAttribute('aria-disabled', String(locked));
  els.next.title = locked ? (s.lockHint || 'Answer the question to go on.') : '';
  const ready = !!token?.ready && !locked;
  els.nextWrap.classList.toggle('ready', ready);
  els.nextWrap.classList.toggle('gone', s.next === null);
  els.next.querySelector('.lbl').textContent = s.next || 'Next';
  els.back.classList.toggle('gone', cur === 0);
}

function setCaption(text) {
  const el = els.caption;
  const t = text || '';
  if (el.textContent === t) return;
  el.textContent = t;
  dialogue.narrate(t);
  if (t && !reduced()) el.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.34,1.56,.64,1)' });
}

function resetStage() {
  fig.clear();
  els.custom.replaceChildren();
  els.side.replaceChildren();
  els.stage.classList.remove('is-custom', 'has-side');
  els.readout.replaceChildren();
  els.readout.classList.remove('has-label');
  els.controls.replaceChildren();
  setCaption('');
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
    // the student drags a dot along an arc (anticlockwise from `from` to `to`); the arc lights up
    // behind the finger and shows how far it has turned. Resolves when the end is reached.
    trace(v, { o = [0, 0], r, from, to, auto = 'Trace it for me' }) {
      return guard(new Promise((resolve) => {
        const span = to - from;
        v.s.trace = { o, r, from, to, at: from, done: false, hint: true };
        v.draw();
        let tick = 0, finished = false, autoBtn = null;
        const set = (rel) => {
          if (finished || tk.dead) return;
          rel = Math.max(0, Math.min(span, rel));
          const T = v.s.trace;
          T.at = from + rel;
          T.hint = false;
          if (Math.floor(rel / 30) > tick) { tick = Math.floor(rel / 30); sound.tick(tick); }
          if (rel >= span - 2) {
            finished = true;
            T.at = to;
            T.done = true;
            if (document.activeElement?.closest?.('.fig-svg')) fig.svg.focus({ preventScroll: true });
            fig.onDrag = null; fig.onNudge = null; fig.dragAll = null;
            autoBtn?.parentElement?.remove();
            v.draw();
            sound.right();
            const pt = fig.center('[data-k="tr"]');
            if (pt) burst(pt[0], pt[1], { count: 16, spread: 130 });
            resolve();
            return;
          }
          v.draw();
        };
        fig.onDrag = (id, p) => {
          let rel = ((angleOf([p[0] - o[0], p[1] - o[1]]) - from) % 360 + 360) % 360;
          if (rel > span) rel = rel > span + (360 - span) / 2 ? 0 : span;
          if (Math.abs(rel - (v.s.trace.at - from)) > 50) return;   // follow the path, no jumping across
          set(rel);
        };
        fig.onNudge = (id, d) => set(v.s.trace.at - from + d * 3);
        fig.dragAll = 'tr';
        v.draw();
        if (auto) {
          autoBtn = h('<button type="button" class="pill act"><span></span></button>');
          autoBtn.querySelector('span').textContent = auto;
          autoBtn.addEventListener('click', () => {
            sound.tap();
            autoBtn.disabled = true;
            const start = v.s.trace.at - from;
            c.tween(1500, (k) => set(start + (span - start) * k), 'inOut').catch(() => {});
          });
          els.controls.appendChild(entering(autoBtn, 0));
        }
      }));
    },
    // the student turns a ghost copy of an angle round its vertex, half a turn (rot 0 -> 180)
    spin(v, { o = [0, 0], a, b, r, len, hr, auto = 'Turn it for me' }) {
      return guard(new Promise((resolve) => {
        const mid = (a + b) / 2;
        v.s.spin = { o, a, b, r, len, hr, rot: 0, done: false, hint: true };
        v.draw();
        let finished = false, autoBtn = null, tick = 0;
        const set = (rot) => {
          if (finished || tk.dead) return;
          const G = v.s.spin;
          G.rot = Math.max(0, Math.min(180, rot));
          G.hint = false;
          if (Math.floor(G.rot / 45) > tick) { tick = Math.floor(G.rot / 45); sound.tick(tick); }
          if (G.rot >= 177) {
            finished = true;
            G.rot = 180;
            G.done = true;
            if (document.activeElement?.closest?.('.fig-svg')) fig.svg.focus({ preventScroll: true });
            fig.onDrag = null; fig.onNudge = null; fig.dragAll = null;
            autoBtn?.parentElement?.remove();
            v.draw();
            sound.snap();
            const pt = fig.center('[data-k="sp-w"]');
            if (pt) burst(pt[0], pt[1], { count: 16, spread: 120 });
            resolve();
            return;
          }
          v.draw();
        };
        fig.onDrag = (id, p) => {
          const rel = ((angleOf([p[0] - o[0], p[1] - o[1]]) - mid) % 360 + 360) % 360;
          const r2 = rel > 270 ? 0 : Math.min(rel, 180);
          if (Math.abs(r2 - v.s.spin.rot) > 60) return;
          set(r2);
        };
        fig.onNudge = (id, d) => set(v.s.spin.rot + d * 3);
        fig.dragAll = 'sp';
        v.draw();
        if (auto) {
          autoBtn = h('<button type="button" class="pill act"><span></span></button>');
          autoBtn.querySelector('span').textContent = auto;
          autoBtn.addEventListener('click', () => {
            sound.tap();
            autoBtn.disabled = true;
            const start = v.s.spin.rot;
            c.tween(1400, (k) => set(start + (180 - start) * k), 'inOut').catch(() => {});
          });
          els.controls.appendChild(entering(autoBtn, 0));
        }
      }));
    },
    // a small static figure inside some element (cards, chips, recap)
    mini(host, box, draw, opts = {}) {
      const f = new Figure(host, { kMin: 0.42, kMax: 0.9, pad: 8, ...opts });
      f.box(...box);
      f.draw(draw);
      later(() => f.destroy());
      return f;
    },
    readout(html) { els.readout.classList.remove('has-label'); els.readout.innerHTML = html || ''; },
    // the deck's label box ("ADJACENT ANGLES"), shown where the readout goes
    stamp(text) {
      els.readout.classList.add('has-label');
      els.readout.textContent = text;
      els.readout.animate?.([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      sound.stamp();
      c.wait(200).then(() => burstAt(els.readout, { count: 12, spread: 130 })).catch(() => {});
    },
    side(node) {
      els.side.replaceChildren(...(node ? [node] : []));
      els.stage.classList.toggle('has-side', !!node);
      if (node && !reduced()) els.side.animate([{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    },
    stage(node) {
      els.custom.replaceChildren(...(node ? [node] : []));
      els.stage.classList.toggle('is-custom', !!node);
    },
    controls(...items) { els.controls.replaceChildren(...items.map((el, k) => entering(el, k))); },

    // answer buttons; resolves with { wrong } once the right one is tapped
    choose({ options, answer, fmt = (v) => `${v}`, why = {}, onWrong = null }) {
      return guard(new Promise((resolve) => {
        let wrong = 0;
        const btns = options.map((v) => {
          const b = h('<button type="button" class="pill ans"><span class="v"></span></button>');
          b.querySelector('.v').textContent = fmt(v);
          b.dataset.v = String(v);
          b.addEventListener('click', () => {
            if (b.disabled || tk.dead || b.classList.contains('is-right')) return;
            if (v === answer) {
              b.classList.add('is-right');
              b.setAttribute('aria-pressed', 'true');
              btns.forEach((o) => { if (o !== b && !o.disabled) o.classList.add('is-off'); });
              sound.right();
              burstAt(b);
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
        c.controls(...btns);
        c.pick = (v) => {
          const b = btns.find((x) => x.dataset.v === String(v));
          if (b) b.click();
          return !!b;
        };
      }));
    },

    // A / B / C cards with a small figure each; resolves with { wrong, view } (the right card's view)
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
              resolve({ wrong, view: views[it.id], card });
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
        c.stage(wrap);
      }));
    },

    // an action button in the controls row; resolves when tapped
    button(label, { tone = 'aqua', keep = false } = {}) {
      return guard(new Promise((resolve) => {
        const b = h('<button type="button" class="pill act"><span></span></button>');
        b.querySelector('span').textContent = label;
        b.addEventListener('click', () => {
          if (b.disabled || tk.dead) return;
          sound.tap();
          if (!keep) { const w = b.parentElement; (w && w !== els.controls ? w : b).remove(); }
          resolve(b);
        });
        els.controls.appendChild(entering(b, 0));
      }));
    },

    // tap targets on the figure; resolves with { wrong } once the right one is tapped
    tapFig({ answer, why = {} }) {
      return guard(new Promise((resolve) => {
        let wrong = 0;
        fig.onTap = (id, el) => {
          if (tk.dead) return;
          if (id === answer) {
            fig.onTap = null;
            sound.right();
            burstAt(el, { count: 14, spread: 110 });
            resolve({ wrong });
          } else {
            wrong++;
            sound.wrong();
            el.classList.remove('nope');
            void el.getBoundingClientRect();
            el.classList.add('nope');
            talk(why[id]);
          }
        };
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
    go: (k) => go(k, { dir: k < cur ? -1 : 1 }),
    indexOf: (id) => STEPS.findIndex((s) => s.id === id),
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
    if (!tk.dead) c.ready();
  } catch (e) {
    if (e !== CANCEL) console.error(e);
  }
}

function next() {
  const s = STEPS[cur];
  if (s.next === null) return;
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

// keyboard: → / Enter next, ← back, Space finishes the line being typed (or moves to the next one)
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('[data-drag], [data-tap], .fig-svg')) return;   // arrows there move the figure, not the lesson
  const onButton = e.target.tagName === 'BUTTON';
  if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onButton)) { next(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { back(); e.preventDefault(); }
  else if (e.key === ' ' && !onButton) { dialogue.skip(); e.preventDefault(); }
});

// ---------------------------------------------------------------- the HQ backdrop and the screen layout
const scene = createScene($('room-pic'));

// start once the fonts used on the figures are ready (or after a short wait)
const params = new URLSearchParams(location.search);
const start = Math.max(0, Math.min(STEPS.length - 1, Number(params.get('step')) || 0));
maxCh = STEPS[start].ch;
const fonts = ['400 20px "Lilita One"', '600 18px "Fredoka"', '400 18px "Noto Sans Math"'];
const fontsIn = Promise.race([Promise.all(fonts.map((f) => document.fonts?.load(f, '∠1°−'))), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
Promise.race([Promise.all([fontsIn, scene.loaded]), new Promise((r) => setTimeout(r, 4000))]).finally(() => {
  document.body.classList.add('is-on');
  go(start);
});

window.lesson = { go, get index() { return cur; }, steps: STEPS, memory, shared, dialogue };   // for testing from the console
