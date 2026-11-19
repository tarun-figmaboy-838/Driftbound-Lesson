// The narration's voice: recorded lines in assets/vo (the game's co-pilot voice, made with Kokoro by
// tools/vo/make_vo.py), each found by a hash of the line's exact text. Each line comes with the time
// every word starts, so the words on screen light up as they are said, and an analyser on the voice
// gives the mouth its movement. A line without a file stays silent (its words fill in at reading pace).
// The files are AAC (.m4a): the one format every browser decodes, Safari included.

// djb2 over UTF-16 code units; must match key() in tools/vo/make_vo.py
const hash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
};

export class Voice {
  constructor(sound) {
    this.sound = sound;            // the lesson's sounds: their audio context starts on the first tap
    this.lines = {};
    this.loading = new Map();
    this.src = null;
    this.want = null;
    this.t0 = 0;
    this.ready = fetch('assets/vo/manifest.json').then((r) => (r.ok ? r.json() : {}))
      .then((m) => { this.lines = m.lines || {}; }).catch(() => {});
  }

  has(text) { return !!text && !!this.lines[hash(text)]; }

  get ctx() { return this.sound.ctx; }

  // decode every line once the audio has started, a few at a time (all at once can make a browser drop
  // some, and it would compete with the intro's animation); a line needed sooner is loaded at once
  preload() {
    if (!this.ctx || this.preloading) return;
    this.preloading = true;
    const keys = Object.keys(this.lines);
    let i = 0;
    const next = () => { if (i < keys.length) this.load(keys[i++]).then(next); };
    for (let n = 0; n < 3; n++) next();
  }

  // one line as audio
  async decode(k) {
    const r = await fetch(`assets/vo/${k}.m4a`);
    if (!r.ok) throw new Error(r.status);
    return this.ctx.decodeAudioData(await r.arrayBuffer());
  }

  load(k) {
    if (!this.loading.has(k)) {
      const p = this.decode(k).catch(() => null);
      this.loading.set(k, p);
      p.then((buf) => { if (!buf && this.loading.get(k) === p) this.loading.delete(k); });   // a failed line is tried again when it is said
    }
    return this.loading.get(k);
  }

  // the voice's own output: louder than the effects, through an analyser for the mouth
  out() {
    const ctx = this.ctx;
    if (!this.bus || this.bus.context !== ctx) {
      this.bus = ctx.createGain();
      this.bus.gain.value = 1;
      this.an = ctx.createAnalyser();
      this.an.fftSize = 256;
      this.an.smoothingTimeConstant = 0.55;
      this.bins = new Uint8Array(this.an.frequencyBinCount);
      this.bus.connect(this.an);
      this.an.connect(ctx.destination);
    }
    return this.bus;
  }

  // say a line (stops the one before). onstart({ words }) when the sound starts (words: the time each
  // shown word starts), onend() when it is over. Returns false if this line can't be said.
  say(text, { onstart, onend } = {}) {
    this.stop();
    const ctx = this.ctx, k = hash(text), line = this.lines[k];
    if (!ctx || !line) return false;
    const want = this.want = {};
    this.load(k).then(async (buf) => {
      if (this.want !== want) return;                     // cut off before it started
      if (!buf) { onend?.(); return; }                    // this browser can't play the file
      if (ctx.state !== 'running' && !document.hidden) {  // try to wake the audio (a moment at most); a hidden tab stays quiet
        try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))]); } catch { /* blocked */ }
      }
      if (this.want !== want) return;
      if (ctx.state !== 'running') { onend?.(); return; } // the browser keeps the audio off: words fill in at reading pace
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.out());
      src.onended = () => { if (this.src === src) this.src = null; onend?.(); };
      this.src = src;
      this.t0 = ctx.currentTime;
      src.start();
      onstart?.({ words: line.words || [], seconds: buf.duration });
    });
    return true;
  }

  // seconds since the current line started
  elapsed() { return this.src ? this.ctx.currentTime - this.t0 : 0; }

  stop() {
    this.want = null;
    const s = this.src;
    this.src = null;
    if (s) { s.onended = null; try { s.stop(); } catch { /* already over */ } }
  }

  // the mouth: n bars (0..1). How far it opens comes from the voice's loudness; the frequencies give
  // the bars their shape, loudest in the middle, quieter to the sides
  bands(n = 7) {
    if (!this.src || !this.an) return null;
    this.wave = this.wave || new Uint8Array(this.an.fftSize);
    this.an.getByteTimeDomainData(this.wave);
    let sum = 0;
    for (const v of this.wave) { const x = (v - 128) / 128; sum += x * x; }
    const open = Math.min(1, Math.sqrt(sum / this.wave.length) * 4.2);
    this.an.getByteFrequencyData(this.bins);
    const lo = 2, hi = 44, per = (hi - lo) / n, band = [];
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = Math.floor(lo + i * per); j < Math.floor(lo + (i + 1) * per); j++) s += this.bins[j];
      band.push(s / per);
    }
    const top = Math.max(1, ...band);
    const order = [3, 2, 4, 1, 5, 0, 6], m = new Array(n).fill(0);
    band.map((v) => v / top).sort((a, b) => b - a).forEach((v, i) => { m[order[i] ?? i] = open * (0.25 + 0.75 * v); });
    return m;
  }
}
