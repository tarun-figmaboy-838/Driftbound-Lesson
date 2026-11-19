"""Encode the lesson's pictures for the web as WebP: one file per picture, shown by every browser
(Safari 14 and later included), far smaller than PNG.

Settings: quality 90 (85 for the intro's large photographic layers, 95 for the recall card, whose faint
hexagons need it). At these settings the pictures look the same as the originals (checked side by side).

usage:
    python3 tools/ui/encode_images.py SOURCE.png assets/ui/hint/hand.webp
    python3 tools/ui/encode_images.py SOURCE.png assets/ui/recall/card.webp 95      # quality
    python3 tools/ui/encode_images.py --intro FIGMA_DIR                             # the intro's pictures

The intro's pictures are cut from Figma AI pictures (UI kit file, nodes 23:2 gate, 23:3 corridor, 24:3 /
24:4 / 24:5 the hall's right, back and left walls; download them as gate.png, corridor.png,
hall-right.png, hall-back.png, hall-left.png into FIGMA_DIR). The hall's front is the lesson's own
backdrop (assets/ui/bg/hq-wide.webp).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
QUALITY = 90


def save(im, out, quality=QUALITY):
    out = Path(out).resolve().with_suffix('.webp')
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, 'WEBP', quality=quality, method=6)
    print(f'{out.relative_to(ROOT)}: {out.stat().st_size // 1024} KB')


def rounded_mask(size, box, r, scale=4):
    """an anti-aliased rounded rectangle (drawn 4x and scaled down)"""
    W, H = size
    m = Image.new('L', (W * scale, H * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle([v * scale for v in box], radius=r * scale, fill=255)
    return m.resize(size, Image.LANCZOS)


def intro(src):
    src, out = Path(src), ROOT / 'assets' / 'ui' / 'intro'
    # the gate: its frame with the doorway cut out, and the two door halves (they slide under the frame)
    g = Image.open(src / 'gate.png').convert('RGBA')
    x0, y0, x1, y1, r, seam = 456, 138, 1077, 818, 34, 767
    hole = rounded_mask(g.size, (x0, y0, x1, y1), r)
    frame = g.copy()
    frame.putalpha(Image.eval(hole, lambda v: 255 - v))
    save(frame, out / 'gate-frame', 85)          # photographic layers: 85 keeps them clean and small
    door = g.copy()
    door.putalpha(hole)
    save(door.crop((x0, y0, seam, y1)), out / 'door-l')
    save(door.crop((seam, y0, x1, y1)), out / 'door-r')
    # the corridor, its far doorway cut open (rounded top corners, square threshold)
    c = Image.open(src / 'corridor.png').convert('RGBA')
    W, H = c.size
    x0, y0, x1, y1, r, S = 665, 411, 868, 572, 15, 4
    m = Image.new('L', (W * S, H * S), 255)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([x0 * S, y0 * S, x1 * S, (y1 + 40) * S], radius=r * S, fill=0)
    d.rectangle([x0 * S, (y1 - 1) * S, x1 * S, (y1 + 40) * S], fill=255)
    d.rectangle([x0 * S, (y0 + r) * S, x1 * S, y1 * S], fill=0)
    c.putalpha(m.resize((W, H), Image.LANCZOS))
    save(c, out / 'corridor', 85)
    # the hall all the way round: front, right, back, left, front, blended over 440 px at each seam
    front = Image.open(ROOT / 'assets' / 'ui' / 'bg' / 'hq-wide.webp').convert('RGB')
    walls = [front] + [Image.open(src / f'hall-{n}.png').convert('RGB') for n in ('right', 'back', 'left')] + [front]
    W, H, OV = 1536, 1024, 440
    step = W - OV
    strip = Image.new('RGB', (step * 4 + W, H))
    ramp = Image.new('L', (W, 1))
    for x in range(W):
        t = min(1, x / OV)
        ramp.putpixel((x, 0), int(255 * t * t * (3 - 2 * t)))
    mask = ramp.resize((W, H))
    for i, wall in enumerate(walls):
        strip.paste(wall, (i * step, 0), None if i == 0 else mask)
    save(strip, out / 'hall-360', 85)


if __name__ == '__main__':
    if sys.argv[1] == '--intro':
        intro(sys.argv[2])
    else:
        save(Image.open(sys.argv[1]), sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else QUALITY)
