import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Battery from "expo-battery";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import {
  getChargeReminderEnabled,
  subscribeChargeReminder,
} from "@/utils/chargeReminder";

const ARM_KEY = "ta_plus_charge_reminder_armed";

export default function PhoneChargeReminder() {
  const [enabled, setEnabled] = useState(false);
  const armed = useRef(true);
  const lastLevel = useRef(-1);
  const lastState = useRef<Battery.BatteryState>(Battery.BatteryState.UNKNOWN);

  useEffect(() => {
    Promise.all([
      getChargeReminderEnabled(),
      AsyncStorage.getItem(ARM_KEY),
    ])
      .then(([storedEnabled, storedArmed]) => {
        setEnabled(storedEnabled);
        armed.current = storedArmed !== "false";
      })
      .catch(() => {});

    return subscribeChargeReminder(setEnabled);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const persistArmed = (value: boolean) => {
      armed.current = value;
      AsyncStorage.setItem(ARM_KEY, value ? "true" : "false").catch(() => {});
    };

    const check = async (level: number, state: Battery.BatteryState) => {
      if (!mounted || level < 0) return;
      lastLevel.current = level;
      lastState.current = state;

      const charging =
        state === Battery.BatteryState.CHARGING ||
        state === Battery.BatteryState.FULL;

      if (charging || level >= 0.15) {
        if (!armed.current) persistArmed(true);
        return;
      }

      if (level <= 0.105 && armed.current) {
        persistArmed(false);
        Alert.alert("Charge your phone");

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Charge your phone",
              body: "Your phone is at 10% battery.",
              sound: true,
            },
            trigger: null,
          });
        } catch (error) {
          console.warn("[ChargeReminder] notification failed", error);
        }
      }
    };

    Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
    ])
      .then(([level, state]) => check(level, state))
      .catch((error) => console.warn("[ChargeReminder] initial battery read failed", error));

    const levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      check(batteryLevel, lastState.current).catch(() => {});
    });

    const stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
      check(lastLevel.current, batteryState).catch(() => {});
    });

    return () => {
      mounted = false;
      levelSub.remove();
      stateSub.remove();
    };
  }, [enabled]);

  return null;
}
