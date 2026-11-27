// The HQ backdrop and the screen layout.
//
// The room is a picture made with Figma AI (assets/ui/bg): the command HQ inside the satellite, a wide
// version for landscape screens and a tall one for phones. The lesson floats as a hologram in front of
// the front wall's big screen, in the light of a projector on the floor (hq.css); the picture shows the
// calm hall around it: the domed ceiling, the window band onto the planet, the glowing floor ring.
// The screen's rectangle is handed to the CSS as --sx, --sy, --sw, --sh (px).

const PICS = {
  // the front wall's screen, in picture pixels: x0, y0, x1, y1 (the lesson is centred on it)
  wide: { src: 'assets/ui/bg/hq-wide.webp', w: 1536, h: 1024, screen: [388, 278, 1147, 617] },
  tall: { src: 'assets/ui/bg/hq-tall.webp', w: 1024, h: 1536, screen: [111, 363, 912, 757] },
};

export function createScene(img, root = document.documentElement) {
  let ready;
  const loaded = new Promise((r) => { ready = r; });
  img.addEventListener('load', () => ready(), { once: false });
  img.addEventListener('error', () => ready());

  function fit() {
    const W = window.innerWidth, H = window.innerHeight;
    const tall = W / H < 0.85;
    const P = tall ? PICS.tall : PICS.wide;
    if (img.dataset.src !== P.src) { img.dataset.src = P.src; img.src = P.src; }

    // the lesson screen: nearly the whole window, with a strip of the hall above it and the floor
    // below it for the answer row (and Back / Next on phones)
    const top = tall ? 16 : Math.max(20, H * 0.035);
    const below = tall ? 150 : 96;
    const sw = tall ? W - 20 : Math.min(W - 48, 1560);
    const sh = Math.max(220, H - top - below);
    const sx = (W - sw) / 2, sy = top;

    // the picture: the whole hall, just big enough to fill the window, with its screen centred
    // behind the lesson screen
    const [x0, y0, x1, y1] = P.screen;
    const s = Math.max(W / P.w, H / P.h) * 1.04;
    let dx = sx + sw / 2 - ((x0 + x1) / 2) * s;
    let dy = sy + sh / 2 - ((y0 + y1) / 2) * s;
    dx = Math.min(0, Math.max(W - P.w * s, dx));
    dy = Math.min(0, Math.max(H - P.h * s, dy));
    img.style.width = `${P.w * s}px`;
    img.style.height = `${P.h * s}px`;
    img.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;

    const set = (k, v) => root.style.setProperty(k, `${v.toFixed(1)}px`);
    set('--sx', sx); set('--sy', sy); set('--sw', sw); set('--sh', sh);
    root.classList.toggle('is-tall', tall);
  }

  let raf = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
  fit();
  return { loaded, fit };
}
