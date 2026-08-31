TeachAssist+ — The Fun Update

Complete replacement patch files:
- app/(tabs)/_layout.tsx
- app/(tabs)/profile.tsx
- app/(tabs)/schedule.tsx
- app/(tabs)/misc.tsx
- app/(settings)/Personalization.tsx
- app/(settings)/AdvancedView.tsx
- components/FunOverlays.tsx
- components/ProfileWeatherBar.tsx
- components/ScheduleCalendarModal.tsx
- utils/funSettings.ts
- assets/images/maxwell.png

Added:
- Coin Flip in Misc
- Midnight Mode: manual toggle + automatic 12:00 AM–3:00 AM star visuals
- "you should probably sleep" on Profile while Midnight Mode is active
- Live Maple, Vaughan weather card with condition-matched visuals
- Schedule Calendar with events, PA days, school events, reminders, upcoming/day-of local notifications
- GPT experiment: type GPT in Advanced > Enable experiments to toggle GPT Access in Misc
- GPT Access uses an OpenAI API key stored in SecureStorage (ChatGPT sign-in does not grant general API/chat access)
- Maxwell pet toggle in Personalization, draggable with gravity and quick tilt animation
- Changelog entry: The Fun Update

No new npm package is added by this patch itself. Your existing native build still needs to include any native dependencies previously added for Study/Flipper.
