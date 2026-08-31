import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Text from "@/components/ui/AppText";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";

const STORAGE_KEY = "ta_plus_schedule_calendar_events_v1";

type EventType = "event" | "pa_day" | "school_event" | "reminder";

type CalendarEvent = {
  id: string;
  title: string;
  type: EventType;
  date: string;
  notes: string;
  reminderDays: number;
  notificationIds: string[];
};

const TYPES: { key: EventType; label: string; icon: ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { key: "event", label: "Event", icon: "event" },
  { key: "pa_day", label: "PA Day", icon: "school" },
  { key: "school_event", label: "School Event", icon: "celebration" },
  { key: "reminder", label: "Reminder", icon: "notifications" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const buildMonthGrid = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const cancelIds = async (ids: string[]) => {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
};

const ensureNotificationPermission = async () => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
};

const scheduleEventNotifications = async (
  event: Omit<CalendarEvent, "notificationIds">,
) => {
  const allowed = await ensureNotificationPermission();
  if (!allowed) return [] as string[];

  const ids: string[] = [];
  const eventDate = fromKey(event.date);
  const dayOf = new Date(eventDate);
  dayOf.setHours(8, 0, 0, 0);

  const upcoming = new Date(eventDate);
  upcoming.setDate(upcoming.getDate() - event.reminderDays);
  upcoming.setHours(16, 0, 0, 0);

  const typeLabel = TYPES.find((item) => item.key === event.type)?.label ?? "Event";

  if (event.reminderDays > 0 && upcoming.getTime() > Date.now()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeLabel} coming up`,
        body: `${event.title} is in ${event.reminderDays} day${event.reminderDays === 1 ? "" : "s"}.`,
        data: { calendarEventId: event.id, date: event.date },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: upcoming,
      },
    });
    ids.push(id);
  }

  if (dayOf.getTime() > Date.now()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeLabel} today`,
        body: event.title,
        data: { calendarEventId: event.id, date: event.date },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dayOf,
      },
    });
    ids.push(id);
  }

  return ids;
};

export default function ScheduleCalendarModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";
  const muted = activeTone.muted;

  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const notesInputRef = useRef<TextInput>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<EventType>("event");
  const [reminderDays, setReminderDays] = useState(1);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setEvents(parsed);
      })
      .catch((error) => console.warn("[Calendar] Failed to load", error));
  }, [visible]);

  const persist = async (next: CalendarEvent[]) => {
    setEvents(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => map.set(event.date, [...(map.get(event.date) ?? []), event]));
    return map;
  }, [events]);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const startCreate = () => {
    setEditingId(null);
    setTitle("");
    setNotes("");
    setType("event");
    setReminderDays(1);
    setEditorOpen(true);
  };

  const startEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setTitle(event.title);
    setNotes(event.notes);
    setType(event.type);
    setReminderDays(event.reminderDays);
    setEditorOpen(true);
  };

  const save = async () => {
    const clean = title.trim();
    if (!clean) {
      Alert.alert("Add a title", "Name this calendar item first.");
      return;
    }

    const old = editingId ? events.find((event) => event.id === editingId) : null;
    if (old) await cancelIds(old.notificationIds ?? []);

    const base = {
      id: editingId ?? `calendar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: clean,
      type,
      date: selectedDate,
      notes: notes.trim(),
      reminderDays,
    };
    const notificationIds = await scheduleEventNotifications(base);
    const nextEvent: CalendarEvent = { ...base, notificationIds };
    const next = editingId
      ? events.map((event) => (event.id === editingId ? nextEvent : event))
      : [...events, nextEvent];

    await persist(next);
    setEditorOpen(false);
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const remove = (event: CalendarEvent) => {
    Alert.alert("Delete calendar item?", event.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelIds(event.notificationIds ?? []);
          await persist(events.filter((item) => item.id !== event.id));
        },
      },
    ]);
  };

  const selectedDateObj = fromKey(selectedDate);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: activeTone.bg1 }]}>
        <PageBackground />
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={[styles.headerTitle, { color: textColor }]}>Calendar</Text>
          <Pressable onPress={onClose} style={[styles.close, { backgroundColor: activeTone.bg3 }]}>
            <MaterialIcons name="close" size={23} color={textColor} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <LiquidGlassView className="rounded-2xl overflow-hidden" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear">
            <View style={styles.calendarCard}>
              <View style={styles.monthRow}>
                <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.monthArrow}>
                  <MaterialIcons name="chevron-left" size={28} color={activeTone.accent} />
                </Pressable>
                <Text style={[styles.monthTitle, { color: textColor }]}>
                  {month.toLocaleDateString([], { month: "long", year: "numeric" })}
                </Text>
                <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.monthArrow}>
                  <MaterialIcons name="chevron-right" size={28} color={activeTone.accent} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <Text key={`${day}-${index}`} style={[styles.weekday, { color: muted }]}>{day}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {grid.map((date) => {
                  const key = dateKey(date);
                  const selected = key === selectedDate;
                  const today = key === dateKey(new Date());
                  const hasEvents = (eventsByDate.get(key)?.length ?? 0) > 0;
                  const inMonth = sameMonth(date, month);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setSelectedDate(key)}
                      style={[
                        styles.dayCell,
                        selected ? { backgroundColor: activeTone.accent } : null,
                      ]}
                    >
                      <Text style={{ color: selected ? (isDark ? "#111113" : "#ffffff") : inMonth ? textColor : muted, fontSize: 13, fontWeight: today ? "900" : "600" }}>
                        {date.getDate()}
                      </Text>
                      {hasEvents ? <View style={[styles.eventDot, { backgroundColor: selected ? (isDark ? "#111113" : "#ffffff") : activeTone.accent }]} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </LiquidGlassView>

          <View style={styles.selectedHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectedTitle, { color: textColor }]}>
                {selectedDateObj.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </Text>
              <Text style={[styles.selectedSubtitle, { color: muted }]}>
                {selectedEvents.length} item{selectedEvents.length === 1 ? "" : "s"}
              </Text>
            </View>
            <Pressable onPress={startCreate} style={[styles.addButton, { backgroundColor: activeTone.accent }]}>
              <MaterialIcons name="add" size={22} color={isDark ? "#111113" : "#ffffff"} />
              <Text style={{ color: isDark ? "#111113" : "#ffffff", fontWeight: "900" }}>Add</Text>
            </Pressable>
          </View>

          {selectedEvents.map((event) => {
            const def = TYPES.find((item) => item.key === event.type) ?? TYPES[0];
            return (
              <LiquidGlassView key={event.id} className="rounded-2xl overflow-hidden mb-3" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear">
                <Pressable onPress={() => startEdit(event)} style={styles.eventRow}>
                  <View style={[styles.eventIcon, { backgroundColor: activeTone.bg4 }]}>
                    <MaterialIcons name={def.icon} size={23} color={activeTone.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventTitle, { color: textColor }]}>{event.title}</Text>
                    <Text style={[styles.eventMeta, { color: muted }]}>
                      {def.label} • day-of alert{event.reminderDays > 0 ? ` • ${event.reminderDays}d before` : ""}
                    </Text>
                    {event.notes ? <Text numberOfLines={2} style={[styles.eventNotes, { color: muted }]}>{event.notes}</Text> : null}
                  </View>
                  <Pressable onPress={() => remove(event)} hitSlop={8}>
                    <MaterialIcons name="delete-outline" size={22} color="#ef5350" />
                  </Pressable>
                </Pressable>
              </LiquidGlassView>
            );
          })}

          {selectedEvents.length === 0 ? (
            <LiquidGlassView className="rounded-2xl overflow-hidden" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear">
              <View style={styles.empty}>
                <MaterialIcons name="event-available" size={35} color={muted} />
                <Text style={[styles.emptyTitle, { color: textColor }]}>Nothing scheduled</Text>
                <Text style={[styles.emptyText, { color: muted }]}>Tap Add to create an event, PA day, school event, or reminder.</Text>
              </View>
            </LiquidGlassView>
          ) : null}
        </ScrollView>

        <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
          <KeyboardAvoidingView
            style={styles.backdrop}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={18}
          >
            <LiquidGlassView containerClassName="w-full max-w-md" className="rounded-2xl overflow-hidden" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="regular">
              <View style={styles.editorCard}>
                <View style={styles.editorTop}>
                  <Text style={[styles.editorTitle, { color: textColor }]}>{editingId ? "Edit Calendar Item" : "Add Calendar Item"}</Text>
                  <Pressable onPress={() => setEditorOpen(false)}><MaterialIcons name="close" size={22} color={textColor} /></Pressable>
                </View>

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Title"
                  placeholderTextColor={muted}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => notesInputRef.current?.focus()}
                  style={[styles.input, { color: textColor, backgroundColor: activeTone.bg2, borderColor: activeTone.border }]}
                />

                <View style={styles.typeWrap}>
                  {TYPES.map((item) => {
                    const selected = type === item.key;
                    return (
                      <Pressable key={item.key} onPress={() => setType(item.key)} style={[styles.typeChip, { backgroundColor: selected ? activeTone.accent : activeTone.bg2, borderColor: selected ? activeTone.accent : activeTone.border }]}>
                        <Text style={{ color: selected ? (isDark ? "#111113" : "#ffffff") : textColor, fontSize: 11, fontWeight: "800" }}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextInput
                  ref={notesInputRef}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Notes (optional)"
                  placeholderTextColor={muted}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={[styles.notesInput, { color: textColor, backgroundColor: activeTone.bg2, borderColor: activeTone.border }]}
                />

                <Text style={[styles.reminderLabel, { color: muted }]}>Upcoming reminder</Text>
                <View style={styles.reminderRow}>
                  {[0, 1, 3, 7].map((days) => {
                    const selected = reminderDays === days;
                    return (
                      <Pressable key={days} onPress={() => setReminderDays(days)} style={[styles.reminderChip, { backgroundColor: selected ? activeTone.accent : activeTone.bg2, borderColor: selected ? activeTone.accent : activeTone.border }]}>
                        <Text style={{ color: selected ? (isDark ? "#111113" : "#ffffff") : textColor, fontSize: 12, fontWeight: "800" }}>{days === 0 ? "Day only" : `${days}d before`}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable onPress={save} style={[styles.saveButton, { backgroundColor: activeTone.accent }]}>
                  <Text style={{ color: isDark ? "#111113" : "#ffffff", fontWeight: "900" }}>Save</Text>
                </Pressable>
              </View>
            </LiquidGlassView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "900" },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingBottom: 44 },
  calendarCard: { padding: 13 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthArrow: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  monthTitle: { fontSize: 18, fontWeight: "900" },
  weekRow: { flexDirection: "row" },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontWeight: "800", paddingVertical: 7 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, height: 43, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  selectedHeader: { flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 11 },
  selectedTitle: { fontSize: 20, fontWeight: "900" },
  selectedSubtitle: { fontSize: 11, marginTop: 2 },
  addButton: { minHeight: 42, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 4 },
  eventRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  eventIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  eventTitle: { fontSize: 15, fontWeight: "900" },
  eventMeta: { fontSize: 10, marginTop: 3 },
  eventNotes: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  empty: { padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "900", marginTop: 8 },
  emptyText: { fontSize: 11, lineHeight: 17, marginTop: 4, textAlign: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "center", paddingHorizontal: 20 },
  editorCard: { padding: 18 },
  editorTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editorTitle: { fontSize: 19, fontWeight: "900" },
  input: { minHeight: 48, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, fontSize: 15, marginTop: 14 },
  notesInput: { minHeight: 90, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, marginTop: 11 },
  typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11 },
  typeChip: { flexGrow: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" },
  reminderLabel: { fontSize: 11, fontWeight: "800", marginTop: 13 },
  reminderRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 },
  reminderChip: { flexGrow: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  saveButton: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 15 },
});
