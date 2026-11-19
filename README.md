# Lines & Angles: flight training before Driftbound

The lesson students take before playing [Driftbound](https://zathura-teal.vercel.app). It follows the
"Lines & Angles · Class 2" deck (*Angles Learning section.pdf*) slide by slide: how an angle is formed,
angle types, complementary pairs, adjacent angles, the linear pair axiom and its converse, vertically
opposite angles and their proof, and the recall. On the last step, Next becomes "Launch mission" and
opens the game.

It opens on a start banner (the Driftbound title over the satellite HQ in orbit, with a play button in
the centre). Then it plays
in the command HQ inside the satellite, on one big digital hologram screen (honeycomb grid, scan line,
glowing edge). The narration is one line at the top of the screen: it is read aloud by a recorded voice
(the game's co-pilot) and each word lights up as the voice says it, while the AI mouth beside it moves
with the voice. In the recall, a hologram drone delivers the
five summary cards and the mouth moves to the drone's screen.

- Background: two pictures of the HQ made with Figma AI (`assets/ui/bg/`), a wide one for landscape
  and a tall one for phones. `src/scene.js` scales the picture to fill the window and centres the
  picture's own screen behind the lesson screen.
- Buttons: the capsule buttons from the POLYGON Figma file (`assets/ui/polygon/`), cut into a left cap,
  a stretching middle and a right cap so they fit any label. The art is built into `src/pills.css`
  (`python3 tools/ui/inline_pills.py`), so a button never shows without its capsule.
- Intro (gate, corridor, the hall's walls for the full turn): made with Figma AI (`assets/ui/intro/`),
  played by `src/intro.js`.
- Start banner, play button, recall drone and card, hint hand: made with Figma AI (`assets/ui/start/`,
  `assets/ui/recall/`).
- Voice-over: made with Kokoro (Kokoro-82M, free and open source, Apache 2.0, runs on your Mac), with
  the co-pilot voice from the game (`af_heart`, a light robot shimmer and a radio sound). Each line also
  stores the time every word starts, which the narration uses to light the words up as they are said.
- UI kit: Figma, https://www.figma.com/design/tyeZIE8dPEVxyAIccfBrov. Its colour variables carry the
  same names as `src/tokens.css`. (Its screens show an earlier layout.)

## Run it

On a Mac, double-click `start.command`: it starts a local server and opens the lesson in your browser.

Or run it yourself:

```
python3 serve.py
```

Then open http://127.0.0.1:8124 and press play. The fonts load from Google Fonts, so it needs an
internet connection to look right (it still works without one). `?step=12` skips the banner and opens
a given step directly (handy for testing).

## Files

```
index.html            page shell: start banner, HQ picture, the lesson screen (narration, diagram,
                      readout), the answer row with Back / Next, the sound button
src/main.js           the step player: navigation, Next locking, the screen's materialize effect,
                      the helpers steps use (answers, cards, taps, tracing an arc, spinning a copy of an angle)
src/steps.js          the lesson, step by step, with the deck's slide numbers
src/scene.js          fits the HQ picture to the window and places the lesson screen (--sx --sy --sw --sh)
src/figure.js         the diagrams (SVG): rays, lines, angle sectors, labels, handles, protractor
src/dialogue.js       the narration: one line, read aloud word by word (captions, instructions, hints)
src/voice.js          plays the recorded lines, their word timing, and the mouth's movement
src/audio.js          small synthesized sounds
src/ui.js             DOM helper and hexagon bursts
src/tokens.css        colours, type, radii, motion
src/components.css    shared component styles and motion utilities
src/style.css         layout, the hologram screen, buttons and lesson styles
src/pills.css         the capsule button art, inside the stylesheet (made by tools/ui/inline_pills.py)
assets/ui/bg/         HQ background pictures (Figma AI): hq-wide.png, hq-tall.png
assets/ui/polygon/    button art from the POLYGON Figma file (gold, blue, green, red; caps and middles)
assets/ui/start/      start banner and play button (Figma AI)
assets/ui/recall/     recall drone and card (Figma AI)
assets/ui/hint/       the hint hand (Figma AI)
assets/ui/intro/      the intro (Figma AI): gate frame and door halves, corridor, the hall all the way round
assets/vo/            the voice-over: one .m4a per line, and manifest.json (lines and word timings)
tools/vo/make_vo.py   makes the voice-over with Kokoro
tools/vo/split_vo.py  splits long recorded lines into pieces (cuts the recordings at the word times)
LESSON_DESIGN.md      the lesson design: flow, mapping to the deck and the game
```

## Remaking the voice-over

After changing any line the narration says (in `src/steps.js`), make its voice again. With Python
3.10-3.12 and `pip install kokoro soundfile scipy numpy`:

```
python tools/vo/make_vo.py
```

It voices every line it finds in `src/steps.js` and `src/main.js`, keeps the lines that did not change,
and removes files for lines that are gone. `--list` only prints the lines.

## Changing the background

If you replace a picture in `assets/ui/bg/`, update its entry in `PICS` in `src/scene.js`: the
picture's size and the rectangle of the screen inside it (in picture pixels). The lesson screen is
centred over that rectangle.

## Link to the game

Launch mission (the last step's Next) opens the game in the same tab. Change `GAME_URL` in `src/main.js`
to point it somewhere else.
