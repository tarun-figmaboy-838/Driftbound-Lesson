// The narration: one line of text beside the voice (the AI mouth), read aloud, word by word.
//
// Everything the voice says appears in that one line. The voice is recorded (src/engine/voice.js): each word
// lights up at the moment the recording says it, and the mouth's bars follow the voice itself. With the
// sound off (or a line without a recording) the words fill in at reading pace.
//   caption      the step's sentence from the deck: replaces the line
//   instruction  ("Drag B."): said after the caption, then takes the line and stays there (it is what to
//                do now), so the line never runs a question and a task together
//   hint         (a wrong answer, Next too early): takes the line at once while it is said, then the
//                line goes back to the caption or instruction
// One sentence at a time: a piece that goes on with the sentence before it (it starts in lower case)
// joins the line instead of taking it.
// Pieces are said in order: a new caption waits for the one before it to be said.
// Tapping the line finishes it. Screen readers get each whole piece once, through the sr element.

const PACE = 17;           // characters a second the line fills in without a voice
const BACK = 2.4;          // seconds a hint stays after it has been said
const START_WAIT = 2;      // seconds to wait for a recording to start before filling in without it

import { esc, angles } from './ui.js';

export class Dialogue {
  constructor(root, { text, mouth = null, speaker = null, blip = null, sr = null, reduced = () => false, muted = () => false } = {}) {
    this.root = root;
    this.text = text;          // the narration line
    this.mouth = mouth;
    this.speaker = speaker;    // the recorded voice (src/engine/voice.js)
    this.blip = blip;          // a tiny blip per word when there is no voice
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
  }

  get speech() { return this.speaking > 0; }

  // ------------------------------------------------------------ what the steps call
  // a new caption: said after whatever is being said now ('' clears the line)
  narrate(text) {
    if (!text) { this.clear(); return; }
    this.add({ kind: 'caption', text });
  }

  // instructions and hints; resolves once they have been said (or the line is cleared). A long hint comes
  // in pieces, said one after another: a new sentence takes the line, a piece that goes on with the
  // sentence (it starts in lower case) joins it, and the line only goes back to the caption after the last
  play(lines) {
    const ps = lines.filter(Boolean).map((l) => (typeof l === 'string' ? { text: l } : l))
      .map((l) => ({ kind: l.mood === 'hint' ? 'hint' : 'line', text: l.text, hold: l.hold, join: /^[a-z]/.test(l.text) }));
    if (!ps.length) return Promise.resolve();
    if (ps[0].kind === 'hint') this.interrupt();
    ps.forEach((p, i) => {
      p.more = p.kind === 'hint' && ps[i + 1]?.kind === 'hint';
      if (p.more && p.hold == null) p.hold = 0.35;     // a short breath between the pieces
    });
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
    this.speaker?.stop();
    this.speaking = 0;
    this.talkClass();
    this.lips(null);
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
      if (p.kind === 'hint') {                         // hints go before the rest, in their own order
        const i = this.queue.findIndex((q) => q.kind !== 'hint');
        this.queue.splice(i < 0 ? this.queue.length : i, 0, p);
      } else this.queue.push(p);
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
    let at = 0;
    for (const part of parts) {
      if (/^\s+$/.test(part)) { nodes.push(document.createTextNode(' ')); at += 1; continue; }
      const el = document.createElement('span');
      el.className = 'w';
      el.innerHTML = angles(esc(part));
      nodes.push(el);
      words.push({ el, at });
      at += part.length;
    }
    if (p.join && this.text.childNodes.length) {       // goes on with the sentence before it: joins the line
      this.text.append(document.createTextNode(' '), ...nodes);
      if (p.kind === 'line') this.base = `${this.base} ${p.text}`.trim();
    } else {                                           // a new sentence takes the line
      this.text.replaceChildren(...nodes);
      if (p.kind !== 'hint') this.base = p.text;
    }
    Object.assign(p, { words, k: 0, t: 0, age: 0, waited: 0, started: false, heard: false, timing: null, ended: false, voiced: false });
    this.root.dataset.mood = p.kind === 'hint' ? 'hint' : '';
    if (this.sr) this.sr.textContent = p.text;
    if (this.reduced()) this.reveal(p, Infinity);
    p.voiced = this.speak(p);
    if (!p.voiced) p.started = true;
    this.talkClass();
  }

  // say a piece with its recording; the words then follow the recording's own timing
  speak(p) {
    if (!this.speaker || this.muted() || !this.speaker.has(p.text)) return false;
    const g = this.gen;
    let on = false, over = false;
    const end = () => {
      if (over) return;
      over = true;
      if (on && g === this.gen) this.speaking = Math.max(0, this.speaking - 1);
      p.ended = true;
      if (this.cur === p) this.reveal(p, Infinity);
      this.talkClass();
      if (!this.speaking) this.lips(null);
    };
    return this.speaker.say(p.text, {
      onstart: ({ words }) => {
        if (g !== this.gen) return;
        on = true;
        this.speaking += 1;
        p.started = p.heard = true;
        if (words.length === p.words.length) p.timing = words;
        this.talkClass();
      },
      onend: end,
    });
  }

  // the mouth follows the voice: each bar's height comes from the sound (null puts it back at rest)
  lips(bands) {
    const on = !!bands;
    document.documentElement.classList.toggle('lipsync', on);
    if (!on && !this.lipBars) return;
    this.lipBars = this.lipBars || [];
    if (on) this.lipBars = [...document.querySelectorAll('#narration .voice i, .drone__screen i')];
    this.lipBars.forEach((el, i) => { if (on) el.style.setProperty('--lv', bands[i % 7].toFixed(3)); else el.style.removeProperty('--lv'); });
    if (!on) this.lipBars = null;
  }

  // light up every word that starts at or before position `upTo` in the line
  reveal(p, upTo) {
    let n = 0;
    while (p.k < p.words.length && p.words[p.k].at <= upTo) {
      const el = p.words[p.k].el;
      el.classList.add('on');
      if (this.reduced()) el.classList.add('now');
      p.k++; n++;
    }
    if (n) {
      if (!p.heard) this.blip?.();
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
    p.age += dt;
    // the recording can take a moment to start, or never start (no file, or the browser can't play it)
    if (!p.started) { p.waited += dt; if (p.waited > START_WAIT) p.started = true; }
    if (p.timing) {                                    // each word as the recording says it
      const t = this.speaker.elapsed();
      let k = p.k;
      while (k < p.words.length && p.timing[k] <= t) k++;
      if (k > p.k) this.reveal(p, p.words[k - 1].at);
    } else if (p.started && p.k < p.words.length) {    // no timing: an even reading pace
      p.t += dt;
      this.reveal(p, p.t * PACE);
    }
    if (this.speaking) this.lips(this.speaker.bands(7));
    const allShown = p.k >= p.words.length;
    // done when the voice has finished; or it never started (no voice); or after 20 s at most
    const voiceDone = !p.voiced || p.ended || (!p.heard && allShown) || p.age > 20;
    if (!allShown || !voiceDone) return true;
    // said: a hint stays a moment, then the line goes back to the caption
    if (p.kind === 'hint') {
      p.hold = (p.hold ?? BACK) - dt;
      if (p.hold > 0) return true;
      if (p.more && this.queue[0]?.kind === 'hint') { this.done(p); return true; }   // the next piece takes over
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
