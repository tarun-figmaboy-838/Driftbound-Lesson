// Small DOM helpers and the hexagon bursts used on right answers and the launch.

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
