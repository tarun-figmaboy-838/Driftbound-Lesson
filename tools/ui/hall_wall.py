"""The hall's front wall without its empty screen: a glowing DRIFTBOUND hologram hangs there instead.

The HQ pictures (Figma AI) were made with a big dark screen on the front wall. In the intro the student
walks in and looks all the way round the hall before the drone projects the lesson's screen, so an empty
screen there gave the moment away. This paints the screen out of the wall (filled smoothly from the wall
around it, with the wall's own grain) and puts the game's title in the room as a cyan hologram, rising
from a projector table on the floor. The lesson's screen is projected onto the same spot (scene.js still uses
the old screen's rectangle to place it).

It writes the wide and tall backdrops (assets/ui/bg). Then rebuild the intro's pictures, whose 360° strip
starts and ends on this front wall: python3 tools/ui/encode_images.py --intro FIGMA_DIR

usage:  python3 tools/ui/hall_wall.py MASTERS_DIR
    MASTERS_DIR holds the lossless originals: hq-wide.png, hq-tall.png (the backdrops before this change)
    and title.png (the start banner's title). They are in git history, before commit fda2882.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
# the old screen's rectangle in each picture (as in src/engine/scene.js), and how far its glow reaches
# table: the projector table on the floor (its top's centre y, top width, height down to the floor)
WALLS = {
    'hq-wide': {'rect': (388, 278, 1147, 617), 'margin': 20, 'logo_w': 0.60, 'table': (676, 330, 128)},
    'hq-tall': {'rect': (111, 363, 912, 757), 'margin': 20, 'logo_w': 0.64, 'table': (886, 340, 124)},
}


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


def hologram(title, width):
    """the title as a cyan hologram: tinted light, scan lines and a soft glow (RGBA)"""
    t = title.convert('RGBA')
    t = t.resize((width, round(t.height * width / t.width)), Image.LANCZOS)
    rgba = np.asarray(t, dtype=np.float64) / 255
    lum = (0.3 * rgba[..., 0] + 0.59 * rgba[..., 1] + 0.11 * rgba[..., 2])[..., None]
    cyan, white = np.array([0.50, 0.95, 1.0]), np.array([0.92, 1.0, 1.0])
    col = cyan * (1 - lum ** 1.4) + white * lum ** 1.4
    rows = np.arange(t.height)[:, None]
    scan = 0.88 + 0.12 * (np.sin(rows * np.pi / 2.2) ** 2)          # fine horizontal scan lines
    alpha = rgba[..., 3] * (0.42 + 0.5 * lum[..., 0]) * scan        # light parts solid, shading see-through
    holo = np.dstack([col, alpha[..., None]])
    pad = 36
    canvas = np.zeros((t.height + 2 * pad, t.width + 2 * pad, 4))
    canvas[pad:-pad, pad:-pad] = holo
    a_img = Image.fromarray((canvas[..., 3] * 255).astype(np.uint8))
    glow = np.asarray(a_img.filter(ImageFilter.GaussianBlur(14)), dtype=np.float64)[..., None] / 255
    glow_rgba = np.dstack([np.broadcast_to(np.array([0.24, 0.86, 0.95]), canvas.shape[:2] + (3,)), glow[..., 0] * 0.7])
    out = glow_rgba.copy()                                      # glow under the light
    a_t, a_b = canvas[..., 3:4], out[..., 3:4]
    a_o = a_t + a_b * (1 - a_t)
    out[..., :3] = (canvas[..., :3] * a_t + out[..., :3] * a_b * (1 - a_t)) / np.maximum(a_o, 1e-6)
    out[..., 3:4] = a_o
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def holo_table(top_w, height):
    """the projector table the hologram rises from: a round navy pedestal seen a little from above, a
    glowing cyan rim and light ring, and a bright emitter in its top (RGBA, drawn 3x and scaled down)"""
    S = 3
    tw, h = top_w * S, height * S
    ry_t = tw * 0.12                                   # the top's ellipse
    bw = tw * 0.52
    ry_b = bw * 0.16                                   # the foot
    W, H = int(tw + 120 * S), int(h + ry_t + ry_b + 120 * S)
    cx, ty = W / 2, 50 * S + ry_t                      # top centre
    by = ty + h                                        # foot centre (on the floor)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # its shadow on the floor
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).ellipse([cx - bw * 0.9, by - ry_b * 1.2, cx + bw * 0.9, by + ry_b * 1.5], fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(14 * S))
    img.alpha_composite(Image.merge('RGBA', [Image.new('L', (W, H), 4), Image.new('L', (W, H), 10), Image.new('L', (W, H), 30), sh]))
    # the body: wide under the top, narrowing to the foot; lit from the front-left like the room
    body = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(body)
    d.polygon([(cx - tw / 2 * 0.94, ty), (cx + tw / 2 * 0.94, ty), (cx + bw / 2, by), (cx - bw / 2, by)], fill=255)
    d.ellipse([cx - bw / 2, by - ry_b, cx + bw / 2, by + ry_b], fill=255)
    xs = (np.arange(W) - cx) / (tw / 2)
    ys = (np.arange(H) - ty) / max(1, h)
    shade = 0.55 + 0.45 * np.cos(np.clip(xs + 0.25, -1.4, 1.4) * 1.1)[None, :]          # rounder: darker at the sides
    shade = shade * (1.0 - 0.35 * np.clip(ys, 0, 1))[:, None]                          # darker towards the floor
    base_col = np.array([28, 58, 128]) / 255
    rgb = np.clip(base_col[None, None, :] * shade[..., None] * 1.25, 0, 1)
    body_rgba = np.dstack([rgb, np.asarray(body, np.float64)[..., None] / 255])
    img.alpha_composite(Image.fromarray((body_rgba * 255).astype(np.uint8)))
    d = ImageDraw.Draw(img)
    # a light ring round the body, just under the top
    yb = ty + h * 0.22
    half = (tw / 2 * 0.94) + (bw / 2 - tw / 2 * 0.94) * 0.22
    d.arc([cx - half, yb - half * 0.12, cx + half, yb + half * 0.12], 0, 180, fill=(127, 243, 255, 230), width=int(2.2 * S))
    # a thin light ring at the foot, like the room's floor lights
    d.arc([cx - bw / 2, by - ry_b, cx + bw / 2, by + ry_b], 0, 180, fill=(127, 243, 255, 200), width=int(2 * S))
    # the top: a dark disc with a glowing rim and the emitter's light
    d.ellipse([cx - tw / 2, ty - ry_t, cx + tw / 2, ty + ry_t], fill=(14, 30, 74, 255), outline=(150, 248, 255, 255), width=int(3 * S))
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse([cx - tw * 0.32, ty - ry_t * 0.62, cx + tw * 0.32, ty + ry_t * 0.62], fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(9 * S))
    g = np.asarray(glow, np.float64) / 255
    img.alpha_composite(Image.fromarray((np.dstack([np.broadcast_to(np.array([0.8, 1.0, 1.0]), g.shape + (3,)), g * 0.95]) * 255).astype(np.uint8)))
    rim = Image.new('L', (W, H), 0)
    ImageDraw.Draw(rim).ellipse([cx - tw / 2, ty - ry_t, cx + tw / 2, ty + ry_t], outline=255, width=int(5 * S))
    rim = np.asarray(rim.filter(ImageFilter.GaussianBlur(7 * S)), np.float64) / 255
    img.alpha_composite(Image.fromarray((np.dstack([np.broadcast_to(np.array([0.5, 0.95, 1.0]), rim.shape + (3,)), rim * 0.8]) * 255).astype(np.uint8)))
    small = img.resize((W // S, H // S), Image.LANCZOS)
    return small, (cx / S, ty / S)


def light_cone(w_bottom, w_top, height):
    """the projection's light: a faint cone widening up from the emitter to the hologram (with room
    round it for the blur, so it has no edge)"""
    pad = 40
    W = max(w_bottom, w_top) + 2 * pad
    a = np.zeros((height + 2 * pad, W))
    for y in range(height):
        f = y / max(1, height - 1)                       # 0 at the top, 1 at the emitter
        half = (w_top + (w_bottom - w_top) * f) / 2
        a[pad + y, round(W / 2 - half):round(W / 2 + half)] = 0.2 * f ** 1.4
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(12)), np.float64) / 255
    rgb = np.broadcast_to(np.array([0.55, 0.95, 1.0]), a.shape + (3,))
    return Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8)), pad


def new_wall(master, title, cfg):
    img = fill_wall(Image.open(master).convert('RGB'), cfg['rect'], cfg['margin'])
    x0, y0, x1, y1 = cfg['rect']
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    holo = hologram(title, round((x1 - x0) * cfg['logo_w']))
    hx, hy = round(cx - holo.width / 2), round(cy - holo.height / 2 - (y1 - y0) * 0.08)
    top_y, top_w, height = cfg['table']
    table, (tcx, tty) = holo_table(top_w, height)
    base = img.convert('RGBA')
    base.alpha_composite(table, (round(cx - tcx), round(top_y - tty)))
    # the light rises from the table's top to the hologram
    cone, pad = light_cone(round(top_w * 0.62), round(holo.width * 0.66), top_y - (hy + holo.height // 3))
    base.alpha_composite(cone, (round(cx - cone.width / 2), hy + holo.height // 3 - pad))
    base.alpha_composite(holo, (hx, hy))
    return base.convert('RGB')


def main(masters):
    masters = Path(masters)
    title = Image.open(masters / 'title.png')
    for name, cfg in WALLS.items():
        wall = new_wall(masters / f'{name}.png', title, cfg)
        out = ROOT / 'assets' / 'ui' / 'bg' / f'{name}.webp'
        wall.save(out, 'WEBP', quality=90, method=6)
        print(f'{out.relative_to(ROOT)}: {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1])
