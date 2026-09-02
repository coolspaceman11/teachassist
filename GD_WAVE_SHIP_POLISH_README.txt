TeachAssist+ — GD Wave / Ship Performance + Hidden Economy Patch

Main changes
============
- GD Wave Mockup is now hidden by default.
- Advanced > Experiments code WAVE toggles the entire GD Wave Mockup tile.
- Wave incline/decline is steeper (about 60° visually).
- Wave trail remains centered on the triangle.

Ship performance / controls
===========================
- Ship physics still run on requestAnimationFrame.
- React scene rendering is capped around 32 FPS with ONE scene update instead
  of multiple state updates every physics frame.
- Missile/projectile counts are bounded to prevent runaway view counts.
- Plane nose now rotates to the actual velocity heading.
- Full free-flight world:
  camera follows when the plane approaches any edge;
  there are no invisible top/bottom/left/right walls.
- More procedural clouds, including occasional rain beneath clouds.
- Trails added to all aircraft.
- Homing triangles now have visible trails.
- Every 5th spawned homing triangle is an elite missile:
  faster, stronger homing and harder to outrun.
- Missiles can still collide with each other.

Aircraft / Store
================
Default      Free
Turboprop    $100   faster; spinning propeller
Jet          $1000  rear defensive cannon
Bomber       $2000  homing counter-missile ability
Airliner     $3500  flares with fixed 8-second cooldown
Interceptor  $5000  fastest normal aircraft; rear gun + flares
Maxwell      hidden MAXWELL unlock; upgraded turboprop

Graphics
========
- Plane graphics are more detailed.
- Turboprop/Maxwell propellers animate during gameplay.
- Jet/interceptor/airliner/bomber engine fans animate.
- Plane tip always points in the actual travel direction.

Economy
=======
- Survival reward reduced to $1 per second.
- Completing homework/assignment work via the Schedule checkmark can silently
  award $200.
- That homework reward has one global 1-hour cooldown.
- Schedule itself never displays or mentions the reward.
- Pending homework reward is shown only after opening the hidden Ship menu.

Developer codes
===============
WAVE      toggle GD Wave Mockup visibility
MAXWELL   unlock Maxwell aircraft
DEVTEST   unlock all regular aircraft for testing
DEVWIPE   reset owned aircraft to Default and remove Maxwell unlock

No new native package is added by this patch.
