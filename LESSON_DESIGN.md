# Lines & Angles, Class 2: lesson design

This document is for the designers and educators working on Driftbound. It describes the lesson that
students take before the game: where its content comes from, how each step works, and how it
connects to the game.

## Source

The content is the deck *Angles Learning section.pdf* (43 slides, "Lines & Angles · Class 2"). The
captions on screen are the deck's own sentences, in the deck's order. Nothing is taught that the deck
does not teach.

Skills covered (deck slide 1): explain and identify adjacent angles, linear pairs and vertically
opposite angles, then solve missing-angle problems.

## Setting

The lesson plays in the command HQ inside the ship's satellite: a calm, domed hall with a window band
onto the planet (a picture made with Figma AI). In front of it is one big, rectangular hologram
screen that fills most of the window: a glowing edge, a faint honeycomb grid and a slow scan line. The
whole lesson plays on that screen: the caption bar at the top, the diagram in the middle, the deck's
sums and labels at the bottom. Back, the answers and Next sit in one row under the screen. On phones
the answers sit above Back and Next.

The caption bar is the narration: each caption is read aloud, and the voice indicator at its left
moves while the voice talks. A short line under the caption shows an instruction when the student
has something to do (for example "Drag B.") and explains a wrong answer. There is no character, no
progress bar and no other text.

## Steps

21 steps. "Gate" means Next stays locked until the step is done; every wrong answer is explained,
and every drag task has a pulsing handle and also works with the arrow keys.

| # | Deck slides | Caption (from the deck) | What the student does | Gate |
|---|---|---|---|---|
| 1 | 1 | Lines & Angles · Class 2, skills covered | Taps Start | |
| 2 | 2–3 | Do you remember how an angle is formed? / Two rays starting from the same point form an angle. | Watches arm OB turn away from OA; drags B to open and close the angle | |
| 3 | 4–6 | Which type of angle is this? / What type is it now? / And what type is this? | Picks Acute, Right or Obtuse three times; arm OB turns between questions | yes |
| 4 | 7 | Which pair is complementary? | Taps one of three cards; the right pair slides together into a right angle | yes |
| 5 | 8–12 | What if these two angles share a point and an arm? / They have the same vertex. / They also have one common arm. / The two angles do not overlap. / We call these adjacent angles. | Taps the shared point, then the shared arm, then answers whether the angles overlap | yes |
| 6 | 13 | Which pair is adjacent? | Taps one of three cards | yes |
| 7 | 14–16 | What happens if a ray starts from a point on a straight line? / We get a pair of adjacent angles. / As both angles lie on a straight line, we call them a linear pair. | Watches line AB and ray OC draw in | |
| 8 | 17–18 | Let's measure both angles. / What do the two angles add up to? | Watches a protractor measure 65° and 115°; picks the total; traces the arc from B over to A (half a turn, 180°) | yes |
| 9 | 19–20 | What happens if we move the ray? / The angles change, but their total stays 180°. | Drags C; the two angles change, the sum stays 180° | yes |
| 10 | 21–22 | A linear pair always adds up to 180°. / If a ray stands on a straight line, the two adjacent angles formed add up to 180°. | Watches the half turn sweep from B to A | |
| 11 | 23 | Find the missing angle in this linear pair. | Picks 118°, 128° or 138° | yes |
| 12 | 24 | Which pair is supplementary? | Taps one of three cards | yes |
| 13 | 25–27 | What if these two supplementary angles become adjacent? / Their outer arms lie on a straight line. / Adjacent angles that add to 180° form a linear pair. | Taps Join them; the 110° and 70° angles slide together and their outer arms snap into line AB | yes |
| 14 | 28 | Which pair must form a linear pair? | Taps one of three cards | yes |
| 15 | 29–30 | What happens when two straight lines cross? / Four angles are formed. | Watches line PQ cross AB; ∠1 to ∠4 are counted round O | |
| 16 | 31–33 | Which angle is opposite ∠1? / Which angle is opposite ∠2? / These are vertically opposite angle pairs. | Taps the opposite angle (on the diagram or a button), twice | yes |
| 17 | 34–35 | Let's measure the angles. / Vertically opposite angles are equal. | Watches a protractor measure all four; turns a copy of ∠1 half a turn round O and sees it land exactly on ∠3 | yes |
| 18 | 36 | Does that still happen if we rotate a line? | Drags P; ∠1 = ∠3 and ∠2 = ∠4 at every position | yes |
| 19 | 37–41 | Let's see why it happens. / ∠1 and ∠2 form a linear pair. / ∠2 and ∠3 form another linear pair. / Both totals include the same ∠2. / So ∠1 and ∠3 must be equal. | Taps Next step four times; each linear pair sweeps its half turn; the proof panel builds up to ∠1 = ∠3 (and ∠2 = ∠4) | yes |
| 20 | 42 | Can you find the other three angles if ∠1 is 68°? | Finds ∠3, ∠2 and ∠4 in turn | yes |
| 21 | 43 | Recall | Reads the five ideas: angle, adjacent angles, linear pair, converse, vertically opposite angles; Next becomes Launch mission and opens the game | |

## Interactions and animations

- Lines and rays draw out from their starting point; arm OB turns away from OA so an angle reads as a turn.
- Tracing: the student drags a dot along the arc from B to A; the arc lights up behind the finger and
  counts the degrees, ending at 180°.
- Spinning: the student turns a copy of ∠1 round the vertex; after half a turn it lies exactly on ∠3.
- Measuring: a holo protractor sweeps its needle across each angle while the number counts up.
- Joining: two separate supplementary angles slide together; their outer arms snap into one line.
- Dragging: point B, point C and point P can be dragged; the numbers update live.
- Each step materializes on the screen from top to bottom, and the scan line sweeps across it.
- Right answers burst into small glowing hexagons.

## Additions beyond the deck

Kept to what the interactions need:

1. The instruction for each task (one short line in the caption bar, read aloud).
2. Explanations for wrong answers (the specific mistake: the given angle, using 90° instead of 180°,
   adjacent instead of opposite, and so on).
3. Launch mission on the last step, which opens the game.

## How it maps to the game

| Lesson | In the game |
|---|---|
| Linear pair (steps 7–11) | Levels L1, L3, L4, L6, L8 and the mixed mastery levels: x = 180° − the given angle |
| Vertically opposite angles (steps 15–20) | Levels L2, L5, L7 and the mastery levels: x = the given angle |

## Accessibility

- Keyboard: → or Enter for Next, ← for Back, Space to finish or skip a spoken line, Tab to reach
  every button. Handles (B, C, P, the trace and the spin) take the arrow keys.
- Screen readers: captions and instructions are announced; handles are sliders with their value.
- Colour is never the only cue: every angle carries a name or a number.
- Reduced motion turns off the screen effects, tweens and bursts. The sound button turns the voice off.

## Production notes

- The HQ background is two pictures made with Figma AI (`assets/ui/bg/`): a wide one for landscape
  screens and a tall one for phones. `src/scene.js` lines up the picture's own screen behind the
  lesson screen.
- The buttons are the capsules from the POLYGON Figma file (`assets/ui/polygon/`).
- The UI kit is in Figma (https://www.figma.com/design/tyeZIE8dPEVxyAIccfBrov); its colour
  variables match `src/tokens.css`. Its screens show an earlier layout.
- Diagrams are SVG, drawn by `src/figure.js`, so they stay sharp at any size.
- No build step: plain HTML, CSS and JavaScript modules.
