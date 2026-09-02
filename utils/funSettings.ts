import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";

export const MIDNIGHT_MODE_STORAGE_KEY = "ta_plus_midnight_mode_forced";
export const PET_ENABLED_STORAGE_KEY = "ta_plus_pet_enabled";
export const GPT_ACCESS_STORAGE_KEY = "ta_plus_gpt_access_enabled";
export const MAXWELL_PLANE_UNLOCK_STORAGE_KEY = "ta_plus_maxwell_plane_unlocked";
export const WAVE_MOCKUP_STORAGE_KEY = "ta_plus_wave_mockup_enabled";
export const KINGSHOT_DEMO_STORAGE_KEY = "ta_plus_kingshot_demo_enabled";
export const FUN_SETTINGS_EVENT = "ta_plus_fun_settings_changed";

export type FunSettingsSnapshot = {
  midnightModeForced: boolean;
  petEnabled: boolean;
  gptAccessEnabled: boolean;
  maxwellPlaneUnlocked: boolean;
  waveMockupEnabled: boolean;
  kingshotEnabled: boolean;
};

const boolFromStorage = (value: string | null) => value === "true";

export const isAutomaticMidnightWindow = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= 0 && hour < 3;
};

export const loadFunSettings = async (): Promise<FunSettingsSnapshot> => {
  const [midnight, pet, gpt, maxwellPlane, waveMockup, kingshot] = await Promise.all([
    AsyncStorage.getItem(MIDNIGHT_MODE_STORAGE_KEY),
    AsyncStorage.getItem(PET_ENABLED_STORAGE_KEY),
    AsyncStorage.getItem(GPT_ACCESS_STORAGE_KEY),
    AsyncStorage.getItem(MAXWELL_PLANE_UNLOCK_STORAGE_KEY),
    AsyncStorage.getItem(WAVE_MOCKUP_STORAGE_KEY),
    AsyncStorage.getItem(KINGSHOT_DEMO_STORAGE_KEY),
  ]);

  return {
    midnightModeForced: boolFromStorage(midnight),
    petEnabled: boolFromStorage(pet),
    gptAccessEnabled: boolFromStorage(gpt),
    maxwellPlaneUnlocked: boolFromStorage(maxwellPlane),
    waveMockupEnabled: boolFromStorage(waveMockup),
    kingshotEnabled: boolFromStorage(kingshot),
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

export const setMaxwellPlaneUnlocked = async (enabled: boolean) => {
  await AsyncStorage.setItem(
    MAXWELL_PLANE_UNLOCK_STORAGE_KEY,
    String(enabled),
  );
  emit();
};

export const setWaveMockupEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(WAVE_MOCKUP_STORAGE_KEY, String(enabled));
  emit();
};

export const toggleWaveMockup = async () => {
  const current = await AsyncStorage.getItem(WAVE_MOCKUP_STORAGE_KEY);
  const next = current !== "true";
  await setWaveMockupEnabled(next);
  return next;
};

export const setKingshotEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(KINGSHOT_DEMO_STORAGE_KEY, String(enabled));
  emit();
};

export const toggleKingshot = async () => {
  const current = await AsyncStorage.getItem(KINGSHOT_DEMO_STORAGE_KEY);
  const next = current !== "true";
  await setKingshotEnabled(next);
  return next;
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
    maxwellPlaneUnlocked: false,
    waveMockupEnabled: false,
    kingshotEnabled: false,
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
