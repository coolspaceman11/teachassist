import AsyncStorage from "@react-native-async-storage/async-storage";

const CHARGE_REMINDER_KEY = "ta_plus_charge_reminder_enabled";

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

export async function getChargeReminderEnabled() {
  return (await AsyncStorage.getItem(CHARGE_REMINDER_KEY)) === "true";
}

export async function setChargeReminderEnabled(enabled: boolean) {
  await AsyncStorage.setItem(CHARGE_REMINDER_KEY, enabled ? "true" : "false");
  listeners.forEach((listener) => listener(enabled));
}

export function subscribeChargeReminder(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
