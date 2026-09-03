TeachAssist+ — Performance + Native Features Patch

WHAT THIS PATCH INCLUDES
========================

MINIGAMES / PERFORMANCE
- Rebrands GD Wave Mockup to:
    Minigames
    Two gamemodes solely for fun
- Wave start screen now says "Wave mode".
- Ship mode name remains unchanged.
- GD Ship performance rewrite:
  * 60 Hz physics/joystick path stays ref-driven.
  * Plane position/heading use Animated values so steering does not force a
    complete React tree update.
  * Expensive battlefield publication is throttled separately from physics.
  * Rendered projectile/effect counts are bounded.
  * Boss-death explosion VFX improved while keeping effect lifetimes bounded.
- Kingshot performance rewrite:
  * Joystick touch events are coalesced to animation frames.
  * Movement stays in refs instead of React setState on every finger move.
  * Scene publishing is throttled independently of physics.
  * Battlefield rendering is consolidated heavily into SVG.
  * Targeting/combat work was reduced and bounded.
  * Boss-death explosion VFX added.
- Kingshot player graphics:
  * Archer uses the supplied pixel-art archer.
  * Melee/Hunter class uses the supplied swordsman-style pixel-art sprite.

SCHOOL MAP
==========
- Ground Floor and Second Floor floor plans added.
- Floor plans are compressed JPEGs to reduce Metro/IPA asset size.
- Swipe between floors.
- Tap a floor plan to add a custom marker.
- Marker fields:
  * Room
  * Floor
  * Teacher
- Markers persist locally.
- Maple High School card:
  * 50 Springside Rd, Vaughan
  * Current-location driving ETA through native MapKit
  * Open route in Apple Maps

WEATHER
=======
- Profile weather bar prefers Apple's WeatherKit.
- Includes additional Apple condition recognition such as:
  partly cloudy, thunderstorms, drizzle, heavy rain, snow, sleet, hail,
  freezing rain, fog, wind, blizzard and related conditions.
- Keeps the existing internet weather source as a fallback if WeatherKit
  cannot be used.
- Apple Weather attribution is displayed when WeatherKit is active.

HEALTH & STEPS
==============
- New Misc panel using read-only HealthKit.
- Shows:
  * Steps today
  * Steps over the last 7 days
  * 7-day daily average
  * Walking/running distance today
  * Active energy today
  * Flights climbed today
- User authorization is requested before Health data is read.

PHONE CHARGE REMINDER
=====================
- New toggle under Privacy & Notifications.
- When enabled, crossing approximately 10% battery triggers:
  * "Charge your phone" popup
  * Local phone notification
- Rearms after charging or returning above the reset threshold.

NATIVE MODULE
=============
A local Expo module is included at:
  modules/teachassist-native

It implements:
- WeatherKit
- HealthKit
- MapKit ETA
- CoreLocation

Expo SDK 54 autolinking discovers local modules in ./modules by default.

INSTALL
=======
You already installed expo-battery, so no additional npm package is required
by this patch.

From PowerShell:

  cd C:\Development\teachassist

  $patch = Get-ChildItem "$HOME\Downloads\TeachAssistPlus-Performance-NativeFeatures-Patch*.zip" |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

  Expand-Archive $patch.FullName -DestinationPath "C:\Development\teachassist" -Force

Then test JS/TS changes as usual. However, WeatherKit, HealthKit and MapKit ETA
are NEW NATIVE CODE, so the installed Dev IPA must be rebuilt before those
features can work.

REBUILD
=======
After applying the patch, commit/push the files and run your development IPA
GitHub Actions workflow.

For the stable/main app, run the normal stable IPA workflow after testing.

IMPORTANT APPLE CAPABILITIES
============================
app.config.js requests:
- com.apple.developer.weatherkit
- com.apple.developer.healthkit
- Location usage text
- Health read usage text

WeatherKit must also be enabled for the app's App ID/provisioning capability
to return Apple Weather data. If WeatherKit is unavailable, the weather bar
falls back to its existing online provider.

HealthKit likewise requires the HealthKit entitlement to survive signing and
the user must grant read permission on the phone.

VALIDATION
==========
- All 11 TypeScript/TSX files in this patch were syntax-transpiled successfully.
- No new package is needed beyond expo-battery for the additions in this patch.
- Floor-plan assets were reduced from about 6.1 MB total PNG to about 0.56 MB
  total JPEG while retaining the original dimensions.
