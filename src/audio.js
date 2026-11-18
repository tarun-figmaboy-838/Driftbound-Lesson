// Small synthesized sounds in the game's style (no files): talk blips, taps, right / wrong, stars.
// The audio context starts on the first tap or key press (browsers require a gesture).

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastBlip = 0;
    const start = () => {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.5;
        this.out.connect(this.ctx.destination);
      } catch { this.ctx = null; }
    };
    window.addEventListener('pointerdown', start, { once: false, passive: true });
    window.addEventListener('keydown', start);
  }

  ok() { return this.ctx && this.ctx.state === 'running' && !this.muted; }

  tone(type, f0, f1, dur, peak, t = 0, filter = 0) {
    if (!this.ok()) return;
    const c = this.ctx, at = c.currentTime + t;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let node = o.connect(g);
    if (filter) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filter; node = g.connect(lp); lp.connect(this.out); }
    else g.connect(this.out);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  // comic "talk" blips while a line types: bright for the crew, low and grumbly for enemies
  blip(who) {
    const now = performance.now();
    if (now - this.lastBlip < 55) return;
    this.lastBlip = now;
    const enemy = who !== 'crew';
    const f = (enemy ? 150 : 420) * (0.8 + Math.random() * 0.5);
    this.tone(enemy ? 'sawtooth' : 'square', f, f * (Math.random() < 0.5 ? 1.25 : 0.8), 0.06, enemy ? 0.16 : 0.1, 0, enemy ? 1400 : 2600);
  }

  tap() { this.tone('triangle', 880, 990, 0.07, 0.18); }
  right() { [660, 830, 990, 1320].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.3, i * 0.06)); }
  wrong() { this.tone('square', 180, 150, 0.14, 0.22, 0, 1200); this.tone('square', 150, 120, 0.2, 0.22, 0.16, 1200); }
  star(i) { const f = [784, 988, 1319][i] || 1319; this.tone('triangle', f, f, 0.35, 0.35); this.tone('sine', f * 2, f * 2, 0.25, 0.12, 0.04); }
  whoosh() { this.tone('sawtooth', 120, 900, 0.5, 0.12, 0, 1800); }
}
