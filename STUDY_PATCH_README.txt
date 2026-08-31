TeachAssist+ Study Patch

Included:
- app/(tabs)/_layout.tsx
- app/(tabs)/study.tsx
- app/(tabs)/profile.tsx
- package.json

New Study tab:
- Textbook Library: upload local PDFs/files and add textbook links, with in-app viewer.
- School Map shell: intentionally no room markers yet.
- Flashcards: multiple decks, simple front/back builder, card flip, shuffle, Again/Hard/Good/Easy spaced repetition.
- Focus Study: Pomodoro, 50/10, Sprint, Deep Work.
- Screen Time: saves blocking rules and implements the 5-minute + device-authentication unlock workflow. System-wide iOS enforcement still requires a separate Family Controls / Screen Time native extension and Apple entitlement.
- Quick Notepad: folders, text notes, drawing notes, pen sizes, undo and clear.

Important:
This patch adds expo-document-picker and expo-file-system. Run:
  npm install
or:
  npx expo install expo-document-picker expo-file-system

Because expo-document-picker/expo-file-system are native modules, rebuild TeachAssist+ Dev before using PDF upload if those modules were not already compiled into your installed development client.
