// The game's comms box: portrait, ribbon nameplate and the line typing out (tap to finish it, tap
// again for the next one). In the lesson the last line of a scene stays on screen, so the student
// can read it at their own pace.
//
// line: { who: 'crew' | 'warden' | 'raider', name, text, mood: 'taunt' | 'laugh' | 'panic' | 'cheer', hold }

const NAMES = { crew: 'CO-PILOT', warden: 'THE WARDEN', raider: 'GLIB' };

export class Dialogue {
  constructor(root, voice = null) {
    this.root = root;
    this.nameEl = root.querySelector('.name');
    this.faceEl = root.querySelector('.portrait img');
    const lineEl = root.querySelector('.line');
    this.typed = document.createElement('span');
    this.rest = document.createElement('span');
    this.rest.className = 'rest';
    lineEl.replaceChildren(this.typed, this.rest);
    this.voice = voice;
    this.sr = document.getElementById('dialog-sr');   // screen readers hear each whole line once
    this.queue = [];
    this.line = null;
    this.chars = 0;
    this.hold = 0;
    this.onDone = null;
    this.raf = 0;
    this.last = 0;
    root.addEventListener('pointerdown', (e) => { e.preventDefault(); this.skip(); });
    // preload the three portraits so a new speaker never pops in blank
    for (const f of ['crew', 'warden', 'raider']) { const i = new Image(); i.src = `assets/ui/face-${f}.webp`; }
  }

  get busy() { return !!this.line && (this.chars < this.line.text.length || this.queue.length > 0); }

  play(lines, onDone) {
    this.queue = [...lines];
    this.onDone = onDone || null;
    this.next();
  }

  say(line, onDone) { this.play([line], onDone); }

  next() {
    const l = this.queue.shift();
    if (!l) {
      const done = this.onDone;
      this.onDone = null;
      done?.();
      return;
    }
    this.line = { ...l, name: l.name || NAMES[l.who] || '' };
    this.chars = 0;
    this.hold = 0;
    const r = this.root;
    r.dataset.face = l.who;
    r.dataset.mood = l.mood || '';
    const src = `assets/ui/face-${l.who}.webp`;
    if (!this.faceEl.src.endsWith(src)) this.faceEl.src = src;
    this.nameEl.textContent = this.line.name;
    if (this.sr) this.sr.textContent = `${this.line.name}: ${l.text}`;
    this.typed.textContent = '';
    this.rest.textContent = l.text;
    r.classList.remove('show', 'done');
    void r.offsetWidth;
    r.classList.add('show', 'typing');
    this.start();
  }

  skip() {
    if (!this.line) return;
    if (this.chars < this.line.text.length) this.chars = this.line.text.length;
    else if (this.queue.length) this.next();
  }

  clear() {
    this.queue.length = 0;
    this.onDone = null;
    this.line = null;
    this.root.classList.remove('show', 'typing', 'done');
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.raf = this.line ? requestAnimationFrame(loop) : 0;
    };
    this.raf = requestAnimationFrame(loop);
  }

  update(dt) {
    const l = this.line;
    if (!l) return;
    if (this.chars < l.text.length) {
      const before = Math.floor(this.chars / 3);
      this.chars = Math.min(l.text.length, this.chars + dt * 40);
      const n = Math.floor(this.chars);
      if (Math.floor(this.chars / 3) > before && l.text[n - 1] !== ' ') this.voice?.(l.who);
      this.typed.textContent = l.text.slice(0, n);
      this.rest.textContent = l.text.slice(n);
      return;
    }
    if (this.rest.textContent) { this.typed.textContent = l.text; this.rest.textContent = ''; }
    if (this.root.classList.contains('typing')) {
      this.root.classList.remove('typing');
      this.root.classList.toggle('done', this.queue.length > 0);   // the arrow only when more is coming
    }
    this.hold += dt;
    if (this.queue.length && this.hold >= (l.hold ?? 1.4)) this.next();
    else if (!this.queue.length && this.onDone && this.hold >= (l.hold ?? 0.6)) {
      const done = this.onDone;
      this.onDone = null;
      done();
    }
  }
}
