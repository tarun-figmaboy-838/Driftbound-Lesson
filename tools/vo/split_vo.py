"""Split long recorded lines into shorter pieces, without recording them again.

A long line (a wrong-answer hint that reads out a whole sum, say) is easier to follow said in pieces: a
new sentence takes the narration line, a piece that goes on with the sentence joins it. Each piece
needs its own recording; this cuts the line's existing recording at the moment the piece's first word
starts (the manifest keeps every word's start time), with a short fade at each cut, and gives each
piece its own file and word times. The full line's file and entry are removed.

The lesson's source (src/steps.js) lists the pieces instead of the full line; make_vo.py collects them
the same way, so a later run of make_vo.py keeps these files.

usage:  python3 tools/vo/split_vo.py           (macOS: uses afconvert)
"""
import json
import subprocess
import sys
import tempfile
import wave
from array import array
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from make_vo import key  # noqa: E402  (djb2, the same hash as src/voice.js)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'vo'
LEAD = 0.06        # seconds the cut sits before the next piece's first word
FADE_OUT = 0.025
FADE_IN = 0.008

SPLITS = {
    # wrong-answer hints: the sum, then what it means
    '68° + 132° = 200°. ∠1 and ∠4 make a linear pair: 180°.': ['68° + 132° = 200°.', '∠1 and ∠4 make a linear pair: 180°.'],
    '65° + 115° = 180°, but they aren’t adjacent: no shared vertex, no shared arm.': ['65° + 115° = 180°,', 'but they aren’t adjacent: no shared vertex, no shared arm.'],
    '85° + 85° = 170°. Supplementary angles make exactly 180°.': ['85° + 85° = 170°.', 'Supplementary angles make exactly 180°.'],
    '118° + 52° = 170°. A linear pair must make exactly 180°.': ['118° + 52° = 170°.', 'A linear pair must make exactly 180°.'],
    '68° + 122° = 190°. A linear pair makes exactly 180°.': ['68° + 122° = 190°.', 'A linear pair makes exactly 180°.'],
    'They’re adjacent, but 65° + 95° = 160°, so the outer arms don’t make a straight line.': ['They’re adjacent, but 65° + 95° = 160°,', 'so the outer arms don’t make a straight line.'],
    '45° + 55° = 100°. Complementary angles make exactly 90°.': ['45° + 55° = 100°.', 'Complementary angles make exactly 90°.'],
    '138° + 52° = 190°. That’s more than a straight line.': ['138° + 52° = 190°.', 'That’s more than a straight line.'],
    'A bit too much. 60 + 110 = 170, and 5 + 5 = 10 more.': ['A bit too much.', '60 + 110 = 170, and 5 + 5 = 10 more.'],
    'Not quite. 60 + 110 = 170, and 5 + 5 = 10 more.': ['Not quite.', '60 + 110 = 170, and 5 + 5 = 10 more.'],
    '∠2 is next to ∠1, not opposite. Together they make a linear pair: 180°.': ['∠2 is next to ∠1, not opposite.', 'Together they make a linear pair: 180°.'],
    '112° would make a linear pair with ∠1. But ∠3 is opposite ∠1.': ['112° would make a linear pair with ∠1.', 'But ∠3 is opposite ∠1.'],
    'That’s 90° − 68°. ∠3 is opposite ∠1, so they’re equal.': ['That’s 90° − 68°.', '∠3 is opposite ∠1, so they’re equal.'],
    '35° + 65° = 100°. That’s 10° too many.': ['35° + 65° = 100°.', 'That’s 10° too many.'],
    '100° + 70° = 170°. That’s 10° short.': ['100° + 70° = 170°.', 'That’s 10° short.'],
    '∠2 is next to ∠1: they share an arm. Opposite angles only share the vertex.': ['∠2 is next to ∠1: they share an arm.', 'Opposite angles only share the vertex.'],
    '∠4 is next to ∠1: they share an arm. Look straight across the vertex.': ['∠4 is next to ∠1: they share an arm.', 'Look straight across the vertex.'],
    'They share a vertex and an arm, but the orange angle covers the blue one: they overlap.': ['They share a vertex and an arm,', 'but the orange angle covers the blue one: they overlap.'],
    # angle types: the rule, then this angle
    'Acute angles are smaller than 90°. This one opens wider than a square corner.': ['Acute angles are smaller than 90°.', 'This one opens wider than a square corner.'],
    'Acute angles are smaller than 90°. This one makes a perfect square corner.': ['Acute angles are smaller than 90°.', 'This one makes a perfect square corner.'],
    'A right angle is exactly 90°, a square corner. This one is smaller than that.': ['A right angle is exactly 90°, a square corner.', 'This one is smaller than that.'],
    'A right angle is exactly 90°. This one opens wider than that.': ['A right angle is exactly 90°.', 'This one opens wider than that.'],
    'Obtuse angles are bigger than 90°. This one is exactly a square corner.': ['Obtuse angles are bigger than 90°.', 'This one is exactly a square corner.'],
    'Obtuse angles are bigger than 90°. This one is smaller than a square corner.': ['Obtuse angles are bigger than 90°.', 'This one is smaller than a square corner.'],
    # the lesson's own lines
    'If a ray stands on a straight line, the two adjacent angles formed add up to 180°.': ['If a ray stands on a straight line,', 'the two adjacent angles formed add up to 180°.'],
    'They have the same vertex. They also have one common arm. The two angles do not overlap.': ['They have the same vertex.', 'They also have one common arm.', 'The two angles do not overlap.'],
}


def read_wav(path):
    """16-bit mono PCM from a WAV (afconvert writes the extensible header, which wave.py refuses)"""
    data, pos, sr, pcm = path.read_bytes(), 12, 24000, None
    while pos + 8 <= len(data):
        cid, size = data[pos:pos + 4], int.from_bytes(data[pos + 4:pos + 8], 'little')
        body = data[pos + 8:pos + 8 + size]
        if cid == b'fmt ':
            sr = int.from_bytes(body[4:8], 'little')
        elif cid == b'data':
            pcm = array('h', body[:len(body) // 2 * 2])
        pos += 8 + size + (size & 1)
    return sr, pcm


def write_wav(path, sr, samples):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(samples.tobytes())


def fade(samples, sr, inn, out):
    a, n = array('h', samples), len(samples)
    for i in range(min(n, int(inn * sr))):
        a[i] = int(a[i] * i / (inn * sr))
    k = min(n, int(out * sr))
    for i in range(k):
        a[n - 1 - i] = int(a[n - 1 - i] * i / k)
    return a


def main():
    man_path = OUT / 'manifest.json'
    man = json.loads(man_path.read_text())
    lines = man['lines']
    done = 0
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for full, pieces in SPLITS.items():
            k = key(full)
            if k not in lines:
                print('skip (not recorded, or already split):', full)
                continue
            words = lines[k]['words']
            tokens = full.split()
            counts = [len(p.split()) for p in pieces]
            assert sum(counts) == len(tokens) and ' '.join(pieces).split() == tokens, full
            assert len(words) == len(tokens), (full, len(words), len(tokens))
            wav = tmp / f'{k}.wav'
            subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', str(OUT / f'{k}.m4a'), str(wav)], check=True)
            sr, pcm = read_wav(wav)
            # where each piece starts: just before its first word
            starts, i = [0.0], 0
            for c in counts[:-1]:
                i += c
                starts.append(max(words[i - 1] + 0.12, words[i] - LEAD))
            ends = starts[1:] + [len(pcm) / sr]
            i = 0
            for n, (p, a, b) in enumerate(zip(pieces, starts, ends)):
                pk = key(p)
                if pk not in lines:                     # the same piece in two lines is cut once
                    part = pcm[int(a * sr):int(b * sr)]
                    part = fade(part, sr, FADE_IN if n else 0, FADE_OUT if n < len(pieces) - 1 else 0)
                    pw = tmp / f'{pk}.wav'
                    write_wav(pw, sr, part)
                    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', str(pw), str(OUT / f'{pk}.m4a')], check=True)
                    lines[pk] = {'text': p, 'seconds': round(len(part) / sr, 2), 'words': [round(t - a, 3) for t in words[i:i + counts[n]]]}
                i += counts[n]
            del lines[k]
            (OUT / f'{k}.m4a').unlink()
            done += 1
            print(f'split: {full}  ->  {" | ".join(pieces)}')
    man['files'] = sorted(lines)
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=1))
    print(f'{done} lines split')


if __name__ == '__main__':
    main()
