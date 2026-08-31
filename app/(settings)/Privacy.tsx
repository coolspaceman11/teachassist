import { Redirect } from "expo-router";

export default function RedirectOldSettingsPage() {
  return <Redirect href="/(settings)/PrivacyNotifications" />;
}
