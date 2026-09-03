import { requireOptionalNativeModule } from "expo";

export type AppleWeatherSnapshot = {
  temperatureC: number;
  apparentTemperatureC: number;
  condition: string;
  description: string;
  symbolName: string;
  isDaylight: boolean;
  cloudCover: number;
  humidity: number;
  windKph: number;
  uvIndex: number;
  providerName: string;
  legalPageURL: string;
  attributionMarkLightURL: string;
  attributionMarkDarkURL: string;
};

export type HealthSummary = {
  stepsToday: number;
  stepsWeek: number;
  averageSteps: number;
  distanceKmToday: number;
  activeEnergyKcalToday: number;
  flightsClimbedToday: number;
};

export type SchoolETA = {
  seconds: number;
  distanceMeters: number;
  expectedArrivalISO: string;
  destinationName: string;
};

type NativeShape = {
  getAppleWeather(latitude: number, longitude: number): Promise<AppleWeatherSnapshot>;
  requestHealthAccess(): Promise<boolean>;
  getHealthSummary(): Promise<HealthSummary>;
  getSchoolETA(): Promise<SchoolETA>;
};

const Native = requireOptionalNativeModule<NativeShape>("TeachAssistNative");

export const isTeachAssistNativeAvailable = () => Native !== null;

const requireFeature = () => {
  if (!Native) {
    throw new Error("TeachAssistNative is not included in this installed IPA. Rebuild the native app first.");
  }
  return Native;
};

export const getAppleWeather = (latitude: number, longitude: number) =>
  requireFeature().getAppleWeather(latitude, longitude);

export const requestHealthAccess = () => requireFeature().requestHealthAccess();
export const getHealthSummary = () => requireFeature().getHealthSummary();
export const getSchoolETA = () => requireFeature().getSchoolETA();
