TeachAssist+ Boot Fix

Root cause addressed:
- Project is Expo SDK 54.
- The existing package-lock resolved ROOT expo-asset to SDK 57 (57.0.15).
- Expo SDK 54 itself expects expo-asset ~12.0.13.
- expo-audio has an expo-asset peer dependency, so npm selected the incompatible
  root package when expo-asset was not explicitly pinned.
- This can break Expo asset/font/native initialization in a release IPA and can
  leave the app sitting on the splash/loading screen.

Patch:
1. Adds explicit dependency: expo-asset ~12.0.13
2. Keeps expo-audio ~1.1.1
3. Updates app/_layout.tsx so a font loading error cannot leave the splash screen
   up forever; it falls back to system rendering.

IMPORTANT AFTER APPLYING:
Delete node_modules AND package-lock.json, then reinstall using Expo's compatible
dependency resolver. Regenerate package-lock.json before GitHub Actions because
the stable workflow runs npm ci.

Recommended PowerShell:
  cd C:\Development\teachassist
  Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
  Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
  npx expo install expo-asset expo-audio
  npm install
  npx expo-doctor

Then verify:
  npm ls expo expo-asset expo-audio

The root expo-asset should be 12.0.13 (or another SDK-54-compatible 12.0.x),
NOT 57.x.

Then:
  git add .
  git commit -m "Fix iOS startup dependency mismatch"
  git push origin teachassist-plus

Rebuild the stable IPA in GitHub Actions.
