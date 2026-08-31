import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polygon } from "react-native-svg";

import Text from "@/components/ui/AppText";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";
import { setGPTAccessEnabled, useFunSettings } from "@/utils/funSettings";
import { SecureStorage } from "../(auth)/taauth";

type MiscTool = "sunshine" | "flipper" | "coin" | "wave" | "gpt" | null;

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
  const { gptAccessEnabled } = useFunSettings();
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

        <Pressable style={styles.cell} onPress={() => openTool("wave")}>
          <LiquidGlassView
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: activeTone.bg4 }]}>
                <MaterialIcons name="change-history" size={28} color={activeTone.accent} />
              </View>
              <Text style={[styles.cardTitle, { color: textColor }]}>Cozy Wave</Text>
              <Text style={[styles.cardSubtitle, { color: activeTone.muted }]}>
                Hold to rise, release to fall
              </Text>
            </View>
          </LiquidGlassView>
        </Pressable>

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
                    Ask GPT from a TeachAssist+ interface
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
                      ? "Cozy Wave"
                      : "GPT Access"
            }
            onClose={closeTool}
          />

          {activeTool === "sunshine" && <SunshineListPanel />}
          {activeTool === "flipper" && <FlipperPanel />}
          {activeTool === "coin" && <CoinFlipPanel />}
          {activeTool === "wave" && <CozyWavePanel />}
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


type CozyObstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  side: "top" | "bottom";
};

type CozySpike = {
  id: number;
  x: number;
  y: number;
  vy: number;
  rotation: number;
};

type CozyMode = "wave" | "ship";

const COZY_WAVE_HIGH_SCORE = "ta_plus_cozy_wave_high_score";
const COZY_SHIP_HIGH_SCORE = "ta_plus_cozy_ship_high_score";

function CozyWavePanel() {
  const { activeTone, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const arenaWidth = Math.max(280, width - 40);
  const arenaHeight = 355;
  const playerX = 72;
  const playerSize = 20;

  const [mode, setMode] = useState<CozyMode>("wave");
  const [running, setRunning] = useState(false);
  const [holding, setHolding] = useState(false);
  const [playerY, setPlayerY] = useState(arenaHeight / 2);
  const [elapsed, setElapsed] = useState(0);
  const [waveBest, setWaveBest] = useState(0);
  const [shipBest, setShipBest] = useState(0);
  const [obstacles, setObstacles] = useState<CozyObstacle[]>([]);
  const [spikes, setSpikes] = useState<CozySpike[]>([]);
  const [trail, setTrail] = useState<number[]>([]);

  const runningRef = useRef(false);
  const holdingRef = useRef(false);
  const yRef = useRef(arenaHeight / 2);
  const velocityRef = useRef(0);
  const cameraYRef = useRef(0);
  const holdDurationRef = useRef(0);
  const releaseDurationRef = useRef(0);
  const elapsedRef = useRef(0);
  const obstacleRef = useRef<CozyObstacle[]>([]);
  const spikeRef = useRef<CozySpike[]>([]);
  const trailRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const obstacleIdRef = useRef(4);
  const spikeIdRef = useRef(1);
  const nextSpikeAtRef = useRef(1.6);

  const cloudA = useRef(new Animated.Value(0)).current;
  const cloudB = useRef(new Animated.Value(0)).current;

  const best = mode === "wave" ? waveBest : shipBest;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(COZY_WAVE_HIGH_SCORE),
      AsyncStorage.getItem(COZY_SHIP_HIGH_SCORE),
    ])
      .then(([wave, ship]) => {
        const parsedWave = Number(wave);
        const parsedShip = Number(ship);

        if (Number.isFinite(parsedWave)) setWaveBest(parsedWave);
        if (Number.isFinite(parsedShip)) setShipBest(parsedShip);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(cloudA, {
        toValue: 1,
        duration: 17000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const b = Animated.loop(
      Animated.timing(cloudB, {
        toValue: 1,
        duration: 23000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    a.start();
    b.start();

    return () => {
      a.stop();
      b.stop();
    };
  }, [cloudA, cloudB]);

  const reset = (nextMode = mode) => {
    const initial: CozyObstacle[] =
      nextMode === "wave"
        ? [
            {
              id: 1,
              x: arenaWidth + 50,
              width: 100,
              height: 116,
              side: "bottom",
            },
            {
              id: 2,
              x: arenaWidth + 225,
              width: 112,
              height: 128,
              side: "top",
            },
            {
              id: 3,
              x: arenaWidth + 405,
              width: 98,
              height: 136,
              side: "bottom",
            },
          ]
        : [];

    obstacleIdRef.current = 4;
    spikeIdRef.current = 1;
    nextSpikeAtRef.current = nextMode === "ship" ? 0.75 : 1.35;

    yRef.current = nextMode === "ship" ? 0 : arenaHeight / 2;
    cameraYRef.current = nextMode === "ship" ? 0 : arenaHeight / 2;
    velocityRef.current = 0;
    holdDurationRef.current = 0;
    releaseDurationRef.current = 0;
    elapsedRef.current = 0;
    obstacleRef.current = initial;
    spikeRef.current = [];
    trailRef.current = [];

    setPlayerY(arenaHeight / 2);
    setElapsed(0);
    setObstacles(initial);
    setSpikes([]);
    setTrail([]);
  };

  const stop = async () => {
    runningRef.current = false;
    setRunning(false);
    setHolding(false);

    const score = elapsedRef.current;

    if (mode === "wave" && score > waveBest) {
      setWaveBest(score);
      await AsyncStorage.setItem(COZY_WAVE_HIGH_SCORE, String(score));
    }

    if (mode === "ship" && score > shipBest) {
      setShipBest(score);
      await AsyncStorage.setItem(COZY_SHIP_HIGH_SCORE, String(score));
    }

    hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const waveCollision = (y: number, obstacle: CozyObstacle) => {
    const left = playerX - playerSize / 2;
    const right = playerX + playerSize / 2;

    if (right < obstacle.x || left > obstacle.x + obstacle.width) {
      return false;
    }

    const localX = Math.max(0, Math.min(obstacle.width, playerX - obstacle.x));

    const slope =
      obstacle.height *
      (1 -
        Math.abs(localX - obstacle.width / 2) /
          (obstacle.width / 2));

    return obstacle.side === "bottom"
      ? y + playerSize / 2 >= arenaHeight - slope
      : y - playerSize / 2 <= slope;
  };

  const spikeCollision = (
    playerScreenY: number,
    spike: CozySpike,
    shipCameraY: number,
  ) => {
    const spikeScreenY =
      mode === "ship"
        ? arenaHeight / 2 + (spike.y - shipCameraY)
        : spike.y;

    // spike.x is the LEFT edge of the visual triangle, so collision
    // should use its center. Wave mode intentionally has a forgiving
    // hitbox so near-misses actually feel like near-misses.
    const spikeCenterX = spike.x + 11;
    const horizontalRadius = mode === "wave" ? 11 : 13;
    const verticalRadius = mode === "wave" ? 9 : 12;

    return (
      Math.abs(spikeCenterX - playerX) < horizontalRadius &&
      Math.abs(spikeScreenY - playerScreenY) < verticalRadius
    );
  };

  useEffect(() => {
    if (!running) {
      return;
    }

    const tick = (time: number) => {
      if (!runningRef.current) return;

      const previous = lastRef.current ?? time;
      const dt = Math.min(0.032, (time - previous) / 1000);
      lastRef.current = time;

      elapsedRef.current += dt;

      if (mode === "wave") {
        // Slightly harder than the previous version.
        const verticalSpeed = 178;
        const nextY =
          yRef.current + (holdingRef.current ? -verticalSpeed : verticalSpeed) * dt;

        const obstacleSpeed =
          138 + Math.min(100, elapsedRef.current * 2.05);

        let nextObstacles = obstacleRef.current
          .map((item) => ({
            ...item,
            x: item.x - obstacleSpeed * dt,
          }))
          .filter((item) => item.x + item.width > -30);

        const farthest = nextObstacles.reduce(
          (max, item) => Math.max(max, item.x),
          0,
        );

        if (farthest < arenaWidth + 205) {
          const id = obstacleIdRef.current++;

          nextObstacles.push({
            id,
            x: Math.max(
              arenaWidth + 205,
              farthest + 150 + (id % 3) * 28,
            ),
            width: 88 + (id % 4) * 11,
            height: 108 + (id % 5) * 11,
            side: id % 2 === 0 ? "top" : "bottom",
          });
        }

        let nextSpikes = spikeRef.current.map((spike) => ({
          ...spike,
          x: spike.x - (245 + Math.min(90, elapsedRef.current * 2.2)) * dt,
          y:
            spike.y +
            Math.sign(nextY - spike.y) *
              Math.min(Math.abs(nextY - spike.y), 48 * dt),
          rotation: spike.rotation + 320 * dt,
        }));

        if (elapsedRef.current >= nextSpikeAtRef.current) {
          const id = spikeIdRef.current++;
          const aimOffset = ((id % 5) - 2) * 34;

          nextSpikes.push({
            id,
            x: arenaWidth + 35,
            y: Math.max(
              38,
              Math.min(arenaHeight - 38, nextY + aimOffset),
            ),
            vy: 0,
            rotation: 0,
          });

          nextSpikeAtRef.current =
            elapsedRef.current +
            Math.max(0.72, 1.55 - elapsedRef.current * 0.014);
        }

        nextSpikes = nextSpikes.filter((spike) => spike.x > -40);

        const hitWall =
          nextY - playerSize / 2 <= 7 ||
          nextY + playerSize / 2 >= arenaHeight - 7;

        const hitSlope = nextObstacles.some((item) =>
          waveCollision(nextY, item),
        );

        const hitSpike = nextSpikes.some((spike) =>
          spikeCollision(nextY, spike, 0),
        );

        if (hitWall || hitSlope || hitSpike) {
          stop();
          return;
        }

        yRef.current = nextY;
        obstacleRef.current = nextObstacles;
        spikeRef.current = nextSpikes;

        const nextTrail = [
          nextY,
          ...trailRef.current,
        ].slice(0, 18);
        trailRef.current = nextTrail;

        setPlayerY(nextY);
        setObstacles(nextObstacles);
        setSpikes(nextSpikes);
        setTrail(nextTrail);
      } else {
        // Ship physics:
        // - Holding progressively increases upward acceleration.
        // - Releasing immediately bleeds off leftover upward momentum,
        //   then downward acceleration ramps up the longer you stay released.
        // This makes the controls much more responsive while keeping the
        // "accelerating ship" feel.
        if (holdingRef.current) {
          holdDurationRef.current += dt;
          releaseDurationRef.current = 0;

          if (velocityRef.current > 0) {
            velocityRef.current *= Math.pow(0.035, dt);
          }

          const upwardAcceleration =
            205 +
            Math.min(
              210,
              110 * Math.pow(holdDurationRef.current, 1.35),
            );

          velocityRef.current -= upwardAcceleration * dt;
        } else {
          releaseDurationRef.current += dt;
          holdDurationRef.current = 0;

          // Do not let a long hold leave the ship "stuck" travelling upward.
          if (velocityRef.current < 0) {
            velocityRef.current *= Math.pow(0.0025, dt);
          }

          const downwardAcceleration =
            185 +
            Math.min(
              430,
              175 * Math.pow(releaseDurationRef.current, 1.55),
            );

          velocityRef.current += downwardAcceleration * dt;
        }

        velocityRef.current = Math.max(
          -300,
          Math.min(365, velocityRef.current),
        );

        const nextWorldY =
          yRef.current + velocityRef.current * dt;

        // No ceiling / floor: camera follows the ship through open sky.
        cameraYRef.current +=
          (nextWorldY - cameraYRef.current) *
          Math.min(1, dt * 6);

        let nextSpikes = spikeRef.current.map((spike) => {
          const verticalDelta = nextWorldY - spike.y;

          return {
            ...spike,
            x:
              spike.x -
              (255 + Math.min(125, elapsedRef.current * 2.8)) * dt,
            y:
              spike.y +
              Math.sign(verticalDelta) *
                Math.min(
                  Math.abs(verticalDelta),
                  (88 + Math.min(85, elapsedRef.current * 1.2)) * dt,
                ),
            rotation: spike.rotation + 390 * dt,
          };
        });

        if (elapsedRef.current >= nextSpikeAtRef.current) {
          const amount = elapsedRef.current > 14 ? 2 : 1;

          for (let index = 0; index < amount; index += 1) {
            const id = spikeIdRef.current++;
            const offset =
              ((id * 53) % 230) -
              115 +
              index * 62;

            nextSpikes.push({
              id,
              x: arenaWidth + 35 + index * 70,
              y: nextWorldY + offset,
              vy: 0,
              rotation: id * 17,
            });
          }

          nextSpikeAtRef.current =
            elapsedRef.current +
            Math.max(0.48, 1.05 - elapsedRef.current * 0.012);
        }

        nextSpikes = nextSpikes.filter((spike) => spike.x > -45);

        const shipScreenY =
          arenaHeight / 2 +
          (nextWorldY - cameraYRef.current);

        const hitSpike = nextSpikes.some((spike) =>
          spikeCollision(
            shipScreenY,
            spike,
            cameraYRef.current,
          ),
        );

        if (hitSpike) {
          stop();
          return;
        }

        yRef.current = nextWorldY;
        spikeRef.current = nextSpikes;

        const nextTrail = [
          shipScreenY,
          ...trailRef.current,
        ].slice(0, 22);
        trailRef.current = nextTrail;

        setPlayerY(shipScreenY);
        setObstacles([]);
        setSpikes(nextSpikes);
        setTrail(nextTrail);
      }

      setElapsed(elapsedRef.current);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      lastRef.current = null;
    };
  }, [running, arenaWidth, mode, waveBest, shipBest]);

  const beginControl = () => {
    if (!runningRef.current) {
      start();
    }

    setHolding(true);
    holdingRef.current = true;
    releaseDurationRef.current = 0;
  };

  const endControl = () => {
    setHolding(false);
    holdingRef.current = false;
    holdDurationRef.current = 0;

    if (mode === "ship" && velocityRef.current < 0) {
      // On release, retain only a small amount of upward momentum.
      // This prevents the ship from continuing to climb after the finger
      // has clearly left the screen.
      velocityRef.current *= 0.22;
    }
  };

  const start = () => {
    reset(mode);
    holdingRef.current = false;
    setHolding(false);
    runningRef.current = true;
    setRunning(true);
    lastRef.current = null;
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const changeMode = (nextMode: CozyMode) => {
    if (running) return;

    setMode(nextMode);
    reset(nextMode);
  };

  const renderSpikeY = (spike: CozySpike) =>
    mode === "ship"
      ? arenaHeight / 2 +
        (spike.y - cameraYRef.current)
      : spike.y;

  return (
    <View style={styles.panelBody}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.waveContent}
      >
        <View style={styles.waveModeRow}>
          {[
            {
              key: "wave" as CozyMode,
              title: "Wave",
              icon: "change-history" as const,
            },
            {
              key: "ship" as CozyMode,
              title: "Ship",
              icon: "flight" as const,
            },
          ].map((option) => {
            const selected = mode === option.key;

            return (
              <Pressable
                key={option.key}
                disabled={running}
                onPress={() => changeMode(option.key)}
                style={[
                  styles.waveModeButton,
                  {
                    backgroundColor: selected
                      ? activeTone.accent
                      : activeTone.bg3,
                    borderColor: selected
                      ? activeTone.accent
                      : activeTone.border,
                    opacity: running && !selected ? 0.45 : 1,
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
                />

                <Text
                  style={{
                    color: selected
                      ? isDark
                        ? "#111113"
                        : "#ffffff"
                      : textColor,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  {option.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

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

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                styles.waveScoreLabel,
                { color: activeTone.muted },
              ]}
            >
              {mode === "wave" ? "WAVE BEST" : "SHIP BEST"}
            </Text>

            <Text
              style={[
                styles.waveScoreValue,
                { color: activeTone.accent },
              ]}
            >
              {best.toFixed(2)}s
            </Text>
          </View>
        </View>

        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={beginControl}
          onResponderRelease={endControl}
          onResponderTerminate={endControl}
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
                backgroundColor: `${activeTone.accent}18`,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.waveCloud,
              {
                top: 48,
                opacity: 0.27,
                transform: [
                  {
                    translateX: cloudA.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        -155,
                        arenaWidth + 185,
                      ],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.waveCloudBase} />
            <View style={styles.waveCloudTop} />
          </Animated.View>

          <Animated.View
            style={[
              styles.waveCloud,
              {
                top: 126,
                opacity: 0.15,
                transform: [
                  {
                    translateX: cloudB.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        arenaWidth + 155,
                        -195,
                      ],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.waveCloudBase} />
            <View style={styles.waveCloudTop} />
          </Animated.View>

          {trail.map((trailY, index) => (
            <View
              key={`${index}-${trailY}`}
              style={[
                styles.waveTrailDot,
                {
                  left: playerX - 10 - index * 7,
                  top: trailY - 3,
                  width: Math.max(2, 7 - index * 0.25),
                  height: Math.max(2, 7 - index * 0.25),
                  borderRadius: 6,
                  backgroundColor: activeTone.accent,
                  opacity: Math.max(
                    0.05,
                    0.56 - index * 0.028,
                  ),
                },
              ]}
            />
          ))}

          {mode === "wave" ? (
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
                  fill={`${activeTone.accent}3F`}
                  stroke={activeTone.accent}
                  strokeWidth={2}
                />
              ))}
            </Svg>
          ) : null}

          {spikes.map((spike) => {
            const y = renderSpikeY(spike);

            if (y < -45 || y > arenaHeight + 45) {
              return null;
            }

            return (
              <View
                key={spike.id}
                style={[
                  styles.waveSpike,
                  {
                    left: spike.x,
                    top: y - 10,
                    borderRightColor: activeTone.accent,
                    transform: [
                      {
                        rotate: `${spike.rotation}deg`,
                      },
                    ],
                  },
                ]}
              />
            );
          })}

          {mode === "wave" ? (
            <View
              style={[
                styles.wavePlayer,
                {
                  left: playerX - playerSize / 2,
                  top: playerY - playerSize / 2,
                  borderLeftColor: activeTone.accent,
                  transform: [
                    {
                      rotate: holding
                        ? "-45deg"
                        : "45deg",
                    },
                  ],
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.shipPlayer,
                {
                  left: playerX - 18,
                  top: playerY - 18,
                  backgroundColor: `${activeTone.accent}24`,
                  borderColor: activeTone.accent,
                  transform: [
                    {
                      rotate: `${Math.max(
                        -24,
                        Math.min(
                          24,
                          velocityRef.current * 0.09,
                        ),
                      )}deg`,
                    },
                  ],
                },
              ]}
            >
              <MaterialIcons
                name="flight"
                size={26}
                color={activeTone.accent}
                style={{
                  transform: [{ rotate: "90deg" }],
                }}
              />
            </View>
          )}

          {!running ? (
            <View
              style={styles.waveStart}
              pointerEvents="none"
            >
              <MaterialIcons
                name={
                  mode === "wave"
                    ? "change-history"
                    : "flight"
                }
                size={38}
                color={activeTone.accent}
                style={
                  mode === "ship"
                    ? {
                        transform: [
                          { rotate: "90deg" },
                        ],
                      }
                    : undefined
                }
              />

              <Text
                style={[
                  styles.waveStartTitle,
                  { color: textColor },
                ]}
              >
                {elapsed > 0
                  ? "Try again"
                  : mode === "wave"
                    ? "Cozy Wave"
                    : "Cozy Ship"}
              </Text>

              <Text
                style={[
                  styles.waveStartText,
                  { color: activeTone.muted },
                ]}
              >
                {mode === "wave"
                  ? "Hold to climb at 45°. Release to descend. Dodge slopes and incoming spikes."
                  : "Hold to accelerate upward. Release and gravity accelerates you downward. Dodge the chasing spikes."}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[
            styles.waveHint,
            { color: activeTone.muted },
          ]}
        >
          {mode === "wave"
            ? "Wave mode is faster now, with tighter slopes and occasional launched spikes."
            : "Ship mode has no ceiling or floor. The camera follows you through open sky while more spikes hunt the plane."}
        </Text>
      </ScrollView>
    </View>
  );
}

type GPTMessage = { id: string; role: "user" | "assistant"; text: string };
const OPENAI_KEY_STORAGE = "ta_plus_openai_api_key";

function GPTAccessPanel() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";
  const muted = activeTone.muted;
  const [apiKey, setApiKey] = useState("");
  const [stored, setStored] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<GPTMessage[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    SecureStorage.load(OPENAI_KEY_STORAGE).then((value) => {
      if (value) {
        setApiKey(value);
        setStored(true);
      }
    });
  }, []);

  const saveKey = async () => {
    const clean = apiKey.trim();
    if (!clean.startsWith("sk-")) {
      Alert.alert("Check API key", "Paste an OpenAI API key that starts with sk-.");
      return;
    }
    await SecureStorage.save(OPENAI_KEY_STORAGE, clean);
    setStored(true);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const removeKey = async () => {
    await SecureStorage.delete(OPENAI_KEY_STORAGE);
    setApiKey("");
    setStored(false);
    setMessages([]);
  };

  const send = async () => {
    const question = draft.trim();
    if (!question || sending) return;
    const key = (await SecureStorage.load(OPENAI_KEY_STORAGE))?.trim();
    if (!key) {
      Alert.alert("Connect API", "Add your OpenAI API key first.");
      return;
    }

    const userMessage: GPTMessage = { id: `u-${Date.now()}`, role: "user", text: question };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);

    try {
      const input = nextMessages.slice(-12).map((message) => ({
        role: message.role,
        content: message.text,
      }));
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-5",
          store: false,
          input,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? `OpenAI ${response.status}`);
      }

      let answer = typeof data?.output_text === "string" ? data.output_text : "";
      if (!answer && Array.isArray(data?.output)) {
        answer = data.output
          .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
          .filter((item: any) => item?.type === "output_text" && typeof item?.text === "string")
          .map((item: any) => item.text)
          .join("\n")
          .trim();
      }
      if (!answer) answer = "No text response was returned.";
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: "assistant", text: answer },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      Alert.alert("GPT request failed", message);
    } finally {
      setSending(false);
    }
  };

  if (!stored) {
    return (
      <View style={styles.panelBody}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
          <LiquidGlassView className="rounded-2xl overflow-hidden" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear">
            <View style={styles.gptConnectCard}>
              <MaterialIcons name="auto-awesome" size={35} color={activeTone.accent} />
              <Text style={[styles.gptConnectTitle, { color: textColor }]}>Connect OpenAI</Text>
              <Text style={[styles.gptConnectText, { color: muted }]}>GPT Access uses the OpenAI API inside a TeachAssist+ interface. Your API key is stored in the app's secure storage.</Text>
              <TextInput value={apiKey} onChangeText={setApiKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="sk-..." placeholderTextColor={muted} style={[styles.gptKeyInput, { color: textColor, backgroundColor: activeTone.bg2, borderColor: activeTone.border }]} />
              <Pressable onPress={saveKey} style={[styles.gptSaveKey, { backgroundColor: activeTone.accent }]}>
                <Text style={{ color: isDark ? "#111113" : "#ffffff", fontWeight: "900" }}>Save API Key</Text>
              </Pressable>
            </View>
          </LiquidGlassView>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.panelBody}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gptMessages}>
        {messages.length === 0 ? (
          <View style={styles.gptEmpty}>
            <MaterialIcons name="forum" size={38} color={muted} />
            <Text style={[styles.gptEmptyTitle, { color: textColor }]}>Ask anything</Text>
            <Text style={[styles.gptConnectText, { color: muted }]}>GPT responses appear here without leaving TeachAssist+.</Text>
          </View>
        ) : null}
        {messages.map((message) => (
          <View key={message.id} style={[styles.gptBubble, { alignSelf: message.role === "user" ? "flex-end" : "flex-start", backgroundColor: message.role === "user" ? activeTone.accent : activeTone.bg3 }]}>
            <Text style={{ color: message.role === "user" ? (isDark ? "#111113" : "#ffffff") : textColor, fontSize: 14, lineHeight: 20 }}>{message.text}</Text>
          </View>
        ))}
        {sending ? <Text style={{ color: muted, marginTop: 8 }}>Thinking…</Text> : null}
      </ScrollView>
      <View style={[styles.gptComposer, { borderTopColor: activeTone.border, backgroundColor: activeTone.bg1 }]}>
        <Pressable onPress={removeKey} hitSlop={8} style={styles.gptKeyButton}>
          <MaterialIcons name="key-off" size={20} color={muted} />
        </Pressable>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} returnKeyType="send" placeholder="Ask GPT…" placeholderTextColor={muted} style={[styles.gptInput, { color: textColor, backgroundColor: activeTone.bg3 }]} />
        <Pressable onPress={send} disabled={sending || !draft.trim()} style={[styles.gptSend, { backgroundColor: activeTone.accent, opacity: sending || !draft.trim() ? 0.45 : 1 }]}>
          <MaterialIcons name="arrow-upward" size={22} color={isDark ? "#111113" : "#ffffff"} />
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
    marginBottom: 14,
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

  waveCloud: {
    position: "absolute",
    left: 0,
    width: 120,
    height: 52,
  },

  waveCloudBase: {
    position: "absolute",
    left: 0,
    top: 15,
    width: 95,
    height: 31,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.76)",
  },

  waveCloudTop: {
    position: "absolute",
    left: 32,
    top: 0,
    width: 58,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.76)",
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

  shipPlayer: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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

  gptDisableButton: {
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    marginTop: 12,
  },

  gptDisableText: {
    fontSize: 10,
    fontWeight: "800",
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
