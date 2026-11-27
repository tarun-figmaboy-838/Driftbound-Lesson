"""The hall's front wall without its screen: a plain wall behind the lesson's hologram.

The HQ pictures (Figma AI) were made with a big dark screen on the front wall. The lesson floats in front
of that wall as a hologram, so the screen's frame showed through it as a box round the drawing. This
paints the screen out of the wall (filled smoothly from the wall around it, with the wall's own grain),
in the wide and the tall backdrop (assets/ui/bg), and in the intro's look round the hall
(assets/ui/intro/hall-360.webp), whose strip starts and ends on this same wall.

usage:  python3 tools/ui/plain_wall.py MASTERS_DIR
    MASTERS_DIR holds the lossless originals hq-wide.png and hq-tall.png; they are in git history:
        git show fda2882~1:assets/ui/bg/hq-wide.png > MASTERS_DIR/hq-wide.png   (and hq-tall.png)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
# the screen's rectangle in each picture (as in src/engine/scene.js), and how far its glow reaches
WALLS = {
    'hq-wide': {'rect': (388, 278, 1147, 617), 'margin': 20},
    'hq-tall': {'rect': (111, 363, 912, 757), 'margin': 20},
}
STRIP = {'src': ROOT / 'assets' / 'ui' / 'intro' / 'hall-360.webp', 'fronts': (0, 4384)}   # where the wide wall sits in it


def fill_wall(img, rect, margin):
    """paint the rectangle out: a Coons patch from the wall on its four sides, plus the wall's grain"""
    a = np.asarray(img, dtype=np.float64).copy()
    x0, y0, x1, y1 = rect[0] - margin, rect[1] - margin, rect[2] + margin, rect[3] + margin
    band = 8
    top = a[y0 - band:y0].mean(axis=0)[x0:x1]          # the wall just above, per column
    bot = a[y1:y1 + band].mean(axis=0)[x0:x1]          # just below
    lef = a[y0:y1, x0 - band:x0].mean(axis=1)          # just left, per row
    rig = a[y0:y1, x1:x1 + band].mean(axis=1)          # just right
    h, w = y1 - y0, x1 - x0
    v = np.linspace(0, 1, h)[:, None, None]
    u = np.linspace(0, 1, w)[None, :, None]
    c00, c10 = a[y0 - band:y0, x0 - band:x0].mean((0, 1)), a[y0 - band:y0, x1:x1 + band].mean((0, 1))
    c01, c11 = a[y1:y1 + band, x0 - band:x0].mean((0, 1)), a[y1:y1 + band, x1:x1 + band].mean((0, 1))
    patch = ((1 - v) * top[None] + v * bot[None] + (1 - u) * lef[:, None] + u * rig[:, None]
             - ((1 - u) * (1 - v) * c00 + u * (1 - v) * c10 + (1 - u) * v * c01 + u * v * c11))
    # the wall's grain: the fine detail of the wall beside the patch, tiled
    sample = a[y0:y1, max(0, x0 - 140):x0 - 20]
    grain = sample - np.asarray(Image.fromarray(sample.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), dtype=np.float64)
    reps = (int(np.ceil(h / grain.shape[0])), int(np.ceil(w / grain.shape[1])), 1)
    patch += np.tile(grain, reps)[:h, :w]
    # blend in over the outer few pixels so there is no edge
    f = 6
    ramp_y = np.clip(np.minimum(np.arange(h), np.arange(h)[::-1]) / f, 0, 1)[:, None, None]
    ramp_x = np.clip(np.minimum(np.arange(w), np.arange(w)[::-1]) / f, 0, 1)[None, :, None]
    k = np.minimum(ramp_y, ramp_x)
    a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - k) + patch * k
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def save(img, out, quality=90):
    img.save(out, 'WEBP', quality=quality, method=6)
    print(f'{out.relative_to(ROOT)}: {out.stat().st_size // 1024} KB')


def main(masters):
    masters = Path(masters)
    walls = {}
    for name, cfg in WALLS.items():
        walls[name] = fill_wall(Image.open(masters / f'{name}.png').convert('RGB'), cfg['rect'], cfg['margin'])
        save(walls[name], ROOT / 'assets' / 'ui' / 'bg' / f'{name}.webp')
    # the look round the hall: the same plain wall at both ends of the strip
    strip = Image.open(STRIP['src']).convert('RGB')
    x0, y0, x1, y1 = WALLS['hq-wide']['rect']
    pad = WALLS['hq-wide']['margin'] + 12
    piece = walls['hq-wide'].crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    for off in STRIP['fronts']:
        strip.paste(piece, (off + x0 - pad, y0 - pad))
    save(strip, STRIP['src'], quality=85)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
