import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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
import Svg, { Polyline } from "react-native-svg";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Text from "@/components/ui/AppText";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";

type StudyTool =
  | "textbooks"
  | "map"
  | "flashcards"
  | "focus"
  | "blocker"
  | "notepad"
  | null;

type TextbookItem = {
  id: string;
  title: string;
  kind: "file" | "link";
  uri: string;
  addedAt: string;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  dueAt: number;
  intervalDays: number;
  repetitions: number;
  ease: number;
};

type FlashcardDeck = {
  id: string;
  name: string;
  cards: Flashcard[];
};

type FocusPreset = {
  id: string;
  label: string;
  focusMinutes: number;
  breakMinutes: number;
};

type BlockRule = {
  id: string;
  label: string;
  target: string;
  kind: "url" | "app";
  mode: "timed" | "usage" | "permanent";
  minutes: number;
  enabled: boolean;
};

type Stroke = {
  id: string;
  points: string;
  width: number;
};

type NoteFolder = {
  id: string;
  name: string;
};

type StudyNote = {
  id: string;
  folderId: string;
  title: string;
  type: "text" | "draw";
  body: string;
  strokes: Stroke[];
  updatedAt: string;
};

const TEXTBOOKS_KEY = "study_textbooks_v1";
const FLASHCARDS_KEY = "study_flashcards_v1";
const BLOCK_RULES_KEY = "study_block_rules_v1";
const NOTE_FOLDERS_KEY = "study_note_folders_v1";
const NOTES_KEY = "study_notes_v1";

const FOCUS_PRESETS: FocusPreset[] = [
  {
    id: "pomodoro",
    label: "Pomodoro",
    focusMinutes: 25,
    breakMinutes: 5,
  },
  {
    id: "long",
    label: "50 / 10",
    focusMinutes: 50,
    breakMinutes: 10,
  },
  {
    id: "sprint",
    label: "Sprint",
    focusMinutes: 15,
    breakMinutes: 3,
  },
  {
    id: "deep",
    label: "Deep Work",
    focusMinutes: 90,
    breakMinutes: 20,
  },
];

const STUDY_TOOLS = [
  {
    id: "textbooks" as const,
    title: "Textbook Library",
    subtitle: "PDFs, files, and textbook links",
    icon: "library-books" as const,
  },
  {
    id: "map" as const,
    title: "School Map",
    subtitle: "Rooms, teachers, and room info",
    icon: "map" as const,
  },
  {
    id: "flashcards" as const,
    title: "Flashcards",
    subtitle: "Decks, card flips, and spaced repetition",
    icon: "style" as const,
  },
  {
    id: "focus" as const,
    title: "Focus Study",
    subtitle: "Pomodoro and other study timers",
    icon: "timer" as const,
  },
  {
    id: "blocker" as const,
    title: "Screen Time",
    subtitle: "Plan app and website blocking",
    icon: "shield" as const,
  },
  {
    id: "notepad" as const,
    title: "Quick Notepad",
    subtitle: "Type or draw notes into folders",
    icon: "edit-note" as const,
  },
];

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatTimer = (seconds: number) => {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const dueLabel = (timestamp: number) => {
  const now = new Date();
  const due = new Date(timestamp);

  if (timestamp <= Date.now()) {
    return "Due now";
  }

  if (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  ) {
    return "Later today";
  }

  return due.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

export default function StudyScreen() {
  const { activeTone, isDark } = useTheme();
  const { width } = useWindowDimensions();

  const [activeTool, setActiveTool] = useState<StudyTool>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const slideX = useRef(new Animated.Value(width)).current;

  const textColor = isDark ? "#edebea" : "#2f3035";
  const inverseText = isDark ? "#111113" : "#ffffff";

  const openTool = (tool: Exclude<StudyTool, null>) => {
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
    <View
      style={[
        styles.screen,
        {
          backgroundColor: activeTone.bg1,
        },
      ]}
    >
      <PageBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.dashboardContent}
      >
        <Text
          style={[
            styles.screenTitle,
            {
              color: textColor,
            },
          ]}
        >
          Study
        </Text>

        <Text
          style={[
            styles.screenSubtitle,
            {
              color: activeTone.muted,
            },
          ]}
        >
          Your study tools, notes, textbooks, and focus controls.
        </Text>

        <View style={styles.toolGrid}>
          {STUDY_TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              onPress={() => openTool(tool.id)}
              style={styles.toolCell}
            >
              <LiquidGlassView
                className="rounded-2xl overflow-hidden"
                fallbackBackgroundColor={activeTone.bg3}
                glassTintColor={activeTone.bg2}
                glassEffectStyle="clear"
              >
                <View style={styles.toolCard}>
                  <View
                    style={[
                      styles.toolIconWrap,
                      {
                        backgroundColor: activeTone.bg4,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={tool.icon}
                      size={27}
                      color={activeTone.accent}
                    />
                  </View>

                  <Text
                    style={[
                      styles.toolTitle,
                      {
                        color: textColor,
                      },
                    ]}
                  >
                    {tool.title}
                  </Text>

                  <Text
                    style={[
                      styles.toolSubtitle,
                      {
                        color: activeTone.muted,
                      },
                    ]}
                  >
                    {tool.subtitle}
                  </Text>
                </View>
              </LiquidGlassView>
            </Pressable>
          ))}
        </View>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden mt-2"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View style={styles.tipCard}>
            <MaterialIcons
              name="auto-awesome"
              size={22}
              color={activeTone.accent}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.tipTitle,
                  {
                    color: textColor,
                  },
                ]}
              >
                Built for quick access
              </Text>

              <Text
                style={[
                  styles.tipText,
                  {
                    color: activeTone.muted,
                  },
                ]}
              >
                Every study tool opens as a full-screen panel from the right.
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

          <StudyPanelHeader
            title={
              STUDY_TOOLS.find((tool) => tool.id === activeTool)?.title ?? "Study"
            }
            onClose={closeTool}
          />

          {activeTool === "textbooks" && <TextbookLibrary />}
          {activeTool === "map" && <SchoolMap />}
          {activeTool === "flashcards" && <Flashcards />}
          {activeTool === "focus" && <FocusStudy />}
          {activeTool === "blocker" && <ScreenTimePlanner />}
          {activeTool === "notepad" && <QuickNotepad />}
        </Animated.View>
      )}
    </View>
  );
}

function StudyPanelHeader({
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
      <Text
        style={[
          styles.panelHeaderTitle,
          {
            color: textColor,
          },
        ]}
      >
        {title}
      </Text>

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
        <MaterialIcons
          name="close"
          size={23}
          color={textColor}
        />
      </Pressable>
    </View>
  );
}

function TextbookLibrary() {
  const { activeTone, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const textColor = isDark ? "#edebea" : "#2f3035";
  const [items, setItems] = useState<TextbookItem[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [viewer, setViewer] = useState<TextbookItem | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(TEXTBOOKS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      })
      .catch((error) => {
        console.warn("[Study] Failed to load textbooks", error);
      });
  }, []);

  const saveItems = async (next: TextbookItem[]) => {
    setItems(next);
    await AsyncStorage.setItem(TEXTBOOKS_KEY, JSON.stringify(next));
  };

  const pickFile = async () => {
    try {
      // These are loaded only when Upload is tapped. That keeps the entire
      // Study route usable on an older dev-client binary that does not yet
      // contain ExpoDocumentPicker / ExpoFileSystem.
      const DocumentPicker = await import("expo-document-picker");
      const FileSystem = await import("expo-file-system");

      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/*", "application/epub+zip"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const source = new FileSystem.File(asset);
      const directory = new FileSystem.Directory(
        FileSystem.Paths.document,
        "study-textbooks",
      );

      directory.create({
        idempotent: true,
        intermediates: true,
      });

      const safeName = asset.name.replace(/[^\w.\- ]+/g, "_");
      const destination = new FileSystem.File(
        directory,
        `${Date.now()}-${safeName}`,
      );

      source.copy(destination);

      await saveItems([
        {
          id: uid("book"),
          title: asset.name,
          kind: "file",
          uri: destination.uri,
          addedAt: new Date().toISOString(),
        },
        ...items,
      ]);

      hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn("[Study] File import unavailable in this dev build", error);
      Alert.alert(
        "PDF Upload Needs the New Dev Build",
        "The Study tab can run now, but this installed TeachAssist+ Dev app does not contain ExpoDocumentPicker yet. Rebuild and reinstall the Dev IPA once, then PDF upload will work.",
      );
    }
  };

  const addLink = async () => {
    const title = linkTitle.trim();
    const uri = normalizeUrl(linkUrl);

    if (!title || !uri) {
      Alert.alert("Missing information", "Enter a name and a textbook URL.");
      return;
    }

    await saveItems([
      {
        id: uid("link"),
        title,
        kind: "link",
        uri,
        addedAt: new Date().toISOString(),
      },
      ...items,
    ]);

    setLinkTitle("");
    setLinkUrl("");
    setShowAddLink(false);
  };

  const removeItem = (item: TextbookItem) => {
    Alert.alert(
      "Remove textbook?",
      `Remove ${item.title} from your library?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (item.kind === "file") {
              try {
                const file = new File(item.uri);
                if (file.exists) {
                  file.delete();
                }
              } catch {
                // The library entry can still be removed if its local file vanished.
              }
            }

            await saveItems(items.filter((current) => current.id !== item.id));
          },
        },
      ],
    );
  };

  return (
    <View style={styles.panelBody}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.panelScrollContent}
      >
        <View style={styles.rowGap}>
          <Pressable
            onPress={pickFile}
            style={[
              styles.primaryButton,
              {
                backgroundColor: activeTone.accent,
              },
            ]}
          >
            <MaterialIcons
              name="upload-file"
              size={20}
              color={isDark ? "#111113" : "#ffffff"}
            />
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: isDark ? "#111113" : "#ffffff",
                },
              ]}
            >
              Upload File / PDF
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowAddLink((value) => !value)}
            style={[
              styles.secondaryButton,
              {
                borderColor: activeTone.border,
                backgroundColor: activeTone.bg3,
              },
            ]}
          >
            <MaterialIcons
              name="add-link"
              size={20}
              color={activeTone.accent}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color: textColor,
                },
              ]}
            >
              Add Textbook Link
            </Text>
          </Pressable>
        </View>

        {showAddLink && (
          <LiquidGlassView
            className="rounded-2xl overflow-hidden mt-4"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View style={styles.formCard}>
              <Text
                style={[
                  styles.formTitle,
                  {
                    color: textColor,
                  },
                ]}
              >
                New Textbook Link
              </Text>

              <TextInput
                value={linkTitle}
                onChangeText={setLinkTitle}
                placeholder="Textbook name"
                placeholderTextColor={activeTone.muted}
                style={[
                  styles.input,
                  {
                    color: textColor,
                    borderColor: activeTone.border,
                    backgroundColor: activeTone.bg2,
                  },
                ]}
              />

              <TextInput
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://..."
                placeholderTextColor={activeTone.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[
                  styles.input,
                  {
                    color: textColor,
                    borderColor: activeTone.border,
                    backgroundColor: activeTone.bg2,
                  },
                ]}
              />

              <Pressable
                onPress={addLink}
                style={[
                  styles.fullPrimaryButton,
                  {
                    backgroundColor: activeTone.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color: isDark ? "#111113" : "#ffffff",
                    },
                  ]}
                >
                  Add Link
                </Text>
              </Pressable>
            </View>
          </LiquidGlassView>
        )}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
            },
          ]}
        >
          Library
        </Text>

        {items.length === 0 ? (
          <EmptyState
            icon="menu-book"
            title="No textbooks yet"
            body="Upload a PDF or add a link to start your library."
          />
        ) : (
          items.map((item) => (
            <LiquidGlassView
              key={item.id}
              className="rounded-2xl overflow-hidden mb-3"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.listRow}>
                <Pressable
                  onPress={() => setViewer(item)}
                  style={styles.listMainPressable}
                >
                  <View
                    style={[
                      styles.listIcon,
                      {
                        backgroundColor: activeTone.bg4,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={item.kind === "file" ? "picture-as-pdf" : "link"}
                      size={24}
                      color={activeTone.accent}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.listTitle,
                        {
                          color: textColor,
                        },
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={[
                        styles.listSubtitle,
                        {
                          color: activeTone.muted,
                        },
                      ]}
                    >
                      {item.kind === "file" ? "Saved file" : "Embedded link"}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => removeItem(item)}
                  hitSlop={10}
                  style={styles.iconButton}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={21}
                    color={activeTone.muted}
                  />
                </Pressable>
              </View>
            </LiquidGlassView>
          ))
        )}
      </ScrollView>

      <Modal
        visible={viewer !== null}
        animationType="slide"
        onRequestClose={() => setViewer(null)}
      >
        <View
          style={[
            styles.viewerScreen,
            {
              backgroundColor: activeTone.bg1,
              paddingTop: insets.top + 10,
            },
          ]}
        >
          <View style={styles.viewerHeader}>
            <Text
              numberOfLines={1}
              style={[
                styles.viewerTitle,
                {
                  color: textColor,
                },
              ]}
            >
              {viewer?.title ?? "Textbook"}
            </Text>

            <Pressable
              onPress={() => setViewer(null)}
              style={[
                styles.closeButton,
                {
                  backgroundColor: activeTone.bg3,
                },
              ]}
            >
              <MaterialIcons
                name="close"
                size={23}
                color={textColor}
              />
            </Pressable>
          </View>

          {viewer ? (
            <WebView
              source={{ uri: viewer.uri }}
              originWhitelist={["*"]}
              allowFileAccess
              startInLoadingState
              style={{ flex: 1, backgroundColor: activeTone.bg1 }}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function SchoolMap() {
  return (
    <View style={styles.panelBody}>
      <View style={styles.centeredPanel}>
        <EmptyState
          icon="map"
          title="School map is ready for your floor plans"
          body="The map shell is in place. Room markers, teachers, and room details will be added when you provide the marked school maps."
        />
      </View>
    </View>
  );
}

function Flashcards() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [deckName, setDeckName] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [showCardBuilder, setShowCardBuilder] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [reviewDeckId, setReviewDeckId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FLASHCARDS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDecks(parsed);
        }
      })
      .catch((error) => {
        console.warn("[Study] Failed to load flashcards", error);
      });
  }, []);

  const persist = async (next: FlashcardDeck[]) => {
    setDecks(next);
    await AsyncStorage.setItem(FLASHCARDS_KEY, JSON.stringify(next));
  };

  const addDeck = async () => {
    const name = deckName.trim();
    if (!name) return;

    await persist([
      ...decks,
      {
        id: uid("deck"),
        name,
        cards: [],
      },
    ]);

    setDeckName("");
  };

  const removeDeck = (deckId: string) => {
    Alert.alert(
      "Delete deck?",
      "This will permanently remove every card in the deck.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => persist(decks.filter((deck) => deck.id !== deckId)),
        },
      ],
    );
  };

  const addCard = async () => {
    const front = cardFront.trim();
    const back = cardBack.trim();

    if (!selectedDeckId || !front || !back) {
      Alert.alert("Missing card text", "Add both a front and a back.");
      return;
    }

    const next = decks.map((deck) =>
      deck.id === selectedDeckId
        ? {
            ...deck,
            cards: [
              ...deck.cards,
              {
                id: uid("card"),
                front,
                back,
                dueAt: Date.now(),
                intervalDays: 0,
                repetitions: 0,
                ease: 2.5,
              },
            ],
          }
        : deck,
    );

    await persist(next);
    setCardFront("");
    setCardBack("");
    setShowCardBuilder(false);
  };

  const reviewDeck = decks.find((deck) => deck.id === reviewDeckId) ?? null;

  if (reviewDeck) {
    return (
      <FlashcardReview
        deck={reviewDeck}
        onExit={() => setReviewDeckId(null)}
        onUpdateDeck={async (updatedDeck) => {
          await persist(
            decks.map((deck) =>
              deck.id === updatedDeck.id ? updatedDeck : deck,
            ),
          );
        }}
      />
    );
  }

  return (
    <View style={styles.panelBody}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.panelScrollContent}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
              marginTop: 4,
            },
          ]}
        >
          Your Decks
        </Text>

        <View style={styles.inlineBuilder}>
          <TextInput
            value={deckName}
            onChangeText={setDeckName}
            placeholder="New deck name"
            placeholderTextColor={activeTone.muted}
            style={[
              styles.inlineInput,
              {
                color: textColor,
                backgroundColor: activeTone.bg2,
                borderColor: activeTone.border,
              },
            ]}
          />

          <Pressable
            onPress={addDeck}
            style={[
              styles.squareAccentButton,
              {
                backgroundColor: activeTone.accent,
              },
            ]}
          >
            <MaterialIcons
              name="add"
              size={24}
              color={isDark ? "#111113" : "#ffffff"}
            />
          </Pressable>
        </View>

        {decks.length === 0 ? (
          <EmptyState
            icon="style"
            title="No flashcard decks"
            body="Create a deck, then add cards with a simple front and back."
          />
        ) : (
          decks.map((deck) => {
            const dueCount = deck.cards.filter(
              (card) => card.dueAt <= Date.now(),
            ).length;

            return (
              <LiquidGlassView
                key={deck.id}
                className="rounded-2xl overflow-hidden mb-3"
                fallbackBackgroundColor={activeTone.bg3}
                glassTintColor={activeTone.bg2}
                glassEffectStyle="clear"
              >
                <View style={styles.deckCard}>
                  <View style={styles.deckTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.deckName,
                          {
                            color: textColor,
                          },
                        ]}
                      >
                        {deck.name}
                      </Text>

                      <Text
                        style={[
                          styles.listSubtitle,
                          {
                            color: activeTone.muted,
                          },
                        ]}
                      >
                        {deck.cards.length} cards • {dueCount} due
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => removeDeck(deck.id)}
                      hitSlop={10}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={21}
                        color={activeTone.muted}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.rowGap}>
                    <Pressable
                      onPress={() => {
                        setSelectedDeckId(deck.id);
                        setShowCardBuilder(true);
                      }}
                      style={[
                        styles.secondaryButton,
                        {
                          backgroundColor: activeTone.bg4,
                          borderColor: activeTone.border,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="add-card"
                        size={19}
                        color={activeTone.accent}
                      />
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          {
                            color: textColor,
                          },
                        ]}
                      >
                        Add Card
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={deck.cards.length === 0}
                      onPress={() => setReviewDeckId(deck.id)}
                      style={[
                        styles.primaryButton,
                        {
                          backgroundColor: activeTone.accent,
                          opacity: deck.cards.length === 0 ? 0.45 : 1,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="play-arrow"
                        size={20}
                        color={isDark ? "#111113" : "#ffffff"}
                      />
                      <Text
                        style={[
                          styles.primaryButtonText,
                          {
                            color: isDark ? "#111113" : "#ffffff",
                          },
                        ]}
                      >
                        Review
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </LiquidGlassView>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showCardBuilder}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCardBuilder(false)}
      >
        <View style={styles.modalBackdrop}>
          <LiquidGlassView
            containerClassName="w-full max-w-md"
            className="rounded-2xl overflow-hidden"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="regular"
          >
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <Text
                  style={[
                    styles.formTitle,
                    {
                      color: textColor,
                    },
                  ]}
                >
                  Add Flashcard
                </Text>

                <Pressable onPress={() => setShowCardBuilder(false)}>
                  <MaterialIcons
                    name="close"
                    size={23}
                    color={textColor}
                  />
                </Pressable>
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: activeTone.muted,
                  },
                ]}
              >
                Front
              </Text>

              <TextInput
                value={cardFront}
                onChangeText={setCardFront}
                multiline
                placeholder="Question, term, prompt..."
                placeholderTextColor={activeTone.muted}
                style={[
                  styles.multilineInput,
                  {
                    color: textColor,
                    borderColor: activeTone.border,
                    backgroundColor: activeTone.bg2,
                  },
                ]}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: activeTone.muted,
                  },
                ]}
              >
                Back
              </Text>

              <TextInput
                value={cardBack}
                onChangeText={setCardBack}
                multiline
                placeholder="Answer, definition..."
                placeholderTextColor={activeTone.muted}
                style={[
                  styles.multilineInput,
                  {
                    color: textColor,
                    borderColor: activeTone.border,
                    backgroundColor: activeTone.bg2,
                  },
                ]}
              />

              <Pressable
                onPress={addCard}
                style={[
                  styles.fullPrimaryButton,
                  {
                    backgroundColor: activeTone.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      color: isDark ? "#111113" : "#ffffff",
                    },
                  ]}
                >
                  Save Card
                </Text>
              </Pressable>
            </View>
          </LiquidGlassView>
        </View>
      </Modal>
    </View>
  );
}

function FlashcardReview({
  deck,
  onExit,
  onUpdateDeck,
}: {
  deck: FlashcardDeck;
  onExit: () => void;
  onUpdateDeck: (deck: FlashcardDeck) => Promise<void>;
}) {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";
  const [cards, setCards] = useState<Flashcard[]>(
    () => {
      const due = deck.cards.filter((card) => card.dueAt <= Date.now());
      const base = due.length > 0 ? due : deck.cards;
      return [...base].sort(() => Math.random() - 0.5);
    },
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;

  const card = cards[index] ?? null;

  const flipCard = () => {
    const next = !flipped;
    setFlipped(next);

    Animated.timing(flip, {
      toValue: next ? 1 : 0,
      duration: 320,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const grade = async (rating: "again" | "hard" | "good" | "easy") => {
    if (!card) return;

    let intervalDays = card.intervalDays;
    let repetitions = card.repetitions;
    let ease = card.ease;
    let dueAt = Date.now();

    if (rating === "again") {
      intervalDays = 0;
      repetitions = 0;
      ease = Math.max(1.3, ease - 0.2);
      dueAt = Date.now() + 10 * 60 * 1000;
    } else if (rating === "hard") {
      intervalDays = Math.max(1, intervalDays || 1);
      repetitions += 1;
      ease = Math.max(1.3, ease - 0.15);
      dueAt = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
    } else if (rating === "good") {
      repetitions += 1;

      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 3;
      } else {
        intervalDays = Math.max(1, Math.round((intervalDays || 1) * ease));
      }

      dueAt = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
    } else {
      repetitions += 1;
      ease = Math.min(3.2, ease + 0.15);
      intervalDays =
        repetitions === 1
          ? 4
          : Math.max(4, Math.round((intervalDays || 1) * (ease + 0.8)));
      dueAt = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
    }

    const updatedCard: Flashcard = {
      ...card,
      dueAt,
      intervalDays,
      repetitions,
      ease,
    };

    const updatedDeck: FlashcardDeck = {
      ...deck,
      cards: deck.cards.map((existing) =>
        existing.id === card.id ? updatedCard : existing,
      ),
    };

    await onUpdateDeck(updatedDeck);

    setFlipped(false);
    flip.setValue(0);

    if (index >= cards.length - 1) {
      Alert.alert("Review complete", "You finished this review session.");
      onExit();
      return;
    }

    setIndex((current) => current + 1);
  };

  if (!card) {
    return (
      <View style={styles.panelBody}>
        <View style={styles.centeredPanel}>
          <EmptyState
            icon="task-alt"
            title="Nothing to review"
            body="Add cards to this deck first."
          />
        </View>
      </View>
    );
  }

  const frontRotate = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotate = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <View style={styles.panelBody}>
      <View style={styles.reviewHeader}>
        <Pressable onPress={onExit} style={styles.textButton}>
          <Text style={{ color: activeTone.accent, fontWeight: "700" }}>
            Decks
          </Text>
        </Pressable>

        <Text
          style={[
            styles.reviewProgress,
            {
              color: activeTone.muted,
            },
          ]}
        >
          {index + 1} / {cards.length}
        </Text>
      </View>

      <Pressable onPress={flipCard} style={styles.flashcardStage}>
        <Animated.View
          style={[
            styles.flashcardFace,
            {
              backgroundColor: activeTone.bg3,
              borderColor: activeTone.border,
              transform: [{ rotateY: frontRotate }],
            },
          ]}
        >
          <Text
            style={[
              styles.flashcardSideLabel,
              {
                color: activeTone.accent,
              },
            ]}
          >
            FRONT
          </Text>

          <Text
            style={[
              styles.flashcardText,
              {
                color: textColor,
              },
            ]}
          >
            {card.front}
          </Text>

          <Text
            style={[
              styles.flashcardTapHint,
              {
                color: activeTone.muted,
              },
            ]}
          >
            Tap to reveal
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.flashcardFace,
            styles.flashcardBack,
            {
              backgroundColor: activeTone.bg3,
              borderColor: activeTone.border,
              transform: [{ rotateY: backRotate }],
            },
          ]}
        >
          <Text
            style={[
              styles.flashcardSideLabel,
              {
                color: activeTone.accent,
              },
            ]}
          >
            BACK
          </Text>

          <Text
            style={[
              styles.flashcardText,
              {
                color: textColor,
              },
            ]}
          >
            {card.back}
          </Text>

          <Text
            style={[
              styles.flashcardTapHint,
              {
                color: activeTone.muted,
              },
            ]}
          >
            Tap to flip back
          </Text>
        </Animated.View>
      </Pressable>

      {flipped && (
        <View style={styles.ratingGrid}>
          {[
            {
              key: "again" as const,
              label: "Again",
              detail: "10 min",
            },
            {
              key: "hard" as const,
              label: "Hard",
              detail: "1 day",
            },
            {
              key: "good" as const,
              label: "Good",
              detail: card.intervalDays > 0 ? `${Math.max(1, Math.round(card.intervalDays * card.ease))}d` : "1 day",
            },
            {
              key: "easy" as const,
              label: "Easy",
              detail: card.intervalDays > 0 ? `${Math.max(4, Math.round(card.intervalDays * 3.3))}d` : "4 days",
            },
          ].map((rating) => (
            <Pressable
              key={rating.key}
              onPress={() => grade(rating.key)}
              style={[
                styles.ratingButton,
                {
                  backgroundColor:
                    rating.key === "good"
                      ? activeTone.accent
                      : activeTone.bg3,
                  borderColor: activeTone.border,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    rating.key === "good"
                      ? isDark
                        ? "#111113"
                        : "#ffffff"
                      : textColor,
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                {rating.label}
              </Text>

              <Text
                style={{
                  color:
                    rating.key === "good"
                      ? isDark
                        ? "#111113"
                        : "#ffffff"
                      : activeTone.muted,
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {rating.detail}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function FocusStudy() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const [preset, setPreset] = useState<FocusPreset>(FOCUS_PRESETS[0]);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(
    FOCUS_PRESETS[0].focusMinutes * 60,
  );
  const [running, setRunning] = useState(false);
  const [targetEnd, setTargetEnd] = useState<number | null>(null);
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);

  useEffect(() => {
    if (!running || !targetEnd) {
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((targetEnd - Date.now()) / 1000),
      );

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        setRunning(false);
        setTargetEnd(null);

        if (phase === "focus") {
          setCompletedFocusSessions((count) => count + 1);
          setPhase("break");
          setSecondsLeft(preset.breakMinutes * 60);
          Alert.alert("Focus session complete", "Break time.");
        } else {
          setPhase("focus");
          setSecondsLeft(preset.focusMinutes * 60);
          Alert.alert("Break complete", "Ready for another focus session.");
        }

        hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy);
      }
    };

    tick();
    const timer = setInterval(tick, 500);

    return () => clearInterval(timer);
  }, [running, targetEnd, phase, preset]);

  const selectPreset = (next: FocusPreset) => {
    setRunning(false);
    setTargetEnd(null);
    setPreset(next);
    setPhase("focus");
    setSecondsLeft(next.focusMinutes * 60);
  };

  const toggleTimer = () => {
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);

    if (running) {
      setRunning(false);
      setTargetEnd(null);
      return;
    }

    setRunning(true);
    setTargetEnd(Date.now() + secondsLeft * 1000);
  };

  const reset = () => {
    setRunning(false);
    setTargetEnd(null);
    setPhase("focus");
    setSecondsLeft(preset.focusMinutes * 60);
  };

  return (
    <View style={styles.panelBody}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.panelScrollContent}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
              marginTop: 4,
            },
          ]}
        >
          Technique
        </Text>

        <View style={styles.presetWrap}>
          {FOCUS_PRESETS.map((option) => {
            const selected = preset.id === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => selectPreset(option)}
                style={[
                  styles.presetChip,
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
                <Text
                  style={{
                    color: selected
                      ? isDark
                        ? "#111113"
                        : "#ffffff"
                      : textColor,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  {option.label}
                </Text>

                <Text
                  style={{
                    color: selected
                      ? isDark
                        ? "#111113"
                        : "#ffffff"
                      : activeTone.muted,
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {option.focusMinutes}/{option.breakMinutes}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <LiquidGlassView
          className="rounded-3xl overflow-hidden mt-7"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View style={styles.timerCard}>
            <Text
              style={[
                styles.timerPhase,
                {
                  color: activeTone.accent,
                },
              ]}
            >
              {phase === "focus" ? "FOCUS" : "BREAK"}
            </Text>

            <Text
              style={[
                styles.timerText,
                {
                  color: textColor,
                },
              ]}
            >
              {formatTimer(secondsLeft)}
            </Text>

            <Text
              style={[
                styles.timerSubtext,
                {
                  color: activeTone.muted,
                },
              ]}
            >
              {preset.label} • {completedFocusSessions} focus sessions completed
            </Text>

            <View style={styles.timerActions}>
              <Pressable
                onPress={reset}
                style={[
                  styles.timerSmallButton,
                  {
                    backgroundColor: activeTone.bg4,
                  },
                ]}
              >
                <MaterialIcons
                  name="restart-alt"
                  size={23}
                  color={textColor}
                />
              </Pressable>

              <Pressable
                onPress={toggleTimer}
                style={[
                  styles.timerMainButton,
                  {
                    backgroundColor: activeTone.accent,
                  },
                ]}
              >
                <MaterialIcons
                  name={running ? "pause" : "play-arrow"}
                  size={34}
                  color={isDark ? "#111113" : "#ffffff"}
                />
              </Pressable>
            </View>
          </View>
        </LiquidGlassView>

        <Text
          style={[
            styles.helperText,
            {
              color: activeTone.muted,
            },
          ]}
        >
          The timer recalculates from the target time, so it catches up correctly
          when you briefly leave the app.
        </Text>
      </ScrollView>
    </View>
  );
}

function ScreenTimePlanner() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const [rules, setRules] = useState<BlockRule[]>([]);
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<"url" | "app">("url");
  const [mode, setMode] = useState<"timed" | "usage" | "permanent">("timed");
  const [minutes, setMinutes] = useState("60");
  const [unlockRequestedAt, setUnlockRequestedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    AsyncStorage.getItem(BLOCK_RULES_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRules(parsed);
        }
      })
      .catch((error) => {
        console.warn("[Study] Failed to load blocker rules", error);
      });
  }, []);

  useEffect(() => {
    if (!unlockRequestedAt) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [unlockRequestedAt]);

  const persist = async (next: BlockRule[]) => {
    setRules(next);
    await AsyncStorage.setItem(BLOCK_RULES_KEY, JSON.stringify(next));
  };

  const addRule = async () => {
    const clean = target.trim();

    if (!clean) {
      return;
    }

    const parsedMinutes = Math.max(1, Number(minutes) || 60);

    await persist([
      ...rules,
      {
        id: uid("block"),
        label: clean,
        target: clean,
        kind,
        mode,
        minutes: parsedMinutes,
        enabled: true,
      },
    ]);

    setTarget("");
  };

  const requestUnlock = () => {
    setUnlockRequestedAt(Date.now());
    setNow(Date.now());
    Alert.alert(
      "Unlock requested",
      "The 5-minute cooling-off period has started.",
    );
  };

  const unlockRemaining = unlockRequestedAt
    ? Math.max(0, 5 * 60 - Math.floor((now - unlockRequestedAt) / 1000))
    : 0;

  const finishUnlock = async () => {
    if (unlockRemaining > 0) {
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Study restrictions",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      await persist(rules.map((rule) => ({ ...rule, enabled: false })));
      setUnlockRequestedAt(null);
      Alert.alert("Restrictions disabled", "Your saved block rules are now off.");
    }
  };

  return (
    <View style={styles.panelBody}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.panelScrollContent}
      >
        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View style={styles.warningCard}>
            <MaterialIcons
              name="info-outline"
              size={22}
              color={activeTone.accent}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.warningTitle,
                  {
                    color: textColor,
                  },
                ]}
              >
                Native iPhone blocking needs one more native layer
              </Text>

              <Text
                style={[
                  styles.warningText,
                  {
                    color: activeTone.muted,
                  },
                ]}
              >
                This screen saves the exact rules and unlock flow now. System-wide
                YouTube, Discord, app, and website enforcement will connect to
                Apple's Screen Time / Family Controls extension in a native build.
              </Text>
            </View>
          </View>
        </LiquidGlassView>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
            },
          ]}
        >
          New Restriction
        </Text>

        <LiquidGlassView
          className="rounded-2xl overflow-hidden"
          fallbackBackgroundColor={activeTone.bg3}
          glassTintColor={activeTone.bg2}
          glassEffectStyle="clear"
        >
          <View style={styles.formCard}>
            <View style={styles.segmentRow}>
              {[
                { key: "url" as const, label: "Website" },
                { key: "app" as const, label: "App" },
              ].map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => setKind(option.key)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        kind === option.key ? activeTone.accent : activeTone.bg2,
                      borderColor:
                        kind === option.key
                          ? activeTone.accent
                          : activeTone.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        kind === option.key
                          ? isDark
                            ? "#111113"
                            : "#ffffff"
                          : textColor,
                      fontSize: 13,
                      fontWeight: "800",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder={kind === "url" ? "youtube.com" : "Discord"}
              placeholderTextColor={activeTone.muted}
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  color: textColor,
                  borderColor: activeTone.border,
                  backgroundColor: activeTone.bg2,
                },
              ]}
            />

            <View style={styles.segmentRow}>
              {[
                { key: "timed" as const, label: "Timed" },
                { key: "usage" as const, label: "Usage Limit" },
                { key: "permanent" as const, label: "Permanent" },
              ].map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => setMode(option.key)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        mode === option.key ? activeTone.accent : activeTone.bg2,
                      borderColor:
                        mode === option.key
                          ? activeTone.accent
                          : activeTone.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        mode === option.key
                          ? isDark
                            ? "#111113"
                            : "#ffffff"
                          : textColor,
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode !== "permanent" && (
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder="Minutes"
                placeholderTextColor={activeTone.muted}
                style={[
                  styles.input,
                  {
                    color: textColor,
                    borderColor: activeTone.border,
                    backgroundColor: activeTone.bg2,
                  },
                ]}
              />
            )}

            <Pressable
              onPress={addRule}
              style={[
                styles.fullPrimaryButton,
                {
                  backgroundColor: activeTone.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  {
                    color: isDark ? "#111113" : "#ffffff",
                  },
                ]}
              >
                Save Restriction
              </Text>
            </Pressable>
          </View>
        </LiquidGlassView>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
            },
          ]}
        >
          Saved Restrictions
        </Text>

        {rules.length === 0 ? (
          <EmptyState
            icon="shield"
            title="No restrictions saved"
            body="Add an app or website rule above."
          />
        ) : (
          rules.map((rule) => (
            <LiquidGlassView
              key={rule.id}
              className="rounded-2xl overflow-hidden mb-3"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.listRow}>
                <View
                  style={[
                    styles.listIcon,
                    {
                      backgroundColor: activeTone.bg4,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={rule.kind === "url" ? "language" : "apps"}
                    size={23}
                    color={activeTone.accent}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.listTitle,
                      {
                        color: textColor,
                      },
                    ]}
                  >
                    {rule.label}
                  </Text>

                  <Text
                    style={[
                      styles.listSubtitle,
                      {
                        color: activeTone.muted,
                      },
                    ]}
                  >
                    {rule.mode === "permanent"
                      ? "Permanent"
                      : `${rule.mode === "usage" ? "Usage limit" : "Timed"} • ${
                          rule.minutes
                        } min`}{" "}
                    • {rule.enabled ? "Enabled" : "Off"}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    persist(rules.filter((current) => current.id !== rule.id))
                  }
                  hitSlop={10}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={21}
                    color={activeTone.muted}
                  />
                </Pressable>
              </View>
            </LiquidGlassView>
          ))
        )}

        {rules.some((rule) => rule.enabled) && (
          <LiquidGlassView
            className="rounded-2xl overflow-hidden mt-4"
            fallbackBackgroundColor={activeTone.bg3}
            glassTintColor={activeTone.bg2}
            glassEffectStyle="clear"
          >
            <View style={styles.unlockCard}>
              <Text
                style={[
                  styles.formTitle,
                  {
                    color: textColor,
                  },
                ]}
              >
                Unblock Restrictions
              </Text>

              <Text
                style={[
                  styles.warningText,
                  {
                    color: activeTone.muted,
                  },
                ]}
              >
                Start a 5-minute cooling-off period. After it finishes, iOS will
                ask for device authentication before saved restrictions can be
                disabled.
              </Text>

              {!unlockRequestedAt ? (
                <Pressable
                  onPress={requestUnlock}
                  style={[
                    styles.fullPrimaryButton,
                    {
                      backgroundColor: activeTone.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      {
                        color: isDark ? "#111113" : "#ffffff",
                      },
                    ]}
                  >
                    Request Unblock
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={unlockRemaining > 0}
                  onPress={finishUnlock}
                  style={[
                    styles.fullPrimaryButton,
                    {
                      backgroundColor:
                        unlockRemaining > 0
                          ? activeTone.bg4
                          : activeTone.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      {
                        color:
                          unlockRemaining > 0
                            ? textColor
                            : isDark
                              ? "#111113"
                              : "#ffffff",
                      },
                    ]}
                  >
                    {unlockRemaining > 0
                      ? `Wait ${formatTimer(unlockRemaining)}`
                      : "Authenticate & Unblock"}
                  </Text>
                </Pressable>
              )}
            </View>
          </LiquidGlassView>
        )}
      </ScrollView>
    </View>
  );
}

function QuickNotepad() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const [folders, setFolders] = useState<NoteFolder[]>([
    {
      id: "general",
      name: "General",
    },
  ]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [folderName, setFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("general");
  const [editorNote, setEditorNote] = useState<StudyNote | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(NOTE_FOLDERS_KEY),
      AsyncStorage.getItem(NOTES_KEY),
    ])
      .then(([foldersRaw, notesRaw]) => {
        if (foldersRaw) {
          const parsed = JSON.parse(foldersRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFolders(parsed);
            setSelectedFolderId(parsed[0].id);
          }
        }

        if (notesRaw) {
          const parsed = JSON.parse(notesRaw);
          if (Array.isArray(parsed)) {
            setNotes(parsed);
          }
        }
      })
      .catch((error) => {
        console.warn("[Study] Failed to load notes", error);
      });
  }, []);

  const persistFolders = async (next: NoteFolder[]) => {
    setFolders(next);
    await AsyncStorage.setItem(NOTE_FOLDERS_KEY, JSON.stringify(next));
  };

  const persistNotes = async (next: StudyNote[]) => {
    setNotes(next);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
  };

  const addFolder = async () => {
    const name = folderName.trim();
    if (!name) return;

    const folder = {
      id: uid("folder"),
      name,
    };

    await persistFolders([...folders, folder]);
    setSelectedFolderId(folder.id);
    setFolderName("");
  };

  const createNote = (type: "text" | "draw") => {
    setEditorNote({
      id: uid("note"),
      folderId: selectedFolderId,
      title: type === "text" ? "Quick Note" : "Drawing",
      type,
      body: "",
      strokes: [],
      updatedAt: new Date().toISOString(),
    });
  };

  const saveEditorNote = async (note: StudyNote) => {
    const exists = notes.some((current) => current.id === note.id);

    const next = exists
      ? notes.map((current) => (current.id === note.id ? note : current))
      : [note, ...notes];

    await persistNotes(next);
    setEditorNote(null);
  };

  const visibleNotes = notes
    .filter((note) => note.folderId === selectedFolderId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return (
    <View style={styles.panelBody}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.panelScrollContent}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
              marginTop: 4,
            },
          ]}
        >
          Note Folders
        </Text>

        <View style={styles.inlineBuilder}>
          <TextInput
            value={folderName}
            onChangeText={setFolderName}
            placeholder="New folder"
            placeholderTextColor={activeTone.muted}
            style={[
              styles.inlineInput,
              {
                color: textColor,
                backgroundColor: activeTone.bg2,
                borderColor: activeTone.border,
              },
            ]}
          />

          <Pressable
            onPress={addFolder}
            style={[
              styles.squareAccentButton,
              {
                backgroundColor: activeTone.accent,
              },
            ]}
          >
            <MaterialIcons
              name="create-new-folder"
              size={22}
              color={isDark ? "#111113" : "#ffffff"}
            />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.folderChips}
        >
          {folders.map((folder) => {
            const selected = folder.id === selectedFolderId;

            return (
              <Pressable
                key={folder.id}
                onPress={() => setSelectedFolderId(folder.id)}
                style={[
                  styles.folderChip,
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
                <Text
                  style={{
                    color: selected
                      ? isDark
                        ? "#111113"
                        : "#ffffff"
                      : textColor,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  {folder.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.rowGap}>
          <Pressable
            onPress={() => createNote("text")}
            style={[
              styles.primaryButton,
              {
                backgroundColor: activeTone.accent,
              },
            ]}
          >
            <MaterialIcons
              name="notes"
              size={20}
              color={isDark ? "#111113" : "#ffffff"}
            />
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: isDark ? "#111113" : "#ffffff",
                },
              ]}
            >
              Text Note
            </Text>
          </Pressable>

          <Pressable
            onPress={() => createNote("draw")}
            style={[
              styles.secondaryButton,
              {
                backgroundColor: activeTone.bg3,
                borderColor: activeTone.border,
              },
            ]}
          >
            <MaterialIcons
              name="draw"
              size={20}
              color={activeTone.accent}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color: textColor,
                },
              ]}
            >
              Draw
            </Text>
          </Pressable>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
            },
          ]}
        >
          Notes
        </Text>

        {visibleNotes.length === 0 ? (
          <EmptyState
            icon="edit-note"
            title="This folder is empty"
            body="Create a typed note or open a blank drawing."
          />
        ) : (
          visibleNotes.map((note) => (
            <LiquidGlassView
              key={note.id}
              className="rounded-2xl overflow-hidden mb-3"
              fallbackBackgroundColor={activeTone.bg3}
              glassTintColor={activeTone.bg2}
              glassEffectStyle="clear"
            >
              <View style={styles.listRow}>
                <Pressable
                  onPress={() => setEditorNote(note)}
                  style={styles.listMainPressable}
                >
                  <View
                    style={[
                      styles.listIcon,
                      {
                        backgroundColor: activeTone.bg4,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={note.type === "draw" ? "draw" : "notes"}
                      size={23}
                      color={activeTone.accent}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.listTitle,
                        {
                          color: textColor,
                        },
                      ]}
                    >
                      {note.title || "Untitled"}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.listSubtitle,
                        {
                          color: activeTone.muted,
                        },
                      ]}
                    >
                      {note.type === "draw"
                        ? `${note.strokes.length} pen strokes`
                        : note.body || "Empty note"}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() =>
                    persistNotes(notes.filter((current) => current.id !== note.id))
                  }
                  hitSlop={10}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={21}
                    color={activeTone.muted}
                  />
                </Pressable>
              </View>
            </LiquidGlassView>
          ))
        )}
      </ScrollView>

      <NoteEditor
        note={editorNote}
        onClose={() => setEditorNote(null)}
        onSave={saveEditorNote}
      />
    </View>
  );
}

function NoteEditor({
  note,
  onClose,
  onSave,
}: {
  note: StudyNote | null;
  onClose: () => void;
  onSave: (note: StudyNote) => Promise<void>;
}) {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const [draft, setDraft] = useState<StudyNote | null>(note);
  const [penWidth, setPenWidth] = useState(3);
  const currentStrokeId = useRef<string | null>(null);

  useEffect(() => {
    setDraft(note);
    currentStrokeId.current = null;
  }, [note]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => draft?.type === "draw",
        onMoveShouldSetPanResponder: () => draft?.type === "draw",
        onPanResponderGrant: (event) => {
          if (!draft || draft.type !== "draw") return;

          const id = uid("stroke");
          currentStrokeId.current = id;
          const point = `${event.nativeEvent.locationX},${event.nativeEvent.locationY}`;

          setDraft((current) =>
            current
              ? {
                  ...current,
                  strokes: [
                    ...current.strokes,
                    {
                      id,
                      points: point,
                      width: penWidth,
                    },
                  ],
                }
              : current,
          );
        },
        onPanResponderMove: (event) => {
          const strokeId = currentStrokeId.current;

          if (!strokeId) return;

          const point = `${event.nativeEvent.locationX},${event.nativeEvent.locationY}`;

          setDraft((current) =>
            current
              ? {
                  ...current,
                  strokes: current.strokes.map((stroke) =>
                    stroke.id === strokeId
                      ? {
                          ...stroke,
                          points: `${stroke.points} ${point}`,
                        }
                      : stroke,
                  ),
                }
              : current,
          );
        },
        onPanResponderRelease: () => {
          currentStrokeId.current = null;
        },
        onPanResponderTerminate: () => {
          currentStrokeId.current = null;
        },
      }),
    [draft?.type, penWidth],
  );

  if (!note || !draft) {
    return null;
  }

  return (
    <Modal
      visible={note !== null}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.viewerScreen,
          {
            backgroundColor: activeTone.bg1,
          },
        ]}
      >
        <View style={styles.noteEditorHeader}>
          <Pressable onPress={onClose} style={styles.textButton}>
            <Text style={{ color: activeTone.accent, fontWeight: "700" }}>
              Cancel
            </Text>
          </Pressable>

          <Text
            style={[
              styles.viewerTitle,
              {
                color: textColor,
              },
            ]}
          >
            {draft.type === "draw" ? "Drawing" : "Note"}
          </Text>

          <Pressable
            onPress={() =>
              onSave({
                ...draft,
                updatedAt: new Date().toISOString(),
              })
            }
            style={styles.textButton}
          >
            <Text style={{ color: activeTone.accent, fontWeight: "800" }}>
              Save
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={draft.title}
          onChangeText={(title) =>
            setDraft((current) => (current ? { ...current, title } : current))
          }
          placeholder="Note title"
          placeholderTextColor={activeTone.muted}
          style={[
            styles.noteTitleInput,
            {
              color: textColor,
              borderColor: activeTone.border,
              backgroundColor: activeTone.bg2,
            },
          ]}
        />

        {draft.type === "text" ? (
          <TextInput
            value={draft.body}
            onChangeText={(body) =>
              setDraft((current) => (current ? { ...current, body } : current))
            }
            multiline
            textAlignVertical="top"
            placeholder="Write anything..."
            placeholderTextColor={activeTone.muted}
            style={[
              styles.noteBodyInput,
              {
                color: textColor,
                borderColor: activeTone.border,
                backgroundColor: activeTone.bg2,
              },
            ]}
          />
        ) : (
          <>
            <View style={styles.drawingToolbar}>
              {[2, 3, 5, 8].map((width) => (
                <Pressable
                  key={width}
                  onPress={() => setPenWidth(width)}
                  style={[
                    styles.penButton,
                    {
                      backgroundColor:
                        penWidth === width ? activeTone.accent : activeTone.bg3,
                      borderColor:
                        penWidth === width
                          ? activeTone.accent
                          : activeTone.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: width * 1.7,
                      height: width * 1.7,
                      borderRadius: width,
                      backgroundColor:
                        penWidth === width
                          ? isDark
                            ? "#111113"
                            : "#ffffff"
                          : activeTone.accent,
                    }}
                  />
                </Pressable>
              ))}

              <Pressable
                onPress={() =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          strokes: current.strokes.slice(0, -1),
                        }
                      : current,
                  )
                }
                style={[
                  styles.penButton,
                  {
                    backgroundColor: activeTone.bg3,
                    borderColor: activeTone.border,
                  },
                ]}
              >
                <MaterialIcons
                  name="undo"
                  size={20}
                  color={textColor}
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          strokes: [],
                        }
                      : current,
                  )
                }
                style={[
                  styles.penButton,
                  {
                    backgroundColor: activeTone.bg3,
                    borderColor: activeTone.border,
                  },
                ]}
              >
                <MaterialIcons
                  name="delete-sweep"
                  size={20}
                  color={textColor}
                />
              </Pressable>
            </View>

            <View
              {...panResponder.panHandlers}
              style={[
                styles.drawingCanvas,
                {
                  backgroundColor: isDark ? "#ffffff" : "#ffffff",
                  borderColor: activeTone.border,
                },
              ]}
            >
              <Svg width="100%" height="100%">
                {draft.strokes.map((stroke) => (
                  <Polyline
                    key={stroke.id}
                    points={stroke.points}
                    fill="none"
                    stroke="#111113"
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  body: string;
}) {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  return (
    <LiquidGlassView
      className="rounded-2xl overflow-hidden"
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg2}
      glassEffectStyle="clear"
    >
      <View style={styles.emptyState}>
        <MaterialIcons
          name={icon}
          size={38}
          color={activeTone.muted}
        />

        <Text
          style={[
            styles.emptyTitle,
            {
              color: textColor,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.emptyBody,
            {
              color: activeTone.muted,
            },
          ]}
        >
          {body}
        </Text>
      </View>
    </LiquidGlassView>
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

  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },

  toolCell: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },

  toolCard: {
    minHeight: 168,
    padding: 16,
  },

  toolIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  toolTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  toolSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },

  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 16,
  },

  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  tipText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  panelHeader: {
    minHeight: 74,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  panelHeaderTitle: {
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

  panelScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },

  centeredPanel: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 70,
  },

  rowGap: {
    flexDirection: "row",
    gap: 9,
  },

  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 11,
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 11,
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  fullPrimaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 14,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 25,
    marginBottom: 12,
  },

  formCard: {
    padding: 16,
  },

  formTitle: {
    fontSize: 19,
    fontWeight: "800",
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 13,
    marginBottom: 6,
  },

  input: {
    minHeight: 47,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 15,
    marginTop: 10,
  },

  multilineInput: {
    minHeight: 110,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
  },

  inlineBuilder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },

  inlineInput: {
    flex: 1,
    minHeight: 47,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 15,
  },

  squareAccentButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  listRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 10,
  },

  listMainPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  listTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  listSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  iconButton: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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

  viewerScreen: {
    flex: 1,
    paddingTop: 0,
  },

  viewerHeader: {
    minHeight: 62,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  viewerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
  },

  deckCard: {
    padding: 15,
  },

  deckTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 13,
  },

  deckName: {
    fontSize: 18,
    fontWeight: "800",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    padding: 18,
  },

  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  reviewHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  textButton: {
    minWidth: 64,
    minHeight: 42,
    justifyContent: "center",
  },

  reviewProgress: {
    fontSize: 13,
    fontWeight: "700",
  },

  flashcardStage: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 18,
    justifyContent: "center",
  },

  flashcardFace: {
    position: "absolute",
    width: "100%",
    minHeight: 330,
    borderRadius: 24,
    borderWidth: 1,
    padding: 26,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
  },

  flashcardBack: {
    position: "absolute",
  },

  flashcardSideLabel: {
    position: "absolute",
    top: 20,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  flashcardText: {
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "700",
    textAlign: "center",
  },

  flashcardTapHint: {
    position: "absolute",
    bottom: 20,
    fontSize: 11,
    fontWeight: "600",
  },

  ratingGrid: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexDirection: "row",
    gap: 7,
  },

  ratingButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  presetChip: {
    minWidth: "47%",
    flexGrow: 1,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  timerCard: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 36,
  },

  timerPhase: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  timerText: {
    fontSize: 64,
    lineHeight: 76,
    fontWeight: "300",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },

  timerSubtext: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  timerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 27,
    gap: 14,
  },

  timerSmallButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  timerMainButton: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  helperText: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 14,
    textAlign: "center",
    paddingHorizontal: 12,
  },

  warningCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  warningText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  segmentRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },

  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  unlockCard: {
    padding: 17,
  },

  folderChips: {
    gap: 7,
    paddingBottom: 15,
  },

  folderChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  noteEditorHeader: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  noteTitleInput: {
    minHeight: 47,
    marginHorizontal: 18,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 16,
  },

  noteBodyInput: {
    flex: 1,
    margin: 18,
    marginTop: 12,
    borderRadius: 15,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    lineHeight: 23,
  },

  drawingToolbar: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  penButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  drawingCanvas: {
    flex: 1,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
});
