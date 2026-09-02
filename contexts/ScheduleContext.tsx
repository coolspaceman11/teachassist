import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { awardShipTaskCompletionBonus } from "@/utils/shipEconomy";
import { Platform } from "react-native";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type ScheduleClass = {
  id: string;
  name: string;
  room: string;
  start: string;
  end: string;
  days: number[];
  enabled: boolean;
};

export type ScheduleSettings = {
  phoneNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  reminderMinutes: number;
};

export type ScheduleTaskKind = "homework" | "assignment";

export type ScheduleTask = {
  id: string;
  classId: string;
  title: string;
  kind: ScheduleTaskKind;
  dueDate: string;
  createdAt: string;
};

export type UpcomingClass = {
  classBlock: ScheduleClass;
  startDate: Date;
  dayLabel: string;
  minutesUntil: number;
};

export type ScheduleStatus = {
  currentClass: ScheduleClass | null;
  currentClassMinutesRemaining: number | null;
  nextClass: UpcomingClass | null;
};

type SaveScheduleResult = {
  notificationsGranted: boolean;
};

type AddTaskInput = {
  classId: string;
  title: string;
  kind: ScheduleTaskKind;
  dueDate: string;
};

type ScheduleContextValue = {
  classes: ScheduleClass[];
  settings: ScheduleSettings;
  tasks: ScheduleTask[];
  loaded: boolean;

  saveSchedule: (
    nextClasses: ScheduleClass[],
    nextSettings: ScheduleSettings,
  ) => Promise<SaveScheduleResult>;

  getClassesForDate: (date: Date) => ScheduleClass[];
  getStatus: (date?: Date) => ScheduleStatus;
  rescheduleNotifications: () => Promise<void>;

  getTasksForClass: (classId: string) => ScheduleTask[];
  addTask: (task: AddTaskInput) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
};

const CLASSES_STORAGE_KEY = "ta_plus_schedule_classes";
const SETTINGS_STORAGE_KEY = "ta_plus_schedule_settings";
const TASKS_STORAGE_KEY = "ta_plus_schedule_tasks";
const NOTIFICATION_SOURCE = "ta_schedule_class";

const DEFAULT_SETTINGS: ScheduleSettings = {
  phoneNotificationsEnabled: false,
  inAppNotificationsEnabled: true,
  reminderMinutes: 5,
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const formatScheduleTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatCountdown = (minutes: number) => {
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining === 0
    ? `${hours} hr`
    : `${hours} hr ${remaining} min`;
};

export const dateToLocalKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const localKeyToDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0,
  );
};

export const formatTaskDueDate = (dateKey: string) => {
  const date = localKeyToDate(dateKey);
  const today = dateToLocalKey(new Date());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateToLocalKey(tomorrowDate);

  if (dateKey === today) return "Today";
  if (dateKey === tomorrow) return "Tomorrow";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

const buildDateAtTime = (
  baseDate: Date,
  dayOffset: number,
  time: string,
) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(baseDate);

  date.setDate(baseDate.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);

  return date;
};

const normalizeClass = (
  classBlock: ScheduleClass,
): ScheduleClass => ({
  ...classBlock,
  name:
    typeof classBlock.name === "string"
      ? classBlock.name
      : "",
  room:
    typeof classBlock.room === "string"
      ? classBlock.room
      : "",
  start:
    typeof classBlock.start === "string"
      ? classBlock.start
      : "08:30",
  end:
    typeof classBlock.end === "string"
      ? classBlock.end
      : "09:45",
  enabled: classBlock.enabled !== false,
  days: Array.isArray(classBlock.days)
    ? classBlock.days.filter(
        (day) =>
          Number.isInteger(day) &&
          day >= 0 &&
          day <= 6,
      )
    : [],
});

const normalizeTask = (
  task: ScheduleTask,
): ScheduleTask => ({
  id:
    typeof task.id === "string"
      ? task.id
      : `${Date.now()}`,
  classId:
    typeof task.classId === "string"
      ? task.classId
      : "",
  title:
    typeof task.title === "string"
      ? task.title
      : "",
  kind:
    task.kind === "assignment"
      ? "assignment"
      : "homework",
  dueDate:
    typeof task.dueDate === "string"
      ? task.dueDate
      : dateToLocalKey(new Date()),
  createdAt:
    typeof task.createdAt === "string"
      ? task.createdAt
      : new Date().toISOString(),
});

const sortTasks = (input: ScheduleTask[]) =>
  [...input].sort((a, b) => {
    const due = a.dueDate.localeCompare(b.dueDate);

    if (due !== 0) {
      return due;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });

const clearScheduleNotifications = async () => {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    const ours = scheduled.filter(
      (notification) =>
        notification.content?.data?.source ===
        NOTIFICATION_SOURCE,
    );

    await Promise.all(
      ours.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        ),
      ),
    );
  } catch (error) {
    console.warn(
      "[Schedule] Failed to clear notifications.",
      error,
    );
  }
};

const ensureNotificationPermission = async () => {
  const existing =
    await Notifications.getPermissionsAsync();

  if (existing.status === "granted") {
    return true;
  }

  const requested =
    await Notifications.requestPermissionsAsync();

  return requested.status === "granted";
};

const configureAndroidChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    "ta-schedule",
    {
      name: "Class Schedule",
      importance:
        Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    },
  );
};

const scheduleClassNotifications = async (
  scheduleClasses: ScheduleClass[],
  scheduleSettings: ScheduleSettings,
) => {
  await clearScheduleNotifications();

  if (!scheduleSettings.phoneNotificationsEnabled) {
    return;
  }

  const permission =
    await Notifications.getPermissionsAsync();

  if (permission.status !== "granted") {
    return;
  }

  await configureAndroidChannel();

  const now = new Date();

  const upcoming: {
    classBlock: ScheduleClass;
    fireDate: Date;
  }[] = [];

  for (let offset = 0; offset < 14; offset += 1) {
    const futureDate = new Date(now);

    futureDate.setDate(
      now.getDate() + offset,
    );

    const day = futureDate.getDay();

    const classesForDay = scheduleClasses
      .filter(
        (classBlock) =>
          classBlock.enabled &&
          classBlock.days.includes(day),
      )
      .sort(
        (a, b) =>
          timeToMinutes(a.start) -
          timeToMinutes(b.start),
      );

    for (const classBlock of classesForDay) {
      const classStart = buildDateAtTime(
        now,
        offset,
        classBlock.start,
      );

      const fireDate = new Date(
        classStart.getTime() -
          scheduleSettings.reminderMinutes *
            60 *
            1000,
      );

      if (fireDate.getTime() <= now.getTime()) {
        continue;
      }

      upcoming.push({
        classBlock,
        fireDate,
      });
    }
  }

  upcoming.sort(
    (a, b) =>
      a.fireDate.getTime() -
      b.fireDate.getTime(),
  );

  for (const item of upcoming.slice(0, 50)) {
    const { classBlock, fireDate } = item;

    const warning =
      scheduleSettings.reminderMinutes === 0
        ? "is starting now"
        : `starts in ${scheduleSettings.reminderMinutes} ${
            scheduleSettings.reminderMinutes === 1
              ? "minute"
              : "minutes"
          }`;

    const roomText = classBlock.room.trim()
      ? ` • ${classBlock.room.trim()}`
      : "";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: classBlock.name,
        body: `${classBlock.name} ${warning}${roomText}`,
        data: {
          source: NOTIFICATION_SOURCE,
          route: "/schedule",
          classId: classBlock.id,
        },
      },
      trigger: {
        type:
          Notifications
            .SchedulableTriggerInputTypes
            .DATE,
        date: fireDate,
        ...(Platform.OS === "android"
          ? { channelId: "ta-schedule" }
          : {}),
      },
    });
  }
};

export function ScheduleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [classes, setClasses] =
    useState<ScheduleClass[]>([]);

  const [settings, setSettings] =
    useState<ScheduleSettings>(
      DEFAULT_SETTINGS,
    );

  // IMPORTANT: tasks always starts as an array.
  const [tasks, setTasks] =
    useState<ScheduleTask[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [
          storedClasses,
          storedSettings,
          storedTasks,
        ] = await Promise.all([
          AsyncStorage.getItem(
            CLASSES_STORAGE_KEY,
          ),
          AsyncStorage.getItem(
            SETTINGS_STORAGE_KEY,
          ),
          AsyncStorage.getItem(
            TASKS_STORAGE_KEY,
          ),
        ]);

        let loadedClasses: ScheduleClass[] = [];
        let loadedSettings: ScheduleSettings = {
          ...DEFAULT_SETTINGS,
        };
        let loadedTasks: ScheduleTask[] = [];

        if (storedClasses) {
          const parsed = JSON.parse(
            storedClasses,
          );

          if (Array.isArray(parsed)) {
            loadedClasses =
              parsed.map(normalizeClass);
          }
        }

        if (storedSettings) {
          const parsed = JSON.parse(
            storedSettings,
          );

          loadedSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
          };
        }

        if (storedTasks) {
          const parsed = JSON.parse(
            storedTasks,
          );

          if (Array.isArray(parsed)) {
            loadedTasks = sortTasks(
              parsed.map(normalizeTask),
            );
          }
        }

        if (!mounted) {
          return;
        }

        setClasses(loadedClasses);
        setSettings(loadedSettings);
        setTasks(loadedTasks);
        setLoaded(true);

        if (
          loadedSettings.phoneNotificationsEnabled
        ) {
          scheduleClassNotifications(
            loadedClasses,
            loadedSettings,
          ).catch((error) => {
            console.warn(
              "[Schedule] Notification refresh failed.",
              error,
            );
          });
        }
      } catch (error) {
        console.warn(
          "[Schedule] Failed to load schedule.",
          error,
        );

        if (mounted) {
          setClasses([]);
          setTasks([]);
          setLoaded(true);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const getClassesForDate = (date: Date) => {
    const day = date.getDay();

    return classes
      .filter(
        (classBlock) =>
          classBlock.enabled &&
          classBlock.days.includes(day),
      )
      .sort(
        (a, b) =>
          timeToMinutes(a.start) -
          timeToMinutes(b.start),
      );
  };

  const getTasksForClass = (classId: string) =>
    sortTasks(
      (Array.isArray(tasks) ? tasks : []).filter(
        (task) =>
          task.classId === classId,
      ),
    );

  const getStatus = (
    date = new Date(),
  ): ScheduleStatus => {
    const nowMinutes =
      date.getHours() * 60 +
      date.getMinutes();

    const todayClasses =
      getClassesForDate(date);

    const currentClass =
      todayClasses.find((classBlock) => {
        const start =
          timeToMinutes(classBlock.start);

        const end =
          timeToMinutes(classBlock.end);

        return (
          nowMinutes >= start &&
          nowMinutes < end
        );
      }) ?? null;

    const currentClassMinutesRemaining =
      currentClass
        ? timeToMinutes(currentClass.end) -
          nowMinutes
        : null;

    const laterToday =
      todayClasses.find(
        (classBlock) =>
          timeToMinutes(classBlock.start) >
          nowMinutes,
      );

    let nextClass: UpcomingClass | null = null;

    if (laterToday) {
      const startDate =
        buildDateAtTime(
          date,
          0,
          laterToday.start,
        );

      nextClass = {
        classBlock: laterToday,
        startDate,
        dayLabel: "Today",
        minutesUntil: Math.max(
          0,
          Math.round(
            (startDate.getTime() -
              date.getTime()) /
              60000,
          ),
        ),
      };
    } else {
      for (
        let offset = 1;
        offset <= 7;
        offset += 1
      ) {
        const futureDate =
          new Date(date);

        futureDate.setDate(
          date.getDate() + offset,
        );

        const futureClasses =
          getClassesForDate(
            futureDate,
          );

        if (futureClasses.length === 0) {
          continue;
        }

        const classBlock =
          futureClasses[0];

        const startDate =
          buildDateAtTime(
            date,
            offset,
            classBlock.start,
          );

        nextClass = {
          classBlock,
          startDate,
          dayLabel:
            offset === 1
              ? "Tomorrow"
              : futureDate.toLocaleDateString(
                  [],
                  {
                    weekday: "long",
                  },
                ),
          minutesUntil: Math.max(
            0,
            Math.round(
              (startDate.getTime() -
                date.getTime()) /
                60000,
            ),
          ),
        };

        break;
      }
    }

    return {
      currentClass,
      currentClassMinutesRemaining,
      nextClass,
    };
  };

  const saveSchedule = async (
    nextClasses: ScheduleClass[],
    requestedSettings: ScheduleSettings,
  ): Promise<SaveScheduleResult> => {
    const normalized =
      nextClasses.map(normalizeClass);

    let finalSettings = {
      ...requestedSettings,
    };

    let notificationsGranted = true;

    if (
      finalSettings.phoneNotificationsEnabled
    ) {
      notificationsGranted =
        await ensureNotificationPermission();

      if (!notificationsGranted) {
        finalSettings = {
          ...finalSettings,
          phoneNotificationsEnabled: false,
        };
      }
    }

    const validClassIds = new Set(
      normalized.map(
        (classBlock) =>
          classBlock.id,
      ),
    );

    const safeTasks =
      Array.isArray(tasks)
        ? tasks
        : [];

    const filteredTasks =
      safeTasks.filter(
        (task) =>
          validClassIds.has(
            task.classId,
          ),
      );

    await Promise.all([
      AsyncStorage.setItem(
        CLASSES_STORAGE_KEY,
        JSON.stringify(normalized),
      ),
      AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(finalSettings),
      ),
      AsyncStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify(filteredTasks),
      ),
    ]);

    setClasses(normalized);
    setSettings(finalSettings);
    setTasks(filteredTasks);

    await scheduleClassNotifications(
      normalized,
      finalSettings,
    );

    return {
      notificationsGranted,
    };
  };

  const addTask = async (
    input: AddTaskInput,
  ) => {
    const newTask: ScheduleTask = {
      id:
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      classId: input.classId,
      title: input.title.trim(),
      kind: input.kind,
      dueDate: input.dueDate,
      createdAt:
        new Date().toISOString(),
    };

    const currentTasks =
      Array.isArray(tasks)
        ? tasks
        : [];

    const nextTasks =
      sortTasks([
        ...currentTasks,
        newTask,
      ]);

    setTasks(nextTasks);

    await AsyncStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(nextTasks),
    );
  };

  const removeTask = async (
    taskId: string,
  ) => {
    const currentTasks =
      Array.isArray(tasks)
        ? tasks
        : [];

    const nextTasks =
      currentTasks.filter(
        (task) =>
          task.id !== taskId,
      );

    setTasks(nextTasks);

    await AsyncStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(nextTasks),
    );
  };

  const completeTask = async (
    taskId: string,
  ) => {
    // Hidden GD Ship economy bonus. This intentionally has no Schedule UI,
    // toast, or task-completion message. The bonus is only surfaced later
    // inside the unlocked Ship menu.
    try {
      await awardShipTaskCompletionBonus();
    } catch (error) {
      console.warn(
        "[Schedule] Could not apply hidden ship task bonus.",
        error,
      );
    }

    await removeTask(taskId);
  };

  const deleteTask = async (
    taskId: string,
  ) => {
    await removeTask(taskId);
  };

  const rescheduleNotifications =
    async () => {
      await scheduleClassNotifications(
        classes,
        settings,
      );
    };

  const value: ScheduleContextValue = {
    classes,
    settings,
    tasks: Array.isArray(tasks) ? tasks : [],
    loaded,
    saveSchedule,
    getClassesForDate,
    getStatus,
    rescheduleNotifications,
    getTasksForClass,
    addTask,
    completeTask,
    deleteTask,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextValue {
  const context =
    useContext(ScheduleContext);

  if (!context) {
    throw new Error(
      "useSchedule must be used inside ScheduleProvider.",
    );
  }

  return context;
}

export default ScheduleProvider;
