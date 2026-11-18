"""Build src/pills.css: the POLYGON capsule buttons with their art inside the stylesheet (data URIs),
so a button never shows without its capsule (no separate image to wait for or to miss).

usage: python3 tools/ui/inline_pills.py      (needs Pillow; reads assets/ui/polygon/pill-*-{l,m,r}.png)
"""
import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets' / 'ui' / 'polygon'
H = 112   # pixels tall: twice the largest button height, sharp on retina screens


def uri(path):
    im = Image.open(path).convert('RGBA')
    w = max(1, round(im.width * H / im.height))
    im = im.resize((w, H), Image.LANCZOS)
    im = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE)   # 256 colours: small, no visible loss
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def layers(color):
    l, r, m = (uri(SRC / f'pill-{color}-{p}.png') for p in ('l', 'r', 'm'))
    return (f'background: url({l}) left top / var(--cap) 100% no-repeat,\n'
            f'    url({r}) right top / var(--cap) 100% no-repeat,\n'
            f'    url({m}) center top / calc(100% - 2 * var(--cap) + 2px) 100% no-repeat;')


RULES = [('.pill', 'gold'), ('.pill--blue', 'blue'), ('.pill.is-right', 'green'), ('.pill.is-wrong', 'red')]
css = ['/* The POLYGON capsule buttons: a left cap, a stretching middle and a right cap, as background layers.',
       '   Made by tools/ui/inline_pills.py from assets/ui/polygon (the art is inside, so it is never missing). */']
css += [f'{sel} {{\n  {layers(c)}\n}}' for sel, c in RULES]
(ROOT / 'src' / 'pills.css').write_text('\n'.join(css) + '\n')
print('src/pills.css', round((ROOT / 'src' / 'pills.css').stat().st_size / 1024), 'KB')
