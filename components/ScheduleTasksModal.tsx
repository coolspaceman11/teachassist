import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
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

import {
  dateToLocalKey,
  formatTaskDueDate,
  localKeyToDate,
  ScheduleClass,
  ScheduleTaskKind,
  useSchedule,
} from "@/contexts/ScheduleContext";

import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";

type Props = {
  visible: boolean;
  classBlock: ScheduleClass | null;
  onClose: () => void;
};

const tomorrowKey = () => {
  const date = new Date();

  date.setDate(
    date.getDate() + 1,
  );

  return dateToLocalKey(
    date,
  );
};

export default function ScheduleTasksModal({
  visible,
  classBlock,
  onClose,
}: Props) {
  const {
    getTasksForClass,
    addTask,
    completeTask,
    deleteTask,
  } = useSchedule();

  const {
    activeTone,
    isDark,
  } = useTheme();

  const [
    adding,
    setAdding,
  ] = useState(false);

  const [
    taskTitle,
    setTaskTitle,
  ] = useState("");

  const [
    taskKind,
    setTaskKind,
  ] = useState<ScheduleTaskKind>(
    "homework",
  );

  const [
    dueDate,
    setDueDate,
  ] = useState(
    tomorrowKey(),
  );

  useEffect(() => {
    if (!visible) {
      setAdding(false);
      setTaskTitle("");
      setTaskKind(
        "homework",
      );
      setDueDate(
        tomorrowKey(),
      );
    }
  }, [visible]);

  const tasks = useMemo(() => {
    if (!classBlock) {
      return [];
    }

    return getTasksForClass(
      classBlock.id,
    );
  }, [
    classBlock,
    getTasksForClass,
  ]);

  if (!classBlock) {
    return null;
  }

  const textColor =
    isDark
      ? "#edebea"
      : "#2f3035";

  const muted =
    activeTone.muted;

  const handleAddTask =
    async () => {
      const trimmed =
        taskTitle.trim();

      if (!trimmed) {
        Alert.alert(
          "Add a title",
          "Enter the homework or assignment name first.",
        );

        return;
      }

      await addTask({
        classId:
          classBlock.id,

        title:
          trimmed,

        kind:
          taskKind,

        dueDate,
      });

      hapticsImpact(
        Haptics
          .ImpactFeedbackStyle
          .Medium,
      );

      setTaskTitle("");
      setTaskKind(
        "homework",
      );
      setDueDate(
        tomorrowKey(),
      );
      setAdding(false);
    };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={
        onClose
      }
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              activeTone.bg1,
          },
        ]}
      >
        <PageBackground />

        <View
          style={
            styles.header
          }
        >
          <View
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Text
              style={[
                styles.title,
                {
                  color:
                    textColor,
                },
              ]}
              numberOfLines={1}
            >
              {
                classBlock.name
              }
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    muted,
                },
              ]}
            >
              Homework & Assignments
            </Text>
          </View>

          <Pressable
            onPress={
              onClose
            }
            style={[
              styles.closeButton,
              {
                backgroundColor:
                  activeTone.bg3,
              },
            ]}
          >
            <MaterialIcons
              name="close"
              size={24}
              color={
                textColor
              }
            />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.content
          }
        >
          {!adding && (
            <Pressable
              onPress={() => {
                hapticsImpact(
                  Haptics
                    .ImpactFeedbackStyle
                    .Light,
                );

                setAdding(
                  true,
                );
              }}
              style={[
                styles.addButton,
                {
                  backgroundColor:
                    activeTone.accent,
                },
              ]}
            >
              <MaterialIcons
                name="add"
                size={22}
                color={
                  isDark
                    ? "#111113"
                    : "#ffffff"
                }
              />

              <Text
                style={[
                  styles.addButtonText,
                  {
                    color:
                      isDark
                        ? "#111113"
                        : "#ffffff",
                  },
                ]}
              >
                Add Work
              </Text>
            </Pressable>
          )}

          {adding && (
            <LiquidGlassView
              className="rounded-2xl overflow-hidden mb-5"
              fallbackBackgroundColor={
                activeTone.bg3
              }
              glassTintColor={
                activeTone.bg2
              }
              glassEffectStyle="clear"
            >
              <View
                style={
                  styles.form
                }
              >
                <Text
                  style={[
                    styles.formTitle,
                    {
                      color:
                        textColor,
                    },
                  ]}
                >
                  New Work
                </Text>

                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        muted,
                    },
                  ]}
                >
                  Type
                </Text>

                <View
                  style={
                    styles.kindRow
                  }
                >
                  <Pressable
                    onPress={() =>
                      setTaskKind(
                        "homework",
                      )
                    }
                    style={[
                      styles.kindButton,
                      {
                        backgroundColor:
                          taskKind ===
                          "homework"
                            ? activeTone.accent
                            : activeTone.bg2,

                        borderColor:
                          taskKind ===
                          "homework"
                            ? activeTone.accent
                            : activeTone.border,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="menu-book"
                      size={19}
                      color={
                        taskKind ===
                        "homework"
                          ? isDark
                            ? "#111113"
                            : "#ffffff"
                          : textColor
                      }
                    />

                    <Text
                      style={[
                        styles.kindText,
                        {
                          color:
                            taskKind ===
                            "homework"
                              ? isDark
                                ? "#111113"
                                : "#ffffff"
                              : textColor,
                        },
                      ]}
                    >
                      Homework
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setTaskKind(
                        "assignment",
                      )
                    }
                    style={[
                      styles.kindButton,
                      {
                        backgroundColor:
                          taskKind ===
                          "assignment"
                            ? activeTone.accent
                            : activeTone.bg2,

                        borderColor:
                          taskKind ===
                          "assignment"
                            ? activeTone.accent
                            : activeTone.border,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="assignment"
                      size={19}
                      color={
                        taskKind ===
                        "assignment"
                          ? isDark
                            ? "#111113"
                            : "#ffffff"
                          : textColor
                      }
                    />

                    <Text
                      style={[
                        styles.kindText,
                        {
                          color:
                            taskKind ===
                            "assignment"
                              ? isDark
                                ? "#111113"
                                : "#ffffff"
                              : textColor,
                        },
                      ]}
                    >
                      Assignment
                    </Text>
                  </Pressable>
                </View>

                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color:
                        muted,
                    },
                  ]}
                >
                  Title
                </Text>

                <TextInput
                  value={
                    taskTitle
                  }
                  onChangeText={
                    setTaskTitle
                  }
                  placeholder={
                    taskKind ===
                    "homework"
                      ? "e.g. Finish chapter questions"
                      : "e.g. History presentation"
                  }
                  placeholderTextColor={
                    muted
                  }
                  style={[
                    styles.input,
                    {
                      color:
                        textColor,

                      backgroundColor:
                        activeTone.bg2,

                      borderColor:
                        activeTone.border,
                    },
                  ]}
                />

                <View
                  style={
                    styles.dueRow
                  }
                >
                  <View>
                    <Text
                      style={[
                        styles.fieldLabel,
                        {
                          color:
                            muted,
                          marginTop:
                            0,
                        },
                      ]}
                    >
                      Due Date
                    </Text>

                    <Text
                      style={[
                        styles.duePreview,
                        {
                          color:
                            textColor,
                        },
                      ]}
                    >
                      {formatTaskDueDate(
                        dueDate,
                      )}
                    </Text>
                  </View>

                  <DateTimePicker
                    value={
                      localKeyToDate(
                        dueDate,
                      )
                    }
                    mode="date"
                    minimumDate={
                      new Date()
                    }
                    display={
                      Platform.OS ===
                      "ios"
                        ? "compact"
                        : "default"
                    }
                    onChange={(
                      _event,
                      selected,
                    ) => {
                      if (
                        selected
                      ) {
                        setDueDate(
                          dateToLocalKey(
                            selected,
                          ),
                        );
                      }
                    }}
                  />
                </View>

                <View
                  style={
                    styles.formActions
                  }
                >
                  <Pressable
                    onPress={() => {
                      setAdding(
                        false,
                      );

                      setTaskTitle(
                        "",
                      );
                    }}
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor:
                          activeTone.bg2,

                        borderColor:
                          activeTone.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryText,
                        {
                          color:
                            textColor,
                        },
                      ]}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={
                      handleAddTask
                    }
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor:
                          activeTone.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.saveText,
                        {
                          color:
                            isDark
                              ? "#111113"
                              : "#ffffff",
                        },
                      ]}
                    >
                      Add
                    </Text>
                  </Pressable>
                </View>
              </View>
            </LiquidGlassView>
          )}

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  textColor,
              },
            ]}
          >
            Active Work
          </Text>

          {tasks.length === 0 ? (
            <LiquidGlassView
              className="rounded-2xl overflow-hidden"
              fallbackBackgroundColor={
                activeTone.bg3
              }
              glassTintColor={
                activeTone.bg2
              }
              glassEffectStyle="clear"
            >
              <View
                style={
                  styles.empty
                }
              >
                <MaterialIcons
                  name="task-alt"
                  size={38}
                  color={
                    muted
                  }
                />

                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      color:
                        textColor,
                    },
                  ]}
                >
                  All caught up
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    {
                      color:
                        muted,
                    },
                  ]}
                >
                  No homework or assignments for this class.
                </Text>
              </View>
            </LiquidGlassView>
          ) : (
            tasks.map(
              (task) => {
                const today =
                  dateToLocalKey(
                    new Date(),
                  );

                const overdue =
                  task.dueDate <
                  today;

                return (
                  <LiquidGlassView
                    key={
                      task.id
                    }
                    className="rounded-2xl overflow-hidden mb-3"
                    fallbackBackgroundColor={
                      activeTone.bg3
                    }
                    glassTintColor={
                      activeTone.bg2
                    }
                    glassEffectStyle="clear"
                  >
                    <View
                      style={
                        styles.taskRow
                      }
                    >
                      <Pressable
                        onPress={async () => {
                          hapticsImpact(
                            Haptics
                              .ImpactFeedbackStyle
                              .Medium,
                          );

                          await completeTask(
                            task.id,
                          );
                        }}
                        style={[
                          styles.checkbox,
                          {
                            borderColor:
                              activeTone.accent,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="check"
                          size={20}
                          color={
                            activeTone.accent
                          }
                        />
                      </Pressable>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <View
                          style={
                            styles.taskTopRow
                          }
                        >
                          <Text
                            style={[
                              styles.taskTitle,
                              {
                                color:
                                  textColor,
                              },
                            ]}
                          >
                            {
                              task.title
                            }
                          </Text>

                          <View
                            style={[
                              styles.typeBadge,
                              {
                                backgroundColor:
                                  activeTone.bg2,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.typeBadgeText,
                                {
                                  color:
                                    activeTone.accent,
                                },
                              ]}
                            >
                              {task.kind ===
                              "assignment"
                                ? "ASSIGNMENT"
                                : "HOMEWORK"}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.dueText,
                            {
                              color:
                                overdue
                                  ? "#ef5350"
                                  : muted,
                            },
                          ]}
                        >
                          {overdue
                            ? "Overdue • "
                            : "Due "}
                          {formatTaskDueDate(
                            task.dueDate,
                          )}
                        </Text>
                      </View>

                      <Pressable
                        hitSlop={
                          10
                        }
                        onPress={() => {
                          Alert.alert(
                            "Delete Work?",
                            "Remove this item without marking it complete?",
                            [
                              {
                                text:
                                  "Cancel",
                                style:
                                  "cancel",
                              },
                              {
                                text:
                                  "Delete",
                                style:
                                  "destructive",
                                onPress:
                                  () =>
                                    deleteTask(
                                      task.id,
                                    ),
                              },
                            ],
                          );
                        }}
                        style={
                          styles.deleteButton
                        }
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={20}
                          color={
                            muted
                          }
                        />
                      </Pressable>
                    </View>
                  </LiquidGlassView>
                );
              },
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    header: {
      minHeight: 72,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    title: {
      fontSize: 27,
      fontWeight: "700",
    },

    subtitle: {
      fontSize: 13,
      marginTop: 2,
    },

    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 50,
    },

    addButton: {
      minHeight: 50,
      borderRadius: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 8,
      marginBottom: 24,
    },

    addButtonText: {
      fontSize: 15,
      fontWeight: "700",
    },

    form: {
      padding: 17,
    },

    formTitle: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 10,
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 13,
      marginBottom: 6,
    },

    kindRow: {
      flexDirection: "row",
      gap: 8,
    },

    kindButton: {
      flex: 1,
      minHeight: 45,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    kindText: {
      fontSize: 13,
      fontWeight: "700",
    },

    input: {
      minHeight: 48,
      borderRadius: 13,
      borderWidth: 1,
      paddingHorizontal: 13,
      fontSize: 16,
    },

    dueRow: {
      minHeight: 65,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 13,
    },

    duePreview: {
      fontSize: 15,
      fontWeight: "700",
    },

    formActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
    },

    secondaryButton: {
      flex: 1,
      minHeight: 45,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    secondaryText: {
      fontSize: 14,
      fontWeight: "700",
    },

    saveButton: {
      flex: 1,
      minHeight: 45,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },

    saveText: {
      fontSize: 14,
      fontWeight: "700",
    },

    sectionTitle: {
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 12,
    },

    taskRow: {
      minHeight: 82,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    checkbox: {
      width: 38,
      height: 38,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },

    taskTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    taskTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
    },

    typeBadge: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 7,
    },

    typeBadgeText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.4,
    },

    dueText: {
      fontSize: 12,
      marginTop: 5,
      fontWeight: "600",
    },

    deleteButton: {
      width: 30,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },

    empty: {
      paddingHorizontal: 24,
      paddingVertical: 34,
      alignItems: "center",
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginTop: 9,
    },

    emptyText: {
      fontSize: 13,
      marginTop: 4,
      textAlign: "center",
    },
  });
