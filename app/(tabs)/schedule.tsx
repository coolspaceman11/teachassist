import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
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

import ScheduleTasksModal from "@/components/ScheduleTasksModal";
import ScheduleCalendarModal from "@/components/ScheduleCalendarModal";
import Text from "@/components/ui/AppText";
import AppToggle from "@/components/ui/AppToggle";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import PageBackground from "@/components/ui/PageBackground";

import {
    dateToLocalKey,
    formatCountdown,
    formatScheduleTime,
    formatTaskDueDate,
    ScheduleClass,
    ScheduleSettings,
    timeToMinutes,
    useSchedule,
} from "@/contexts/ScheduleContext";

import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";

const DAYS = [
  {
    value: 1,
    short: "M",
    label: "Monday",
  },
  {
    value: 2,
    short: "T",
    label: "Tuesday",
  },
  {
    value: 3,
    short: "W",
    label: "Wednesday",
  },
  {
    value: 4,
    short: "T",
    label: "Thursday",
  },
  {
    value: 5,
    short: "F",
    label: "Friday",
  },
  {
    value: 6,
    short: "S",
    label: "Saturday",
  },
  {
    value: 0,
    short: "S",
    label: "Sunday",
  },
];

const REMINDER_OPTIONS = [
  0,
  5,
  10,
  15,
  30,
];


const createClass =
  (): ScheduleClass => ({
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    name: "",
    room: "",
    start: "08:30",
    end: "09:45",
    days: [
      1,
      2,
      3,
      4,
      5,
    ],
    enabled: true,
  });

const cloneClasses = (
  classes: ScheduleClass[],
) =>
  classes.map(
    (classBlock) => ({
      ...classBlock,
      days: [
        ...classBlock.days,
      ],
    }),
  );

const timeStringToDate = (
  time: string,
) => {
  const [hours, minutes] =
    time
      .split(":")
      .map(Number);

  const date =
    new Date();

  date.setHours(
    hours,
    minutes,
    0,
    0,
  );

  return date;
};

const dateToTimeString = (
  date: Date,
) =>
  `${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;

export default function ScheduleScreen() {
  const {
    classes,
    settings,
    tasks,
    loaded,
    saveSchedule,
    getClassesForDate,
    getStatus,
    getTasksForClass,
    completeTask,
  } = useSchedule();

  const {
    activeTone,
    isDark,
  } = useTheme();

  const [
    now,
    setNow,
  ] =
    useState(
      new Date(),
    );

  const [
    editorVisible,
    setEditorVisible,
  ] =
    useState(false);

  const [
    draftClasses,
    setDraftClasses,
  ] =
    useState<
      ScheduleClass[]
    >([]);

  const [
    draftSettings,
    setDraftSettings,
  ] =
    useState<ScheduleSettings>(
      settings,
    );


  const [
    selectedTaskClass,
    setSelectedTaskClass,
  ] =
    useState<ScheduleClass | null>(
      null,
    );

  const [calendarVisible, setCalendarVisible] = useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  useEffect(() => {
    const timer =
      setInterval(
        () => {
          setNow(
            new Date(),
          );
        },
        30000,
      );

    return () => {
      clearInterval(
        timer,
      );
    };
  }, []);

  const todayClasses =
    useMemo(
      () =>
        getClassesForDate(
          now,
        ),
      [
        classes,
        now,
      ],
    );

  const status =
    useMemo(
      () =>
        getStatus(
          now,
        ),
      [
        classes,
        now,
      ],
    );

  const upcomingTasks =
    useMemo(
      () =>
        Array.isArray(tasks)
          ? [...tasks].sort(
              (a, b) =>
                a.dueDate.localeCompare(
                  b.dueDate,
                ),
            )
          : [],
      [tasks],
    );

  const classMap =
    useMemo(
      () =>
        new Map(
          classes.map(
            (
              classBlock,
            ) => [
              classBlock.id,
              classBlock,
            ],
          ),
        ),
      [classes],
    );

  const textColor =
    isDark
      ? "#edebea"
      : "#2f3035";

  const muted =
    activeTone.muted;

  const openEditor =
    () => {
      hapticsImpact(
        Haptics
          .ImpactFeedbackStyle
          .Light,
      );

      setDraftClasses(
        cloneClasses(
          classes,
        ),
      );

      setDraftSettings({
        ...settings,
      });

      setEditorVisible(
        true,
      );
    };

  const updateDraftClass =
    (
      id: string,
      patch: Partial<ScheduleClass>,
    ) => {
      setDraftClasses(
        (current) =>
          current.map(
            (
              classBlock,
            ) =>
              classBlock.id ===
              id
                ? {
                    ...classBlock,
                    ...patch,
                  }
                : classBlock,
          ),
      );
    };

  const toggleDay =
    (
      id: string,
      day: number,
    ) => {
      setDraftClasses(
        (current) =>
          current.map(
            (
              classBlock,
            ) => {
              if (
                classBlock.id !==
                id
              ) {
                return classBlock;
              }

              const hasDay =
                classBlock.days.includes(
                  day,
                );

              return {
                ...classBlock,

                days:
                  hasDay
                    ? classBlock.days.filter(
                        (
                          value,
                        ) =>
                          value !==
                          day,
                      )
                    : [
                        ...classBlock.days,
                        day,
                      ],
              };
            },
          ),
      );
    };

  const removeClass =
    (
      id: string,
    ) => {
      Alert.alert(
        "Remove Class?",
        "This class and its saved homework/assignments will be removed.",
        [
          {
            text:
              "Cancel",
            style:
              "cancel",
          },
          {
            text:
              "Remove",
            style:
              "destructive",

            onPress:
              () => {
                setDraftClasses(
                  (
                    current,
                  ) =>
                    current.filter(
                      (
                        classBlock,
                      ) =>
                        classBlock.id !==
                        id,
                    ),
                );
              },
          },
        ],
      );
    };

  const validateDraft =
    () => {
      for (
        const classBlock of
        draftClasses
      ) {
        if (
          !classBlock.name.trim()
        ) {
          Alert.alert(
            "Class Name Required",
            "Every timetable entry needs a class name.",
          );

          return false;
        }

        if (
          classBlock.days.length ===
          0
        ) {
          Alert.alert(
            "Choose a Day",
            `${classBlock.name} needs at least one day selected.`,
          );

          return false;
        }

        if (
          timeToMinutes(
            classBlock.end,
          ) <=
          timeToMinutes(
            classBlock.start,
          )
        ) {
          Alert.alert(
            "Invalid Class Time",
            `${classBlock.name} must end after it starts.`,
          );

          return false;
        }
      }

      return true;
    };

  const handleSave =
    async () => {
      if (
        !validateDraft()
      ) {
        return;
      }

      setSaving(
        true,
      );

      try {
        const result =
          await saveSchedule(
            draftClasses,
            draftSettings,
          );

        if (
          draftSettings.phoneNotificationsEnabled &&
          !result.notificationsGranted
        ) {
          Alert.alert(
            "Notifications Disabled",
            "Your schedule was saved, but notification permission was not granted.",
          );
        }

        hapticsImpact(
          Haptics
            .ImpactFeedbackStyle
            .Medium,
        );

        setEditorVisible(
          false,
        );
      } catch (error) {
        console.warn(
          "[Schedule] Save failed.",
          error,
        );

        Alert.alert(
          "Couldn't Save",
          "TeachAssist+ could not save your schedule.",
        );
      } finally {
        setSaving(
          false,
        );
      }
    };


  if (!loaded) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              activeTone.bg1,
          },
        ]}
      />
    );
  }

  return (
    <SafeAreaView
      edges={[
        "top",
      ]}
      style={[
        styles.safeArea,
        {
          backgroundColor:
            activeTone.bg1,
        },
      ]}
    >
      <PageBackground />

      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.headerRow
          }
        >
          <View
            style={{
              flex: 1,
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
            >
              Schedule
            </Text>

            <Text
              style={[
                styles.date,
                {
                  color:
                    muted,
                },
              ]}
            >
              {now.toLocaleDateString(
                [],
                {
                  weekday:
                    "long",
                  month:
                    "long",
                  day:
                    "numeric",
                },
              )}
            </Text>
          </View>

          <Pressable
            onPress={
              openEditor
            }
            style={[
              styles.editButton,
              {
                backgroundColor:
                  activeTone.accent,
              },
            ]}
          >
            <MaterialIcons
              name="edit"
              size={19}
              color={
                isDark
                  ? "#111113"
                  : "#ffffff"
              }
            />

            <Text
              style={[
                styles.editButtonText,
                {
                  color:
                    isDark
                      ? "#111113"
                      : "#ffffff",
                },
              ]}
            >
              Edit
            </Text>
          </Pressable>
        </View>

        {status.currentClass && (
          <LiquidGlassView
            className="rounded-2xl overflow-hidden mb-3"
            fallbackBackgroundColor={
              activeTone.bg2
            }
            glassTintColor={
              activeTone.bg2
            }
            glassEffectStyle="clear"
          >
            <View
              style={[
                styles.heroCard,
                {
                  borderColor:
                    activeTone.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.eyebrow,
                  {
                    color:
                      activeTone.accent,
                  },
                ]}
              >
                IN CLASS
              </Text>

              <Text
                style={[
                  styles.heroName,
                  {
                    color:
                      textColor,
                  },
                ]}
              >
                {
                  status.currentClass.name
                }
              </Text>

              {!!status.currentClass.room && (
                <Text
                  style={[
                    styles.roomText,
                    {
                      color:
                        muted,
                    },
                  ]}
                >
                  {
                    status.currentClass.room
                  }
                </Text>
              )}

              <Text
                style={[
                  styles.countdownText,
                  {
                    color:
                      textColor,
                  },
                ]}
              >
                Ends in{" "}
                {formatCountdown(
                  status.currentClassMinutesRemaining ??
                    0,
                )}
              </Text>
            </View>
          </LiquidGlassView>
        )}

        <LiquidGlassView
          className="rounded-2xl overflow-hidden mb-7"
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
              styles.heroCard
            }
          >
            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    activeTone.accent,
                },
              ]}
            >
              UP NEXT
            </Text>

            {status.nextClass ? (
              <>
                <Text
                  style={[
                    styles.heroName,
                    {
                      color:
                        textColor,
                    },
                  ]}
                >
                  {
                    status.nextClass.classBlock.name
                  }
                </Text>

                {!!status.nextClass.classBlock.room && (
                  <Text
                    style={[
                      styles.roomText,
                      {
                        color:
                          muted,
                      },
                    ]}
                  >
                    {
                      status.nextClass.classBlock.room
                    }
                  </Text>
                )}

                <View
                  style={
                    styles.upNextBottom
                  }
                >
                  <Text
                    style={[
                      styles.upNextTime,
                      {
                        color:
                          textColor,
                      },
                    ]}
                  >
                    {
                      status.nextClass.dayLabel
                    }
                    ,{" "}
                    {formatScheduleTime(
                      status.nextClass.classBlock.start,
                    )}
                  </Text>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          activeTone.bg2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            activeTone.accent,
                        },
                      ]}
                    >
                      {formatCountdown(
                        status.nextClass.minutesUntil,
                      )}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      muted,
                  },
                ]}
              >
                No upcoming classes.
              </Text>
            )}
          </View>
        </LiquidGlassView>

        <View
          style={
            styles.sectionHeadingRow
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  textColor,
              },
            ]}
          >
            Today
          </Text>

          {todayClasses.length >
            0 && (
            <Text
              style={[
                styles.swipeHint,
                {
                  color:
                    muted,
                },
              ]}
            >
              Tap WORK for homework →
            </Text>
          )}
        </View>

        {todayClasses.length ===
        0 ? (
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
                styles.emptyCard
              }
            >
              <MaterialIcons
                name="event-busy"
                size={36}
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
                No classes today
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
                Tap Edit to build your timetable.
              </Text>
            </View>
          </LiquidGlassView>
        ) : (
          todayClasses.map(
            (
              classBlock,
            ) => {
              const currentMinutes =
                now.getHours() *
                  60 +
                now.getMinutes();

              const start =
                timeToMinutes(
                  classBlock.start,
                );

              const end =
                timeToMinutes(
                  classBlock.end,
                );

              const isCurrent =
                currentMinutes >=
                  start &&
                currentMinutes <
                  end;

              const hasPassed =
                currentMinutes >=
                end;

              const taskCount =
                getTasksForClass(
                  classBlock.id,
                ).length;

              return (
                <View
                  key={
                    classBlock.id
                  }
                  style={
                    styles.swipeWrapper
                  }
                >
                                      <LiquidGlassView
                      className="rounded-2xl overflow-hidden"
                      fallbackBackgroundColor={
                        activeTone.bg2
                      }
                      glassTintColor={
                        activeTone.bg2
                      }
                      glassEffectStyle="clear"
                    >
                      <View
                        style={[
                          styles.classRow,
                          {
                            opacity:
                              hasPassed
                                ? 0.58
                                : 1,

                            borderColor:
                              isCurrent
                                ? activeTone.accent
                                : "transparent",
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.timeColumn
                          }
                        >
                          <Text
                            style={[
                              styles.startTime,
                              {
                                color:
                                  isCurrent
                                    ? activeTone.accent
                                    : textColor,
                              },
                            ]}
                          >
                            {formatScheduleTime(
                              classBlock.start,
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.endTime,
                              {
                                color:
                                  muted,
                              },
                            ]}
                          >
                            {formatScheduleTime(
                              classBlock.end,
                            )}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.timeline,
                            {
                              backgroundColor:
                                isCurrent
                                  ? activeTone.accent
                                  : activeTone.border,
                            },
                          ]}
                        />

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={[
                              styles.className,
                              {
                                color:
                                  textColor,
                              },
                            ]}
                          >
                            {
                              classBlock.name
                            }
                          </Text>

                          {!!classBlock.room && (
                            <Text
                              style={[
                                styles.roomText,
                                {
                                  color:
                                    muted,
                                },
                              ]}
                            >
                              {
                                classBlock.room
                              }
                            </Text>
                          )}
                        </View>

                        <Pressable
                          onPress={() => {
                            hapticsImpact(
                              Haptics
                                .ImpactFeedbackStyle
                                .Medium,
                            );

                            setSelectedTaskClass(
                              classBlock,
                            );
                          }}
                          hitSlop={6}
                          style={[
                            styles.workButton,
                            {
                              backgroundColor:
                                activeTone.bg3,
                              borderColor:
                                activeTone.accent,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="assignment"
                            size={14}
                            color={
                              activeTone.accent
                            }
                          />

                          <Text
                            style={[
                              styles.workButtonText,
                              {
                                color:
                                  activeTone.accent,
                              },
                            ]}
                          >
                            WORK
                          </Text>

                          {taskCount > 0 && (
                            <View
                              style={[
                                styles.workCountBubble,
                                {
                                  backgroundColor:
                                    activeTone.accent,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.workCountBubbleText,
                                  {
                                    color:
                                      isDark
                                        ? "#111113"
                                        : "#ffffff",
                                  },
                                ]}
                              >
                                {taskCount}
                              </Text>
                            </View>
                          )}
                        </Pressable>

                        {isCurrent && (
                          <View
                            style={[
                              styles.nowBadge,
                              {
                                backgroundColor:
                                  activeTone.accent,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.nowBadgeText,
                                {
                                  color:
                                    isDark
                                      ? "#111113"
                                      : "#ffffff",
                                },
                              ]}
                            >
                              NOW
                            </Text>
                          </View>
                        )}
                      </View>
                    </LiquidGlassView>

                </View>
              );
            },
          )
        )}

        {upcomingTasks.length >
          0 && (
          <>
            <Text
              style={[
                styles.upcomingWorkTitle,
                {
                  color:
                    textColor,
                },
              ]}
            >
              Upcoming Work
            </Text>

            {upcomingTasks.map(
              (
                task,
              ) => {
                const classBlock =
                  classMap.get(
                    task.classId,
                  );

                if (
                  !classBlock
                ) {
                  return null;
                }

                const overdue =
                  task.dueDate <
                  dateToLocalKey(
                    new Date(),
                  );

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
                    <Pressable
                      onPress={() =>
                        setSelectedTaskClass(
                          classBlock,
                        )
                      }
                      style={
                        styles.upcomingTaskRow
                      }
                    >
                      <Pressable
                        onPress={async (
                          event,
                        ) => {
                          event.stopPropagation();

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
                          styles.checkButton,
                          {
                            borderColor:
                              activeTone.accent,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="check"
                          size={18}
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
                        <Text
                          style={[
                            styles.upcomingTaskName,
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

                        <Text
                          style={[
                            styles.upcomingTaskMeta,
                            {
                              color:
                                overdue
                                  ? "#ef5350"
                                  : muted,
                            },
                          ]}
                        >
                          {
                            classBlock.name
                          }
                          {" • "}
                          {task.kind ===
                          "assignment"
                            ? "Assignment"
                            : "Homework"}
                          {" • "}
                          {overdue
                            ? "Overdue "
                            : "Due "}
                          {formatTaskDueDate(
                            task.dueDate,
                          )}
                        </Text>
                      </View>

                      <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={
                          muted
                        }
                      />
                    </Pressable>
                  </LiquidGlassView>
                );
              },
            )}
          </>
        )}

        <Pressable
          onPress={() => {
            hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
            setCalendarVisible(true);
          }}
          style={[
            styles.calendarButton,
            {
              backgroundColor: activeTone.bg3,
              borderColor: activeTone.accent,
            },
          ]}
        >
          <View style={[styles.calendarIconWrap, { backgroundColor: activeTone.bg4 }]}>
            <MaterialIcons name="calendar-month" size={27} color={activeTone.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.calendarButtonTitle, { color: textColor }]}>Calendar</Text>
            <Text style={[styles.calendarButtonSubtitle, { color: muted }]}>Events, PA days, school events, and reminders</Text>
          </View>
          <MaterialIcons name="chevron-right" size={25} color={activeTone.accent} />
        </Pressable>
      </ScrollView>

      <ScheduleCalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
      />

      <ScheduleTasksModal
        visible={
          selectedTaskClass !==
          null
        }
        classBlock={
          selectedTaskClass
        }
        onClose={() =>
          setSelectedTaskClass(
            null,
          )
        }
      />

      <Modal
        visible={
          editorVisible
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setEditorVisible(
            false,
          )
        }
      >
        <SafeAreaView
          style={[
            styles.editor,
            {
              backgroundColor:
                activeTone.bg1,
            },
          ]}
        >
          <PageBackground />

          <View
            style={
              styles.editorHeader
            }
          >
            <Pressable
              onPress={() =>
                setEditorVisible(
                  false,
                )
              }
              style={
                styles.headerAction
              }
            >
              <Text
                style={[
                  styles.headerActionText,
                  {
                    color:
                      activeTone.accent,
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Text
              style={[
                styles.editorTitle,
                {
                  color:
                    textColor,
                },
              ]}
            >
              Edit Schedule
            </Text>

            <Pressable
              disabled={
                saving
              }
              onPress={
                handleSave
              }
              style={
                styles.headerAction
              }
            >
              <Text
                style={[
                  styles.headerActionText,
                  {
                    color:
                      activeTone.accent,

                    opacity:
                      saving
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                {saving
                  ? "Saving"
                  : "Save"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal:
                16,

              paddingBottom:
                50,
            }}
          >
            <Text
              style={[
                styles.editorSectionTitle,
                {
                  color:
                    textColor,
                },
              ]}
            >
              Classes
            </Text>

            {draftClasses.map(
              (
                classBlock,
                index,
              ) => (
                <LiquidGlassView
                  key={
                    classBlock.id
                  }
                  className="rounded-2xl overflow-hidden mb-4"
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
                      styles.editCard
                    }
                  >
                    <View
                      style={
                        styles.editCardHeader
                      }
                    >
                      <Text
                        style={[
                          styles.editCardTitle,
                          {
                            color:
                              textColor,
                          },
                        ]}
                      >
                        Class{" "}
                        {index +
                          1}
                      </Text>

                      <Pressable
                        onPress={() =>
                          removeClass(
                            classBlock.id,
                          )
                        }
                        hitSlop={
                          8
                        }
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={23}
                          color="#ef5350"
                        />
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
                      Class name
                    </Text>

                    <TextInput
                      value={
                        classBlock.name
                      }
                      onChangeText={(
                        name,
                      ) =>
                        updateDraftClass(
                          classBlock.id,
                          {
                            name,
                          },
                        )
                      }
                      placeholder="e.g. Calculus"
                      placeholderTextColor={
                        muted
                      }
                      style={[
                        styles.input,
                        {
                          color:
                            textColor,

                          borderColor:
                            activeTone.border,

                          backgroundColor:
                            activeTone.bg2,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.fieldLabel,
                        {
                          color:
                            muted,
                        },
                      ]}
                    >
                      Room
                    </Text>

                    <TextInput
                      value={
                        classBlock.room
                      }
                      onChangeText={(
                        room,
                      ) =>
                        updateDraftClass(
                          classBlock.id,
                          {
                            room,
                          },
                        )
                      }
                      placeholder="e.g. Room 214"
                      placeholderTextColor={
                        muted
                      }
                      style={[
                        styles.input,
                        {
                          color:
                            textColor,

                          borderColor:
                            activeTone.border,

                          backgroundColor:
                            activeTone.bg2,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.fieldLabel,
                        {
                          color:
                            muted,
                        },
                      ]}
                    >
                      Days
                    </Text>

                    <View
                      style={
                        styles.dayRow
                      }
                    >
                      {DAYS.map(
                        (
                          day,
                        ) => {
                          const selected =
                            classBlock.days.includes(
                              day.value,
                            );

                          return (
                            <Pressable
                              key={
                                day.label
                              }
                              accessibilityLabel={
                                day.label
                              }
                              onPress={() =>
                                toggleDay(
                                  classBlock.id,
                                  day.value,
                                )
                              }
                              style={[
                                styles.dayChip,
                                {
                                  backgroundColor:
                                    selected
                                      ? activeTone.accent
                                      : activeTone.bg2,

                                  borderColor:
                                    selected
                                      ? activeTone.accent
                                      : activeTone.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  {
                                    color:
                                      selected
                                        ? isDark
                                          ? "#111113"
                                          : "#ffffff"
                                        : textColor,
                                  },
                                ]}
                              >
                                {
                                  day.short
                                }
                              </Text>
                            </Pressable>
                          );
                        },
                      )}
                    </View>

                    <View style={styles.timesRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.fieldLabel,
                            { color: muted },
                          ]}
                        >
                          Starts
                        </Text>

                        <View
                          style={[
                            styles.inlineTimePicker,
                            {
                              backgroundColor: activeTone.bg2,
                              borderColor: activeTone.border,
                            },
                          ]}
                        >
                          <DateTimePicker
                            value={timeStringToDate(classBlock.start)}
                            mode="time"
                            display={Platform.OS === "ios" ? "compact" : "default"}
                            minuteInterval={1}
                            onChange={(_event, selectedDate) => {
                              if (!selectedDate) return;
                              updateDraftClass(classBlock.id, {
                                start: dateToTimeString(selectedDate),
                              });
                            }}
                          />
                        </View>
                      </View>

                      <View style={{ width: 12 }} />

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.fieldLabel,
                            { color: muted },
                          ]}
                        >
                          Ends
                        </Text>

                        <View
                          style={[
                            styles.inlineTimePicker,
                            {
                              backgroundColor: activeTone.bg2,
                              borderColor: activeTone.border,
                            },
                          ]}
                        >
                          <DateTimePicker
                            value={timeStringToDate(classBlock.end)}
                            mode="time"
                            display={Platform.OS === "ios" ? "compact" : "default"}
                            minuteInterval={1}
                            onChange={(_event, selectedDate) => {
                              if (!selectedDate) return;
                              updateDraftClass(classBlock.id, {
                                end: dateToTimeString(selectedDate),
                              });
                            }}
                          />
                        </View>
                      </View>
                    </View>

                    <View
                      style={
                        styles.enabledRow
                      }
                    >
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={[
                            styles.settingTitle,
                            {
                              color:
                                textColor,
                            },
                          ]}
                        >
                          Enabled
                        </Text>

                        <Text
                          style={[
                            styles.settingDescription,
                            {
                              color:
                                muted,
                            },
                          ]}
                        >
                          Temporarily hide this class without deleting it.
                        </Text>
                      </View>

                      <AppToggle
                        value={
                          classBlock.enabled
                        }
                        onValueChange={(
                          enabled,
                        ) =>
                          updateDraftClass(
                            classBlock.id,
                            {
                              enabled,
                            },
                          )
                        }
                      />
                    </View>
                  </View>
                </LiquidGlassView>
              ),
            )}

            <Pressable
              onPress={() => {
                hapticsImpact(
                  Haptics
                    .ImpactFeedbackStyle
                    .Light,
                );

                setDraftClasses(
                  (
                    current,
                  ) => [
                    ...current,
                    createClass(),
                  ],
                );
              }}
              style={[
                styles.addClassButton,
                {
                  borderColor:
                    activeTone.accent,
                },
              ]}
            >
              <MaterialIcons
                name="add"
                size={22}
                color={
                  activeTone.accent
                }
              />

              <Text
                style={[
                  styles.addClassButtonText,
                  {
                    color:
                      activeTone.accent,
                  },
                ]}
              >
                Add Class
              </Text>
            </Pressable>

            <Text
              style={[
                styles.editorSectionTitle,
                {
                  color:
                    textColor,

                  marginTop:
                    30,
                },
              ]}
            >
              Class Alerts
            </Text>

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
                  styles.settingsCard
                }
              >
                <View
                  style={
                    styles.settingRow
                  }
                >
                  <View
                    style={{
                      flex: 1,
                      paddingRight:
                        12,
                    }}
                  >
                    <Text
                      style={[
                        styles.settingTitle,
                        {
                          color:
                            textColor,
                        },
                      ]}
                    >
                      Phone Notifications
                    </Text>

                    <Text
                      style={[
                        styles.settingDescription,
                        {
                          color:
                            muted,
                        },
                      ]}
                    >
                      Receive an iOS notification before each class.
                    </Text>
                  </View>

                  <AppToggle
                    value={
                      draftSettings.phoneNotificationsEnabled
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setDraftSettings(
                        (
                          current,
                        ) => ({
                          ...current,

                          phoneNotificationsEnabled:
                            value,
                        }),
                      )
                    }
                  />
                </View>

                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor:
                        activeTone.border,
                    },
                  ]}
                />

                <View
                  style={
                    styles.settingRow
                  }
                >
                  <View
                    style={{
                      flex: 1,
                      paddingRight:
                        12,
                    }}
                  >
                    <Text
                      style={[
                        styles.settingTitle,
                        {
                          color:
                            textColor,
                        },
                      ]}
                    >
                      In-App Alerts
                    </Text>

                    <Text
                      style={[
                        styles.settingDescription,
                        {
                          color:
                            muted,
                        },
                      ]}
                    >
                      Show a banner while you're using TeachAssist+.
                    </Text>
                  </View>

                  <AppToggle
                    value={
                      draftSettings.inAppNotificationsEnabled
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setDraftSettings(
                        (
                          current,
                        ) => ({
                          ...current,

                          inAppNotificationsEnabled:
                            value,
                        }),
                      )
                    }
                  />
                </View>

                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor:
                        activeTone.border,
                    },
                  ]}
                />

                <View
                  style={{
                    paddingVertical:
                      14,
                  }}
                >
                  <Text
                    style={[
                      styles.settingTitle,
                      {
                        color:
                          textColor,
                      },
                    ]}
                  >
                    Alert Before Class
                  </Text>

                  <Text
                    style={[
                      styles.settingDescription,
                      {
                        color:
                          muted,
                      },
                    ]}
                  >
                    Choose how early you want the alert.
                  </Text>

                  <View
                    style={
                      styles.reminderOptions
                    }
                  >
                    {REMINDER_OPTIONS.map(
                      (
                        minutes,
                      ) => {
                        const selected =
                          draftSettings.reminderMinutes ===
                          minutes;

                        return (
                          <Pressable
                            key={
                              minutes
                            }
                            onPress={() =>
                              setDraftSettings(
                                (
                                  current,
                                ) => ({
                                  ...current,

                                  reminderMinutes:
                                    minutes,
                                }),
                              )
                            }
                            style={[
                              styles.reminderChip,
                              {
                                backgroundColor:
                                  selected
                                    ? activeTone.accent
                                    : activeTone.bg2,

                                borderColor:
                                  selected
                                    ? activeTone.accent
                                    : activeTone.border,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize:
                                  13,

                                fontWeight:
                                  "700",

                                color:
                                  selected
                                    ? isDark
                                      ? "#111113"
                                      : "#ffffff"
                                    : textColor,
                              }}
                            >
                              {minutes ===
                              0
                                ? "At start"
                                : `${minutes}m`}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </View>
                </View>
              </View>
            </LiquidGlassView>
          </ScrollView>
        </SafeAreaView>
      </Modal>


    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 130,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
      marginBottom: 24,
    },

    title: {
      fontSize: 42,
      lineHeight: 48,
      fontWeight: "700",
    },

    date: {
      fontSize: 16,
      marginTop: 3,
    },

    editButton: {
      height: 42,
      borderRadius: 13,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    editButtonText: {
      fontSize: 14,
      fontWeight: "700",
    },

    heroCard: {
      padding: 20,
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 20,
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginBottom: 6,
    },

    heroName: {
      fontSize: 27,
      fontWeight: "700",
    },

    roomText: {
      fontSize: 14,
      marginTop: 3,
    },

    countdownText: {
      fontSize: 15,
      fontWeight: "600",
      marginTop: 14,
    },

    upNextBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 16,
      gap: 10,
    },

    upNextTime: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
    },

    badge: {
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },

    badgeText: {
      fontSize: 12,
      fontWeight: "700",
    },

    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 24,
      fontWeight: "700",
    },

    swipeHint: {
      fontSize: 11,
      fontWeight: "600",
    },

    swipeWrapper: {
      marginBottom: 11,
      borderRadius: 17,
      overflow: "hidden",
    },

    swipeAction: {
      width: 108,
      borderRadius: 17,
      marginRight: 8,
      alignItems: "center",
      justifyContent: "center",
    },

    swipeActionText: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginTop: 3,
    },

    swipeActionCount: {
      fontSize: 10,
      fontWeight: "700",
      marginTop: 2,
    },

    classRow: {
      minHeight: 78,
      borderRadius: 17,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
    },

    timeColumn: {
      width: 83,
    },

    startTime: {
      fontSize: 14,
      fontWeight: "700",
    },

    endTime: {
      fontSize: 12,
      marginTop: 3,
    },

    timeline: {
      width: 3,
      alignSelf: "stretch",
      borderRadius: 99,
      marginRight: 13,
    },

    className: {
      fontSize: 17,
      fontWeight: "700",
    },

    workButton: {
      minHeight: 34,
      borderRadius: 10,
      borderWidth: 1,
      marginRight: 7,
      paddingHorizontal: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },

    workButtonText: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.5,
    },

    workCountBubble: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 1,
    },

    workCountBubbleText: {
      fontSize: 9,
      fontWeight: "900",
    },

    nowBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    nowBadgeText: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.5,
    },

    emptyCard: {
      padding: 28,
      alignItems: "center",
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginTop: 10,
    },

    emptyText: {
      fontSize: 14,
      marginTop: 4,
      textAlign: "center",
    },

    upcomingWorkTitle: {
      fontSize: 24,
      fontWeight: "700",
      marginTop: 28,
      marginBottom: 12,
    },

    upcomingTaskRow: {
      minHeight: 74,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    checkButton: {
      width: 36,
      height: 36,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },

    upcomingTaskName: {
      fontSize: 15,
      fontWeight: "700",
    },

    upcomingTaskMeta: {
      fontSize: 11,
      fontWeight: "600",
      marginTop: 4,
    },

    editor: {
      flex: 1,
    },

    editorHeader: {
      height: 58,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    editorTitle: {
      fontSize: 18,
      fontWeight: "700",
    },

    headerAction: {
      minWidth: 70,
      minHeight: 44,
      justifyContent: "center",
    },

    headerActionText: {
      fontSize: 16,
      fontWeight: "600",
    },

    editorSectionTitle: {
      fontSize: 23,
      fontWeight: "700",
      marginBottom: 12,
      marginTop: 12,
    },

    editCard: {
      padding: 16,
    },

    editCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },

    editCardTitle: {
      fontSize: 18,
      fontWeight: "700",
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 10,
    },

    input: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 13,
      fontSize: 16,
    },

    dayRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 5,
    },

    dayChip: {
      flex: 1,
      aspectRatio: 1,
      maxWidth: 42,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    dayText: {
      fontSize: 13,
      fontWeight: "700",
    },

    timesRow: {
      flexDirection: "row",
      marginTop: 4,
    },

    inlineTimePicker: {
      minHeight: 50,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      justifyContent: "center",
      alignItems: "flex-start",
    },

    timeButton: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: "center",
      paddingHorizontal: 13,
    },

    timeButtonText: {
      fontSize: 15,
      fontWeight: "600",
    },

    enabledRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 18,
    },

    settingTitle: {
      fontSize: 15,
      fontWeight: "700",
    },

    settingDescription: {
      fontSize: 12,
      marginTop: 3,
      lineHeight: 17,
    },

    addClassButton: {
      minHeight: 50,
      borderRadius: 15,
      borderWidth: 1.5,
      borderStyle: "dashed",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    addClassButtonText: {
      fontSize: 15,
      fontWeight: "700",
    },

    settingsCard: {
      paddingHorizontal: 16,
    },

    settingRow: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
    },

    divider: {
      height: StyleSheet.hairlineWidth,
    },

    reminderOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },

    reminderChip: {
      minHeight: 40,
      minWidth: 58,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    timeModalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      paddingHorizontal: 24,
    },

    timeModal: {
      borderRadius: 22,
      borderWidth: 1,
      padding: 18,
    },

    timeModalTitle: {
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
    },

    doneButton: {
      height: 46,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
  

    calendarButton: {
      minHeight: 86,
      borderRadius: 19,
      borderWidth: 1,
      marginTop: 18,
      marginBottom: 8,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    calendarIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    calendarButtonTitle: {
      fontSize: 20,
      fontWeight: "900",
    },
    calendarButtonSubtitle: {
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
});