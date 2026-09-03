import AsyncStorage from "@react-native-async-storage/async-storage";

export const SHIP_CREDITS_KEY = "ta_plus_ship_credits";
export const SHIP_OWNED_KEY = "ta_plus_ship_owned";
export const SHIP_EQUIPPED_KEY = "ta_plus_ship_equipped";
export const SHIP_HIGH_SCORE_KEY = "ta_plus_ship_high_score";

export const SHIP_TASK_REWARD_LAST_KEY =
  "ta_plus_ship_task_reward_last";
export const SHIP_TASK_REWARD_PENDING_KEY =
  "ta_plus_ship_task_reward_pending";

export const SHIP_TASK_REWARD_AMOUNT = 200;
export const SHIP_TASK_REWARD_COOLDOWN_MS = 60 * 60 * 1000;

export const NORMAL_SHIP_SKINS = [
  "default",
  "turboprop",
  "jet",
  "airliner",
  "bomber",
  "interceptor",
  "scout",
  "fighter",
  "stealth",
  "gunship",
] as const;

export async function awardShipTaskCompletionBonus() {
  const now = Date.now();
  const rawLast = await AsyncStorage.getItem(
    SHIP_TASK_REWARD_LAST_KEY,
  );
  const last = Number(rawLast);

  if (
    Number.isFinite(last) &&
    now - last < SHIP_TASK_REWARD_COOLDOWN_MS
  ) {
    return false;
  }

  const [rawCredits, rawPending] = await Promise.all([
    AsyncStorage.getItem(SHIP_CREDITS_KEY),
    AsyncStorage.getItem(SHIP_TASK_REWARD_PENDING_KEY),
  ]);

  const currentCredits = Number(rawCredits);
  const currentPending = Number(rawPending);

  const nextCredits =
    (Number.isFinite(currentCredits) ? currentCredits : 0) +
    SHIP_TASK_REWARD_AMOUNT;

  const nextPending =
    (Number.isFinite(currentPending) ? currentPending : 0) +
    SHIP_TASK_REWARD_AMOUNT;

  await Promise.all([
    AsyncStorage.setItem(
      SHIP_CREDITS_KEY,
      String(Math.floor(nextCredits)),
    ),
    AsyncStorage.setItem(
      SHIP_TASK_REWARD_PENDING_KEY,
      String(Math.floor(nextPending)),
    ),
    AsyncStorage.setItem(
      SHIP_TASK_REWARD_LAST_KEY,
      String(now),
    ),
  ]);

  return true;
}

export async function consumePendingShipTaskBonus() {
  const raw = await AsyncStorage.getItem(
    SHIP_TASK_REWARD_PENDING_KEY,
  );
  const pending = Number(raw);

  await AsyncStorage.setItem(
    SHIP_TASK_REWARD_PENDING_KEY,
    "0",
  );

  return Number.isFinite(pending)
    ? Math.max(0, Math.floor(pending))
    : 0;
}

export async function unlockAllShipTestAircraft() {
  await AsyncStorage.setItem(
    SHIP_OWNED_KEY,
    JSON.stringify([...NORMAL_SHIP_SKINS]),
  );

  await AsyncStorage.setItem(
    SHIP_EQUIPPED_KEY,
    "default",
  );
}

export async function wipeOwnedShipAircraft() {
  await Promise.all([
    AsyncStorage.setItem(
      SHIP_OWNED_KEY,
      JSON.stringify(["default"]),
    ),
    AsyncStorage.setItem(
      SHIP_EQUIPPED_KEY,
      "default",
    ),
  ]);
}
