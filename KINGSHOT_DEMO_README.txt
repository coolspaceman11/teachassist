TeachAssist+ — Kingshot Demo Patch

Unlock
======
Advanced > Enable Experiments
Code: KINGSHOT

Entering KINGSHOT toggles the entire Kingshot Demo tile in Misc.

Misc tile
=========
Kingshot Demo
"Kingshot demo style mockup"

Main menu
=========
- Play
- Shop
- Levels
- Persistent Money balance
- Equipped hero class

Classes
=======
Hero classes:
- Archer — free/default
  * joystick-controlled top-down movement
  * automatically fires semi-rapid arrows at enemies inside range
- Hunter — $500
  * faster movement
  * close-range stabbing/melee
  * stronger direct damage than the starter Archer

Troop classes:
- Swordsman House — free/default
  * costs 8 match Credits to place
  * maintains four friendly swordsmen
  * the four units reserve separate targets when possible
  * each friendly swordsman instantly clashes/kills one normal enemy swordsman
  * then respawns and is sent out again
  * minibosses/bosses take repeated swordsman damage instead of instant death
- Archer Tower — $500 persistent Shop unlock
  * costs 13 match Credits to place
  * rapid ranged fire
  * prioritizes the enemy closest to the base
  * intentionally stronger overall tower pressure than Swordsman House

Economy
=======
- Start each level with 14 match Credits.
- Every enemy kill gives:
  +1 Credit for the current match
  +1 persistent Money
- Money buys permanent classes in Shop.
- Credits place troop towers during a level.

Tower placement
===============
- Select a troop from the bottom bar.
- Tap open terrain to place it.
- Towers cannot be placed directly on the enemy road, on the base, or on top
  of another tower.

Rounds
======
Five rounds per level.
Five-second break between completed rounds.

Round 1:
- normal troop wave

Round 2:
- normal troops + 1 miniboss

Round 3:
- normal troops + 2 minibosses

Round 4:
- normal troops + 2 minibosses

Round 5:
- normal troops + 1 large boss
- large boss has exactly 3x the base miniboss HP

Minibosses and the final boss have visible health bars.

Base
====
- Every enemy follows a predetermined road to the base.
- Enemies that reach the end stop at the tower/base and repeatedly damage it.
- Normal troops, minibosses, and the final boss deal different damage amounts.

Levels
======
Level 1 — Normal
Level 2 — Hard
Level 3 — Expert

- Level 2 unlocks after completing Level 1.
- Level 3 unlocks after completing Level 2.
- Later levels increase enemy HP, movement speed, wave counts, and reduce base HP.
- Each level has its own predetermined road layout.

Joystick optimization
=====================
- Joystick movement does NOT call React setState for every finger move.
- Steering is held in refs for the game physics.
- Joystick knob uses Animated.ValueXY.
- Touch events are coalesced to one joystick update per animation frame.
- Battle physics use requestAnimationFrame.
- The entire battle scene is published in one scene update.
- Enemies/arrows are bounded by wave size and projectile lifetime.
- Most map objects render inside one react-native-svg scene to reduce View count.

No new native dependencies are added by this patch.
A new Dev IPA is not required just to test this with Metro.
