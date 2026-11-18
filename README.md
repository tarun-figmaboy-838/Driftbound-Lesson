# Driftbound Briefing

The angle lesson students take before playing [Driftbound](https://zathura-teal.vercel.app). It is a strategy meeting on the ship: the co-pilot robot teaches what an angle is, degrees, angle types, the two rules the game uses (angles on a straight line add up to 180°, vertically opposite angles are equal), the traps hidden in the answers and how to read the battle radar, then runs a practice round. The last screen launches the game.

It shares the game's characters, radar, notation and buttons, and lives outside the game folder as its own project.

## Run it

On a Mac, double-click `start.command`: it starts a local server and opens the lesson in your browser.

Or run it yourself:

```
python3 serve.py
```

Then open http://127.0.0.1:8124. (Any static file server works; `serve.py` turns off caching so a reload always shows the latest version.)

## Files

```
index.html          page shell: progress dots, stage, comms box, Back / Next
src/main.js         scene navigation, keyboard, the link to the game (GAME_URL)
src/scenes.js       the ten scenes and the extra training: scripts, questions, interactions
src/radar.js        the game's battle radar, drawn in SVG
src/dialogue.js     the comms box (typing lines, portraits, moods)
src/audio.js        small synthesized sounds (talk blips, taps, right / wrong, stars)
src/style.css       the game's look: colours, fonts, capsules, comms box
assets/ui/          portraits, capsules, buttons and cockpit art copied from the game
LESSON_DESIGN.md    objectives, scene-by-scene flow, mapping to the game levels, misconceptions
```

## Link to the game

Launch mission on the last scene opens the game in the same tab. Change `GAME_URL` in `src/main.js` to point it somewhere else.
