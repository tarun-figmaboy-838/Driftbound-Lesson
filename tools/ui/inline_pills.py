"""Build src/styles/pills.css: the POLYGON capsule buttons with their art inside the stylesheet (data URIs),
so a button never shows without its capsule (no separate image to wait for or to miss).

usage: python3 tools/ui/inline_pills.py      (needs Pillow; reads tools/ui/polygon/pill-*-{l,m,r}.webp, the
       POLYGON Figma file's capsule art: the source, not loaded by the page)
"""
import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools' / 'ui' / 'polygon'
OUT = ROOT / 'src' / 'styles' / 'pills.css'
H = 112   # pixels tall: twice the largest button height, sharp on retina screens


def uri(path):
    im = Image.open(path).convert('RGBA')
    w = max(1, round(im.width * H / im.height))
    im = im.resize((w, H), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=92, method=6)    # full colour, smaller than a 256-colour PNG
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def layers(color):
    l, r, m = (uri(SRC / f'pill-{color}-{p}.webp') for p in ('l', 'r', 'm'))
    return (f'background: url({l}) left top / var(--cap) 100% no-repeat,\n'
            f'    url({r}) right top / var(--cap) 100% no-repeat,\n'
            f'    url({m}) center top / calc(100% - 2 * var(--cap) + 2px) 100% no-repeat;')


RULES = [('.pill', 'gold'), ('.pill--blue', 'blue'), ('.pill.is-right', 'green'), ('.pill.is-wrong', 'red')]
css = ['/* The POLYGON capsule buttons: a left cap, a stretching middle and a right cap, as background layers.',
       '   Made by tools/ui/inline_pills.py from tools/ui/polygon (the art is inside, so it is never missing). */']
css += [f'{sel} {{\n  {layers(c)}\n}}' for sel, c in RULES]
OUT.write_text('\n'.join(css) + '\n')
print(OUT.relative_to(ROOT), round(OUT.stat().st_size / 1024), 'KB')
