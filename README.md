# Lines & Angles: flight training before Driftbound

The lesson students take before playing [Driftbound](https://zathura-teal.vercel.app). It follows the
"Lines & Angles · Class 2" deck (*Angles Learning section.pdf*) slide by slide: how an angle is formed,
angle types, complementary pairs, adjacent angles, the linear pair axiom and its converse, vertically
opposite angles and their proof, and the recall. On the last step, Next becomes "Launch mission" and
opens the game.

It plays in the command HQ inside the ship's satellite. The lesson runs on one big digital hologram
screen (honeycomb grid, scan line, glowing edge) that fills most of the window. Each caption is read
aloud, and the voice indicator at the left of the caption bar moves while the voice talks.

- Background: two pictures of the HQ made with Figma AI (`assets/ui/bg/`), a wide one for landscape
  and a tall one for phones. `src/scene.js` scales the picture to fill the window and centres the
  picture's own screen behind the lesson screen.
- Buttons: the capsule buttons from the POLYGON Figma file (`assets/ui/polygon/`), drawn with CSS
  `border-image` so they stretch to any label.
- UI kit: Figma, https://www.figma.com/design/tyeZIE8dPEVxyAIccfBrov. Its colour variables carry the
  same names as `src/tokens.css`. (Its screens show an earlier layout.)

## Run it

On a Mac, double-click `start.command`: it starts a local server and opens the lesson in your browser.

Or run it yourself:

```
python3 serve.py
```

Then open http://127.0.0.1:8124. The fonts load from Google Fonts, so it needs an internet
connection to look right (it still works without one). `?step=12` opens a given step directly
(handy for testing).

## Files

```
index.html            page shell: HQ picture, the lesson screen (caption bar, diagram, readout),
                      the answer row with Back / Next, the sound button
src/main.js           the step player: navigation, Next locking, the screen's materialize effect,
                      the helpers steps use (answers, cards, taps, tracing an arc, spinning a copy of an angle)
src/steps.js          the lesson, step by step, with the deck's slide numbers
src/scene.js          fits the HQ picture to the window and places the lesson screen (--sx --sy --sw --sh)
src/figure.js         the diagrams (SVG): rays, lines, angle sectors, labels, handles, protractor
src/dialogue.js       the narration: reads captions aloud, shows instructions and hints under the caption
src/audio.js          small synthesized sounds
src/ui.js             DOM helper and hexagon bursts
src/tokens.css        colours, type, radii, motion
src/components.css    shared component styles and motion utilities
src/style.css         layout, the hologram screen, buttons and lesson styles
assets/ui/bg/         HQ background pictures (Figma AI): hq-wide.png, hq-tall.png
assets/ui/polygon/    button art from the POLYGON Figma file (gold, blue, green, red) and the sound icon
LESSON_DESIGN.md      the lesson design: flow, mapping to the deck and the game
```

## Changing the background

If you replace a picture in `assets/ui/bg/`, update its entry in `PICS` in `src/scene.js`: the
picture's size and the rectangle of the screen inside it (in picture pixels). The lesson screen is
centred over that rectangle.

## Link to the game

Launch mission (the last step's Next) opens the game in the same tab. Change `GAME_URL` in `src/main.js`
to point it somewhere else.
