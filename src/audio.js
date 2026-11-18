// Small synthesized sounds (no files): talk blips, taps, right / wrong, pops, stamps and the launch.
// The audio context starts on the first tap or key press (browsers require a gesture).

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastBlip = 0;
    const start = () => {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.5;
        this.out.connect(this.ctx.destination);
      } catch { this.ctx = null; }
    };
    window.addEventListener('pointerdown', start, { passive: true });
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
    g.gain.linearRampToValueAtTime(peak, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    if (filter) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filter; g.connect(lp); lp.connect(this.out); }
    else g.connect(this.out);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  // comic talk blips while a line types: bright for the crew, low and grumbly for enemies
  blip(who) {
    const now = performance.now();
    if (now - this.lastBlip < 60) return;
    this.lastBlip = now;
    const enemy = who !== 'crew';
    const f = (enemy ? 150 : 460) * (0.82 + Math.random() * 0.45);
    this.tone(enemy ? 'sawtooth' : 'square', f, f * (Math.random() < 0.5 ? 1.22 : 0.82), 0.055, enemy ? 0.12 : 0.06, 0, enemy ? 1400 : 2400);
  }

  tap() { this.tone('triangle', 330, 560, 0.08, 0.2); }
  right() { [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.28, i * 0.07)); }
  wrong() { this.tone('square', 190, 150, 0.13, 0.18, 0, 1200); this.tone('square', 150, 118, 0.2, 0.18, 0.14, 1200); }
  locked() { this.tone('square', 220, 196, 0.09, 0.12, 0, 900); }
  pop() { this.tone('sine', 520, 1040, 0.1, 0.26); this.tone('triangle', 1560, 1560, 0.05, 0.08, 0.05); }
  tick(i = 0) { const f = 620 * 2 ** ((i * 3) / 12); this.tone('triangle', f, f, 0.1, 0.24); }
  snap() { this.tone('square', 220, 440, 0.06, 0.16, 0, 2400); this.tone('triangle', 880, 1320, 0.18, 0.26, 0.05); }
  stamp() { this.tone('sine', 150, 70, 0.24, 0.42); this.tone('triangle', 660, 990, 0.14, 0.2, 0.09); }
  star(i) { const f = [784, 988, 1319][i] || 1319; this.tone('triangle', f, f, 0.35, 0.32); this.tone('sine', f * 2, f * 2, 0.25, 0.1, 0.04); }
  whoosh() { this.tone('sawtooth', 120, 900, 0.45, 0.1, 0, 1800); }
  launch() { this.tone('sawtooth', 80, 1500, 1.1, 0.16, 0, 2200); [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.26, 0.24, 0.12 + i * 0.08)); }
}
