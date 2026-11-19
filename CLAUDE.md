# Working on this project

Start with the project map in README.md. The lesson content is `src/lesson/steps.js`; reusable parts
are in `src/engine/`; styles are split by area in `src/styles/`.

- Run: `python3 serve.py` (port 8124), or `python3 serve.py 8191` for a second copy. `?step=N` opens
  step N directly. There is no build step and no package manager.
- Check changes in a real browser, Chrome and Safari (WebKit) both: the lesson leans on WebAudio,
  SVG and CSS that differ between them.
- Narration text is keyed to its recording by a hash of the exact text (`assets/vo/manifest.json`).
  Editing a line's text leaves it silent until it is recorded again (`tools/vo/make_vo.py`, needs
  Kokoro) or cut from an existing recording (`tools/vo/split_vo.py`).
- One file per asset, no fallback copies: pictures are WebP (`tools/ui/encode_images.py`), the voice is
  AAC .m4a. Do not add PNG, JPEG, AVIF or Ogg copies to `assets/`.
- `src/styles/pills.css` is generated (`tools/ui/inline_pills.py`); do not edit it by hand.
- The stylesheets load in a fixed order (index.html); a rule that overrides another must stay in a
  later file or later in the same file.
- Comments explain what the code does for the student, in plain words, as in the existing files.
- `tools/Blender.app` is a local install, ignored by git; leave it alone.
