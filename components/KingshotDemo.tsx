import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Rect,
} from "react-native-svg";

import Text from "@/components/ui/AppText";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";

type HeroClass = "archer" | "hunter";
type TroopClass = "swordsman" | "archer";
type MenuScreen = "menu" | "shop" | "levels" | "game";
type GamePhase = "wave" | "break" | "victory" | "defeat";

type Point = { x: number; y: number };

type EnemyKind = "swordsman" | "miniboss" | "boss";

type Enemy = {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  progress: number;
  speed: number;
  x: number;
  y: number;
  baseAttackAt: number;
};

type Tower = {
  id: number;
  kind: TroopClass;
  x: number;
  y: number;
  cooldown: number;
};

type Arrow = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  damage: number;
  targetId: number;
  owner: "hero" | "tower";
};

type FriendlySwordsman = {
  id: number;
  towerId: number;
  slot: number;
  x: number;
  y: number;
  targetId: number | null;
  respawnAt: number;
};

type Scene = {
  player: Point;
  enemies: Enemy[];
  towers: Tower[];
  arrows: Arrow[];
  swordsmen: FriendlySwordsman[];
  baseHp: number;
  baseMaxHp: number;
  credits: number;
  round: number;
  phase: GamePhase;
  breakRemaining: number;
  moneyEarned: number;
};

const KINGSHOT_MONEY_KEY = "ta_plus_kingshot_money_v1";
const KINGSHOT_HEROES_KEY = "ta_plus_kingshot_heroes_v1";
const KINGSHOT_TROOPS_KEY = "ta_plus_kingshot_troops_v1";
const KINGSHOT_HERO_EQUIPPED_KEY = "ta_plus_kingshot_hero_equipped_v1";
const KINGSHOT_LEVEL_UNLOCK_KEY = "ta_plus_kingshot_level_unlock_v1";

const HERO_CLASSES = [
  {
    id: "archer" as HeroClass,
    name: "Archer",
    price: 0,
    description: "Ranged class with semi-rapid arrows.",
  },
  {
    id: "hunter" as HeroClass,
    name: "Hunter",
    price: 500,
    description: "Faster melee class with stronger close attacks.",
  },
];

const TROOP_CLASSES = [
  {
    id: "swordsman" as TroopClass,
    name: "Swordsman House",
    price: 0,
    matchCost: 8,
    description: "Sends four swordsmen to intercept enemies.",
  },
  {
    id: "archer" as TroopClass,
    name: "Archer Tower",
    price: 500,
    matchCost: 13,
    description: "Rapidly attacks the enemy closest to your base.",
  },
];

const LEVELS = [
  {
    id: 1,
    name: "Level 1",
    difficulty: "Normal",
    enemyHp: 1,
    enemySpeed: 1,
    enemyCount: 1,
    baseHp: 22,
  },
  {
    id: 2,
    name: "Level 2",
    difficulty: "Hard",
    enemyHp: 1.35,
    enemySpeed: 1.12,
    enemyCount: 1.2,
    baseHp: 20,
  },
  {
    id: 3,
    name: "Level 3",
    difficulty: "Expert",
    enemyHp: 1.7,
    enemySpeed: 1.24,
    enemyCount: 1.4,
    baseHp: 18,
  },
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const normalize = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return { x: 1, y: 0 };
  return { x: x / length, y: y / length };
};

const pointSegmentDistance = (
  point: Point,
  a: Point,
  b: Point,
) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 0.0001) return distance(point, a);

  const t = clamp(
    ((point.x - a.x) * dx + (point.y - a.y) * dy) /
      lengthSquared,
    0,
    1,
  );

  return distance(point, {
    x: a.x + t * dx,
    y: a.y + t * dy,
  });
};

const buildPathMetrics = (points: Point[]) => {
  const segments = points.slice(0, -1).map((start, index) => {
    const end = points[index + 1];
    const length = distance(start, end);
    return { start, end, length };
  });

  const total = segments.reduce((sum, segment) => sum + segment.length, 0);

  return { segments, total };
};

const pointAtProgress = (
  metrics: ReturnType<typeof buildPathMetrics>,
  progress: number,
) => {
  let remaining = clamp(progress, 0, metrics.total);

  for (const segment of metrics.segments) {
    if (remaining <= segment.length) {
      const t = segment.length <= 0 ? 0 : remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * t,
        y: segment.start.y + (segment.end.y - segment.start.y) * t,
      };
    }
    remaining -= segment.length;
  }

  return metrics.segments[metrics.segments.length - 1]?.end ?? { x: 0, y: 0 };
};

const roundComposition = (round: number, level: number) => {
  const levelScale = LEVELS[level - 1]?.enemyCount ?? 1;
  const normalBase = [7, 9, 11, 13, 15][round - 1] ?? 8;

  return {
    normal: Math.ceil(normalBase * levelScale),
    miniboss: round === 2 ? 1 : round === 3 || round === 4 ? 2 : 0,
    boss: round === 5 ? 1 : 0,
  };
};

export default function KingshotDemo() {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const [screen, setScreen] = useState<MenuScreen>("menu");
  const [money, setMoney] = useState(0);
  const [heroes, setHeroes] = useState<HeroClass[]>(["archer"]);
  const [troops, setTroops] = useState<TroopClass[]>(["swordsman"]);
  const [equippedHero, setEquippedHero] = useState<HeroClass>("archer");
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(1);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KINGSHOT_MONEY_KEY),
      AsyncStorage.getItem(KINGSHOT_HEROES_KEY),
      AsyncStorage.getItem(KINGSHOT_TROOPS_KEY),
      AsyncStorage.getItem(KINGSHOT_HERO_EQUIPPED_KEY),
      AsyncStorage.getItem(KINGSHOT_LEVEL_UNLOCK_KEY),
    ])
      .then(([rawMoney, rawHeroes, rawTroops, rawHero, rawLevel]) => {
        const parsedMoney = Number(rawMoney);
        if (Number.isFinite(parsedMoney)) setMoney(Math.max(0, Math.floor(parsedMoney)));

        try {
          const parsed = rawHeroes ? JSON.parse(rawHeroes) : [];
          if (Array.isArray(parsed)) {
            setHeroes(Array.from(new Set<HeroClass>(["archer", ...parsed])));
          }
        } catch {}

        try {
          const parsed = rawTroops ? JSON.parse(rawTroops) : [];
          if (Array.isArray(parsed)) {
            setTroops(Array.from(new Set<TroopClass>(["swordsman", ...parsed])));
          }
        } catch {}

        if (rawHero === "hunter" || rawHero === "archer") {
          setEquippedHero(rawHero);
        }

        const parsedLevel = Number(rawLevel);
        if (Number.isFinite(parsedLevel)) {
          setUnlockedLevel(clamp(Math.floor(parsedLevel), 1, 3));
        }
      })
      .catch(() => {});
  }, []);

  const spendMoney = async (amount: number) => {
    if (money < amount) {
      Alert.alert("Not enough Money", `You need $${amount.toLocaleString()}.`);
      return false;
    }

    const next = money - amount;
    setMoney(next);
    await AsyncStorage.setItem(KINGSHOT_MONEY_KEY, String(next));
    return true;
  };

  const buyHero = async (hero: (typeof HERO_CLASSES)[number]) => {
    if (heroes.includes(hero.id)) {
      setEquippedHero(hero.id);
      await AsyncStorage.setItem(KINGSHOT_HERO_EQUIPPED_KEY, hero.id);
      return;
    }

    if (!(await spendMoney(hero.price))) return;

    const next = [...heroes, hero.id];
    setHeroes(next);
    setEquippedHero(hero.id);
    await Promise.all([
      AsyncStorage.setItem(KINGSHOT_HEROES_KEY, JSON.stringify(next)),
      AsyncStorage.setItem(KINGSHOT_HERO_EQUIPPED_KEY, hero.id),
    ]);
  };

  const buyTroop = async (troop: (typeof TROOP_CLASSES)[number]) => {
    if (troops.includes(troop.id)) return;
    if (!(await spendMoney(troop.price))) return;

    const next = [...troops, troop.id];
    setTroops(next);
    await AsyncStorage.setItem(KINGSHOT_TROOPS_KEY, JSON.stringify(next));
  };

  const finishLevel = async (level: number, earnedMoney: number, won: boolean) => {
    const raw = await AsyncStorage.getItem(KINGSHOT_MONEY_KEY);
    const stored = Number(raw);
    const base = Number.isFinite(stored) ? stored : money;
    const nextMoney = Math.max(0, Math.floor(base + earnedMoney));

    setMoney(nextMoney);
    await AsyncStorage.setItem(KINGSHOT_MONEY_KEY, String(nextMoney));

    if (won && level < 3 && unlockedLevel <= level) {
      const nextLevel = level + 1;
      setUnlockedLevel(nextLevel);
      await AsyncStorage.setItem(KINGSHOT_LEVEL_UNLOCK_KEY, String(nextLevel));
    }
  };

  if (screen === "game") {
    return (
      <KingshotBattle
        level={selectedLevel}
        heroClass={equippedHero}
        troopClasses={troops}
        onExit={() => setScreen("menu")}
        onFinish={finishLevel}
      />
    );
  }

  if (screen === "shop") {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        <MenuTopBar money={money} onBack={() => setScreen("menu")} />

        <Text style={[styles.bigTitle, { color: textColor }]}>Shop</Text>

        <Text style={[styles.sectionTitle, { color: textColor }]}>Classes</Text>

        {HERO_CLASSES.map((hero) => {
          const owned = heroes.includes(hero.id);
          const equipped = equippedHero === hero.id;

          return (
            <ShopCard
              key={hero.id}
              icon={hero.id === "archer" ? "sports-score" : "directions-run"}
              title={hero.name}
              description={hero.description}
              action={equipped ? "Equipped" : owned ? "Equip" : `$${hero.price}`}
              disabled={equipped}
              onPress={() => buyHero(hero)}
            />
          );
        })}

        <Text style={[styles.sectionTitle, { color: textColor }]}>Troop Classes</Text>

        {TROOP_CLASSES.map((troop) => {
          const owned = troops.includes(troop.id);

          return (
            <ShopCard
              key={troop.id}
              icon={troop.id === "archer" ? "filter-center-focus" : "home-work"}
              title={troop.name}
              description={`${troop.description} Match placement: ${troop.matchCost} credits.`}
              action={owned ? "Owned" : `$${troop.price}`}
              disabled={owned}
              onPress={() => buyTroop(troop)}
            />
          );
        })}
      </ScrollView>
    );
  }

  if (screen === "levels") {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        <MenuTopBar money={money} onBack={() => setScreen("menu")} />

        <Text style={[styles.bigTitle, { color: textColor }]}>Levels</Text>

        {LEVELS.map((level) => {
          const unlocked = level.id <= unlockedLevel;

          return (
            <Pressable
              key={level.id}
              disabled={!unlocked}
              onPress={() => {
                setSelectedLevel(level.id);
                setScreen("game");
              }}
              style={[
                styles.levelCard,
                {
                  backgroundColor: activeTone.bg3,
                  borderColor: activeTone.border,
                  opacity: unlocked ? 1 : 0.48,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.levelTitle, { color: textColor }]}>{level.name}</Text>
                <Text style={[styles.levelSubtitle, { color: activeTone.muted }]}>
                  {level.difficulty}
                </Text>
              </View>

              <MaterialIcons
                name={unlocked ? "play-circle" : "lock"}
                size={28}
                color={unlocked ? activeTone.accent : activeTone.muted}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.menuContent}
    >
      <View style={styles.menuTopRow}>
        <View
          style={[
            styles.moneyPill,
            { backgroundColor: activeTone.bg3, borderColor: activeTone.border },
          ]}
        >
          <MaterialIcons name="paid" size={18} color={activeTone.accent} />
          <Text style={{ color: textColor, fontWeight: "900" }}>
            ${money.toLocaleString()}
          </Text>
        </View>

        <Text style={{ color: activeTone.muted, fontSize: 11, fontWeight: "800" }}>
          {HERO_CLASSES.find((hero) => hero.id === equippedHero)?.name ?? "Archer"}
        </Text>
      </View>

      <LiquidGlassView
        className="rounded-3xl overflow-hidden"
        fallbackBackgroundColor={activeTone.bg3}
        glassTintColor={activeTone.bg2}
        glassEffectStyle="clear"
      >
        <View style={styles.heroCard}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: activeTone.bg4, borderColor: activeTone.border },
            ]}
          >
            <MaterialIcons name="castle" size={56} color={activeTone.accent} />
          </View>

          <Text style={[styles.bigTitle, { color: textColor }]}>Kingshot Demo</Text>
          <Text style={[styles.heroSubtitle, { color: activeTone.muted }]}>
            Kingshot demo style mockup
          </Text>
        </View>
      </LiquidGlassView>

      <Pressable
        onPress={() => {
          setSelectedLevel(Math.min(unlockedLevel, 3));
          setScreen("game");
        }}
        style={[styles.primaryButton, { backgroundColor: activeTone.accent }]}
      >
        <MaterialIcons
          name="play-arrow"
          size={24}
          color={isDark ? "#111113" : "#ffffff"}
        />
        <Text
          style={{
            color: isDark ? "#111113" : "#ffffff",
            fontWeight: "900",
            fontSize: 15,
          }}
        >
          Play
        </Text>
      </Pressable>

      <View style={styles.menuButtons}>
        <Pressable
          onPress={() => setScreen("shop")}
          style={[
            styles.secondaryButton,
            { backgroundColor: activeTone.bg3, borderColor: activeTone.border },
          ]}
        >
          <MaterialIcons name="storefront" size={21} color={activeTone.accent} />
          <Text style={{ color: textColor, fontWeight: "900" }}>Shop</Text>
        </Pressable>

        <Pressable
          onPress={() => setScreen("levels")}
          style={[
            styles.secondaryButton,
            { backgroundColor: activeTone.bg3, borderColor: activeTone.border },
          ]}
        >
          <MaterialIcons name="map" size={21} color={activeTone.accent} />
          <Text style={{ color: textColor, fontWeight: "900" }}>Levels</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MenuTopBar({ money, onBack }: { money: number; onBack: () => void }) {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  return (
    <View style={styles.menuTopRow}>
      <Pressable
        onPress={onBack}
        style={[
          styles.backButton,
          { backgroundColor: activeTone.bg3, borderColor: activeTone.border },
        ]}
      >
        <MaterialIcons name="arrow-back" size={18} color={textColor} />
        <Text style={{ color: textColor, fontWeight: "800", fontSize: 12 }}>
          Menu
        </Text>
      </Pressable>

      <View
        style={[
          styles.moneyPill,
          { backgroundColor: activeTone.bg3, borderColor: activeTone.border },
        ]}
      >
        <MaterialIcons name="paid" size={18} color={activeTone.accent} />
        <Text style={{ color: textColor, fontWeight: "900" }}>
          ${money.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

function ShopCard({
  icon,
  title,
  description,
  action,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  action: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { activeTone, isDark } = useTheme();
  const textColor = isDark ? "#edebea" : "#2f3035";

  return (
    <LiquidGlassView
      className="rounded-2xl overflow-hidden mb-3"
      fallbackBackgroundColor={activeTone.bg3}
      glassTintColor={activeTone.bg2}
      glassEffectStyle="clear"
    >
      <View style={styles.shopRow}>
        <View style={[styles.shopIcon, { backgroundColor: activeTone.bg4 }]}>
          <MaterialIcons name={icon} size={26} color={activeTone.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.shopTitle, { color: textColor }]}>{title}</Text>
          <Text style={[styles.shopDescription, { color: activeTone.muted }]}>
            {description}
          </Text>
        </View>

        <Pressable
          disabled={disabled}
          onPress={onPress}
          style={[
            styles.shopAction,
            {
              backgroundColor: disabled ? activeTone.bg4 : activeTone.accent,
              borderColor: activeTone.border,
            },
          ]}
        >
          <Text
            style={{
              color: disabled
                ? textColor
                : isDark
                  ? "#111113"
                  : "#ffffff",
              fontWeight: "900",
              fontSize: 10,
            }}
          >
            {action}
          </Text>
        </Pressable>
      </View>
    </LiquidGlassView>
  );
}

function KingshotBattle({
  level,
  heroClass,
  troopClasses,
  onExit,
  onFinish,
}: {
  level: number;
  heroClass: HeroClass;
  troopClasses: TroopClass[];
  onExit: () => void;
  onFinish: (level: number, earnedMoney: number, won: boolean) => Promise<void>;
}) {
  const { activeTone, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const textColor = isDark ? "#edebea" : "#2f3035";

  const mapWidth = Math.max(300, width - 32);
  const mapHeight = 525;
  const levelConfig = LEVELS[level - 1] ?? LEVELS[0];

  const pathPoints = useMemo<Point[]>(() => {
    if (level === 2) {
      return [
        { x: mapWidth * 0.52, y: -12 },
        { x: mapWidth * 0.52, y: 82 },
        { x: mapWidth * 0.18, y: 150 },
        { x: mapWidth * 0.18, y: 250 },
        { x: mapWidth * 0.78, y: 315 },
        { x: mapWidth * 0.78, y: 405 },
        { x: mapWidth * 0.5, y: mapHeight - 42 },
      ];
    }

    if (level === 3) {
      return [
        { x: mapWidth * 0.48, y: -12 },
        { x: mapWidth * 0.72, y: 88 },
        { x: mapWidth * 0.27, y: 155 },
        { x: mapWidth * 0.7, y: 235 },
        { x: mapWidth * 0.2, y: 320 },
        { x: mapWidth * 0.66, y: 405 },
        { x: mapWidth * 0.5, y: mapHeight - 42 },
      ];
    }

    return [
      { x: mapWidth * 0.5, y: -12 },
      { x: mapWidth * 0.5, y: 88 },
      { x: mapWidth * 0.25, y: 160 },
      { x: mapWidth * 0.25, y: 270 },
      { x: mapWidth * 0.72, y: 335 },
      { x: mapWidth * 0.72, y: 410 },
      { x: mapWidth * 0.5, y: mapHeight - 42 },
    ];
  }, [level, mapWidth]);

  const metrics = useMemo(() => buildPathMetrics(pathPoints), [pathPoints]);

  const [selectedTower, setSelectedTower] = useState<TroopClass | null>(null);
  const [placementMessage, setPlacementMessage] = useState("");
  const [scene, setScene] = useState<Scene>(() => ({
    player: { x: mapWidth * 0.5, y: mapHeight * 0.72 },
    enemies: [],
    towers: [],
    arrows: [],
    swordsmen: [],
    baseHp: levelConfig.baseHp,
    baseMaxHp: levelConfig.baseHp,
    credits: 14,
    round: 1,
    phase: "wave",
    breakRemaining: 0,
    moneyEarned: 0,
  }));

  const playerRef = useRef<Point>({ x: mapWidth * 0.5, y: mapHeight * 0.72 });
  const joystickRef = useRef<Point>({ x: 0, y: 0 });
  const joystickKnob = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const arrowsRef = useRef<Arrow[]>([]);
  const swordsmenRef = useRef<FriendlySwordsman[]>([]);

  const creditsRef = useRef(14);
  const moneyEarnedRef = useRef(0);
  const baseHpRef = useRef(levelConfig.baseHp);
  const roundRef = useRef(1);
  const phaseRef = useRef<GamePhase>("wave");
  const breakUntilRef = useRef(0);
  const spawnQueueRef = useRef<EnemyKind[]>([]);
  const nextSpawnAtRef = useRef(0);
  const roundInitializedRef = useRef(false);
  const heroAttackAtRef = useRef(0);
  const runningRef = useRef(true);
  const finishedRef = useRef(false);

  const enemyIdRef = useRef(1);
  const towerIdRef = useRef(1);
  const arrowIdRef = useRef(1);
  const swordIdRef = useRef(1);

  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const lastPublishRef = useRef(0);

  const getEnemyStats = (kind: EnemyKind) => {
    const hpScale = levelConfig.enemyHp;
    const speedScale = levelConfig.enemySpeed;

    if (kind === "miniboss") {
      return { hp: 14 * hpScale, speed: 26 * speedScale };
    }

    if (kind === "boss") {
      return { hp: 42 * hpScale, speed: 21 * speedScale };
    }

    return { hp: 3 * hpScale, speed: 34 * speedScale };
  };

  const spawnEnemy = (kind: EnemyKind) => {
    const stats = getEnemyStats(kind);
    const start = pointAtProgress(metrics, 0);

    enemiesRef.current.push({
      id: enemyIdRef.current++,
      kind,
      hp: stats.hp,
      maxHp: stats.hp,
      progress: 0,
      speed: stats.speed,
      x: start.x,
      y: start.y,
      baseAttackAt: 0,
    });
  };

  const initializeRound = (round: number, now: number) => {
    const composition = roundComposition(round, level);
    const queue: EnemyKind[] = [];

    for (let i = 0; i < composition.normal; i += 1) {
      queue.push("swordsman");
    }

    for (let i = 0; i < composition.miniboss; i += 1) {
      const index = Math.min(queue.length, 3 + i * 4);
      queue.splice(index, 0, "miniboss");
    }

    if (composition.boss > 0) {
      queue.splice(Math.max(2, Math.floor(queue.length * 0.55)), 0, "boss");
    }

    spawnQueueRef.current = queue;
    nextSpawnAtRef.current = now + 350;
    roundInitializedRef.current = true;
  };

  const grantKill = (_now: number) => {
    creditsRef.current += 1;
    moneyEarnedRef.current += 1;
  };

  const damageEnemy = (id: number, damage: number, now: number) => {
    const enemy = enemiesRef.current.find((item) => item.id === id);
    if (!enemy) return;

    enemy.hp -= damage;

    if (enemy.hp <= 0) {
      enemiesRef.current = enemiesRef.current.filter((item) => item.id !== id);
      grantKill(now);
    }
  };

  const finishBattle = async (won: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    runningRef.current = false;
    phaseRef.current = won ? "victory" : "defeat";

    await onFinish(level, moneyEarnedRef.current, won);

    setScene((current) => ({
      ...current,
      phase: won ? "victory" : "defeat",
      moneyEarned: moneyEarnedRef.current,
    }));

    hapticsImpact(
      won ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy,
    );
  };

  const pendingTouchRef = useRef<Point | null>(null);
  const touchFrameRef = useRef<number | null>(null);

  const setJoystickFromTouch = (x: number, y: number) => {
    const center = 52;
    const radius = 38;
    const dx = x - center;
    const dy = y - center;
    const length = Math.hypot(dx, dy);
    const scale = length > radius && length > 0 ? radius / length : 1;

    let nextX = (dx * scale) / radius;
    let nextY = (dy * scale) / radius;

    if (Math.hypot(nextX, nextY) < 0.08) {
      nextX = 0;
      nextY = 0;
    }

    joystickRef.current = { x: nextX, y: nextY };
    joystickKnob.setValue({ x: nextX * radius, y: nextY * radius });
  };

  const queueJoystick = (x: number, y: number) => {
    pendingTouchRef.current = { x, y };
    if (touchFrameRef.current !== null) return;

    touchFrameRef.current = requestAnimationFrame(() => {
      touchFrameRef.current = null;
      const pending = pendingTouchRef.current;
      pendingTouchRef.current = null;
      if (pending) setJoystickFromTouch(pending.x, pending.y);
    });
  };

  const releaseJoystick = () => {
    pendingTouchRef.current = null;
    joystickRef.current = { x: 0, y: 0 };
    joystickKnob.setValue({ x: 0, y: 0 });
  };

  const joystickPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) =>
        queueJoystick(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onPanResponderMove: (event) =>
        queueJoystick(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onPanResponderRelease: releaseJoystick,
      onPanResponderTerminate: releaseJoystick,
    }),
  ).current;

  const publish = (time: number) => {
    if (time - lastPublishRef.current < 16) return;
    lastPublishRef.current = time;

    setScene({
      player: { ...playerRef.current },
      enemies: enemiesRef.current.map((enemy) => ({ ...enemy })),
      towers: towersRef.current.map((tower) => ({ ...tower })),
      arrows: arrowsRef.current.map((arrow) => ({ ...arrow })),
      swordsmen: swordsmenRef.current.map((unit) => ({ ...unit })),
      baseHp: baseHpRef.current,
      baseMaxHp: levelConfig.baseHp,
      credits: creditsRef.current,
      round: roundRef.current,
      phase: phaseRef.current,
      breakRemaining:
        phaseRef.current === "break"
          ? Math.max(0, (breakUntilRef.current - Date.now()) / 1000)
          : 0,
      moneyEarned: moneyEarnedRef.current,
    });
  };

  useEffect(() => {
    runningRef.current = true;
    initializeRound(1, Date.now());

    const tick = (time: number) => {
      if (!runningRef.current) return;

      const previous = lastFrameRef.current ?? time;
      const dt = Math.min(0.03, (time - previous) / 1000);
      lastFrameRef.current = time;
      const now = Date.now();

      const joy = joystickRef.current;
      const joyMagnitude = Math.min(1, Math.hypot(joy.x, joy.y));

      if (joyMagnitude > 0.08) {
        const heroSpeed = heroClass === "hunter" ? 178 : 150;
        playerRef.current = {
          x: clamp(playerRef.current.x + joy.x * heroSpeed * dt, 18, mapWidth - 18),
          y: clamp(playerRef.current.y + joy.y * heroSpeed * dt, 20, mapHeight - 58),
        };
      }

      if (phaseRef.current === "break") {
        if (now >= breakUntilRef.current) {
          phaseRef.current = "wave";
          roundRef.current += 1;
          roundInitializedRef.current = false;
          initializeRound(roundRef.current, now);
        }
      } else if (phaseRef.current === "wave") {
        if (!roundInitializedRef.current) {
          initializeRound(roundRef.current, now);
        }

        if (spawnQueueRef.current.length > 0 && now >= nextSpawnAtRef.current) {
          const kind = spawnQueueRef.current.shift();
          if (kind) spawnEnemy(kind);
          nextSpawnAtRef.current = now + Math.max(430, 720 - level * 60);
        }
      }

      enemiesRef.current.forEach((enemy) => {
        if (enemy.progress < metrics.total) {
          enemy.progress = Math.min(metrics.total, enemy.progress + enemy.speed * dt);
          const point = pointAtProgress(metrics, enemy.progress);
          enemy.x = point.x;
          enemy.y = point.y;
        } else if (now >= enemy.baseAttackAt) {
          const damage = enemy.kind === "boss" ? 6 : enemy.kind === "miniboss" ? 3 : 1;
          baseHpRef.current -= damage;
          enemy.baseAttackAt = now + (enemy.kind === "swordsman" ? 950 : 1250);

          if (baseHpRef.current <= 0) {
            finishBattle(false);
          }
        }
      });

      if (!runningRef.current) return;

      // Hero combat. Archer is ranged; Hunter is intentionally the stronger class.
      if (now >= heroAttackAtRef.current && enemiesRef.current.length > 0) {
        const targets = enemiesRef.current
          .map((enemy) => ({ enemy, d: distance(playerRef.current, enemy) }))
          .sort((a, b) => a.d - b.d);

        const nearest = targets[0];

        if (heroClass === "archer" && nearest && nearest.d <= 165) {
          const direction = normalize(
            nearest.enemy.x - playerRef.current.x,
            nearest.enemy.y - playerRef.current.y,
          );

          arrowsRef.current.push({
            id: arrowIdRef.current++,
            x: playerRef.current.x,
            y: playerRef.current.y,
            vx: direction.x * 285,
            vy: direction.y * 285,
            age: 0,
            damage: 1,
            targetId: nearest.enemy.id,
            owner: "hero",
          });

          heroAttackAtRef.current = now + 480;
        } else if (heroClass === "hunter" && nearest && nearest.d <= 54) {
          damageEnemy(nearest.enemy.id, 2.6, now);
          heroAttackAtRef.current = now + 360;
        }
      }

      // Archer troop towers: faster than swordsman houses, prioritize enemies closest to base.
      towersRef.current.forEach((tower) => {
        if (tower.kind !== "archer" || now < tower.cooldown) return;

        const target = enemiesRef.current
          .filter((enemy) => distance(tower, enemy) <= 230)
          .sort((a, b) => b.progress - a.progress)[0];

        if (!target) return;

        const direction = normalize(target.x - tower.x, target.y - tower.y);
        arrowsRef.current.push({
          id: arrowIdRef.current++,
          x: tower.x,
          y: tower.y,
          vx: direction.x * 320,
          vy: direction.y * 320,
          age: 0,
          damage: 1.15,
          targetId: target.id,
          owner: "tower",
        });

        tower.cooldown = now + 285;
      });

      // Swordsman houses maintain exactly four reusable runners each.
      towersRef.current
        .filter((tower) => tower.kind === "swordsman")
        .forEach((tower) => {
          for (let slot = 0; slot < 4; slot += 1) {
            let unit = swordsmenRef.current.find(
              (item) => item.towerId === tower.id && item.slot === slot,
            );

            if (!unit) {
              unit = {
                id: swordIdRef.current++,
                towerId: tower.id,
                slot,
                x: tower.x,
                y: tower.y,
                targetId: null,
                respawnAt: now + slot * 250,
              };
              swordsmenRef.current.push(unit);
            }

            if (unit.targetId === null && now >= unit.respawnAt) {
              const reservedTargets = new Set(
                swordsmenRef.current
                  .filter((item) => item.targetId !== null)
                  .map((item) => item.targetId as number),
              );

              const candidates = enemiesRef.current
                .filter(
                  (enemy) =>
                    distance(tower, enemy) <= 285 &&
                    !reservedTargets.has(enemy.id),
                )
                .sort((a, b) => {
                  if (a.kind === "swordsman" && b.kind !== "swordsman") return -1;
                  if (b.kind === "swordsman" && a.kind !== "swordsman") return 1;
                  return b.progress - a.progress;
                });

              const target = candidates[0];

              if (target) {
                unit.targetId = target.id;
                unit.x = tower.x;
                unit.y = tower.y;
              }
            }
          }
        });

      swordsmenRef.current.forEach((unit) => {
        if (unit.targetId === null) return;

        const target = enemiesRef.current.find((enemy) => enemy.id === unit.targetId);
        const tower = towersRef.current.find((item) => item.id === unit.towerId);

        if (!target || !tower) {
          unit.targetId = null;
          unit.respawnAt = now + 1600;
          if (tower) {
            unit.x = tower.x;
            unit.y = tower.y;
          }
          return;
        }

        const direction = normalize(target.x - unit.x, target.y - unit.y);
        unit.x += direction.x * 180 * dt;
        unit.y += direction.y * 180 * dt;

        if (distance(unit, target) <= 12) {
          if (target.kind === "swordsman") {
            damageEnemy(target.id, 999, now);
          } else {
            damageEnemy(target.id, 3.2, now);
          }

          unit.targetId = null;
          unit.respawnAt = now + 2500;
          unit.x = tower.x;
          unit.y = tower.y;
        }
      });

      const destroyedArrows = new Set<number>();

      arrowsRef.current.forEach((arrow) => {
        const target = enemiesRef.current.find((enemy) => enemy.id === arrow.targetId);
        if (!target) {
          destroyedArrows.add(arrow.id);
          return;
        }

        const direction = normalize(target.x - arrow.x, target.y - arrow.y);
        const speed = arrow.owner === "tower" ? 330 : 290;
        arrow.vx = direction.x * speed;
        arrow.vy = direction.y * speed;
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;
        arrow.age += dt;

        if (distance(arrow, target) <= 10) {
          damageEnemy(target.id, arrow.damage, now);
          destroyedArrows.add(arrow.id);
        } else if (arrow.age > 2.4) {
          destroyedArrows.add(arrow.id);
        }
      });

      arrowsRef.current = arrowsRef.current
        .filter((arrow) => !destroyedArrows.has(arrow.id))
        .slice(-36);

      // Progress rounds only after the full spawn queue and all living enemies are gone.
      if (
        phaseRef.current === "wave" &&
        roundInitializedRef.current &&
        spawnQueueRef.current.length === 0 &&
        enemiesRef.current.length === 0
      ) {
        if (roundRef.current >= 5) {
          finishBattle(true);
        } else {
          phaseRef.current = "break";
          breakUntilRef.current = now + 5000;
        }
      }

      publish(time);

      if (runningRef.current) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      runningRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (touchFrameRef.current !== null) cancelAnimationFrame(touchFrameRef.current);
    };
  }, [heroClass, level, mapHeight, mapWidth, metrics, levelConfig.baseHp]);

  const placeTower = (x: number, y: number) => {
    if (!selectedTower || !runningRef.current) return;

    const definition = TROOP_CLASSES.find((item) => item.id === selectedTower);
    if (!definition || !troopClasses.includes(selectedTower)) return;

    if (creditsRef.current < definition.matchCost) {
      setPlacementMessage("Not enough credits");
      return;
    }

    const point = { x, y };
    const tooCloseToPath = metrics.segments.some(
      (segment) => pointSegmentDistance(point, segment.start, segment.end) < 34,
    );

    const tooCloseToBase = distance(point, pathPoints[pathPoints.length - 1]) < 62;
    const tooCloseToTower = towersRef.current.some((tower) => distance(point, tower) < 45);

    if (tooCloseToPath || tooCloseToBase || tooCloseToTower) {
      setPlacementMessage("Choose open ground away from the road");
      return;
    }

    creditsRef.current -= definition.matchCost;
    towersRef.current.push({
      id: towerIdRef.current++,
      kind: selectedTower,
      x,
      y,
      cooldown: 0,
    });

    setPlacementMessage("");
    hapticsImpact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const quitBattle = async () => {
    if (!finishedRef.current) {
      finishedRef.current = true;
      runningRef.current = false;
      await onFinish(level, moneyEarnedRef.current, false);
    }

    onExit();
  };

  const basePoint = pathPoints[pathPoints.length - 1];
  const roadPath = pathPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <View style={styles.battleRoot}>
      <View style={styles.battleTopRow}>
        <Pressable
          onPress={quitBattle}
          style={[
            styles.battleClose,
            { backgroundColor: activeTone.bg3, borderColor: activeTone.border },
          ]}
        >
          <MaterialIcons name="close" size={20} color={textColor} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 13, fontWeight: "900" }}>
            Level {level} • Round {scene.round}/5
          </Text>
          <Text style={{ color: activeTone.muted, fontSize: 9, marginTop: 1 }}>
            Credits {scene.credits} • Money +${scene.moneyEarned}
          </Text>
        </View>

        <View style={styles.baseHealthText}>
          <MaterialIcons name="castle" size={17} color={activeTone.accent} />
          <Text style={{ color: textColor, fontSize: 11, fontWeight: "900" }}>
            {Math.max(0, Math.ceil(scene.baseHp))}/{scene.baseMaxHp}
          </Text>
        </View>
      </View>

      {scene.phase === "break" ? (
        <View style={[styles.roundBanner, { backgroundColor: activeTone.bg3 }]}>
          <Text style={{ color: activeTone.accent, fontWeight: "900" }}>
            Next round in {Math.ceil(scene.breakRemaining)}s
          </Text>
        </View>
      ) : null}

      {placementMessage ? (
        <View style={[styles.placementBanner, { backgroundColor: activeTone.bg3 }]}>
          <Text style={{ color: activeTone.muted, fontSize: 10, fontWeight: "800" }}>
            {placementMessage}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={(event) => {
          if (!selectedTower) return;
          placeTower(event.nativeEvent.locationX, event.nativeEvent.locationY);
        }}
        style={[
          styles.map,
          {
            width: mapWidth,
            height: mapHeight,
            backgroundColor: isDark ? "#0c1a13" : "#dbe9cf",
            borderColor: activeTone.border,
          },
        ]}
      >
        <Svg width={mapWidth} height={mapHeight} style={StyleSheet.absoluteFillObject}>
          <Path
            d={roadPath}
            stroke={isDark ? "#665a46" : "#a98e68"}
            strokeWidth={46}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={roadPath}
            stroke={isDark ? "#817056" : "#c1a27a"}
            strokeWidth={32}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          <Rect
            x={basePoint.x - 30}
            y={basePoint.y - 22}
            width={60}
            height={44}
            rx={8}
            fill={activeTone.bg4}
            stroke={activeTone.accent}
            strokeWidth={2}
          />

          {scene.towers.map((tower) =>
            tower.kind === "archer" ? (
              <Rect
                key={tower.id}
                x={tower.x - 15}
                y={tower.y - 15}
                width={30}
                height={30}
                rx={7}
                fill={activeTone.bg4}
                stroke={activeTone.accent}
                strokeWidth={2}
              />
            ) : (
              <Polygon
                key={tower.id}
                points={`${tower.x - 18},${tower.y + 13} ${tower.x - 18},${tower.y - 7} ${tower.x},${tower.y - 20} ${tower.x + 18},${tower.y - 7} ${tower.x + 18},${tower.y + 13}`}
                fill={activeTone.bg4}
                stroke={activeTone.accent}
                strokeWidth={2}
              />
            ),
          )}

          {scene.swordsmen
            .filter((unit) => unit.targetId !== null)
            .map((unit) => (
              <Rect
                key={unit.id}
                x={unit.x - 4}
                y={unit.y - 4}
                width={8}
                height={8}
                rx={2}
                fill={activeTone.accent}
              />
            ))}

          {scene.arrows.map((arrow) => {
            const angle = Math.atan2(arrow.vy, arrow.vx);
            const dx = Math.cos(angle) * 8;
            const dy = Math.sin(angle) * 8;

            return (
              <Line
                key={arrow.id}
                x1={arrow.x - dx}
                y1={arrow.y - dy}
                x2={arrow.x + dx}
                y2={arrow.y + dy}
                stroke={arrow.owner === "tower" ? activeTone.fg : activeTone.accent}
                strokeWidth={2}
              />
            );
          })}

          {scene.enemies.map((enemy) => {
            const radius = enemy.kind === "boss" ? 17 : enemy.kind === "miniboss" ? 12 : 7;
            const fill = enemy.kind === "boss" ? activeTone.fg : activeTone.muted;

            return (
              <G key={enemy.id}>
                <Circle
                  cx={enemy.x}
                  cy={enemy.y}
                  r={radius}
                  fill={fill}
                  stroke={enemy.kind === "swordsman" ? "none" : activeTone.accent}
                  strokeWidth={enemy.kind === "swordsman" ? 0 : 2}
                />

                {enemy.kind !== "swordsman" ? (
                  <>
                    <Rect
                      x={enemy.x - 20}
                      y={enemy.y - radius - 9}
                      width={40}
                      height={4}
                      rx={2}
                      fill={activeTone.bg1}
                    />
                    <Rect
                      x={enemy.x - 20}
                      y={enemy.y - radius - 9}
                      width={40 * clamp(enemy.hp / enemy.maxHp, 0, 1)}
                      height={4}
                      rx={2}
                      fill={activeTone.accent}
                    />
                  </>
                ) : null}
              </G>
            );
          })}

          {heroClass === "archer" ? (
            <Circle
              cx={scene.player.x}
              cy={scene.player.y}
              r={11}
              fill={activeTone.accent}
              stroke={activeTone.fg}
              strokeWidth={2}
            />
          ) : (
            <Polygon
              points={`${scene.player.x},${scene.player.y - 13} ${scene.player.x + 11},${scene.player.y + 10} ${scene.player.x - 11},${scene.player.y + 10}`}
              fill={activeTone.accent}
              stroke={activeTone.fg}
              strokeWidth={2}
            />
          )}
        </Svg>

        <View
          {...joystickPan.panHandlers}
          style={[
            styles.joystick,
            { backgroundColor: activeTone.bg3, borderColor: activeTone.border },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.joystickKnob,
              {
                backgroundColor: activeTone.accent,
                transform: [
                  { translateX: joystickKnob.x },
                  { translateY: joystickKnob.y },
                ],
              },
            ]}
          />
        </View>

        {scene.phase === "victory" || scene.phase === "defeat" ? (
          <View style={styles.resultOverlay}>
            <MaterialIcons
              name={scene.phase === "victory" ? "emoji-events" : "shield"}
              size={46}
              color={activeTone.accent}
            />
            <Text style={styles.resultTitle}>
              {scene.phase === "victory" ? `Level ${level} Complete` : "Tower Defeated"}
            </Text>
            <Text style={styles.resultSubtitle}>Money earned: ${scene.moneyEarned}</Text>
            <Pressable
              onPress={onExit}
              style={[styles.resultButton, { backgroundColor: activeTone.accent }]}
            >
              <Text
                style={{
                  color: isDark ? "#111113" : "#ffffff",
                  fontWeight: "900",
                }}
              >
                Continue
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.bottomBar}>
        {TROOP_CLASSES.filter((item) => troopClasses.includes(item.id)).map((item) => {
          const selected = selectedTower === item.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedTower(selected ? null : item.id);
                setPlacementMessage(selected ? "" : "Tap open ground to place");
              }}
              style={[
                styles.troopButton,
                {
                  backgroundColor: selected ? activeTone.accent : activeTone.bg3,
                  borderColor: selected ? activeTone.accent : activeTone.border,
                },
              ]}
            >
              <MaterialIcons
                name={item.id === "archer" ? "filter-center-focus" : "home-work"}
                size={19}
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
                  fontSize: 10,
                  fontWeight: "900",
                }}
              >
                {item.id === "archer" ? "ARCHER" : "SWORD"} {item.matchCost}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 70,
  },
  menuTopRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  moneyPill: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
  },
  backButton: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
  },
  heroCard: {
    padding: 22,
    alignItems: "center",
  },
  heroIcon: {
    width: 116,
    height: 100,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bigTitle: {
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  menuButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 9,
  },
  shopRow: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  shopIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  shopTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  shopDescription: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  shopAction: {
    minWidth: 66,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  levelCard: {
    minHeight: 78,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  levelSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
  battleRoot: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 22,
  },
  battleTopRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 7,
  },
  battleClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  baseHealthText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roundBanner: {
    alignSelf: "center",
    minHeight: 30,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  placementBanner: {
    alignSelf: "center",
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  map: {
    alignSelf: "center",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  joystick: {
    position: "absolute",
    left: 14,
    bottom: 14,
    width: 104,
    height: 104,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  joystickKnob: {
    width: 40,
    height: 40,
    borderRadius: 999,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  troopButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    backgroundColor: "rgba(2,5,9,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  resultTitle: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 10,
  },
  resultSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 6,
  },
  resultButton: {
    minWidth: 130,
    minHeight: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
});
