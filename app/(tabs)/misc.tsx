import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";

import Text from "@/components/ui/AppText";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import GDShipGame from "@/components/GDShipGame";
import KingshotDemo from "@/components/KingshotDemo";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";
import { setGPTAccessEnabled, useFunSettings } from "@/utils/funSettings";
import {
  consumePendingShipTaskBonus,
  SHIP_CREDITS_KEY,
  SHIP_EQUIPPED_KEY,
  SHIP_HIGH_SCORE_KEY,
  SHIP_OWNED_KEY,
} from "@/utils/shipEconomy";
import { SecureStorage } from "../(auth)/taauth";

type MiscTool = "sunshine" | "flipper" | "coin" | "wave" | "kingshot" | "gpt" | null;

type SunshineRow = {
  id: string;
  year: string;
  name: string;
  position: string;
  employer: string;
  sector: string;
  salary: string;
  benefits: string;
};

type FlipperDevice = {
  id: string;
  name: string;
  rssi: number | null;
};

const SUNSHINE_API = "https://sunshinelistontario.com/api/search";

const money = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "number") {
    return value.toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 2,
    });
  }

  const numeric = Number(String(value).replace(/[$,\s]/g, ""));
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 2,
    });
  }

  return String(value);
};

const getField = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
};

const normalizeSunshineRow = (
  raw: Record<string, unknown>,
  index: number,
): SunshineRow => {
  const first = getField(raw, [
    "first_name",
    "firstName",
    "firstname",
    "First Name",
    "first",
  ]);

  const last = getField(raw, [
    "last_name",
    "lastName",
    "lastname",
    "Last Name",
    "last",
  ]);

  const directName = getField(raw, [
    "name",
    "Name",
    "employee_name",
    "employeeName",
    "person",
  ]);

  const name =
    directName ||
    [first, last].filter(Boolean).join(" ") ||
    "Unknown person";

  return {
    id:
      getField(raw, ["id", "_id", "record_id"]) ||
      `${name}-${getField(raw, ["year", "calendar_year", "Calendar Year"])}-${index}`,
    year: getField(raw, [
      "year",
      "calendar_year",
      "calendarYear",
      "Calendar Year",
    ]),
    name,
    position:
      getField(raw, [
        "position",
        "job_title",
        "jobTitle",
        "Job Title",
        "title",
      ]) || "—",
    employer:
      getField(raw, ["employer", "Employer", "organization", "employer_name"]) ||
      "—",
    sector: getField(raw, ["sector", "Sector"]) || "—",
    salary: money(
      raw.salary ??
        raw.salary_paid ??
        raw.salaryPaid ??
        raw["Salary Paid"] ??
        raw["Salary"],
    ),
    benefits: money(
      raw.benefits ??
        raw.taxable_benefits ??
        raw.taxableBenefits ??
        raw["Taxable Benefits"] ??
        raw["Benefits"],
    ),
  };
};

export default function MiscScreen() {
  const { activeTone, isDark } = useTheme();
  const {
    gptAccessEnabled,
    maxwellPlaneUnlocked,
    waveMockupEnabled,
    kingshotEnabled,
  } = useFunSettings();
  const { width } = useWindowDimensions();

  const [activeTool, setActiveTool] = useState<MiscTool>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const slideX = useRef(new Animated.Value(width)).current;

  const textColor = isDark ? "#edebea" : "#2f3035";

  const openTool = (tool: Exclude<MiscTool, null>) => {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTool(tool);
    setPanelMounted(true);
    slideX.setValue(width);

    requestAnimationFrame(() => {
      Animated.timing(slideX, {
        toValue: 0,
        duration: 310,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const closeTool = () => {
    Animated.timing(slideX, {
      toValue: width,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPanelMounted(false);
      setActiveTool(null);
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: activeTone.bg1 }]}>
      <PageBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.dashboardContent}
      >
        <Text style={[styles.screenTitle, { color: textColor }]}>Misc</Text>

        <Text style={[styles.screenSubtitle, { color: activeTone.muted }]}>
          Extra tools and integrations.
        </Text>

        <View style={styles.grid}>
          <Pressable style={styles.cell} onPress={() => openTool("sunshine")}>
            <LiquidGlassView
              className="rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.card}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: activeTone.bg4 },
                  ]}
                >
                  <MaterialIcons
                    name="wb-sunny"
                    size={28}
                    color={activeTone.accent}
                  />
                </View>

                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Sunshine List
                </Text>

                <Text style={[styles.cardSubtitle, { color: activeTone.muted }]}>
                  Search Ontario public-sector salary records
                </Text>
              </View>
            </LiquidGlassView>
          </Pressable>

          <Pressable style={styles.cell} onPress={() => openTool("flipper")}>
            <LiquidGlassView
              className="rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.card}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: activeTone.bg4 },
                  ]}
                >
                  <MaterialIcons
                    name="bluetooth-connected"
                    size={28}
                    color={activeTone.accent}
                  />
                </View>

                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Flipper Zero
                </Text>

                <Text style={[styles.cardSubtitle, { color: activeTone.muted }]}>
                  Connect and manage your own device over Bluetooth
                </Text>
              </View>
            </LiquidGlassView>
          </Pressable>
        <Pressable style={styles.cell} onPress={() => openTool("coin")}>
          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: activeTone.bg4 }]}>
                <MaterialIcons name="paid" size={28} color={activeTone.accent} />
              </View>
              <Text style={[styles.cardTitle, { color: textColor }]}>Coin Flip</Text>
              <Text style={[styles.cardSubtitle, { color: activeTone.muted }]}>Heads or tails with a quick animated flip</Text>
            </View>
          </LiquidGlassView>
        </Pressable>

        {waveMockupEnabled ? (
          <Pressable style={styles.cell} onPress={() => openTool("wave")}>
            <LiquidGlassView
              className="rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: activeTone.bg4 }]}>
                  <MaterialIcons
                    name="change-history"
                    size={28}
                    color={activeTone.accent}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  GD Wave Mockup
                </Text>
                <Text style={[styles.cardSubtitle, { color: activeTone.muted }]}>
                  A gamemode inspired by GD's wave and more
                </Text>
              </View>
            </LiquidGlassView>
          </Pressable>
        ) : null}

        {kingshotEnabled ? (
          <Pressable style={styles.cell} onPress={() => openTool("kingshot")}>
            <LiquidGlassView
              className="rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: activeTone.bg4 }]}>
                  <MaterialIcons
                    name="castle"
                    size={28}
                    color={activeTone.accent}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  Kingshot Demo
                </Text>
                <Text style={[styles.cardSubtitle, { color: activeTone.muted }]}>
                  Kingshot demo style mockup
                </Text>
              </View>
            </LiquidGlassView>
          </Pressable>
        ) : null}

        {gptAccessEnabled ? (
          <View style={styles.cell}>
            <LiquidGlassView
              className="rounded-2xl overflow-hidden"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.card}>
                <Pressable onPress={() => openTool("gpt")} style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: activeTone.bg4 },
                    ]}
                  >
                    <MaterialIcons
                      name="auto-awesome"
                      size={28}
                      color={activeTone.accent}
                    />
                  </View>

                  <Text style={[styles.cardTitle, { color: textColor }]}>
                    GPT Access
                  </Text>

                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: activeTone.muted },
                    ]}
                  >
                    Fast AI powered by Groq
                  </Text>
                </Pressable>

                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    Alert.alert(
                      "Disable GPT Access?",
                      "This removes GPT Access from Misc. You can enable it again from Experiments.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Disable",
                          style: "destructive",
                          onPress: async () => {
                            await setGPTAccessEnabled(false);
                            if (activeTool === "gpt") {
                              closeTool();
                            }
                          },
                        },
                      ],
                    );
                  }}
                  style={[
                    styles.gptDisableButton,
                    {
                      backgroundColor: activeTone.bg4,
                      borderColor: activeTone.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="power-settings-new"
                    size={15}
                    color={activeTone.muted}
                  />
                  <Text
                    style={[
                      styles.gptDisableText,
                      { color: activeTone.muted },
                    ]}
                  >
                    Disable
                  </Text>
                </Pressable>
              </View>
            </LiquidGlassView>
          </View>
        ) : null}
      </View>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden mt-2"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View style={styles.moreCard}>
            <MaterialIcons
              name="add-circle-outline"
              size={22}
              color={activeTone.accent}
            />

            <View style={{ flex: 1 }}>
              <Text style={[styles.moreTitle, { color: textColor }]}>
                More later
              </Text>

              <Text style={[styles.moreText, { color: activeTone.muted }]}>
                Misc is intentionally open-ended so new tools can be added
                without crowding the main app.
              </Text>
            </View>
          </View>
        </LiquidGlassView>
      </ScrollView>

      {panelMounted && activeTool && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              zIndex: 100,
              backgroundColor: activeTone.bg1,
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <PageBackground />

          <MiscPanelHeader
            title={
              activeTool === "sunshine"
                ? "Sunshine List"
                : activeTool === "flipper"
                  ? "Flipper Zero"
                  : activeTool === "coin"
                    ? "Coin Flip"
                    : activeTool === "wave"
                      ? "GD Wave Mockup"
                      : activeTool === "kingshot"
                        ? "Kingshot Demo"
                        : "GPT Access"
            }
            onClose={closeTool}
          />

          {activeTool === "sunshine" && <SunshineListPanel />}
          {activeTool === "flipper" && <FlipperPanel />}
          {activeTool === "coin" && <CoinFlipPanel />}
          {activeTool === "wave" && <GDWaveMockupPanel maxwellUnlocked={maxwellPlaneUnlocked} />}
          {activeTool === "kingshot" && <KingshotDemo />}
          {activeTool === "gpt" && <GPTAccessPanel />}
        </Animated.View>
      )}
    </View>
  );
}

function MiscPanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  const { activeTone, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const textColor = isDark ? "#edebea" : "#2f3035";

  return (
    <View
      style={[
        styles.panelHeader,
        {
          paddingTop: insets.top + 14,
          minHeight: insets.top + 72,
        },
      ]}
    >
      <Text style={[styles.panelTitle, { color: textColor }]}>{title}</Text>

      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={[
          styles.closeButton,
          {
            backgroundColor: activeTone.bg3,
          },
        ]}
      >
        <MaterialIcons name="close" size={23} color={textColor} />
      </Pressable>
    </View>
  );
}

function SunshineListPanel() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const [query, setQuery] = useState("");
  const [history, setHistory] = useState(true);
  const [rows, setRows] = useState<SunshineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  const search = async () => {
    const clean = query.trim();

    if (clean.length < 2) {
      Alert.alert("Enter a name", "Type at least two characters.");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        q: clean,
        sort: "year_desc",
        per_page: "100",
      });

      if (history) {
        params.set("year_min", "1996");
        params.set("year_max", "2025");
      } else {
        params.set("year_min", "2025");
        params.set("year_max", "2025");
      }

      const response = await fetch(`${SUNSHINE_API}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Sunshine API ${response.status}`);
      }

      const data = await response.json();
      const rawRows = Array.isArray(data?.rows) ? data.rows : [];

      setRows(
        rawRows.map((row: Record<string, unknown>, index: number) =>
          normalizeSunshineRow(row, index),
        ),
      );

      setTotal(typeof data?.total === "number" ? data.total : rawRows.length);
    } catch (error) {
      console.warn("[Misc] Sunshine search failed", error);
      setRows([]);
      setTotal(null);

      Alert.alert(
        "Search unavailable",
        "The Sunshine List service could not be reached. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.panelBody}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.panelContent}
      >
        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View style={styles.searchCard}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Search a person
            </Text>

            <Text style={[styles.helper, { color: activeTone.muted }]}>
              Search public Ontario salary-disclosure records by name.
            </Text>

            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={search}
                returnKeyType="search"
                autoCapitalize="words"
                placeholder="Teacher or employee name"
                placeholderTextColor={activeTone.muted}
                style={[
                  styles.input,
                  {
                    color: textColor,
                    backgroundColor: activeTone.bg2,
                    borderColor: activeTone.border,
                  },
                ]}
              />

              <Pressable
                onPress={search}
                disabled={loading}
                style={[
                  styles.searchButton,
                  {
                    backgroundColor: activeTone.accent,
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name={loading ? "hourglass-top" : "search"}
                  size={23}
                  color={isDark ? "#111113" : "#ffffff"}
                />
              </Pressable>
            </View>

            <View style={styles.segmentRow}>
              {[
                { value: true, label: "1996–2025" },
                { value: false, label: "2025 only" },
              ].map((option) => {
                const selected = history === option.value;

                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setHistory(option.value)}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: selected
                          ? activeTone.accent
                          : activeTone.bg2,
                        borderColor: selected
                          ? activeTone.accent
                          : activeTone.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected
                          ? isDark
                            ? "#111113"
                            : "#ffffff"
                          : textColor,
                        fontSize: 12,
                        fontWeight: "800",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </LiquidGlassView>

        {searched && !loading && (
          <Text style={[styles.resultCount, { color: activeTone.muted }]}>
            {total === null
              ? `${rows.length} records`
              : `${total.toLocaleString()} matching records`}
            {total !== null && total > rows.length
              ? ` • showing first ${rows.length}`
              : ""}
          </Text>
        )}

        {rows.map((row) => (
          <LiquidGlassView
            key={row.id}
            className="rounded-2xl overflow-hidden mb-3"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View style={styles.salaryCard}>
              <View style={styles.salaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personName, { color: textColor }]}>
                    {row.name}
                  </Text>

                  <Text style={[styles.position, { color: activeTone.muted }]}>
                    {row.position}
                  </Text>
                </View>

                <View
                  style={[
                    styles.yearPill,
                    {
                      backgroundColor: activeTone.bg4,
                    },
                  ]}
                >
                  <Text style={{ color: activeTone.accent, fontWeight: "900" }}>
                    {row.year || "—"}
                  </Text>
                </View>
              </View>

              <Text style={[styles.employer, { color: textColor }]}>
                {row.employer}
              </Text>

              <Text style={[styles.sector, { color: activeTone.muted }]}>
                {row.sector}
              </Text>

              <View style={styles.moneyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moneyLabel, { color: activeTone.muted }]}>
                    Salary
                  </Text>

                  <Text style={[styles.moneyValue, { color: textColor }]}>
                    {row.salary}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.moneyLabel, { color: activeTone.muted }]}>
                    Taxable benefits
                  </Text>

                  <Text style={[styles.moneyValue, { color: textColor }]}>
                    {row.benefits}
                  </Text>
                </View>
              </View>
            </View>
          </LiquidGlassView>
        ))}

        {searched && !loading && rows.length === 0 && (
          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View style={styles.emptyState}>
              <MaterialIcons
                name="person-search"
                size={38}
                color={activeTone.muted}
              />

              <Text style={[styles.emptyTitle, { color: textColor }]}>
                No records found
              </Text>

              <Text style={[styles.emptyBody, { color: activeTone.muted }]}>
                The Sunshine List only contains employees covered by Ontario's
                public-sector salary disclosure rules.
              </Text>
            </View>
          </LiquidGlassView>
        )}

        <Text style={[styles.attribution, { color: activeTone.muted }]}>
          Data: SunshineList Ontario public JSON API, sourced from the
          Government of Ontario Public Sector Salary Disclosure. Informational
          only; verify against the official Ontario disclosure when needed.
        </Text>
      </ScrollView>
    </View>
  );
}

function FlipperPanel() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const bleManagerRef = useRef<any>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bleReady, setBleReady] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<FlipperDevice[]>([]);
  const [connected, setConnected] = useState<FlipperDevice | null>(null);
  const [servicesCount, setServicesCount] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }

      try {
        bleManagerRef.current?.stopDeviceScan?.();
        bleManagerRef.current?.destroy?.();
      } catch {
        // Best-effort cleanup.
      }
    };
  }, []);

  const getManager = async () => {
    if (bleManagerRef.current) {
      return bleManagerRef.current;
    }

    try {
      const module = await import("react-native-ble-plx");
      const manager = new module.BleManager();
      bleManagerRef.current = manager;
      setBleReady(true);
      return manager;
    } catch (error) {
      console.warn("[Misc] BLE native module unavailable", error);
      setBleReady(false);

      Alert.alert(
        "New Dev IPA Required",
        "Bluetooth support was added to TeachAssist+. Install dependencies and rebuild the development IPA once so iOS includes the BLE native module.",
      );

      return null;
    }
  };

  const scan = async () => {
    const manager = await getManager();
    if (!manager) return;

    setDevices([]);
    setScanning(true);

    const addDevice = (device: any) => {
      const name = device?.localName || device?.name || "";

      if (!name.toLowerCase().includes("flipper")) {
        return;
      }

      setDevices((current) => {
        if (current.some((item) => item.id === device.id)) {
          return current.map((item) =>
            item.id === device.id
              ? {
                  ...item,
                  name: name || item.name,
                  rssi:
                    typeof device.rssi === "number" ? device.rssi : item.rssi,
                }
              : item,
          );
        }

        return [
          ...current,
          {
            id: device.id,
            name: name || "Flipper Zero",
            rssi: typeof device.rssi === "number" ? device.rssi : null,
          },
        ];
      });
    };

    try {
      manager.startDeviceScan(
        null,
        {
          allowDuplicates: true,
        },
        (error: any, device: any) => {
          if (error) {
            console.warn("[Misc] BLE scan error", error);
            setScanning(false);
            return;
          }

          if (device) {
            addDevice(device);
          }
        },
      );

      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }

      scanTimerRef.current = setTimeout(() => {
        try {
          manager.stopDeviceScan();
        } catch {
          // no-op
        }

        setScanning(false);
      }, 10000);
    } catch (error) {
      console.warn("[Misc] Could not start BLE scan", error);
      setScanning(false);
      Alert.alert("Bluetooth unavailable", "Could not start the BLE scan.");
    }
  };

  const connect = async (device: FlipperDevice) => {
    const manager = await getManager();
    if (!manager) return;

    try {
      setScanning(false);
      manager.stopDeviceScan();

      const connectedDevice = await manager.connectToDevice(device.id, {
        timeout: 12000,
      });

      const discovered =
        await connectedDevice.discoverAllServicesAndCharacteristics();

      const services = await discovered.services();

      setConnected(device);
      setServicesCount(Array.isArray(services) ? services.length : null);

      hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn("[Misc] Flipper connection failed", error);
      Alert.alert(
        "Connection failed",
        "Make sure Bluetooth is enabled on the Flipper and it is not connected to another phone.",
      );
    }
  };

  const disconnect = async () => {
    const manager = bleManagerRef.current;

    if (manager && connected) {
      try {
        await manager.cancelDeviceConnection(connected.id);
      } catch {
        // no-op
      }
    }

    setConnected(null);
    setServicesCount(null);
  };

  return (
    <View style={styles.panelBody}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.panelContent}
      >
        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View style={styles.flipperHero}>
            <View
              style={[
                styles.flipperIcon,
                {
                  backgroundColor: activeTone.bg4,
                },
              ]}
            >
              <MaterialIcons
                name="bluetooth"
                size={34}
                color={activeTone.accent}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {connected ? connected.name : "Connect a Flipper Zero"}
              </Text>

              <Text style={[styles.helper, { color: activeTone.muted }]}>
                {connected
                  ? `Connected • ${servicesCount ?? "?"} BLE services discovered`
                  : "Scan for a nearby Flipper and select it from the list."}
              </Text>
            </View>
          </View>
        </LiquidGlassView>

        {!connected ? (
          <>
            <Pressable
              onPress={scan}
              disabled={scanning}
              style={[
                styles.fullButton,
                {
                  backgroundColor: activeTone.accent,
                  opacity: scanning ? 0.65 : 1,
                },
              ]}
            >
              <MaterialIcons
                name={scanning ? "bluetooth-searching" : "radar"}
                size={21}
                color={isDark ? "#111113" : "#ffffff"}
              />

              <Text
                style={{
                  color: isDark ? "#111113" : "#ffffff",
                  fontWeight: "900",
                }}
              >
                {scanning ? "Scanning..." : "Scan for Flipper"}
              </Text>
            </Pressable>

            {devices.map((device) => (
              <Pressable
                key={device.id}
                onPress={() => connect(device)}
                style={[
                  styles.deviceRow,
                  {
                    backgroundColor: activeTone.bg3,
                    borderColor: activeTone.border,
                  },
                ]}
              >
                <MaterialIcons
                  name="developer-board"
                  size={24}
                  color={activeTone.accent}
                />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceName, { color: textColor }]}>
                    {device.name}
                  </Text>

                  <Text style={[styles.deviceMeta, { color: activeTone.muted }]}>
                    {device.rssi === null ? "Signal unknown" : `${device.rssi} dBm`}
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={activeTone.muted}
                />
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Text style={[styles.toolsHeading, { color: textColor }]}>
              Device Management
            </Text>

            {[
              {
                icon: "info-outline" as const,
                title: "Device Info",
                body: `BLE ID: ${connected.id}`,
                enabled: true,
              },
              {
                icon: "folder-open" as const,
                title: "File Manager & Backup",
                body: "RPC storage layer will manage your own Flipper files and backups.",
                enabled: false,
              },
              {
                icon: "apps" as const,
                title: "Apps & Firmware",
                body: "Install/manage apps and perform safe firmware/device maintenance.",
                enabled: false,
              },
              {
                icon: "settings-remote" as const,
                title: "Remote Controls",
                body: "Benign remote-control functions can be added through the Flipper RPC layer.",
                enabled: false,
              },
            ].map((tool) => (
              <View
                key={tool.title}
                style={[
                  styles.managementRow,
                  {
                    backgroundColor: activeTone.bg3,
                    borderColor: activeTone.border,
                    opacity: tool.enabled ? 1 : 0.62,
                  },
                ]}
              >
                <MaterialIcons
                  name={tool.icon}
                  size={23}
                  color={activeTone.accent}
                />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceName, { color: textColor }]}>
                    {tool.title}
                  </Text>

                  <Text style={[styles.deviceMeta, { color: activeTone.muted }]}>
                    {tool.body}
                  </Text>
                </View>

                {!tool.enabled && (
                  <Text style={{ color: activeTone.muted, fontSize: 10 }}>
                    RPC NEXT
                  </Text>
                )}
              </View>
            ))}

            <Pressable
              onPress={disconnect}
              style={[
                styles.fullButton,
                {
                  backgroundColor: activeTone.bg4,
                },
              ]}
            >
              <MaterialIcons name="link-off" size={21} color={textColor} />
              <Text style={{ color: textColor, fontWeight: "900" }}>
                Disconnect
              </Text>
            </Pressable>
          </>
        )}

        {bleReady === false && (
          <Text style={[styles.attribution, { color: activeTone.muted }]}>
            Bluetooth native module is not present in the currently installed
            Dev IPA. Rebuild once after installing this patch.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function CoinFlipPanel() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";
  const [result, setResult] = useState<"Heads" | "Tails">("Heads");
  const [flipping, setFlipping] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  const flipCoin = () => {
    if (flipping) return;
    setFlipping(true);
    const next = Math.random() < 0.5 ? "Heads" : "Tails";
    spin.setValue(0);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(spin, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setResult(next);
      setFlipping(false);
      hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy);
    });
  };

  const rotateY = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "1440deg"] });
  const scale = spin.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1.28, 1] });

  return (
    <View style={styles.panelBody}>
      <View style={styles.coinPanel}>
        <Animated.View
          style={[
            styles.coin,
            {
              backgroundColor: activeTone.accent,
              transform: [{ rotateY }, { scale }],
            },
          ]}
        >
          <MaterialIcons
            name={result === "Heads" ? "face" : "pets"}
            size={58}
            color={isDark ? "#111113" : "#ffffff"}
          />
        </Animated.View>
        <Text style={[styles.coinResult, { color: textColor }]}>
          {flipping ? "..." : result}
        </Text>
        <Pressable onPress={flipCoin} style={[styles.coinButton, { backgroundColor: activeTone.accent }]}>
          <MaterialIcons name="cached" size={21} color={isDark ? "#111113" : "#ffffff"} />
          <Text style={{ color: isDark ? "#111113" : "#ffffff", fontWeight: "900" }}>Flip Coin</Text>
        </Pressable>
      </View>
    </View>
  );
}



type WaveObstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  side: "top" | "bottom";
};

type WaveSpike = {
  id: number;
  x: number;
  y: number;
  rotation: number;
};

type GameMode = "wave" | "ship";
type ShipMenuScreen = "menu" | "store" | "game";
type ShipSkinId =
  | "default"
  | "turboprop"
  | "jet"
  | "airliner"
  | "bomber"
  | "interceptor"
  | "maxwell";

type ShipAbility =
  | "none"
  | "rearGun"
  | "flares"
  | "hunter"
  | "gunFlares";

type ShipSkinDefinition = {
  id: ShipSkinId;
  name: string;
  price: number;
  speed: number;
  acceleration: number;
  ability: ShipAbility;
  description: string;
};

type ShipMissile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  rotation: number;
  elite: boolean;
};

type ShipProjectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  kind: "bullet" | "hunter";
  targetId?: number;
};

type ShipFlare = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expiresAt: number;
};

type ShipExplosion = {
  id: number;
  x: number;
  y: number;
  bornAt: number;
};

type ShipTrailPoint = {
  x: number;
  y: number;
};

type ShipScene = {
  plane: { x: number; y: number };
  heading: number;
  camera: { x: number; y: number };
  missiles: ShipMissile[];
  projectiles: ShipProjectile[];
  flares: ShipFlare[];
  explosions: ShipExplosion[];
  trail: ShipTrailPoint[];
  elapsed: number;
  earnedPreview: number;
  flareCooldown: number;
  gunCooldown: number;
};

const GD_WAVE_HIGH_SCORE_KEY = "ta_plus_gd_wave_high_score";

const SHIP_SKINS: ShipSkinDefinition[] = [
  {
    id: "default",
    name: "Default",
    price: 0,
    speed: 142,
    acceleration: 6.2,
    ability: "none",
    description: "Balanced starter aircraft.",
  },
  {
    id: "turboprop",
    name: "Turboprop",
    price: 100,
    speed: 178,
    acceleration: 6.5,
    ability: "none",
    description: "Fast propeller aircraft with stronger cruising speed.",
  },
  {
    id: "jet",
    name: "Jet",
    price: 1000,
    speed: 222,
    acceleration: 7.2,
    ability: "rearGun",
    description: "High speed with a rear-firing defensive cannon.",
  },
  {
    id: "bomber",
    name: "Bomber",
    price: 2000,
    speed: 174,
    acceleration: 5.9,
    ability: "hunter",
    description: "Launches counter-missiles that hunt incoming missiles.",
  },
  {
    id: "airliner",
    name: "Airliner",
    price: 3500,
    speed: 166,
    acceleration: 5.8,
    ability: "flares",
    description: "Large aircraft with missile-decoy flares.",
  },
  {
    id: "interceptor",
    name: "Interceptor",
    price: 5000,
    speed: 246,
    acceleration: 7.8,
    ability: "gunFlares",
    description: "Fast defensive aircraft with rear guns and flares.",
  },
  {
    id: "maxwell",
    name: "Maxwell",
    price: 0,
    speed: 198,
    acceleration: 6.9,
    ability: "none",
    description: "A hidden upgraded turboprop.",
  },
];

const distance = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
) => Math.hypot(ax - bx, ay - by);

const normalizeVector = (
  x: number,
  y: number,
) => {
  const length = Math.hypot(x, y);

  if (length < 0.0001) {
    return { x: 1, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
};

const SHIP_SPRITES: Record<
  Exclude<ShipSkinId, "maxwell">,
  any
> = {
  default: require("../../assets/planes/default.png"),
  turboprop: require("../../assets/planes/turboprop.png"),
  jet: require("../../assets/planes/jet.png"),
  bomber: require("../../assets/planes/bomber.png"),
  airliner: require("../../assets/planes/airliner.png"),
  interceptor: require("../../assets/planes/interceptor.png"),
};

function SpinningPropeller({
  accent,
  size,
}: {
  accent: string;
  size: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 420,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: size * 0.5 - 1.5,
        top: size * 0.015,
        width: 3,
        height: size * 0.23,
        borderRadius: 2,
        backgroundColor: accent,
        opacity: 0.9,
        transform: [{ rotate }],
      }}
    />
  );
}

function PlaneGraphic({
  skin,
  accent,
  size = 58,
}: {
  skin: ShipSkinId;
  accent: string;
  size?: number;
  spinPhase?: number;
}) {
  if (skin === "maxwell") {
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: size * 0.04,
            top: size * 0.31,
            width: size * 0.87,
            height: size * 0.32,
            borderRadius: size,
            backgroundColor: `${accent}24`,
            borderWidth: 1,
            borderColor: accent,
          }}
        />

        <Image
          source={require("../../assets/images/maxwell.png")}
          resizeMode="contain"
          style={{
            width: size * 0.72,
            height: size * 0.72,
            tintColor: accent,
          }}
        />

        <SpinningPropeller
          accent={accent}
          size={size}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={SHIP_SPRITES[skin]}
        resizeMode="contain"
        fadeDuration={0}
        style={{
          width: size,
          height: size,
          tintColor: accent,
        }}
      />

      {skin === "turboprop" ? (
        <SpinningPropeller
          accent={accent}
          size={size}
        />
      ) : null}
    </View>
  );
}

function GDWaveMockupPanel({
  maxwellUnlocked,
}: {
  maxwellUnlocked: boolean;
}) {
  const { activeTone, isDark } = useTheme();
  const [mode, setMode] = useState<GameMode>("wave");

  return (
    <View style={styles.panelBody}>
      <View style={styles.waveModeRow}>
        {[
          {
            key: "wave" as const,
            label: "Wave",
            icon: "change-history" as const,
          },
          {
            key: "ship" as const,
            label: "Ship",
            icon: "flight" as const,
          },
        ].map((option) => {
          const selected = mode === option.key;

          return (
            <Pressable
              key={option.key}
              onPress={() => {
                setMode(option.key);
                hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.waveModeButton,
                {
                  backgroundColor: selected
                    ? activeTone.accent
                    : activeTone.bg3,
                  borderColor: selected
                    ? activeTone.accent
                    : activeTone.border,
                },
              ]}
            >
              <MaterialIcons
                name={option.icon}
                size={18}
                color={
                  selected
                    ? isDark
                      ? "#111113"
                      : "#ffffff"
                    : activeTone.accent
                }
                style={
                  option.key === "ship"
                    ? { transform: [{ rotate: "90deg" }] }
                    : undefined
                }
              />
              <Text
                style={{
                  color: selected
                    ? isDark
                      ? "#111113"
                      : "#ffffff"
                    : activeTone.fg,
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === "wave" ? (
        <GDWaveMode />
      ) : (
        <GDShipMode maxwellUnlocked={maxwellUnlocked} />
      )}
    </View>
  );
}

function GDWaveMode() {
  const { activeTone, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const arenaWidth = Math.max(280, width - 40);
  const arenaHeight = 360;
  const playerX = 72;
  const playerSize = 20;

  const [running, setRunning] = useState(false);
  const [holding, setHolding] = useState(false);
  const [playerY, setPlayerY] = useState(arenaHeight / 2);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState(0);
  const [obstacles, setObstacles] = useState<WaveObstacle[]>([]);
  const [spikes, setSpikes] = useState<WaveSpike[]>([]);
  const [trail, setTrail] = useState<number[]>([]);

  const runningRef = useRef(false);
  const holdingRef = useRef(false);
  const yRef = useRef(arenaHeight / 2);
  const elapsedRef = useRef(0);
  const obstacleRef = useRef<WaveObstacle[]>([]);
  const spikeRef = useRef<WaveSpike[]>([]);
  const trailRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const obstacleIdRef = useRef(4);
  const spikeIdRef = useRef(1);
  const nextSpikeAtRef = useRef(1.45);

  useEffect(() => {
    AsyncStorage.getItem(GD_WAVE_HIGH_SCORE_KEY)
      .then((raw) => {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) setBest(parsed);
      })
      .catch(() => {});
  }, []);

  const reset = () => {
    const initial: WaveObstacle[] = [
      {
        id: 1,
        x: arenaWidth + 50,
        width: 96,
        height: 118,
        side: "bottom",
      },
      {
        id: 2,
        x: arenaWidth + 220,
        width: 108,
        height: 128,
        side: "top",
      },
      {
        id: 3,
        x: arenaWidth + 398,
        width: 92,
        height: 136,
        side: "bottom",
      },
    ];

    obstacleIdRef.current = 4;
    spikeIdRef.current = 1;
    nextSpikeAtRef.current = 1.35;
    yRef.current = arenaHeight / 2;
    elapsedRef.current = 0;
    obstacleRef.current = initial;
    spikeRef.current = [];
    trailRef.current = [];

    setPlayerY(yRef.current);
    setElapsed(0);
    setObstacles(initial);
    setSpikes([]);
    setTrail([]);
  };

  const endRun = async () => {
    if (!runningRef.current) return;

    runningRef.current = false;
    setRunning(false);
    setHolding(false);

    if (elapsedRef.current > best) {
      setBest(elapsedRef.current);
      await AsyncStorage.setItem(
        GD_WAVE_HIGH_SCORE_KEY,
        String(elapsedRef.current),
      );
    }

    hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const waveCollision = (
    y: number,
    obstacle: WaveObstacle,
  ) => {
    const left = playerX - playerSize / 2;
    const right = playerX + playerSize / 2;

    if (
      right < obstacle.x ||
      left > obstacle.x + obstacle.width
    ) {
      return false;
    }

    const localX = Math.max(
      0,
      Math.min(
        obstacle.width,
        playerX - obstacle.x,
      ),
    );

    const slope =
      obstacle.height *
      (1 -
        Math.abs(
          localX - obstacle.width / 2,
        ) /
          (obstacle.width / 2));

    return obstacle.side === "bottom"
      ? y + playerSize / 2 >=
          arenaHeight - slope
      : y - playerSize / 2 <= slope;
  };

  const spikeCollision = (
    y: number,
    spike: WaveSpike,
  ) => {
    const centerX = spike.x + 10;

    return (
      Math.abs(centerX - playerX) < 8 &&
      Math.abs(spike.y - y) < 7
    );
  };

  useEffect(() => {
    if (!running) return;

    const tick = (time: number) => {
      if (!runningRef.current) return;

      const previous = lastRef.current ?? time;
      const dt = Math.min(
        0.032,
        (time - previous) / 1000,
      );
      lastRef.current = time;

      elapsedRef.current += dt;

      // Steeper Wave line: roughly a 63-degree visual incline/decline.
      const verticalSpeed = 300;
      const nextY =
        yRef.current +
        (holdingRef.current
          ? -verticalSpeed
          : verticalSpeed) *
          dt;

      const obstacleSpeed =
        150 +
        Math.min(
          108,
          elapsedRef.current * 2.15,
        );

      let nextObstacles =
        obstacleRef.current
          .map((item) => ({
            ...item,
            x: item.x - obstacleSpeed * dt,
          }))
          .filter(
            (item) =>
              item.x + item.width > -30,
          );

      const farthest = nextObstacles.reduce(
        (maximum, item) =>
          Math.max(maximum, item.x),
        0,
      );

      if (farthest < arenaWidth + 190) {
        const id = obstacleIdRef.current++;

        nextObstacles.push({
          id,
          x: Math.max(
            arenaWidth + 190,
            farthest +
              142 +
              (id % 3) * 27,
          ),
          width: 86 + (id % 4) * 10,
          height:
            112 + (id % 5) * 11,
          side:
            id % 2 === 0
              ? "top"
              : "bottom",
        });
      }

      let nextSpikes = spikeRef.current
        .map((spike) => ({
          ...spike,
          x:
            spike.x -
            (242 +
              Math.min(
                90,
                elapsedRef.current * 2.1,
              )) *
              dt,
          y:
            spike.y +
            Math.sign(nextY - spike.y) *
              Math.min(
                Math.abs(nextY - spike.y),
                42 * dt,
              ),
          rotation:
            spike.rotation + 310 * dt,
        }))
        .filter((spike) => spike.x > -40);

      if (
        elapsedRef.current >=
        nextSpikeAtRef.current
      ) {
        const id = spikeIdRef.current++;
        const offset =
          ((id % 5) - 2) * 37;

        nextSpikes.push({
          id,
          x: arenaWidth + 35,
          y: Math.max(
            35,
            Math.min(
              arenaHeight - 35,
              nextY + offset,
            ),
          ),
          rotation: id * 19,
        });

        nextSpikeAtRef.current =
          elapsedRef.current +
          Math.max(
            0.78,
            1.55 -
              elapsedRef.current * 0.012,
          );
      }

      const hitWall =
        nextY - playerSize / 2 <= 6 ||
        nextY + playerSize / 2 >=
          arenaHeight - 6;

      const hitSlope = nextObstacles.some(
        (item) =>
          waveCollision(nextY, item),
      );

      const hitSpike = nextSpikes.some(
        (spike) =>
          spikeCollision(nextY, spike),
      );

      if (hitWall || hitSlope || hitSpike) {
        endRun();
        return;
      }

      yRef.current = nextY;
      obstacleRef.current = nextObstacles;
      spikeRef.current = nextSpikes;

      const nextTrail = [
        nextY,
        ...trailRef.current,
      ].slice(0, 20);

      trailRef.current = nextTrail;

      setPlayerY(nextY);
      setElapsed(elapsedRef.current);
      setObstacles(nextObstacles);
      setSpikes(nextSpikes);
      setTrail(nextTrail);

      frameRef.current =
        requestAnimationFrame(tick);
    };

    frameRef.current =
      requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(
          frameRef.current,
        );
        frameRef.current = null;
      }
      lastRef.current = null;
    };
  }, [running, arenaWidth, best]);

  const start = () => {
    reset();
    runningRef.current = true;
    holdingRef.current = false;
    setHolding(false);
    setRunning(true);
    lastRef.current = null;
    hapticsImpact(
      Haptics.ImpactFeedbackStyle.Medium,
    );
  };

  const begin = () => {
    if (!runningRef.current) start();
    holdingRef.current = true;
    setHolding(true);
  };

  const end = () => {
    holdingRef.current = false;
    setHolding(false);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.waveContent}
    >
      <View style={styles.waveScoreRow}>
        <View>
          <Text
            style={[
              styles.waveScoreLabel,
              { color: activeTone.muted },
            ]}
          >
            CURRENT
          </Text>
          <Text
            style={[
              styles.waveScoreValue,
              { color: textColor },
            ]}
          >
            {elapsed.toFixed(2)}s
          </Text>
        </View>

        <View
          style={{ alignItems: "flex-end" }}
        >
          <Text
            style={[
              styles.waveScoreLabel,
              { color: activeTone.muted },
            ]}
          >
            BEST
          </Text>
          <Text
            style={[
              styles.waveScoreValue,
              {
                color: activeTone.accent,
              },
            ]}
          >
            {best.toFixed(2)}s
          </Text>
        </View>
      </View>

      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() =>
          false
        }
        onResponderGrant={begin}
        onResponderRelease={end}
        onResponderTerminate={end}
        style={[
          styles.waveArena,
          {
            height: arenaHeight,
            backgroundColor: activeTone.bg2,
            borderColor: activeTone.border,
          },
        ]}
      >
        <View
          style={[
            styles.waveGlow,
            {
              backgroundColor: `${activeTone.accent}17`,
            },
          ]}
        />

        {trail.map((trailY, index) => {
          const dotSize = Math.max(
            2,
            7 - index * 0.24,
          );

          return (
            <View
              key={`${index}-${trailY}`}
              style={[
                styles.waveTrailDot,
                {
                  left:
                    playerX -
                    9 -
                    index * 7,
                  // Center each trail dot on the exact triangle centerline.
                  top:
                    trailY -
                    dotSize / 2,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize,
                  backgroundColor:
                    activeTone.accent,
                  opacity: Math.max(
                    0.05,
                    0.58 -
                      index * 0.027,
                  ),
                },
              ]}
            />
          );
        })}

        <Svg
          width={arenaWidth}
          height={arenaHeight}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          {obstacles.map((item) => (
            <Polygon
              key={item.id}
              points={
                item.side === "bottom"
                  ? `${item.x},${arenaHeight} ${item.x + item.width / 2},${arenaHeight - item.height} ${item.x + item.width},${arenaHeight}`
                  : `${item.x},0 ${item.x + item.width / 2},${item.height} ${item.x + item.width},0`
              }
              fill={`${activeTone.accent}3D`}
              stroke={activeTone.accent}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {spikes.map((spike) => (
          <View
            key={spike.id}
            style={[
              styles.waveSpike,
              {
                left: spike.x,
                top: spike.y - 9,
                borderRightColor:
                  activeTone.accent,
                transform: [
                  {
                    rotate: `${spike.rotation}deg`,
                  },
                ],
              },
            ]}
          />
        ))}

        <View
          style={[
            styles.wavePlayer,
            {
              left:
                playerX -
                playerSize / 2,
              top:
                playerY -
                playerSize / 2,
              borderLeftColor:
                activeTone.accent,
              transform: [
                {
                  rotate: holding
                    ? "-63deg"
                    : "63deg",
                },
              ],
            },
          ]}
        />

        {!running ? (
          <View
            style={styles.waveStart}
            pointerEvents="none"
          >
            <MaterialIcons
              name="change-history"
              size={38}
              color={activeTone.accent}
            />
            <Text
              style={[
                styles.waveStartTitle,
                { color: textColor },
              ]}
            >
              {elapsed > 0
                ? "Try again"
                : "GD Wave Mockup"}
            </Text>
            <Text
              style={[
                styles.waveStartText,
                { color: activeTone.muted },
              ]}
            >
              Hold to ascend, release to descend
            </Text>
          </View>
        ) : null}
      </View>

    </ScrollView>
  );
}

function GDShipMode({ maxwellUnlocked }: { maxwellUnlocked: boolean }) {
  return <GDShipGame maxwellUnlocked={maxwellUnlocked} />;
}


type GPTMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const GROQ_API_KEY_STORAGE = "ta_plus_groq_api_key";
const GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS_ENDPOINT = "https://api.groq.com/openai/v1/models";
const GROQ_KEYS_URL = "https://console.groq.com/keys";
const GROQ_MODEL = "openai/gpt-oss-20b";

const groqSystemPrompt = `
You are the built-in AI assistant inside TeachAssist+.
Be useful, concise, accurate, and clear.
You can help with schoolwork, explanations, planning, studying, writing,
brainstorming, math reasoning, and ordinary questions.
Do not claim to have live web access or private school data unless the user
provided that information in the conversation.
`.trim();

const describeGroqError = (
  status: number,
  data: any,
) => {
  const apiMessage =
    typeof data?.error?.message === "string"
      ? data.error.message
      : "";

  if (status === 401) {
    return "That Groq API key was rejected. Create a new key in the Groq Console and paste it again.";
  }

  if (status === 429) {
    return "You reached a Groq free-tier rate limit. Wait for the limit to reset, then try again.";
  }

  if (status === 403) {
    return apiMessage || "Groq refused this request for the current account or project.";
  }

  if (status >= 500) {
    return "Groq is temporarily unavailable. Try again in a moment.";
  }

  return apiMessage || `Groq request failed (${status}).`;
};

function GPTAccessPanel() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";
  const muted = activeTone.muted;

  const [apiKey, setApiKey] = useState("");
  const [stored, setStored] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<GPTMessage[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    SecureStorage.load(GROQ_API_KEY_STORAGE)
      .then((value) => {
        if (value?.trim()) {
          setApiKey(value.trim());
          setStored(true);
        }
      })
      .catch(() => {});
  }, []);

  const validateGroqKey = async (key: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(GROQ_MODELS_ENDPOINT, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(describeGroqError(response.status, data));
      }

      return true;
    } finally {
      clearTimeout(timeout);
    }
  };

  const saveKey = async () => {
    const clean = apiKey.trim();

    if (clean.length < 20) {
      Alert.alert(
        "Check Groq API key",
        "Paste the full API key copied from the Groq Console.",
      );
      return;
    }

    setCheckingKey(true);

    try {
      await validateGroqKey(clean);
      await SecureStorage.save(GROQ_API_KEY_STORAGE, clean);
      setApiKey(clean);
      setStored(true);
      hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not validate the Groq API key.";

      Alert.alert("Groq connection failed", message);
    } finally {
      setCheckingKey(false);
    }
  };

  const removeKey = async () => {
    await SecureStorage.delete(GROQ_API_KEY_STORAGE);
    setApiKey("");
    setStored(false);
    setMessages([]);
    setDraft("");
    hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
  };

  const openGroqKeys = async () => {
    try {
      await Linking.openURL(GROQ_KEYS_URL);
    } catch {
      Alert.alert(
        "Open Groq Console",
        "Go to console.groq.com, sign in, then open API Keys.",
      );
    }
  };

  const send = async () => {
    const question = draft.trim();

    if (!question || sending) {
      return;
    }

    const key =
      (await SecureStorage.load(GROQ_API_KEY_STORAGE))?.trim();

    if (!key) {
      setStored(false);
      Alert.alert(
        "Groq API key required",
        "Add your free Groq API key first.",
      );
      return;
    }

    const userMessage: GPTMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: question,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setSending(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const conversation = nextMessages
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.text,
        }));

      const response = await fetch(GROQ_CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: groqSystemPrompt,
            },
            ...conversation,
          ],
          temperature: 0.7,
          max_completion_tokens: 1400,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(describeGroqError(response.status, data));
      }

      const answer =
        data?.choices?.[0]?.message?.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("Groq returned an empty response.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: answer.trim(),
        },
      ]);

      hapticsImpact(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? "The request timed out. Try again."
            : error.message
          : "Groq request failed.";

      Alert.alert("GPT request failed", message);
    } finally {
      clearTimeout(timeout);
      setSending(false);
    }
  };

  if (!stored) {
    return (
      <View style={styles.panelBody}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.panelContent}
        >
          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View style={styles.gptConnectCard}>
              <MaterialIcons
                name="auto-awesome"
                size={35}
                color={activeTone.accent}
              />

              <Text
                style={[
                  styles.gptConnectTitle,
                  { color: textColor },
                ]}
              >
                Connect Groq
              </Text>

              <Text
                style={[
                  styles.gptConnectText,
                  { color: muted },
                ]}
              >
                GPT Access uses Groq's free API tier and stores your key in
                TeachAssist+'s secure storage.
              </Text>

              <View
                style={[
                  styles.groqInstructions,
                  {
                    backgroundColor: activeTone.bg2,
                    borderColor: activeTone.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.groqInstructionsTitle,
                    { color: textColor },
                  ]}
                >
                  How to get your free API key
                </Text>

                <Text
                  style={[
                    styles.groqInstructionLine,
                    { color: muted },
                  ]}
                >
                  1. Open the Groq Console and sign in or create an account.
                </Text>

                <Text
                  style={[
                    styles.groqInstructionLine,
                    { color: muted },
                  ]}
                >
                  2. Open API Keys and choose Create API Key.
                </Text>

                <Text
                  style={[
                    styles.groqInstructionLine,
                    { color: muted },
                  ]}
                >
                  3. Copy the new key and paste it below.
                </Text>

                <Text
                  style={[
                    styles.groqInstructionLine,
                    { color: muted },
                  ]}
                >
                  4. Stay on Groq's Free plan if you only want free-tier usage.
                </Text>

                <Pressable
                  onPress={openGroqKeys}
                  style={[
                    styles.groqOpenButton,
                    {
                      backgroundColor: activeTone.bg4,
                      borderColor: activeTone.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="open-in-new"
                    size={17}
                    color={activeTone.accent}
                  />

                  <Text
                    style={{
                      color: activeTone.accent,
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    Open Groq API Keys
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Paste Groq API key"
                placeholderTextColor={muted}
                style={[
                  styles.gptKeyInput,
                  {
                    color: textColor,
                    backgroundColor: activeTone.bg2,
                    borderColor: activeTone.border,
                  },
                ]}
              />

              <Pressable
                onPress={saveKey}
                disabled={checkingKey || !apiKey.trim()}
                style={[
                  styles.gptSaveKey,
                  {
                    backgroundColor: activeTone.accent,
                    opacity:
                      checkingKey || !apiKey.trim()
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isDark ? "#111113" : "#ffffff",
                    fontWeight: "900",
                  }}
                >
                  {checkingKey
                    ? "Checking Key..."
                    : "Save & Connect"}
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.groqFinePrint,
                  { color: muted },
                ]}
              >
                Provider: Groq • Model: GPT-OSS 20B. Free accounts are
                rate-limited, so very heavy use can temporarily return a
                limit message.
              </Text>
            </View>
          </LiquidGlassView>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.panelBody}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gptMessages}
      >
        {messages.length === 0 ? (
          <View style={styles.gptEmpty}>
            <MaterialIcons
              name="forum"
              size={38}
              color={muted}
            />

            <Text
              style={[
                styles.gptEmptyTitle,
                { color: textColor },
              ]}
            >
              Ask anything
            </Text>

            <Text
              style={[
                styles.gptConnectText,
                { color: muted },
              ]}
            >
              Powered by Groq using GPT-OSS 20B.
            </Text>

            <View
              style={[
                styles.groqConnectedPill,
                {
                  backgroundColor: activeTone.bg4,
                  borderColor: activeTone.border,
                },
              ]}
            >
              <MaterialIcons
                name="bolt"
                size={15}
                color={activeTone.accent}
              />

              <Text
                style={[
                  styles.groqConnectedText,
                  { color: activeTone.accent },
                ]}
              >
                Groq connected
              </Text>
            </View>
          </View>
        ) : null}

        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.gptBubble,
              {
                alignSelf:
                  message.role === "user"
                    ? "flex-end"
                    : "flex-start",
                backgroundColor:
                  message.role === "user"
                    ? activeTone.accent
                    : activeTone.bg3,
              },
            ]}
          >
            <Text
              style={{
                color:
                  message.role === "user"
                    ? isDark
                      ? "#111113"
                      : "#ffffff"
                    : textColor,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {message.text}
            </Text>
          </View>
        ))}

        {sending ? (
          <View style={styles.groqThinking}>
            <MaterialIcons
              name="bolt"
              size={16}
              color={activeTone.accent}
            />
            <Text style={{ color: muted }}>
              Groq is thinking…
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.gptComposer,
          {
            borderTopColor: activeTone.border,
            backgroundColor: activeTone.bg1,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Alert.alert(
              "Remove Groq API key?",
              "You will need to paste a Groq key again before using GPT Access.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: removeKey,
                },
              ],
            );
          }}
          hitSlop={8}
          style={styles.gptKeyButton}
        >
          <MaterialIcons
            name="key-off"
            size={20}
            color={muted}
          />
        </Pressable>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit={false}
          placeholder="Ask GPT…"
          placeholderTextColor={muted}
          style={[
            styles.gptInput,
            {
              color: textColor,
              backgroundColor: activeTone.bg3,
            },
          ]}
        />

        <Pressable
          onPress={send}
          disabled={sending || !draft.trim()}
          style={[
            styles.gptSend,
            {
              backgroundColor: activeTone.accent,
              opacity:
                sending || !draft.trim()
                  ? 0.45
                  : 1,
            },
          ]}
        >
          <MaterialIcons
            name="arrow-upward"
            size={22}
            color={isDark ? "#111113" : "#ffffff"}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  dashboardContent: {
    paddingHorizontal: 20,
    paddingTop: 62,
    paddingBottom: 120,
  },

  screenTitle: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "700",
  },

  screenSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 23,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },

  cell: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },

  card: {
    minHeight: 168,
    padding: 16,
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },

  moreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 16,
  },

  moreTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  moreText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  panelHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  panelTitle: {
    flex: 1,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "800",
    paddingRight: 12,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  panelBody: {
    flex: 1,
  },

  panelContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },

  searchCard: {
    padding: 16,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
  },

  helper: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 15,
  },

  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  segment: {
    flex: 1,
    minHeight: 41,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  resultCount: {
    fontSize: 11,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  salaryCard: {
    padding: 15,
  },

  salaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  personName: {
    fontSize: 18,
    fontWeight: "800",
  },

  position: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  yearPill: {
    minWidth: 54,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  employer: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 13,
  },

  sector: {
    fontSize: 11,
    marginTop: 3,
  },

  moneyRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  moneyLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  moneyValue: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 3,
  },

  emptyState: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingVertical: 25,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },

  emptyBody: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },

  attribution: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 17,
    paddingHorizontal: 8,
  },

  flipperHero: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  flipperIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  fullButton: {
    minHeight: 50,
    marginTop: 14,
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  deviceRow: {
    minHeight: 70,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  deviceName: {
    fontSize: 14,
    fontWeight: "800",
  },

  deviceMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  toolsHeading: {
    fontSize: 21,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 3,
  },

  managementRow: {
    minHeight: 76,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },


  waveContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },

  waveModeRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },

  waveModeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  waveScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 3,
  },

  waveScoreLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  waveScoreValue: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },

  waveArena: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  waveGlow: {
    ...StyleSheet.absoluteFillObject,
  },

  waveTrailDot: {
    position: "absolute",
    zIndex: 7,
  },

  wavePlayer: {
    position: "absolute",
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 20,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    zIndex: 10,
  },

  waveSpike: {
    position: "absolute",
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 20,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    zIndex: 9,
  },

  waveStart: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  waveStartTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },

  waveStartText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },

  waveHint: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 13,
    paddingHorizontal: 10,
  },

  shipMenuContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 70,
  },

  shipTaskBonusPopup: {
    minHeight: 42,
    borderRadius: 14,
    marginBottom: 10,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  shipMenuTopRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  shipSmallButton: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
  },

  shipCreditsPill: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
  },

  shipBestText: {
    fontSize: 12,
    fontWeight: "800",
  },

  shipHero: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
  },

  shipMenuEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  shipHeroGraphic: {
    width: 154,
    height: 105,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 13,
  },

  shipMenuTitle: {
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },

  shipMenuSubtitle: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 8,
  },

  shipLastRun: {
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
    alignItems: "center",
  },

  shipMainButton: {
    minHeight: 52,
    borderRadius: 15,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  shipSecondaryButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  shipFullscreenRow: {
    minHeight: 64,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  shipStoreRow: {
    minHeight: 118,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  shipStoreGraphic: {
    width: 82,
    height: 74,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  shipStoreName: {
    fontSize: 15,
    fontWeight: "900",
  },

  shipStoreDescription: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },

  shipBuyButton: {
    minWidth: 70,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  shipEmbeddedRoot: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 45,
  },

  shipFullscreenRoot: {
    flex: 1,
  },

  shipGameTopBar: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  shipGameExit: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  shipGameSkinBadge: {
    width: 50,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  shipFlightArena: {
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  shipSkyTint: {
    ...StyleSheet.absoluteFillObject,
  },

  shipCloudGraphic: {
    position: "absolute",
    width: 128,
    height: 55,
  },

  shipCloudBase: {
    position: "absolute",
    left: 0,
    top: 18,
    width: 102,
    height: 31,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  shipCloudTop: {
    position: "absolute",
    left: 34,
    top: 0,
    width: 61,
    height: 46,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  shipCloudRain: {
    position: "absolute",
    left: 8,
    top: 48,
    width: 100,
    height: 40,
  },

  shipCloudRainDrop: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 18,
    borderRadius: 2,
    backgroundColor: "rgba(220,235,255,0.24)",
    transform: [{ rotate: "10deg" }],
  },

  shipPlaneTrail: {
    position: "absolute",
    zIndex: 7,
  },

  shipPlanePosition: {
    position: "absolute",
    zIndex: 12,
    width: 60,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  shipMissileTrailStreak: {
    position: "absolute",
    height: 4,
    borderRadius: 999,
    zIndex: 8,
  },

  shipMissile: {
    position: "absolute",
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 22,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    zIndex: 10,
  },

  shipMissileElite: {
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 27,
  },

  shipInterceptor: {
    position: "absolute",
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    zIndex: 11,
  },

  shipHunterProjectile: {
    position: "absolute",
    width: 10,
    height: 8,
    borderRadius: 5,
    zIndex: 11,
  },

  shipFlare: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 999,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 9,
  },

  shipExplosion: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 2,
    zIndex: 13,
  },

  shipJoystickBase: {
    position: "absolute",
    left: 18,
    bottom: 18,
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },

  shipJoystickKnob: {
    width: 42,
    height: 42,
    borderRadius: 999,
  },

  shipAbilityButton: {
    position: "absolute",
    right: 18,
    minWidth: 82,
    height: 56,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    zIndex: 20,
  },

  shipAbilityPrimary: {
    bottom: 26,
  },

  shipAbilitySecondary: {
    bottom: 92,
  },

  shipCrashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  shipCrashTitle: {
    fontSize: 30,
    fontWeight: "900",
  },

  shipCrashScore: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },

  shipCrashButtons: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
  },

  shipCrashButton: {
    minWidth: 104,
    minHeight: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  coinPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  coin: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "rgba(255,255,255,0.2)",
  },
  coinResult: { fontSize: 31, fontWeight: "900", marginTop: 24 },
  coinButton: { minHeight: 52, borderRadius: 16, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18 },
  gptConnectCard: { padding: 20, alignItems: "center" },
  gptConnectTitle: { fontSize: 21, fontWeight: "900", marginTop: 10 },
  gptConnectText: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6 },
  gptKeyInput: { width: "100%", minHeight: 48, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, marginTop: 16 },
  gptSaveKey: { width: "100%", minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 10 },
  gptMessages: { paddingHorizontal: 16, paddingBottom: 18 },
  gptEmpty: { minHeight: 230, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  gptEmptyTitle: { fontSize: 20, fontWeight: "900", marginTop: 9 },
  gptBubble: { maxWidth: "86%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, marginTop: 9 },
  gptComposer: { minHeight: 72, borderTopWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8, paddingBottom: 8 },
  gptKeyButton: { width: 34, height: 44, alignItems: "center", justifyContent: "center" },
  gptInput: { flex: 1, minHeight: 44, borderRadius: 14, paddingHorizontal: 13, fontSize: 14 },
  gptSend: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
