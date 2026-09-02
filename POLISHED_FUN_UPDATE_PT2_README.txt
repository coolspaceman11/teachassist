TeachAssist+ — The (polished) Fun Update, Pt. 2

Included changes
================

Flashcards
----------
- Flashcard tile subtitle is now:
  "Decks and spaced repetition features"
- Every deck now has Manage Cards.
- Manage Cards expands the deck and shows individual front/back entries.
- Each individual flashcard has its own delete button.
- Deleting one flashcard does not delete the deck.

Profile
-------
- Search field added directly below "My Profile".
- Small search icon is built into the left side of the field.
- Search finds visible Profile Quick Actions plus:
  Personalization, Privacy & Notifications, Support & Legal, and Advanced.
- Search results can be opened directly.

Weather
-------
- Added Partly Cloudy as its own condition and matching visual.
- Weather refresh interval reduced from 15 minutes to 5 minutes.
- Requests are cache-busted to reduce stale readings.
- The weather bar now combines:
  * Open-Meteo Best Match current conditions
  * Canadian GEM current conditions
- Best Match is weighted more heavily, while GEM provides a Canadian
  high-resolution local signal.
- Provider text is removed from the visible weather bar.

Study / Focus
-------------
- "Rainy Focus" renamed to "Rain Effect".
- Removed the descriptive blurb underneath Rain Effect.
- Removed the old "Native iPhone blocking needs one more native layer" card
  from Screen Time.

Personalization
---------------
- Removed the explanatory descriptions around "Enable Profile Greeting".
- The toggle and custom-name controls remain.

GD Wave Mockup
--------------
- Renamed Cozy Wave to "GD Wave Mockup".
- Description:
  "A gamemode inspired by GD's wave and more"
- Wave movement is now much steeper, approximately 55 degrees visually.
- Trail dots are centered exactly on the triangle's centerline.
- Wave incoming-triangle collision remains intentionally forgiving.

Ship overhaul
-------------
- Ship now has its own menu with Play and Store.
- Optional fullscreen flight mode.
- Virtual joystick with smooth omnidirectional steering.
- Plane retains motion when the stick returns to center.
- Homing triangles smoothly steer toward the aircraft.
- Triangles accelerate when you continue in a straight direction too long.
- Missiles can collide with each other and explode.
- Difficulty increases procedurally as survival time increases.
- 3 credits are earned per second survived.
- Separate ship high score.

Aircraft Store
--------------
Default
  Price: Free
  Balanced starter aircraft.

Turboprop
  Price: 100
  Higher speed.

Jet
  Price: 1000
  Highest normal speed.
  SHOOT button fires small interceptors at incoming triangles.

Airliner
  Price: 3500
  FLARES button deploys decoys.
  Homing triangles temporarily target the flares instead of the aircraft.

Maxwell
  Unlock code: MAXWELL in Advanced > Experiments.
  Uses the supplied Maxwell artwork.
  Faster upgraded turboprop-style secret aircraft.

Changelog
---------
New entry:
"The (polished) Fun Update, Pt. 2"

Description:
"Overhauled the Wave and Ship gamemodes, added an entirely new minigame, fixed weather network bugs and smoothened the overall experience"

The previous Fun Update Cozy Wave blurb was removed.

Important Screen Time limitation
================================
The UI cleanup is included, but system-wide iOS blocking of Safari websites or
apps such as YouTube cannot be made functional merely by producing a native IPA.

Apple requires the Family Controls entitlement and a provisioning profile that
contains that entitlement for FamilyControls / ManagedSettings. A SideStore
re-sign using a normal/free provisioning profile does not provide that
capability. The existing saved rule planner therefore cannot honestly enforce
global YouTube/Safari/app blocking in the current SideStore deployment.

No new native dependency is added by this patch.
