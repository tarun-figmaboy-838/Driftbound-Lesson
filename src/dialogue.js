// The narration bar: each caption is read aloud (narrate), and instructions and hints type out on the
// bar's second line and are read aloud too (play), when the device has a voice and the sound is on.
// The bar's wave is the voice's mouth: it moves while anything is being said. Tapping the bar finishes
// the line. The last line stays on screen so it can be read at the student's pace.
// Screen readers get each whole line once.
//
// line: 'text' or { text, mood: 'cheer' | 'hint', hold }

const CPS = 40;   // typing speed, characters per second

export class Dialogue {
  constructor(root, { voice = null, sr = null, reduced = () => false, onLine = null, onSpeak = null, onWord = null, muted = () => false } = {}) {
    this.root = root;
    this.voice = voice;
    this.sr = sr;
    this.reduced = reduced;
    this.onLine = onLine;
    this.onSpeak = onSpeak;
    this.onWord = onWord;
    this.muted = muted;
    const lineEl = root.querySelector('.line');
    this.typed = document.createElement('span');
    this.rest = document.createElement('span');
    this.rest.className = 'rest';
    lineEl.replaceChildren(this.typed, this.rest);
    this.queue = [];
    this.line = null;
    this.chars = 0;
    this.hold = 0;
    this.resolve = null;
    this.raf = 0;
    this.speech = false;          // a voice is speaking the current line
    this.spokeAt = 0;
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

  // play lines in order; resolves when the last one has been heard (or is interrupted)
  play(lines) {
    this.finish();
    this.queue = lines.filter(Boolean).map((l) => (typeof l === 'string' ? { text: l } : { ...l }));
    return new Promise((res) => { this.resolve = res; this.next(); });
  }

  finish() { const r = this.resolve; this.resolve = null; r?.(); }

  hush() {
    try { this.synth?.cancel(); } catch { /* no voice */ }
    this.inFlight = 0;
    this.setSpeech(false);
  }

  setSpeech(on) {
    if (this.speech === on) return;
    this.speech = on;
    this.onSpeak?.(on);
    this.talkClass();
  }

  // the wave moves while something is being said, or a line is typing out
  talkClass() { this.root.classList.toggle('talking', this.speech || (!!this.line && this.chars < this.line.text.length)); }

  // read a caption aloud (it is already on screen)
  narrate(text) { if (text) this.speak(text); }

  clear() {
    this.queue = [];
    this.finish();
    this.hush();
    this.line = null;
    this.typed.textContent = '';
    this.rest.textContent = '';
    this.root.classList.remove('has-more', 'talking', 'has-line');
  }

  // say something aloud, after whatever is already being said; maths symbols are read as words
  speak(text) {
    if (!this.synth || this.muted()) return false;
    try {
      const said = text.replace(/∠/g, 'angle ').replace(/°/g, ' degrees').replace(/−/g, ' minus ');
      const u = new SpeechSynthesisUtterance(said);
      if (this.voicePick) u.voice = this.voicePick;
      u.rate = 1.0;
      u.pitch = 1.3;
      const done = () => { this.inFlight = Math.max(0, (this.inFlight || 0) - 1); if (!this.inFlight) this.setSpeech(false); };
      u.onstart = () => this.setSpeech(true);
      u.onend = done;
      u.onerror = done;
      this.inFlight = (this.inFlight || 0) + 1;
      this.spokeAt = performance.now();
      this.synth.speak(u);
      return true;
    } catch {
      return false;
    }
  }

  next() {
    const l = this.queue.shift();
    if (!l) { this.finish(); return; }
    this.line = l;
    this.root.classList.add('has-line');
    this.chars = this.reduced() ? l.text.length : 0;
    this.hold = 0;
    const r = this.root;
    r.dataset.mood = '';
    void r.offsetWidth;                         // restart the hint's pop
    r.dataset.mood = l.mood || '';
    if (this.sr) this.sr.textContent = l.text;
    this.paint();
    r.classList.toggle('has-more', this.queue.length > 0);
    this.speak(l.text);
    this.talkClass();
    this.start();
  }

  skip() {
    if (!this.line) return;
    if (this.chars < this.line.text.length) this.chars = this.line.text.length;
    else { this.hold = 99; this.hush(); }
    this.start();
  }

  paint() {
    const k = Math.floor(this.chars);
    this.typed.textContent = this.line.text.slice(0, k);
    this.rest.textContent = this.line.text.slice(k);
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
    const l = this.line;
    if (!l) return false;
    const len = l.text.length;
    if (this.chars < len) {
      const before = Math.floor(this.chars / 3);
      this.chars = Math.min(len, this.chars + dt * CPS);
      const k = Math.floor(this.chars);
      if (Math.floor(this.chars / 3) > before && l.text[k - 1] !== ' ') this.voice?.();
      this.paint();
      return true;
    }
    if (this.rest.textContent) { this.paint(); this.talkClass(); }
    // wait for the voice to finish the line (at most 10 s, in case a voice never reports its end)
    if (this.speech && performance.now() - this.spokeAt < 10000) return true;
    this.hold += dt;
    const need = this.queue.length ? (l.hold ?? Math.min(2.2, 0.8 + len / 60)) : (l.hold ?? 0.3);
    if (this.hold < need) return true;
    if (this.queue.length) { this.next(); return true; }
    this.root.classList.remove('has-more');
    this.finish();
    return false;
  }
}
