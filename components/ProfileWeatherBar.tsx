import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import Text from "@/components/ui/AppText";

const MAPLE_LAT = 43.85493;
const MAPLE_LONG = -79.51248;
const WEATHER_FIELDS =
  "temperature_2m,weather_code,is_day,cloud_cover,precipitation,snowfall";

const BEST_MATCH_WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${MAPLE_LAT}` +
  `&longitude=${MAPLE_LONG}` +
  `&current=${WEATHER_FIELDS}` +
  "&temperature_unit=celsius&timezone=America%2FToronto&forecast_hours=1";

const CANADIAN_GEM_WEATHER_URL =
  `https://api.open-meteo.com/v1/gem?latitude=${MAPLE_LAT}` +
  `&longitude=${MAPLE_LONG}` +
  `&current=${WEATHER_FIELDS}` +
  "&temperature_unit=celsius&timezone=America%2FToronto&forecast_hours=1";

type WeatherState = {
  temperature: number;
  code: number;
  isDay: boolean;
  cloudCover: number;
  precipitation: number;
  snowfall: number;
};

type WeatherKind = "clear" | "partlyCloudy" | "cloudy" | "rain" | "snow" | "storm" | "fog";

const classifyWeather = (code: number): WeatherKind => {
  if (code === 0) return "clear";
  if ([1, 2].includes(code)) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
};

const description = (kind: WeatherKind, isDay: boolean) => {
  switch (kind) {
    case "clear":
      return isDay ? "Clear skies" : "Clear night";
    case "partlyCloudy":
      return "Partly cloudy";
    case "cloudy":
      return "Cloudy";
    case "rain":
      return "Rain";
    case "snow":
      return "Snow";
    case "storm":
      return "Thunderstorm";
    case "fog":
      return "Foggy";
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
  night: ["#10172f", "#25335c"],
};

const WeatherVisual = ({ kind, isDay }: { kind: WeatherKind; isDay: boolean }) => {
  const { width } = useWindowDimensions();
  const move = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cloudAnim = Animated.loop(
      Animated.timing(move, {
        toValue: 1,
        duration: 6500,
        useNativeDriver: true,
      }),
    );
    const starAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    cloudAnim.start();
    starAnim.start();
    return () => {
      cloudAnim.stop();
      starAnim.stop();
    };
  }, [move, twinkle]);

  const cloudX = move.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, width + 180],
  });

  if (!isDay && kind === "clear") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {[12, 34, 57, 76, 91].map((left, index) => (
          <Animated.View
            key={left}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: index % 2 ? 14 : 31,
              width: index % 2 ? 2 : 3,
              height: index % 2 ? 2 : 3,
              borderRadius: 3,
              backgroundColor: "#fff",
              opacity: twinkle.interpolate({
                inputRange: [0, 1],
                outputRange: index % 2 ? [0.35, 0.95] : [0.9, 0.4],
              }),
            }}
          />
        ))}
        <MaterialIcons
          name="nightlight-round"
          size={44}
          color="#f5f2d8"
          style={{ position: "absolute", right: 20, bottom: 9, opacity: 0.95 }}
        />
      </View>
    );
  }

  if (kind === "partlyCloudy") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <MaterialIcons
          name={isDay ? "wb-sunny" : "nightlight-round"}
          size={42}
          color={isDay ? "rgba(255,239,162,0.9)" : "rgba(245,242,216,0.9)"}
          style={{ position: "absolute", right: 35, bottom: 15 }}
        />
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            transform: [{ translateX: cloudX }],
          }}
        >
          <MaterialIcons
            name="cloud"
            size={54}
            color="rgba(255,255,255,0.28)"
          />
        </Animated.View>
      </View>
    );
  }

  if (kind === "cloudy" || kind === "fog" || kind === "rain" || kind === "storm") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Animated.View style={{ position: "absolute", left: 0, bottom: 0, transform: [{ translateX: cloudX }] }}>
          <MaterialIcons name="cloud" size={56} color="rgba(255,255,255,0.22)" />
        </Animated.View>
        <Animated.View style={{ position: "absolute", left: -130, top: 0, transform: [{ translateX: cloudX }] }}>
          <MaterialIcons name="cloud" size={42} color="rgba(255,255,255,0.16)" />
        </Animated.View>
        {kind === "rain" || kind === "storm" ? (
          <MaterialIcons name={kind === "storm" ? "thunderstorm" : "water-drop"} size={38} color="rgba(255,255,255,0.32)" style={{ position: "absolute", right: 20, bottom: 10 }} />
        ) : null}
      </View>
    );
  }

  if (kind === "snow") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {[16, 31, 50, 66, 83, 94].map((left, index) => (
          <MaterialIcons key={left} name="ac-unit" size={index % 2 ? 11 : 15} color="rgba(255,255,255,0.55)" style={{ position: "absolute", left: `${left}%`, top: 8 + (index % 3) * 18 }} />
        ))}
      </View>
    );
  }

  return (
    <MaterialIcons
      pointerEvents="none"
      name="wb-sunny"
      size={46}
      color="rgba(255,244,177,0.85)"
      style={{ position: "absolute", right: 18, bottom: 8 }}
    />
  );
};

export default function ProfileWeatherBar() {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const loadWeather = useCallback(async () => {
    const cacheBust = Math.floor(Date.now() / (5 * 60 * 1000));

    const readCurrent = async (baseUrl: string) => {
      const response = await fetch(`${baseUrl}&refresh=${cacheBust}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`Weather ${response.status}`);
      }

      const data = await response.json();
      const current = data?.current;

      if (!current || typeof current.temperature_2m !== "number") {
        throw new Error("Missing current weather");
      }

      return {
        temperature: Number(current.temperature_2m),
        code: Number(current.weather_code ?? 0),
        isDay: Number(current.is_day ?? 1) === 1,
        cloudCover: Number(current.cloud_cover ?? 0),
        precipitation: Number(current.precipitation ?? 0),
        snowfall: Number(current.snowfall ?? 0),
      } satisfies WeatherState;
    };

    try {
      const [bestMatchResult, gemResult] = await Promise.allSettled([
        readCurrent(BEST_MATCH_WEATHER_URL),
        readCurrent(CANADIAN_GEM_WEATHER_URL),
      ]);

      const bestMatch =
        bestMatchResult.status === "fulfilled"
          ? bestMatchResult.value
          : null;

      const gem =
        gemResult.status === "fulfilled"
          ? gemResult.value
          : null;

      if (!bestMatch && !gem) {
        throw new Error("All weather sources failed");
      }

      if (bestMatch && gem) {
        const temperatureGap = Math.abs(
          bestMatch.temperature - gem.temperature,
        );

        // Best Match updates more frequently, while GEM adds a local Canadian
        // high-resolution signal. Blend only when the two are reasonably close.
        const blendedTemperature =
          temperatureGap <= 4
            ? bestMatch.temperature * 0.7 + gem.temperature * 0.3
            : bestMatch.temperature;

        const conditionSource =
          bestMatch.precipitation > 0 ||
          bestMatch.snowfall > 0 ||
          bestMatch.code >= 45
            ? bestMatch
            : gem.code >= 45
              ? gem
              : bestMatch;

        setWeather({
          ...conditionSource,
          temperature: blendedTemperature,
          cloudCover: Math.round(
            bestMatch.cloudCover * 0.7 + gem.cloudCover * 0.3,
          ),
        });
      } else {
        setWeather((bestMatch ?? gem)!);
      }

      setUnavailable(false);
    } catch (error) {
      console.warn("[Weather] Maple weather unavailable", error);
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    const timer = setInterval(loadWeather, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadWeather]);

  const kind = useMemo(
    () => (weather ? classifyWeather(weather.code) : "cloudy"),
    [weather],
  );
  const colors = weather && !weather.isDay ? gradients.night : gradients[kind];

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

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bar}>
        <WeatherVisual kind={kind} isDay={weather.isDay} />
        <View style={{ flex: 1, zIndex: 2 }}>
          <Text style={styles.location}>Maple, Vaughan</Text>
          <Text style={styles.condition}>{description(kind, weather.isDay)}</Text>
        </View>
        <Text style={styles.temperature}>{Math.round(weather.temperature)}°</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginTop: 14 },
  bar: {
    minHeight: 76,
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  temperature: { color: "#ffffff", fontSize: 34, fontWeight: "600", zIndex: 2 },
  offlineText: { color: "rgba(255,255,255,0.75)", fontSize: 11, flex: 1 },
});
