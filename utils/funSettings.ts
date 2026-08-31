import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";

export const MIDNIGHT_MODE_STORAGE_KEY = "ta_plus_midnight_mode_forced";
export const PET_ENABLED_STORAGE_KEY = "ta_plus_pet_enabled";
export const GPT_ACCESS_STORAGE_KEY = "ta_plus_gpt_access_enabled";
export const FUN_SETTINGS_EVENT = "ta_plus_fun_settings_changed";

export type FunSettingsSnapshot = {
  midnightModeForced: boolean;
  petEnabled: boolean;
  gptAccessEnabled: boolean;
};

const boolFromStorage = (value: string | null) => value === "true";

export const isAutomaticMidnightWindow = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= 0 && hour < 3;
};

export const loadFunSettings = async (): Promise<FunSettingsSnapshot> => {
  const [midnight, pet, gpt] = await Promise.all([
    AsyncStorage.getItem(MIDNIGHT_MODE_STORAGE_KEY),
    AsyncStorage.getItem(PET_ENABLED_STORAGE_KEY),
    AsyncStorage.getItem(GPT_ACCESS_STORAGE_KEY),
  ]);

  return {
    midnightModeForced: boolFromStorage(midnight),
    petEnabled: boolFromStorage(pet),
    gptAccessEnabled: boolFromStorage(gpt),
  };
};

const emit = () => DeviceEventEmitter.emit(FUN_SETTINGS_EVENT);

export const setMidnightModeForced = async (enabled: boolean) => {
  await AsyncStorage.setItem(MIDNIGHT_MODE_STORAGE_KEY, String(enabled));
  emit();
};

export const setPetEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(PET_ENABLED_STORAGE_KEY, String(enabled));
  emit();
};

export const setGPTAccessEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(GPT_ACCESS_STORAGE_KEY, String(enabled));
  emit();
};

export const toggleGPTAccess = async () => {
  const current = await AsyncStorage.getItem(GPT_ACCESS_STORAGE_KEY);
  const next = current !== "true";
  await setGPTAccessEnabled(next);
  return next;
};

export const useFunSettings = () => {
  const [snapshot, setSnapshot] = useState<FunSettingsSnapshot>({
    midnightModeForced: false,
    petEnabled: false,
    gptAccessEnabled: false,
  });
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await loadFunSettings());
    } catch (error) {
      console.warn("[FunSettings] Failed to load", error);
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = DeviceEventEmitter.addListener(
      FUN_SETTINGS_EVENT,
      refresh,
    );
    const timer = setInterval(() => setNow(new Date()), 60_000);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  const automaticMidnight = useMemo(
    () => isAutomaticMidnightWindow(now),
    [now],
  );

  return {
    ...snapshot,
    automaticMidnight,
    midnightActive: snapshot.midnightModeForced || automaticMidnight,
    refreshFunSettings: refresh,
  };
};
