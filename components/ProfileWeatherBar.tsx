import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import Text from "@/components/ui/AppText";
import {
  getAppleWeather,
  isTeachAssistNativeAvailable,
  type AppleWeatherSnapshot,
} from "@/modules/teachassist-native";

const MAPLE_LAT = 43.85493;
const MAPLE_LONG = -79.51248;
const FALLBACK_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${MAPLE_LAT}` +
  `&longitude=${MAPLE_LONG}` +
  "&current=temperature_2m,apparent_temperature,weather_code,is_day,cloud_cover,relative_humidity_2m,wind_speed_10m" +
  "&temperature_unit=celsius&wind_speed_unit=kmh&timezone=America%2FToronto&forecast_hours=1";

type WeatherKind =
  | "clear"
  | "partlyCloudy"
  | "cloudy"
  | "rain"
  | "snow"
  | "storm"
  | "fog"
  | "hail"
  | "sleet"
  | "windy";

type WeatherState = {
  temperatureC: number;
  apparentTemperatureC: number;
  condition: string;
  description: string;
  isDaylight: boolean;
  cloudCover: number;
  humidity: number;
  windKph: number;
  provider: "apple" | "fallback";
  legalPageURL?: string;
  attributionMarkLightURL?: string;
  attributionMarkDarkURL?: string;
};

const normalizeCondition = (value: string) => value.replace(/[^a-z]/gi, "").toLowerCase();

const classifyApple = (condition: string): WeatherKind => {
  const c = normalizeCondition(condition);
  if (["clear", "mostlyclear", "hot", "frigid"].includes(c)) return "clear";
  if (["partlycloudy", "sunshowers", "sunflurries"].includes(c)) return "partlyCloudy";
  if (["cloudy", "mostlycloudy"].includes(c)) return "cloudy";
  if (["foggy", "haze", "smoky", "blowingdust"].includes(c)) return "fog";
  if (["breezy", "windy"].includes(c)) return "windy";
  if (["hail"].includes(c)) return "hail";
  if (["sleet", "wintrymix", "freezingdrizzle", "freezingrain"].includes(c)) return "sleet";
  if (["flurries", "snow", "blizzard", "blowingsnow", "heavysnow"].includes(c)) return "snow";
  if (["isolatedthunderstorms", "scatteredthunderstorms", "strongstorms", "thunderstorms", "tropicalstorm", "hurricane"].includes(c)) return "storm";
  if (["drizzle", "heavyrain", "rain"].includes(c)) return "rain";
  return "cloudy";
};

const classifyWmo = (code: number): WeatherKind => {
  if (code === 0) return "clear";
  if ([1, 2].includes(code)) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
};

const fallbackDescription = (kind: WeatherKind, isDay: boolean) => {
  switch (kind) {
    case "clear": return isDay ? "Clear skies" : "Clear night";
    case "partlyCloudy": return "Partly cloudy";
    case "cloudy": return "Cloudy";
    case "rain": return "Rain";
    case "snow": return "Snow";
    case "storm": return "Thunderstorm";
    case "fog": return "Foggy";
    case "hail": return "Hail";
    case "sleet": return "Sleet / wintry mix";
    case "windy": return "Windy";
  }
};

const gradients: Record<WeatherKind | "night", [string, string]> = {
  clear: ["#378bd0", "#75c7f2"],
  partlyCloudy: ["#487ea6", "#8db4cd"],
  cloudy: ["#536675", "#8798a5"],
  rain: ["#31465a", "#526b7e"],
  snow: ["#829dad", "#c7d9e2"],
  storm: ["#242943", "#4b526d"],
  fog: ["#65727a", "#9aa4aa"],
  hail: ["#43586a", "#8096a6"],
  sleet: ["#40566b", "#8296aa"],
  windy: ["#4e6d78", "#7fa0a6"],
  night: ["#10172f", "#25335c"],
};

function WeatherVisual({ kind, isDay }: { kind: WeatherKind; isDay: boolean }) {
  const { width } = useWindowDimensions();
  const move = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cloudAnim = Animated.loop(
      Animated.timing(move, { toValue: 1, duration: 6800, useNativeDriver: true }),
    );
    const starAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0, duration: 720, useNativeDriver: true }),
      ]),
    );
    cloudAnim.start();
    starAnim.start();
    return () => {
      cloudAnim.stop();
      starAnim.stop();
    };
  }, [move, twinkle]);

  const cloudX = move.interpolate({ inputRange: [0, 1], outputRange: [-180, width + 220] });

  if (!isDay && (kind === "clear" || kind === "partlyCloudy")) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {[10, 26, 42, 59, 75, 91].map((left, index) => (
          <Animated.View
            key={left}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: index % 2 ? 13 : 31,
              width: index % 2 ? 2 : 3,
              height: index % 2 ? 2 : 3,
              borderRadius: 3,
              backgroundColor: "#fff",
              opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: index % 2 ? [0.3, 0.95] : [0.9, 0.4] }),
            }}
          />
        ))}
        <MaterialIcons name="nightlight-round" size={43} color="#f5f2d8" style={{ position: "absolute", right: 20, bottom: 9, opacity: 0.95 }} />
        {kind === "partlyCloudy" ? (
          <Animated.View style={{ position: "absolute", left: 0, bottom: -4, transform: [{ translateX: cloudX }] }}>
            <MaterialIcons name="cloud" size={55} color="rgba(255,255,255,0.26)" />
          </Animated.View>
        ) : null}
      </View>
    );
  }

  if (kind === "clear") {
    return <MaterialIcons pointerEvents="none" name="wb-sunny" size={46} color="rgba(255,244,177,0.88)" style={{ position: "absolute", right: 18, bottom: 8 }} />;
  }

  if (kind === "partlyCloudy") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <MaterialIcons name="wb-sunny" size={41} color="rgba(255,239,162,0.9)" style={{ position: "absolute", right: 34, bottom: 16 }} />
        <Animated.View style={{ position: "absolute", left: 0, bottom: -3, transform: [{ translateX: cloudX }] }}>
          <MaterialIcons name="cloud" size={57} color="rgba(255,255,255,0.3)" />
        </Animated.View>
      </View>
    );
  }

  if (["cloudy", "fog", "rain", "storm", "hail", "sleet", "windy"].includes(kind)) {
    const icon = kind === "storm" ? "thunderstorm" : kind === "rain" ? "water-drop" : kind === "hail" || kind === "sleet" ? "ac-unit" : kind === "windy" ? "air" : null;
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Animated.View style={{ position: "absolute", left: 0, bottom: -2, transform: [{ translateX: cloudX }] }}>
          <MaterialIcons name="cloud" size={58} color="rgba(255,255,255,0.22)" />
        </Animated.View>
        <Animated.View style={{ position: "absolute", left: -145, top: -3, transform: [{ translateX: cloudX }] }}>
          <MaterialIcons name="cloud" size={43} color="rgba(255,255,255,0.16)" />
        </Animated.View>
        {icon ? <MaterialIcons name={icon as any} size={37} color="rgba(255,255,255,0.34)" style={{ position: "absolute", right: 20, bottom: 10 }} /> : null}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {[16, 31, 50, 66, 83, 94].map((left, index) => (
        <MaterialIcons key={left} name="ac-unit" size={index % 2 ? 11 : 15} color="rgba(255,255,255,0.55)" style={{ position: "absolute", left: `${left}%`, top: 8 + (index % 3) * 18 }} />
      ))}
    </View>
  );
}

export default function ProfileWeatherBar() {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const loadFallback = useCallback(async (): Promise<WeatherState> => {
    const response = await fetch(`${FALLBACK_URL}&refresh=${Math.floor(Date.now() / 300000)}`, { headers: { "Cache-Control": "no-cache" } });
    if (!response.ok) throw new Error(`Fallback weather ${response.status}`);
    const current = (await response.json())?.current;
    if (!current || typeof current.temperature_2m !== "number") throw new Error("Missing fallback current weather");
    const kind = classifyWmo(Number(current.weather_code ?? 0));
    const isDay = Number(current.is_day ?? 1) === 1;
    return {
      temperatureC: Number(current.temperature_2m),
      apparentTemperatureC: Number(current.apparent_temperature ?? current.temperature_2m),
      condition: `wmo-${Number(current.weather_code ?? 0)}`,
      description: fallbackDescription(kind, isDay),
      isDaylight: isDay,
      cloudCover: Number(current.cloud_cover ?? 0) / 100,
      humidity: Number(current.relative_humidity_2m ?? 0) / 100,
      windKph: Number(current.wind_speed_10m ?? 0),
      provider: "fallback",
    };
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      let next: WeatherState;
      if (isTeachAssistNativeAvailable()) {
        try {
          const apple: AppleWeatherSnapshot = await getAppleWeather(MAPLE_LAT, MAPLE_LONG);
          next = {
            temperatureC: apple.temperatureC,
            apparentTemperatureC: apple.apparentTemperatureC,
            condition: apple.condition,
            description: apple.description,
            isDaylight: apple.isDaylight,
            cloudCover: apple.cloudCover,
            humidity: apple.humidity,
            windKph: apple.windKph,
            provider: "apple",
            legalPageURL: apple.legalPageURL,
            attributionMarkLightURL: apple.attributionMarkLightURL,
            attributionMarkDarkURL: apple.attributionMarkDarkURL,
          };
        } catch (error) {
          console.warn("[Weather] Apple WeatherKit unavailable; using fallback", error);
          next = await loadFallback();
        }
      } else {
        next = await loadFallback();
      }
      setWeather(next);
      setUnavailable(false);
    } catch (error) {
      console.warn("[Weather] Maple weather unavailable", error);
      setUnavailable(true);
    }
  }, [loadFallback]);

  useEffect(() => {
    loadWeather();
    const timer = setInterval(loadWeather, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadWeather]);

  const kind = useMemo(() => {
    if (!weather) return "cloudy" as WeatherKind;
    return weather.provider === "apple"
      ? classifyApple(weather.condition)
      : classifyWmo(Number(weather.condition.replace("wmo-", "")));
  }, [weather]);

  const colors = weather && !weather.isDaylight ? gradients.night : gradients[kind];

  if (!weather && unavailable) {
    return (
      <View style={styles.wrap}>
        <View style={styles.offlineBar}>
          <MaterialIcons name="cloud-off" size={21} color="#ffffff" />
          <Text style={styles.location}>Maple, Vaughan</Text>
          <Text style={styles.offlineText}>Weather unavailable</Text>
          <Pressable onPress={loadWeather} hitSlop={8}>
            <MaterialIcons name="refresh" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    );
  }

  if (!weather) return null;

  const mark = weather.attributionMarkDarkURL || weather.attributionMarkLightURL;

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bar}>
        <WeatherVisual kind={kind} isDay={weather.isDaylight} />
        <View style={{ flex: 1, zIndex: 2 }}>
          <Text style={styles.location}>Maple, Vaughan</Text>
          <Text style={styles.condition}>{weather.description || fallbackDescription(kind, weather.isDaylight)}</Text>
          {weather.provider === "apple" ? (
            <Pressable
              onPress={() => weather.legalPageURL && Linking.openURL(weather.legalPageURL)}
              hitSlop={5}
              style={styles.attributionRow}
            >
              {mark ? <Image source={{ uri: mark }} resizeMode="contain" style={styles.weatherMark} /> : <Text style={styles.providerText}>Weather</Text>}
              <MaterialIcons name="open-in-new" size={10} color="rgba(255,255,255,.7)" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.tempWrap}>
          <Text style={styles.temperature}>{Math.round(weather.temperatureC)}°</Text>
          <Text style={styles.feels}>Feels {Math.round(weather.apparentTemperatureC)}°</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginTop: 14 },
  bar: {
    minHeight: 82,
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },
  offlineBar: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4c5964",
  },
  location: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  condition: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 2 },
  tempWrap: { alignItems: "flex-end", zIndex: 2, paddingLeft: 8 },
  temperature: { color: "#ffffff", fontSize: 34, lineHeight: 38, fontWeight: "600" },
  feels: { color: "rgba(255,255,255,.72)", fontSize: 9, marginTop: -1 },
  offlineText: { color: "rgba(255,255,255,0.75)", fontSize: 11, flex: 1 },
  attributionRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, minHeight: 12 },
  weatherMark: { width: 58, height: 12 },
  providerText: { color: "rgba(255,255,255,.72)", fontSize: 9, fontWeight: "700" },
});
