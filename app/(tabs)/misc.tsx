import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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

import Text from "@/components/ui/AppText";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";

type MiscTool = "sunshine" | "flipper" | null;

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
            title={activeTool === "sunshine" ? "Sunshine List" : "Flipper Zero"}
            onClose={closeTool}
          />

          {activeTool === "sunshine" && <SunshineListPanel />}
          {activeTool === "flipper" && <FlipperPanel />}
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

});
