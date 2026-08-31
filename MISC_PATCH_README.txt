TeachAssist+ Misc Tab Patch

Adds:
- Sixth bottom tab: Misc
- Sunshine List search:
  - Live public JSON API search
  - 2025-only or historical 1996–2025
  - Name, job title, employer, sector, salary, taxable benefits
  - Attribution to SunshineList Ontario and Government of Ontario
- Flipper Zero panel:
  - BLE scan for nearby devices named Flipper
  - Select/connect/disconnect
  - Basic connected-device info
  - Safe management roadmap for files/backups, apps/firmware and ordinary remotes

Important:
- Flipper BLE uses react-native-ble-plx, so run npm install and rebuild the Dev IPA once.
- The screen uses a dynamic import so Misc/Sunshine List can still load before that rebuild; tapping Flipper scan on the old IPA shows a rebuild message instead of crashing.
- Full Flipper RPC device management is a later stage. The app will not add credential cloning/replay, BadUSB execution, or arbitrary RFID/NFC/Sub-GHz access/transmission.
