import AsyncStorage from "@react-native-async-storage/async-storage";

export type VersionUpdateMode = "none" | "optional" | "required";

// Kept for compatibility with any code that may import this constant.
// TeachAssist+ does NOT contact the original TeachAssist update server.
export const VERSION_CHECK_URL =
  "https://prmntr.com/api/teachassist/version";

const MODE_KEY = "version_check_mode";
const LATEST_KEY = "version_check_latest";
const MINIMUM_KEY = "version_check_minimum";
const DISMISSED_FOR_KEY = "version_check_dismissed_for";
const CHECKED_AT_KEY = "version_check_checked_at";

const normalizeVersion = (version: string) =>
  version.trim().replace(/^v/i, "");

const parseVersionParts = (version: string) =>
  normalizeVersion(version)
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));

export const compareVersions = (a: string, b: string) => {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);

  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);

    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
};

// Kept for compatibility.
// We may reuse this later for our own TeachAssist+ update system.
export const parseVersionCheckJson = (json: any) => {
  if (
    !json ||
    !Array.isArray(json.versions) ||
    json.versions.length < 2
  ) {
    return null;
  }

  return {
    latest: normalizeVersion(json.versions[0]),
    minimum: normalizeVersion(json.versions[1]),
  };
};

// TeachAssist+ does not use the original TeachAssist version checker.
// Clear any old cached update state and always allow the app to continue.
export const runVersionCheck = async (
  _currentVersion: string,
): Promise<VersionUpdateMode> => {
  try {
    await AsyncStorage.multiRemove([
      MODE_KEY,
      LATEST_KEY,
      MINIMUM_KEY,
      DISMISSED_FOR_KEY,
      CHECKED_AT_KEY,
    ]);
  } catch (error) {
    console.warn(
      "[TeachAssist+] Failed to clear old version-check state.",
      error,
    );
  }

  return "none";
};

// Always report that TeachAssist+ has no pending update.
export const loadVersionCheckState = async () => {
  return {
    mode: "none" as VersionUpdateMode,
    latest: null,
    minimum: null,
    dismissedFor: null,
  };
};

// Kept so existing components importing this function do not break.
export const markVersionPromptDismissed = async (
  _latest: string | null,
) => {
  try {
    await AsyncStorage.removeItem(DISMISSED_FOR_KEY);
  } catch (error) {
    console.warn(
      "[TeachAssist+] Failed to clear dismissed update state.",
      error,
    );
  }
};

// Never show the original TeachAssist update prompt.
export const shouldShowUpdatePrompt = (
  _mode: VersionUpdateMode,
  _latest: string | null,
  _dismissedFor: string | null,
) => {
  return false;
};

// Kept for compatibility and for a future TeachAssist+ updater.
export const evaluateUpdateMode = (
  currentVersion: string,
  latestVersion: string,
  minimumVersion: string,
): VersionUpdateMode => {
  if (compareVersions(currentVersion, minimumVersion) < 0) {
    return "required";
  }

  if (compareVersions(currentVersion, latestVersion) < 0) {
    return "optional";
  }

  return "none";
};