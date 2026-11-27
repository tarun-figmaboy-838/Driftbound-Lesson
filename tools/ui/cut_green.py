"""Cut a Figma AI picture out of its green background, for art that sits over the page (the projector,
the start banner's title).

Figma AI makes no see-through pictures, so the art is made on a flat pure green (#00FF00) and cut out
here: how green a pixel is (its green above its red and blue) says how much of the background shows in
it; that much is made see-through, and the green it took from the background is taken out of its colour,
so soft edges and glows keep their own colour (a cyan glow stays cyan, with no green fringe). Then the
picture is cropped to the art, with a small margin, and saved as WebP with its see-through parts.

usage:
    python3 tools/ui/cut_green.py SOURCE.png assets/ui/hall/projector.webp
    python3 tools/ui/cut_green.py SOURCE.png assets/ui/start/title.webp 1200     # at most 1200 px wide
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
QUALITY = 90
MARGIN = 12          # px kept round the art
SOLID = 24           # green above red and blue at or below which a pixel is all art
CLEAR = 200          # ... and at or above which it is all background


def cut(src):
    a = np.asarray(Image.open(src).convert('RGB'), dtype=np.float64)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    alpha = np.clip(1 - (green - SOLID) / (CLEAR - SOLID), 0, 1)
    # take the background's green out of the colour: pixel = alpha * art + (1 - alpha) * (0, 255, 0)
    safe = np.maximum(alpha, 1e-3)
    g2 = (g - (1 - alpha) * 255) / safe
    out = np.stack([r, np.clip(np.minimum(g2, np.maximum(r, b) + 30), 0, 255), b], axis=-1)
    out = np.where(alpha[..., None] > 0.02, out, 0)
    rgba = np.dstack([np.clip(out, 0, 255), alpha * 255]).round().astype(np.uint8)
    im = Image.fromarray(rgba)
    ys, xs = np.nonzero(alpha > 0.02)
    box = (max(0, xs.min() - MARGIN), max(0, ys.min() - MARGIN), min(im.width, xs.max() + 1 + MARGIN), min(im.height, ys.max() + 1 + MARGIN))
    return im.crop(box)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    im = cut(sys.argv[1])
    if len(sys.argv) > 3 and im.width > int(sys.argv[3]):
        w = int(sys.argv[3])
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    out = Path(sys.argv[2]).resolve().with_suffix('.webp')
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, 'WEBP', quality=QUALITY, method=6)
    print(f'{out.relative_to(ROOT)}: {im.width} x {im.height}, {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
