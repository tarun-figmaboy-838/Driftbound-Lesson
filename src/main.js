// Driftbound Briefing: the angle lesson before the mission. A strategy meeting on the ship, run by
// the co-pilot, in ten short scenes (plus optional extra training). It shares the game's
// characters, radar, notation and buttons, and ends by launching the game.
import { Radar, tween } from './radar.js';
import { Dialogue } from './dialogue.js';
import { Sound } from './audio.js';
import { SCENES } from './scenes.js';

const GAME_URL = 'https://zathura-teal.vercel.app';
const MAIN = SCENES.filter((s) => !s.extra).length;   // scenes in the progress dots
const $ = (id) => document.getElementById(id);

const sound = new Sound();
const radar = new Radar($('radar'));
const dialogue = new Dialogue($('dialog'), (who) => sound.blip(who));
const els = {
  title: $('scene-title'), dots: $('dots'), stage: $('stage'), holo: $('holo'), readout: $('readout'),
  controls: $('controls'), qbar: $('qbar'), qtext: $('qtext'),
  warden: $('warden-holo'), next: $('next'), back: $('back'),
};

let index = -1;
let cleanups = [];
const seen = new Set();
const data = {};

// the question bar from the game (no timer, like the game); qbar(null) hides it
function qbar(html) {
  els.qbar.classList.toggle('hidden', !html);
  els.qbar.classList.remove('ok', 'bad');
  if (!html) return;
  els.qtext.innerHTML = html;
}
qbar.el = els.qbar;
qbar.flash = (mood) => {
  els.qbar.classList.remove('ok', 'bad');
  void els.qbar.offsetWidth;
  els.qbar.classList.add(mood);
};

const ctx = {
  GAME_URL, radar, sound, data, qbar,
  controls: els.controls,
  say: (lines, onDone) => dialogue.play(Array.isArray(lines) ? lines : [lines], onDone),
  readout: (html) => { els.readout.innerHTML = html; },
  ready: () => { seen.add(index); els.next.classList.add('ready'); renderDots(); },
  warden: (on) => els.warden.classList.toggle('hidden', !on),
  holo: (on) => els.holo.classList.toggle('hidden', !on),
  go: (i) => go(i),
  later: (fn, ms) => { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); },
  tween: (from, to, s, onUpdate, onDone) => { const stop = tween(from, to, s, onUpdate, onDone); cleanups.push(stop); return stop; },
};

function renderDots() {
  els.dots.replaceChildren(...Array.from({ length: MAIN }, (_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Scene ${i + 1}: ${SCENES[i].title}`);
    if (i === Math.min(index, MAIN - 1)) b.classList.add('now'), b.setAttribute('aria-current', 'step');
    else if (seen.has(i)) b.classList.add('seen');
    b.addEventListener('click', () => go(i));
    return b;
  }));
}

function go(i) {
  if (i < 0 || i >= SCENES.length) return;
  const prev = SCENES[index];
  prev?.leave?.(ctx);
  cleanups.forEach((f) => f());
  cleanups = [];
  dialogue.clear();
  index = i;
  const s = SCENES[i];
  // a clean stage for every scene
  qbar(null);
  ctx.readout('');
  els.controls.replaceChildren();
  ctx.holo(true);
  ctx.warden(false);
  radar.interactive(false);
  radar.onDrag = null;
  radar.onNudge = null;
  els.title.textContent = s.title;
  document.title = `${s.title} · Driftbound Briefing`;
  els.next.classList.remove('ready');
  els.next.classList.toggle('gone', s.next === null);
  els.next.querySelector('span').textContent = s.next || 'Next';
  els.back.classList.toggle('gone', i === 0);
  renderDots();
  s.enter(ctx);
}

const next = () => { if (SCENES[index].next !== null && index < MAIN - 1) { sound.tap(); go(index + 1); } };
const back = () => { if (index > 0) { sound.tap(); go(SCENES[index].extra ? MAIN - 1 : index - 1); } };
els.next.addEventListener('click', next);
els.back.addEventListener('click', back);

// keyboard: → / Enter next, ← back, Space finishes the line being typed (or skips to the next one)
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('.radar-svg')) return;            // arrows turn the radar line there
  const onButton = e.target.tagName === 'BUTTON';
  if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onButton)) { next(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { back(); e.preventDefault(); }
  else if (e.key === ' ' && !onButton) { dialogue.skip(); e.preventDefault(); }
});

// fonts used on the radar and the buttons are ready before the first scene draws
const fonts = ['400 20px "Lilita One"', '600 18px "Fredoka"', '700 24px "Fredoka"'];
Promise.race([Promise.all(fonts.map((f) => document.fonts?.load(f))), new Promise((r) => setTimeout(r, 1500))])
  .catch(() => {})
  .finally(() => go(0));

window.lesson = { go, get index() { return index; }, dialogue, data };   // for testing from the console
