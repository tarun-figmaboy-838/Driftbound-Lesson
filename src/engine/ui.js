// Small shared helpers: DOM, text, maths and easing, reduced motion, the drone's markup, and the
// hexagon bursts used on right answers and the launch.

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// the game fonts have no angle sign; the one the browser borrows is thin, so it is drawn heavier
// (see .ang in the CSS). esc() for text, angles() to mark the signs in HTML.
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const angles = (html) => String(html).replace(/∠/g, '<span class="ang">∠</span>');

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => reduceMQ.matches;

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const EASE = {
  linear: (t) => t,
  in: (t) => t ** 3,
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  sine: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
};

// the delivery drone (Figma AI art) of the intro and the recall; its screen carries the voice's mouth
export const droneMarkup = () => '<img class="drone__img" src="assets/ui/recall/drone.webp" alt="" draggable="false">'
  + '<span class="drone__screen"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><i class="drone__flare"></i>';

const COLORS = ['#7ff3ff', '#3ddcf2', '#d4ff7a', '#ffffff', '#ffe066'];

// glowing hologram hexagons that burst out, spin and fade
export function burst(x, y, { count = 16, spread = 120, colors = COLORS } = {}) {
  if (reduced()) return;
  const layer = document.getElementById('fx');
  if (!layer) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.className = 'spark';
    const size = 9 + Math.random() * 15;
    p.style.cssText = `left:${x}px;top:${y}px;--sz:${size}px;--c:${colors[i % colors.length]}`;
    layer.appendChild(p);
    const a = Math.random() * Math.PI * 2, d = spread * (0.45 + Math.random() * 0.75);
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 30, rot = (Math.random() - 0.5) * 540;
    p.animate([
      { transform: 'translate(0,0) scale(.2)', opacity: 1 },
      { transform: `translate(${dx * 0.8}px,${dy * 0.8}px) scale(1.15) rotate(${rot * 0.6}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px,${dy + 60}px) scale(.25) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 650 + Math.random() * 450, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
  }
}

export function burstAt(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}
