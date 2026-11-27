// The opening, after Play. The camera flies into the satellite and stops at its entry gate; the gate
// checks in (its lights blink, a scan sweeps the doors) and slides open; the camera walks in at eye
// height, down the corridor and through the doorway into the command hall, where it faces the hall's 2nd
// wall (its monitors); it turns right past the entrance and the hologram table and stops on the plain
// front wall. The projector on the floor there wakes up and the lesson forms in its light, as a hologram.
// Then the lesson starts.
//
// Pictures (Figma AI, assets/ui/intro): the gate, cut into its frame and the two door halves (the halves
// slide under the frame), and the corridor, its far doorway cut open so the real hall (the lesson's own
// backdrop, assets/ui/bg) is seen through it. The walk is one camera path: the gate, the corridor's far
// end and the hall's front wall each stand at their own distance, so near things grow faster than far
// ones, and the hall arrives exactly at the lesson's framing (no cut, no crossfade). A step bob, a slight
// sway and roll, and a footstep on each step make it feel like a person walking. Through the doorway the
// hall is the look-round strip, turned to the 2nd wall, so the walk and the turn are one view.

import { lerp, clamp, EASE } from '../engine/ui.js';

const ART = { w: 1536, h: 1024 };
const GATE = { x0: 456, y0: 138, x1: 1077, y1: 818, seam: 767, cy: 478, lamps: [[358, 438], [1176, 438]] };
const DOOR = { x0: 665, y0: 411, x1: 868, y1: 572 };      // the corridor's far doorway (its vanishing point)
const STATION = [762, 556];                               // the front of the station on the start banner
const BANNER_Y = 0.45;                                    // the banner's object-position (y)

// distances along the walk, in corridor lengths (0: in front of the gate, 1: the far doorway)
const D_GATE = 0.24;          // the gate plane
const D_WALL = 0.62;          // the hall's front wall, beyond where the walk stops
const STEP_HZ = 1.9;          // steps a second at walking pace

const E = EASE;

const SRC = ['gate-frame', 'door-l', 'door-r', 'corridor'].map((f) => `assets/ui/intro/${f}.webp`);
// the hall all the way round (Figma AI): front (the lesson's own picture), right, back (the entrance),
// left and the front again, blended at the seams; period is one full turn in picture pixels, turn the
// time a full turn would take; start: where the walk-in faces (a quarter turn: the 2nd wall)
const PANO = { src: 'assets/ui/intro/hall-360.webp', w: 5920, h: 1024, period: 4384, turn: 6400, start: 0.25 };
const pics = [...SRC, PANO.src].map((src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; });

class Skip extends Error {}

export async function playIntro({ banner, sound }) {
  const body = document.body;
  const room = document.querySelector('.room');
  const hq = document.querySelector('.hq');
  const screen = document.getElementById('screen');
  const bar = document.querySelector('.bar');
  const mute = document.getElementById('mute');
  const pic = banner.querySelector('.start__pic');

  let skipped = false, done = false, endIntro;
  const ended = new Promise((r) => { endIntro = r; });
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  // a timed stretch of the film: fn(eased, raw) every frame; stops at once when the intro is skipped
  const run = async (ms, fn = () => {}, ease = (t) => t) => {
    const t0 = performance.now();
    for (;;) {
      if (skipped) throw new Skip();
      const t = Math.min(1, (performance.now() - t0) / ms);
      fn(ease(t), t);
      if (t >= 1) return;
      await frame();
    }
  };
  const wait = (ms) => run(ms);

  // ---------------------------------------------------------------- the set
  body.classList.add('intro-run');                 // the lesson's screen and buttons wait for the projector
  const set = document.createElement('div');
  set.className = 'intro';
  set.setAttribute('aria-hidden', 'true');
  set.innerHTML = `
    <div class="intro__layer intro__corridor"><img src="${SRC[3]}" alt="" draggable="false"></div>
    <div class="intro__layer intro__gate">
      <img class="intro__door intro__door--l" src="${SRC[1]}" alt="" draggable="false">
      <img class="intro__door intro__door--r" src="${SRC[2]}" alt="" draggable="false">
      <i class="intro__spill"></i><i class="intro__scan"></i>
      <img class="intro__frame" src="${SRC[0]}" alt="" draggable="false">
      ${GATE.lamps.map(([x, y]) => `<i class="intro__lamp" style="left:${x}px;top:${y}px"></i>`).join('')}
      <i class="intro__steam"></i><i class="intro__steam"></i><i class="intro__steam"></i>
    </div>
    <i class="intro__vignette"></i><i class="intro__bloom"></i>`;
  banner.appendChild(set);
  const gate = set.querySelector('.intro__gate');
  const corridor = set.querySelector('.intro__corridor');
  const doorL = set.querySelector('.intro__door--l'), doorR = set.querySelector('.intro__door--r');
  const spill = set.querySelector('.intro__spill'), scan = set.querySelector('.intro__scan');
  const lamps = [...set.querySelectorAll('.intro__lamp')], steam = [...set.querySelectorAll('.intro__steam')];
  const bloom = set.querySelector('.intro__bloom'), vignette = set.querySelector('.intro__vignette');

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'intro-skip';
  skipBtn.innerHTML = 'Skip<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l6 6-6 6M13 6l6 6-6 6"/></svg>';
  body.appendChild(skipBtn);
  const skip = () => { if (!done) { skipped = true; finish(); } };
  skipBtn.addEventListener('click', skip);
  const onKey = (e) => { if (e.key === 'Escape') skip(); };
  window.addEventListener('keydown', onKey);

  const proj = document.querySelector('.projector');
  let pano = null;
  function finish() {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey);
    skipBtn.remove();
    banner.remove();
    pano?.remove();
    proj.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    proj.querySelectorAll('.projector__beam, .projector__glow').forEach((el) => { el.style.opacity = ''; });
    [screen, bar, mute].forEach((el) => { el.style.opacity = ''; });
    room.style.transform = '';
    [screen, bar, mute].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    body.classList.remove('intro-run');
    body.classList.add('is-on');
    endIntro();
  }

  // a layer of art placed so its point (fx, fy) sits at the middle of the window, z times the smallest
  // size that still covers the window around that point; ox, oy, roll: the camera's bob
  const coverAt = (fx, fy) => {
    const W = innerWidth, H = innerHeight;
    return Math.max(W / (2 * fx), W / (2 * (ART.w - fx)), H / (2 * fy), H / (2 * (ART.h - fy)));
  };
  const place = (el, fx, fy, z, cam) => {
    const k = coverAt(fx, fy) * z;
    el.style.transform = `translate(${(innerWidth / 2 + cam.x).toFixed(2)}px, ${(innerHeight / 2 + cam.y).toFixed(2)}px) rotate(${cam.r.toFixed(3)}deg) scale(${k.toFixed(5)}) translate(${-fx}px, ${-fy}px)`;
    return k;
  };
  const still = { x: 0, y: 0, r: 0 };

  try {
    await Promise.race([Promise.all(pics.map((i) => i.decode().catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]);

    // ---------------------------------------------------------------- 1. into the satellite
    // the banner zooms towards the station's front (faster and faster), the gate fades in out of a flash
    const W = innerWidth, H = innerHeight;
    const cs = getComputedStyle(pic);
    const m0 = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
    pic.style.animation = 'none';
    pic.style.transformOrigin = '0 0';
    const from = new DOMMatrix().translate(pic.offsetWidth / 2, pic.offsetHeight / 2).multiply(m0).translate(-pic.offsetWidth / 2, -pic.offsetHeight / 2);
    const s0 = Math.max(W / 1536, H / 1024);
    const P = [(W - 1536 * s0) / 2 + STATION[0] * s0, (H - 1024 * s0) * BANNER_Y + STATION[1] * s0];
    const Q0 = from.transformPoint(new DOMPoint(P[0], P[1]));
    const zoom0 = Math.hypot(from.a, from.b), K = 8;
    const gateFocus = [GATE.seam, GATE.cy];
    gate.style.opacity = '0';
    corridor.style.visibility = 'hidden';           // behind the gate: only seen once the doors open
    const title = banner.querySelector('.start__title');
    title?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: 'ease-in', fill: 'forwards' });
    place(gate, ...gateFocus, 1, still);
    place(corridor, (DOOR.x0 + DOOR.x1) / 2, (DOOR.y0 + DOOR.y1) / 2, 1, still);
    sound.whoosh();
    await run(1750, (u) => {
      const z = Math.exp(lerp(Math.log(zoom0), Math.log(K), u ** 2.4));
      const qx = lerp(Q0.x, W / 2, E.sine(u)), qy = lerp(Q0.y, H / 2, E.sine(u));
      pic.style.transform = `translate(${qx - z * P[0]}px, ${qy - z * P[1]}px) scale(${z})`;
      pic.style.filter = `blur(${(3 * u ** 3).toFixed(2)}px)`;
      const f = clamp((u - 0.7) / 0.3, 0, 1);
      gate.style.opacity = String(E.sine(f));
      place(gate, ...gateFocus, lerp(0.94, 1, f), still);
      bloom.style.opacity = String(0.5 * Math.sin(Math.PI * clamp((u - 0.62) / 0.38, 0, 1)));
    });
    pic.style.visibility = 'hidden';

    // ---------------------------------------------------------------- 2. arrive at the gate and stop
    const zGate = 1.1;
    await run(1300, (e, t) => {
      place(gate, ...gateFocus, lerp(1, zGate, e), { x: 0, y: Math.sin(t * Math.PI) * 2, r: 0 });
      bloom.style.opacity = String(0.5 * (1 - t) ** 2 * 0);
    }, E.out);
    bloom.style.opacity = '0';

    // ---------------------------------------------------------------- 3. the gate checks in and opens
    for (let i = 0; i < 2; i++) {                    // two blinks
      lamps.forEach((l) => l.classList.add('blink'));
      sound.beep(i);
      await wait(150);
      lamps.forEach((l) => l.classList.remove('blink'));
      await wait(170);
    }
    scan.style.opacity = '1';
    await run(620, (e) => { scan.style.transform = `translateY(${(e * (GATE.y1 - GATE.y0 - 26)).toFixed(1)}px)`; scan.style.opacity = String(Math.sin(Math.PI * e)); }, E.inOut);
    lamps.forEach((l) => l.classList.add('go'));     // cleared: the lights turn green
    sound.unlatch();
    await wait(260);
    sound.clunk();                                   // the latches let go: the doors settle back a touch
    await run(160, (e) => { const s = 1 - 0.012 * Math.sin(Math.PI * e); doorL.style.transform = doorR.style.transform = `scale(${s})`; });
    // the room behind the corridor's doorway is the lesson's own hall: it has to be there from now on
    banner.style.background = 'transparent';
    body.classList.add('is-on');
    room.style.transformOrigin = '0 0';
    // the hall through the doorway: the look-round strip, turned to the 2nd wall (the walk-in faces it). On
    // wide screens one wall of the strip sits exactly where the lesson's own hall picture does; on phones
    // (the tall picture) the strip covers the window, and dissolves into the tall picture after the turn
    const roomPic = room.querySelector('.room__pic');
    pano = document.createElement('div');
    pano.className = 'intro-pano';
    pano.setAttribute('aria-hidden', 'true');
    pano.innerHTML = `<img src="${PANO.src}" alt="" draggable="false">`;
    const strip = pano.firstChild;
    const wide = !/tall/.test(roomPic.dataset.src || roomPic.src);
    const RR = roomPic.getBoundingClientRect();
    const ps = wide ? RR.width / 1536 : Math.max(innerHeight / PANO.h, innerWidth / 1536) * 1.04;
    const px0 = wide ? RR.left : innerWidth / 2 - 768 * ps;
    const py0 = wide ? RR.top : (innerHeight - PANO.h * ps) / 2;
    const F = { left: px0, top: py0, right: px0 + 1536 * ps, bottom: py0 + 1024 * ps };   // one wall, on screen
    const stripAt = (p, y = py0) => { strip.style.transform = `translate(${(px0 - p * PANO.period * ps).toFixed(2)}px, ${y.toFixed(2)}px)`; };
    Object.assign(strip.style, { width: `${PANO.w * ps}px`, height: `${PANO.h * ps}px` });
    stripAt(PANO.start);
    pano.style.transformOrigin = '0 0';
    body.appendChild(pano);
    if (title) title.style.visibility = 'hidden';
    corridor.style.visibility = '';
    sound.hiss();
    steam.forEach((s, i) => s.classList.add(`puff${i}`));
    const half = GATE.seam - GATE.x0 + 24;
    await run(1250, (e, t) => {
      const gap = e * half;
      doorL.style.transform = `translateX(${-gap}px)`;
      doorR.style.transform = `translateX(${gap}px)`;
      spill.style.width = `${(2 * gap + 70).toFixed(1)}px`;
      spill.style.opacity = String(clamp(gap / 30, 0, 1) * (1 - t) ** 0.7 * 0.9);
    }, (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2));
    spill.style.opacity = '0';

    // ---------------------------------------------------------------- 4. walk in: through the gate, down the corridor, into the hall
    // the hall: the room picture as the lesson frames it, zoomed about the screen's middle
    const css = getComputedStyle(document.documentElement);
    const sv = (k) => parseFloat(css.getPropertyValue(k)) || 0;
    const R = F;                                     // the hall's wall as the lesson frames it
    const O = [sv('--sx') + sv('--sw') / 2, sv('--sy') + sv('--sh') / 2];
    const doorF = [(DOOR.x0 + DOOR.x1) / 2, (DOOR.y0 + DOOR.y1) / 2];

    // where the walk stops: just through the doorway (once it fills the window, plus the bob's margin)
    const kC = coverAt(...doorF);
    const dFill = 1 - kC * Math.min((DOOR.x1 - DOOR.x0) / (innerWidth + 40), (DOOR.y1 - DOOR.y0) / (innerHeight + 40));
    const dStop = dFill + 0.035;
    const wall = dStop + D_WALL;
    // the walking pace: speeds up over the first steps, steady, slows to a stop
    const T = 5200, ta = 900, td = 1300;
    const vmax = dStop / (T - ta / 2 - td / 2);
    const distAt = (ms) => {
      const t = clamp(ms, 0, T);
      if (t < ta) return vmax * t * t / (2 * ta);
      if (t < T - td) return vmax * (t - ta / 2);
      const r = T - t;
      return dStop - vmax * r * r / (2 * td);
    };
    const speedAt = (ms) => clamp(Math.min(ms / ta, (T - ms) / td, 1), 0, 1);
    const stepLen = (vmax * 1000) / STEP_HZ;        // distance per step at walking pace
    const A = clamp(innerHeight * 0.0065, 3, 7);     // bob height, px
    let lastStep = 0, gateGone = false, corridorGone = false;

    await run(T, (_, t) => {
      const ms = t * T, d = distAt(ms), v = speedAt(ms);
      // the step bob: the eye dips on each footfall, sways side to side once a stride, rolls a hair
      const ph = d / stepLen;
      const amp = A * Math.min(1, v * 1.4);
      const cam = { x: amp * 0.55 * Math.sin(Math.PI * ph), y: amp * Math.cos(2 * Math.PI * ph) - amp, r: 0.35 * Math.min(1, v * 1.4) * Math.sin(Math.PI * ph) };
      if (Math.floor(ph) > lastStep) { lastStep = Math.floor(ph); if (v > 0.15) sound.step(); }

      // the gate passes (it is the nearest), the corridor opens up, the hall's wall grows slowest
      if (!gateGone) {
        const zg = zGate * D_GATE / Math.max(0.001, D_GATE - d);
        const k = place(gate, ...gateFocus, zg, cam);
        if ((GATE.seam - GATE.x0) * k > innerWidth / 2 + 30 && (GATE.cy - GATE.y0) * k > innerHeight / 2 + 30 && (GATE.y1 - GATE.cy) * k > innerHeight / 2 + 30) {
          gateGone = true; gate.style.display = 'none';
        }
      }
      let hole = null;
      if (!corridorGone) {
        const k = place(corridor, ...doorF, 1 / (1 - d), cam);
        const hx = innerWidth / 2 + cam.x, hy = innerHeight / 2 + cam.y;
        hole = { l: hx - (doorF[0] - DOOR.x0) * k, r: hx + (DOOR.x1 - doorF[0]) * k, t: hy - (doorF[1] - DOOR.y0) * k, b: hy + (DOOR.y1 - doorF[1]) * k };
        if (hole.l < -20 && hole.r > innerWidth + 20 && hole.t < -20 && hole.b > innerHeight + 20) { corridorGone = true; corridor.style.display = 'none'; hole = null; }
      }
      vignette.style.opacity = String(1 - clamp((d - dFill) / (dStop - dFill), 0, 1));

      // the hall: far away, so it barely bobs; never smaller than what it must cover
      const rc = { x: cam.x * 0.4, y: cam.y * 0.4 };
      let z = (wall - dStop) / (wall - d);
      const V = hole
        ? { l: Math.max(0, hole.l), r: Math.min(innerWidth, hole.r), t: Math.max(0, hole.t), b: Math.min(innerHeight, hole.b) }
        : { l: 0, r: innerWidth, t: 0, b: innerHeight };
      const need = [
        (O[0] + rc.x - V.l) / (O[0] - R.left), (V.r - O[0] - rc.x) / (R.right - O[0]),
        (O[1] + rc.y - V.t) / (O[1] - R.top), (V.b - O[1] - rc.y) / (R.bottom - O[1]),
      ].filter((x) => Number.isFinite(x));
      z = Math.max(z, ...need.map((x) => x + 0.002));
      const tx = O[0] + rc.x - z * O[0], ty = O[1] + rc.y - z * O[1];
      pano.style.transform = t >= 1 ? '' : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${z.toFixed(5)})`;
    });
    pano.style.transform = '';
    set.remove();
    banner.remove();

    // ---------------------------------------------------------------- 5. look round the hall
    // from the 2nd wall the camera turns right, past the entrance and the hologram table, slowing at each
    // wall as if looking at it, and stops on the front wall: the lesson's own view of the hall
    const U0 = 4 * PANO.start;
    const turnAt = (u) => { const U = lerp(U0, 4, E.sine(u)); return (U - 0.72 * Math.sin(2 * Math.PI * U) / (2 * Math.PI)) / 4; };
    const turnMs = PANO.turn * (1 - PANO.start);
    let lastWall = U0;
    await run(turnMs, (_, t) => {
      const p = turnAt(t);
      const v = Math.abs(turnAt(Math.min(1, t + 0.005)) - p) * PANO.period * ps / (0.005 * turnMs / 1000);   // px a second
      stripAt(p, py0 + Math.sin(t * Math.PI * 3) * 1.5 * Math.sin(Math.PI * t));
      strip.style.filter = v > 300 ? `blur(${Math.min(1.6, v / 2400).toFixed(2)}px)` : '';
      const wall = Math.floor(lerp(U0, 4, E.sine(t)) + 0.5);
      if (wall > lastWall) { lastWall = wall; if (wall < 4) sound.noise(0.6, { f: 700, f1: 1600, q: 0.7, peak: 0.035, attack: 0.25 }); }
    });
    if (!wide) await run(380, (e) => { pano.style.opacity = String(1 - e); });
    pano.remove();

    // ---------------------------------------------------------------- 6. the projector brings the lesson
    // the projector on the floor wakes up: it rises into view and its lights come on; a column of light
    // rises from it; the lesson card forms in that light from the bottom up, flickering in
    // like a hologram, while the hall's lights go down; then the buttons rise in one after another
    skipBtn.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(() => skipBtn.remove(), () => {});
    [screen, bar, mute].forEach((el) => { el.style.opacity = '0'; });
    body.classList.remove('intro-run');
    const base = proj.querySelector('.projector__img'), column = proj.querySelector('.projector__beam'), lens = proj.querySelector('.projector__glow');
    const anim = (el, frames, opts) => el.animate(frames, { fill: 'both', ...opts }).finished.catch(() => {});
    column.style.opacity = '0';
    lens.style.opacity = '0';                        // the lens lights up with the light, once the projector is up
    sound.hum();
    await anim(base, [{ opacity: 0, transform: 'translateY(30px)', filter: 'brightness(.4)' }, { opacity: 1, transform: 'none', filter: 'brightness(.6)', offset: 0.55 },
      { filter: 'brightness(1.7)', offset: 0.8 }, { opacity: 1, transform: 'none', filter: 'brightness(1)' }], { duration: 1000, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    if (skipped) throw new Skip();
    column.style.opacity = '';
    lens.style.opacity = '';
    sound.materialize();
    await anim(column, [{ transform: 'scaleY(0)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.45, 0, .2, 1)' });   // it grows up from the lens
    if (skipped) throw new Skip();
    screen.style.opacity = '';
    await anim(screen, [
      { clipPath: 'inset(100% 0 0 0 round 16px)', opacity: 0.5, filter: 'brightness(2.2) saturate(.4)' },
      { clipPath: 'inset(45% 0 0 0 round 16px)', opacity: 0.9, filter: 'brightness(1.6) saturate(.6)', offset: 0.5 },
      { clipPath: 'inset(20% 0 0 0 round 16px)', opacity: 0.45, offset: 0.62 },
      { clipPath: 'inset(0% 0 0 0 round 16px)', opacity: 0.95, filter: 'brightness(1.3)', offset: 0.85 },
      { clipPath: 'inset(0% 0 0 0 round 16px)', opacity: 1, filter: 'none' },
    ], { duration: 1100, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'none' });
    if (skipped) throw new Skip();
    const rise = [mute, bar].map((el, i) => el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 520, delay: 150 + i * 160, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    [bar, mute].forEach((el) => { el.style.opacity = ''; });
    await Promise.all(rise.map((a) => a.finished.catch(() => {})));
    finish();
  } catch (e) {
    if (!(e instanceof Skip)) { console.error(e); finish(); }
  }
  return ended;
}
