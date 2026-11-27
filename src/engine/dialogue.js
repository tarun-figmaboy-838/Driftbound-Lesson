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

// the words that carry the idea are lit in gold: the terms the lesson teaches, and every angle size
const KEY = /\b(two rays|same point|vertex|common arm|shared arm|adjacent|linear pair|straight line|complementary|supplementary|vertically opposite|opposite|equal|acute|right angle|obtuse|square corner|overlap)\b|\d+°/gi;

// a line as word spans (each word lights up as it is said); words inside a key term get .key
function wordSpans(text, cls = 'w') {
  const keys = [...text.matchAll(KEY)].map((m) => [m.index, m.index + m[0].length]);
  const nodes = [], words = [];
  let at = 0;
  for (const part of text.split(/(\s+)/).filter(Boolean)) {
    if (/^\s+$/.test(part)) { nodes.push(document.createTextNode(' ')); at += 1; continue; }
    const el = document.createElement('span');
    el.className = keys.some(([a, b]) => at < b && at + part.length > a) ? `${cls} key` : cls;
    el.innerHTML = angles(esc(part));
    nodes.push(el);
    words.push({ el, at });
    at += part.length;
  }
  return { nodes, words };
}

// which word of a line `word` falls in (counting from 0), looking from word `from` on; -1 if it is not there
function wordIndex(text, word, from = 0) {
  const low = text.toLowerCase(), w = word.toLowerCase();
  for (let i = low.indexOf(w); i >= 0; i = low.indexOf(w, i + 1)) {
    const n = (text.slice(0, i).match(/\S+/g) || []).length - (i > 0 && /\S/.test(text[i - 1]) ? 1 : 0);
    if (n >= from) return n;
  }
  return -1;
}

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
  // sentence (it starts in lower case, or says join: true) joins it, and the line only goes back to the caption after the last
  play(lines) {
    const ps = lines.filter(Boolean).map((l) => (typeof l === 'string' ? { text: l } : l))
      .map((l) => ({ kind: l.mood === 'hint' || l.mood === 'praise' ? 'hint' : 'line', mood: l.mood, text: l.text, hold: l.hold, join: l.join ?? /^[a-z]/.test(l.text) }));
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

  // resolves when the voice says `word`: in the line being said, or the first line waiting to be said that
  // has it. With no word, when the last line waiting to be said starts. This is how the figure keeps time
  // with the narration: a part of the picture comes in the moment the voice names it. Resolves at once if
  // no such line is coming (and when the line is skipped, cut off or cleared).
  cue(word = '') {
    const ps = [this.cur, ...this.queue].filter(Boolean);
    let p = null, n = 0;
    if (!word) {
      p = [...ps].reverse().find((q) => q.kind !== 'hint') || null;
      if (p === this.cur && p.k > 0) p = null;             // already started
    } else {
      for (const q of ps) {
        if (q.kind === 'hint') continue;                   // praise and hints are not what the figure follows
        n = wordIndex(q.text, word, q === this.cur ? q.k : 0);
        if (n >= 0) { p = q; break; }
      }
    }
    if (!p) return Promise.resolve();
    return new Promise((res) => { (p.cues = p.cues || []).push({ n, fn: res }); });
  }

  // drop what is still waiting to be said (a question answered before it was read out)
  dropQueued() {
    this.queue.forEach((p) => p.resolve?.());
    this.queue = [];
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
      p.resolve = () => { this.cueUp(p, Infinity); res(); };   // a piece that is over lets every cue in it go
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
    const { nodes, words } = wordSpans(p.text);
    if (p.join && this.text.childNodes.length) {       // goes on with the sentence before it: joins the line
      this.text.append(document.createTextNode(' '), ...nodes);
      if (p.kind === 'line') this.base = `${this.base} ${p.text}`.trim();
    } else {                                           // a new sentence takes the line
      this.text.replaceChildren(...nodes);
      if (p.kind !== 'hint') this.base = p.text;
    }
    Object.assign(p, { words, k: 0, t: 0, age: 0, waited: 0, started: false, heard: false, timing: null, ended: false, voiced: false });
    this.root.dataset.mood = p.kind === 'hint' ? (p.mood === 'praise' ? 'praise' : 'hint') : '';
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
    if (on) this.lipBars = [...document.querySelectorAll('#narration .voice i')];
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
    this.cueUp(p, p.k);
    if (n) {
      if (!p.heard) this.blip?.();
      this.bump();
      this.talkClass();
    }
  }

  // the cues waiting on a word that has now been said (k: how many words of the piece have been said)
  cueUp(p, k) {
    if (!p.cues?.length) return;
    const due = p.cues.filter((q) => q.n < k);
    p.cues = p.cues.filter((q) => q.n >= k);
    due.forEach((q) => q.fn());
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
      if (this.queue.length) { this.done(p); return true; }  // a new line is waiting: it takes the line (no flash of the old one)
      this.text.replaceChildren(...wordSpans(this.base, 'w on now').nodes);
      this.root.dataset.mood = '';
      if (!this.reduced()) this.text.animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'none' }], { duration: 420, easing: 'ease-out' });
    }
    this.done(p);
    return true;
  }
}
