"""Make the lesson's voice-over with Kokoro (open source, Apache-2.0, runs locally, free).

The narrator is the game's co-pilot: Kokoro's af_heart voice with the same light robot shimmer and radio
sound as in Drone Defense. Every line the narration can say is collected from src/lesson/steps.js and src/main.js
(captions, instructions, hints, the recall cards). Each file is named after a hash of the line exactly
as the screen shows it, so the lesson finds it by itself (src/engine/voice.js). The manifest also keeps the time
each word starts, so the words on screen light up exactly as they are said.

Change a line, run this again, and its new voice is made (lines that did not change are kept).

usage (Python 3.10-3.12 with: pip install kokoro soundfile scipy numpy):
    python tools/vo/make_vo.py           # makes assets/vo/*.m4a and assets/vo/manifest.json

Each line is one AAC .m4a file: the format every browser decodes, Safari included.
    python tools/vo/make_vo.py --list    # only prints the lines it would voice
"""
import json
import re
import subprocess
import sys
import tempfile
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'vo'
SR = 24000


def key(text):
    """djb2 over UTF-16 code units; must match hash() in src/engine/voice.js"""
    h = 5381
    b = text.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h = ((h * 33) ^ (b[i] | b[i + 1] << 8)) & 0xFFFFFFFF
    return f'{h:08x}'


# ------------------------------------------------------------------ the lines
Q = r"'((?:[^'\\]|\\.)*)'"


def unq(s):
    return s.replace("\\'", "'")


def lines():
    src = (ROOT / 'src' / 'lesson' / 'steps.js').read_text()
    out = []
    out += re.findall(r"c\.caption\(\s*" + Q, src)                       # captions
    out += re.findall(r"crew\(\s*" + Q, src)                             # instructions
    out += re.findall(r"\b(?:lockHint|cap|rule)\s*:\s*" + Q, src)        # lock hints, questions, recall
    out += re.findall(r"\bgot\s*:\s*" + Q, src)                         # what the praise says was right
    out += re.findall(r"c\.praise\(\s*\w+\s*,\s*" + Q, src)             # ... after a hands-on task
    # wrong-answer explanations: the values inside every why: { ... } and the TYPE_WHY table
    blocks = re.findall(r"why:\s*\{(.*?)\}\s*[,}]", src, re.S)
    t = src.index('const TYPE_WHY = {')
    blocks.append(src[t:src.index('};', t)])
    for b in blocks:
        out += re.findall(r":\s*" + Q, b)
        for arr in re.findall(r":\s*\[(.*?)\]", b, re.S):   # a long hint in pieces
            out += re.findall(Q, arr)
    for arr in re.findall(r"\brule\s*:\s*\[(.*?)\]", src, re.S):  # a recall rule in pieces
        out += re.findall(Q, arr)
    # the one hint made from a template (tapping the angle itself, on the crossing lines)
    m = re.search(r"text:\s*`(That’s \$\{id\} itself\.[^`]*)`", src)
    if m:
        out += [m.group(1).replace('${id}', f'∠{k}') for k in range(1, 5)]
    out += re.findall(r"\{\s*text:\s*" + Q + r",\s*mood:\s*'hint'\s*\}", src)   # a hint piece given as { text, mood }
    main = (ROOT / 'src' / 'main.js').read_text()
    out += re.findall(r"s\.lockHint \|\| " + Q, main)
    p = main.index('const PRAISE = {')                                # the praise lines
    out += re.findall(Q, main[p:main.index('};', p)])
    seen, res = set(), []
    for s in map(unq, out):
        if s and s not in seen:
            seen.add(s)
            res.append(s)
    return res


# ------------------------------------------------------------------ how a line is said
def say_word(w):
    """one word as the voice says it (the screen keeps its symbols)"""
    w = w.replace('∠', 'angle ').replace('°', ' degrees').replace('−', ' minus ')
    # point and line names are read letter by letter: AOC, OA, PQ
    w = re.sub(r'\b([A-Z]{2,3})\b', lambda m: ' '.join(m.group(1)), w)
    return w


def spoken(text):
    """the line as the voice says it, and where each shown word sits in it"""
    words, pieces, spans, pos = [], [], [], 0
    for part in re.split(r'(\s+)', text):
        if not part or part.isspace():
            continue
        s = say_word(part)
        # the point A (not the word "a"): after "point" or "to", or with punctuation after it
        if re.fullmatch(r'A[.,:;!?]?', part) and (part != 'A' or (words and words[-1].lower() in ('point', 'to'))):
            s = 'Ay' + part[1:]
        if pieces:
            pos += 1
        spans.append((pos, pos + len(s)))
        pieces.append(s)
        words.append(part)
        pos += len(s)
    return ' '.join(pieces), words, spans


# ------------------------------------------------------------------ the co-pilot's voice (as in the game)
CREW = {'lang': 'a', 'voice': 'af_heart', 'pitch': 1.05, 'pace': 0.9, 'ring': (140, 0.1), 'band': (280, 6500), 'drive': 1.0}
LEAD = 0.04   # seconds of silence before each line


def character(audio, c):
    import numpy as np
    from scipy.signal import butter, resample_poly, sosfilt
    x = audio.astype(np.float32)
    f = Fraction(1 / c['pitch']).limit_denominator(64)
    x = resample_poly(x, f.numerator, f.denominator).astype(np.float32)
    hz, mix = c['ring']
    if mix:
        t = np.arange(len(x)) / SR
        x = x * (1 - mix) + x * np.sin(2 * np.pi * hz * t) * mix * 1.6
    sos = butter(4, c['band'], btype='band', fs=SR, output='sos')
    x = sosfilt(sos, x).astype(np.float32)
    x = np.tanh(x * c['drive']) / np.tanh(c['drive'])
    x = x / max(1e-6, np.abs(x).max()) * 0.89
    fade = int(SR * 0.012)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    return np.concatenate([np.zeros(int(SR * LEAD), np.float32), x, np.zeros(int(SR * 0.08), np.float32)]), float(f)


def short_espeak_path():
    """espeak-ng only reads its data from a short path, so copy the data to a short folder once"""
    import shutil
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    data = Path(espeakng_loader.get_data_path())
    if len(str(data)) > 100:
        short = Path.home() / '.cache' / 'espeak-ng-data'
        if short.is_symlink():
            short.unlink()
        if not (short / 'phontab').exists():
            shutil.copytree(data, short, dirs_exist_ok=True)
        data = short
    EspeakWrapper.set_data_path(str(data))


def word_times(results, say, spans, stretch):
    """the time (s) each shown word starts in the finished file"""
    starts = [None] * len(spans)
    cursor, offset = 0, 0.0
    for r in results:
        for tk in (r.tokens or []):
            if tk.start_ts is None or not tk.text.strip():
                continue
            at = say.find(tk.text, cursor)
            if at < 0:
                continue
            cursor = at + len(tk.text)
            for i, (a, b) in enumerate(spans):
                if a <= at < b:
                    if starts[i] is None:
                        starts[i] = LEAD + (offset + tk.start_ts) * stretch
                    break
        offset += len(r.audio) / SR
    last = LEAD
    for i, s in enumerate(starts):            # a word with no token of its own starts with the one before
        starts[i] = last = round(s if s is not None else last, 3)
    return starts


def main():
    todo = lines()
    if '--list' in sys.argv:
        for t in todo:
            print(key(t), t)
        print(len(todo), 'lines')
        return
    import numpy as np
    import soundfile as sf
    import misaki.espeak  # noqa: F401  (sets espeak's library and data path)
    short_espeak_path()
    from kokoro import KPipeline
    pipe = KPipeline(lang_code=CREW['lang'], repo_id='hexgrad/Kokoro-82M')
    OUT.mkdir(parents=True, exist_ok=True)
    old = {}
    if (OUT / 'manifest.json').exists():
        old = json.loads((OUT / 'manifest.json').read_text()).get('lines', {})
    made = {}
    for text in todo:
        k = key(text)
        if k in old and old[k].get('text') == text and (OUT / f'{k}.m4a').exists():
            made[k] = old[k]
            continue
        say, words, spans = spoken(text)
        results = list(pipe(say, voice=CREW['voice'], speed=CREW['pace'] / CREW['pitch']))
        raw = np.concatenate([r.audio.numpy() if hasattr(r.audio, 'numpy') else np.asarray(r.audio) for r in results])
        audio, stretch = character(raw, CREW)
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / 'line.wav'
            sf.write(wav, audio, SR)
            # AAC in an .m4a plays in every browser; afconvert ships with macOS
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', str(wav), str(OUT / f'{k}.m4a')], check=True)
        made[k] = {'text': text, 'seconds': round(len(audio) / SR, 2), 'words': word_times(results, say, spans, stretch)}
        print(f'{k}  {made[k]["seconds"]:4.1f}s  {text}', flush=True)
    for f in OUT.glob('*.m4a'):                 # files for lines that are gone
        if f.stem not in made:
            f.unlink()
    (OUT / 'manifest.json').write_text(json.dumps({'files': sorted(made), 'lines': made}, ensure_ascii=False, indent=1))
    print(f'{len(made)} lines -> {OUT}')


if __name__ == '__main__':
    sys.exit(main())
