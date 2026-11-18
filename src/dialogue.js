// The narration: one line of text beside the voice (the AI mouth), read aloud, word by word.
//
// Everything the voice says appears in that one line, each word lighting up as it is spoken (the
// browser's word timing when the voice reports it, an even pace when it doesn't or the sound is off),
// and the mouth bumps on every word.
//   caption      the step's sentence from the deck: replaces the line
//   instruction  ("Drag B."): said after the caption, it follows it in the same line
//   hint         (a wrong answer, Next too early): takes the line at once while it is said, then the
//                line goes back to the caption
// Pieces are said in order: a new caption waits for the one before it to be said.
// Tapping the line finishes it. Screen readers get each whole piece once, through the sr element.

const PACE_VOICE = 14.5;   // characters a second the voice says, when it reports no word timing
const PACE_QUIET = 19;     // characters a second the line fills in with the sound off
const BACK = 2.4;          // seconds a hint stays after it has been said
const START_WAIT = 0.8;    // seconds to wait for a voice to start before filling in without it

import { esc, angles } from './ui.js';

// how the voice should say a word: maths symbols as words
const sayable = (w) => w.replace(/∠/g, 'angle ').replace(/°/g, ' degrees').replace(/−/g, ' minus ');

export class Dialogue {
  constructor(root, { text, mouth = null, voice = null, sr = null, reduced = () => false, muted = () => false } = {}) {
    this.root = root;
    this.text = text;          // the narration line
    this.mouth = mouth;
    this.voice = voice;        // a tiny blip per word when there is no voice
    this.sr = sr;
    this.reduced = reduced;
    this.muted = muted;
    this.base = '';            // what the line shows when nothing else is being said
    this.queue = [];
    this.cur = null;
    this.raf = 0;
    this.speaking = 0;
    this.gen = 0;              // bumped when speech is cut off, so late events from old speech are ignored
    this.waiters = [];
    root.addEventListener('pointerdown', () => this.skip());
    this.synth = window.speechSynthesis || null;
    this.voicePick = null;
    const pickVoice = () => {
      const vs = this.synth?.getVoices?.() || [];
      const en = vs.filter((v) => /^en(-|_|$)/i.test(v.lang));
      const prefer = ['Samantha', 'Google UK English Female', 'Karen', 'Moira', 'Tessa', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny'];
      this.voicePick = prefer.map((n) => en.find((v) => v.name.includes(n))).find(Boolean) || en[0] || null;
    };
    if (this.synth) { pickVoice(); this.synth.addEventListener?.('voiceschanged', pickVoice); }
  }

  get speech() { return this.speaking > 0; }

  // ------------------------------------------------------------ what the steps call
  // a new caption: said after whatever is being said now ('' clears the line)
  narrate(text) {
    if (!text) { this.clear(); return; }
    this.add({ kind: 'caption', text });
  }

  // instructions and hints; resolves once they have been said (or the line is cleared)
  play(lines) {
    const ps = lines.filter(Boolean).map((l) => (typeof l === 'string' ? { text: l } : l))
      .map((l) => ({ kind: l.mood === 'hint' ? 'hint' : 'line', text: l.text, hold: l.hold }));
    if (!ps.length) return Promise.resolve();
    if (ps[0].kind === 'hint') this.interrupt();
    return Promise.all(ps.map((p) => this.add(p)));
  }

  // resolves when everything queued has been said (at most `max` ms)
  settled(max = 7000) {
    if (!this.cur && !this.queue.length) return Promise.resolve();
    return new Promise((res) => {
      const t = setTimeout(res, max);
      this.waiters.push(() => { clearTimeout(t); res(); });
    });
  }

  clear() {
    this.queue.forEach((p) => p.resolve?.());
    this.queue = [];
    this.cur?.resolve?.();
    this.cur = null;
    this.hush();
    this.base = '';
    this.text.replaceChildren();
    this.root.dataset.mood = '';
    this.talkClass();
    this.wake();
  }

  hush() {
    this.gen++;
    try { this.synth?.cancel(); } catch { /* no voice */ }
    this.speaking = 0;
    this.talkClass();
  }

  // tapping the line: show the rest of what is being said
  skip() {
    const p = this.cur;
    if (!p) return;
    if (p.k < p.words.length) { this.reveal(p, Infinity); return; }
    p.hold = 0;
    p.ended = true;
    this.hush();
  }

  // ------------------------------------------------------------ inside
  add(p) {
    return new Promise((res) => {
      p.resolve = res;
      if (p.kind === 'hint') this.queue.unshift(p); else this.queue.push(p);
      this.start();
    });
  }

  // a hint answers the student at once: finish what is being said now, without waiting for the voice
  interrupt() {
    const p = this.cur;
    if (p) { this.reveal(p, Infinity); this.done(p); }
    this.queue = this.queue.filter((q) => (q.kind === 'hint' ? (q.resolve?.(), false) : true));
    this.hush();
  }

  wake() {
    if (this.cur || this.queue.length) return;
    const w = this.waiters; this.waiters = [];
    w.forEach((f) => f());
  }

  talkClass() {
    const p = this.cur;
    const on = this.speaking > 0 || (!!p && p.k < p.words.length);
    this.root.classList.toggle('talking', on);
    document.documentElement.classList.toggle('is-talking', on);
  }

  // lay a piece out in the line, its words hidden until they are said
  begin(p) {
    this.cur = p;
    const parts = p.text.split(/(\s+)/).filter(Boolean);
    const nodes = [];
    const words = [];
    let spoken = '';
    for (const part of parts) {
      if (/^\s+$/.test(part)) { nodes.push(document.createTextNode(' ')); spoken += ' '; continue; }
      const el = document.createElement('span');
      el.className = 'w';
      el.innerHTML = angles(esc(part));
      nodes.push(el);
      words.push({ el, at: spoken.length });
      spoken += sayable(part);
    }
    if (p.kind === 'line' && this.base) {
      this.text.append(document.createTextNode(' '), ...nodes);
      this.base = `${this.base} ${p.text}`;
    } else {
      this.text.replaceChildren(...nodes);
      if (p.kind === 'caption') this.base = p.text;
    }
    if (p.kind === 'line' && !this.base) this.base = p.text;
    Object.assign(p, { words, k: 0, t: 0, waited: 0, started: false, heard: false, bound: false, ended: false, voiced: false });
    this.root.dataset.mood = p.kind === 'hint' ? 'hint' : '';
    if (this.sr) this.sr.textContent = p.text;
    if (this.reduced()) this.reveal(p, Infinity);
    p.voiced = this.speak(p, spoken);
    if (!p.voiced) p.started = true;
    this.talkClass();
  }

  speak(p, spoken) {
    if (!this.synth || this.muted()) return false;
    try {
      const u = new SpeechSynthesisUtterance(spoken);
      if (this.voicePick) u.voice = this.voicePick;
      u.rate = 1.0;
      u.pitch = 1.3;
      const g = this.gen;
      let on = false, over = false;
      const end = () => {
        if (over) return;
        over = true;
        if (on && g === this.gen) this.speaking = Math.max(0, this.speaking - 1);
        p.ended = true;
        if (this.cur === p) this.reveal(p, Infinity);
        this.talkClass();
      };
      u.onstart = () => { if (g !== this.gen) return; on = true; this.speaking += 1; p.started = true; p.heard = true; this.talkClass(); };
      u.onboundary = (e) => { if (e.name && e.name !== 'word') return; p.bound = true; if (this.cur === p) this.reveal(p, e.charIndex); };
      u.onend = end;
      u.onerror = end;
      this.synth.speak(u);
      return true;
    } catch {
      return false;
    }
  }

  // light up every word that starts at or before spoken position `upTo`
  reveal(p, upTo) {
    let n = 0;
    while (p.k < p.words.length && p.words[p.k].at <= upTo) {
      const el = p.words[p.k].el;
      el.classList.add('on');
      if (this.reduced()) el.classList.add('now');
      p.k++; n++;
    }
    if (n) {
      if (!p.voiced) this.voice?.();
      this.bump();
      this.talkClass();
    }
  }

  // the mouth bumps on each word
  bump() {
    if (!this.mouth || this.reduced()) return;
    this.mouth.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
  }

  done(p) {
    if (this.cur === p) this.cur = null;
    p.resolve?.();
    this.talkClass();
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.raf = this.update(dt) ? requestAnimationFrame(loop) : 0;
    };
    this.raf = requestAnimationFrame(loop);
  }

  update(dt) {
    let p = this.cur;
    if (!p) {
      p = this.queue.shift();
      if (!p) { this.wake(); return false; }
      this.begin(p);
    }
    // the voice can be slow to start, or never start (no voice, or the browser blocks it)
    if (!p.started) { p.waited += dt; if (p.waited > START_WAIT) p.started = true; }
    if (p.started && !p.bound && p.k < p.words.length) {
      p.t += dt;
      this.reveal(p, p.t * (p.voiced ? PACE_VOICE : PACE_QUIET));
    }
    const allShown = p.k >= p.words.length;
    // done when the voice has finished; or it never started (no voice); or after 14 s at most
    const voiceDone = !p.voiced || p.ended || (!p.heard && allShown) || p.waited + p.t > 14;
    if (!allShown || !voiceDone) return true;
    // said: a hint stays a moment, then the line goes back to the caption
    if (p.kind === 'hint') {
      p.hold = (p.hold ?? BACK) - dt;
      if (p.hold > 0) return true;
      this.text.replaceChildren(...this.base.split(/(\s+)/).filter(Boolean).map((s) => {
        if (/^\s+$/.test(s)) return document.createTextNode(' ');
        const el = document.createElement('span'); el.className = 'w on now'; el.innerHTML = angles(esc(s)); return el;
      }));
      this.root.dataset.mood = '';
      if (!this.reduced()) this.text.animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'none' }], { duration: 420, easing: 'ease-out' });
    }
    this.done(p);
    return true;
  }
}
