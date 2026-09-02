TeachAssist+ — GD Wave Mockup 60 FPS / Aircraft Sprite Polish

Changes
=======
Performance
- Visual scene publication target raised from ~32 FPS to ~60 FPS.
- Physics remains requestAnimationFrame-driven.
- One React scene update per visual frame.
- Maximum active homing missiles reduced from 26 to 18.
- Maximum active projectiles reduced from 24 to 12.
- Plane trail shortened slightly to reduce per-frame view count.
- Missile trail changed from three separate trail dots to one lightweight streak.
- Difficulty continues to come from spawn rate, homing speed, elite missiles,
  and straight-line acceleration instead of unlimited rendered objects.

Clouds
- Cloud field increased to 35 nearby procedural grid cells.
- Cloud identity is keyed by stable world-grid coordinates.
- Crossing a cloud-grid boundary no longer remounts the entire cloud field.
- This removes the old cloud popping/disappearing effect.
- Rain clouds remain part of the procedural field.

Plane sprites
The six images supplied by the user are installed in this order:
1. Default
2. Turboprop
3. Jet
4. Bomber
5. Airliner
6. Interceptor

- Images are normalized to transparent 256x256 canvases.
- React Native tintColor removes their original color/depth and renders them as
  a single theme-accent silhouette.
- Maxwell remains Maxwell.
- Source aircraft point upward. Gameplay applies a +90-degree sprite offset so
  every nose/tip points exactly along the aircraft's velocity heading.
- Plane physics point and visual center are now aligned exactly.
- Turboprop has a native-driver spinning propeller overlay.

Joystick
- Reworked around actual touch position inside the joystick instead of gesture
  distance from the initial touch.
- Off-center grabs now map correctly.
- Added a small center dead-zone.
- Joystick knob cannot steal responder touches.
- Responder capture/termination settings reduce lost touches.

Rear guns
- 3-second FIRE cooldown.
- One narrow rear shot instead of a wide 3-bullet spread.
- A bullet can destroy only ONE normal/small missile.
- Bullets cannot destroy elite/larger missiles.
- Flares remain stronger and can still deal with elite missiles.
- FIRE button displays remaining cooldown.

Homing missile graphics
- Fixed triangle orientation: the pointed tip now faces its travel direction.
- Each homing missile has a lightweight directional trail.
- Every fifth missile is still the faster elite missile.

Wave
- Incline/decline increased again to about 63 degrees visually.

No new native dependency is added by this patch.
