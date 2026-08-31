import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFunSettings } from "@/utils/funSettings";

const STAR_POINTS = [
  [7, 10, 2], [15, 24, 1], [25, 7, 2], [34, 19, 1], [43, 8, 1],
  [52, 28, 2], [61, 12, 1], [69, 23, 2], [78, 6, 1], [89, 17, 2],
  [95, 30, 1], [11, 43, 1], [22, 37, 2], [38, 46, 1], [49, 39, 2],
  [58, 51, 1], [72, 42, 1], [83, 52, 2], [91, 40, 1], [4, 59, 1],
  [18, 66, 2], [31, 57, 1], [46, 68, 1], [64, 61, 2], [76, 73, 1],
  [88, 64, 2], [97, 77, 1], [13, 84, 1], [39, 88, 2], [71, 86, 1],
] as const;

const MidnightStars = () => {
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [twinkle]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {STAR_POINTS.map(([left, top, size], index) => (
        <Animated.View
          key={`${left}-${top}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top: `${top}%`,
            width: size + 1,
            height: size + 1,
            borderRadius: 4,
            backgroundColor: "#ffffff",
            opacity: twinkle.interpolate({
              inputRange: [0, 1],
              outputRange: index % 2 === 0 ? [0.18, 0.8] : [0.62, 0.22],
            }),
          }}
        />
      ))}
    </View>
  );
};

const MaxwellPet = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const petWidth = 112;
  const petHeight = 92;
  const bottomY = Math.max(0, height - insets.bottom - 74 - petHeight);
  const defaultX = Math.max(6, width - petWidth - 10);

  const position = useRef(
    new Animated.ValueXY({ x: defaultX, y: bottomY }),
  ).current;
  const current = useRef({ x: defaultX, y: bottomY });
  const dragStart = useRef({ x: defaultX, y: bottomY });
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = position.addListener((value) => {
      current.current = value;
    });
    return () => position.removeListener(id);
  }, [position]);

  useEffect(() => {
    position.setValue({
      x: Math.min(Math.max(6, current.current.x), Math.max(6, width - petWidth - 6)),
      y: bottomY,
    });
  }, [bottomY, petWidth, position, width]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, {
          toValue: 1,
          duration: 130,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(tilt, {
          toValue: -1,
          duration: 260,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(tilt, {
          toValue: 0,
          duration: 130,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [tilt]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = { ...current.current };
          position.stopAnimation();
        },
        onPanResponderMove: (_event, gesture) => {
          const x = Math.min(
            Math.max(0, dragStart.current.x + gesture.dx),
            Math.max(0, width - petWidth),
          );
          const y = Math.min(
            Math.max(insets.top, dragStart.current.y + gesture.dy),
            bottomY,
          );
          position.setValue({ x, y });
        },
        onPanResponderRelease: () => {
          const x = Math.min(
            Math.max(0, current.current.x),
            Math.max(0, width - petWidth),
          );
          Animated.spring(position, {
            toValue: { x, y: bottomY },
            velocity: 7,
            tension: 58,
            friction: 7,
            useNativeDriver: false,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(position, {
            toValue: { x: current.current.x, y: bottomY },
            useNativeDriver: false,
          }).start();
        },
      }),
    [bottomY, insets.top, petWidth, position, width],
  );

  const rotate = tilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-5deg", "0deg", "5deg"],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.pet,
        {
          width: petWidth,
          height: petHeight,
          transform: [
            { translateX: position.x },
            { translateY: position.y },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.petTiltLayer,
          {
            transform: [{ rotate }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/maxwell.png")}
          resizeMode="contain"
          style={styles.petImage}
        />
      </Animated.View>
    </Animated.View>
  );
};

export default function FunOverlays() {
  const { midnightActive, petEnabled } = useFunSettings();

  if (!midnightActive && !petEnabled) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, styles.root]}>
      {midnightActive ? <MidnightStars /> : null}
      {petEnabled ? <MaxwellPet /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 900,
  },
  pet: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 950,
  },
  petTiltLayer: {
    width: "100%",
    height: "100%",
  },
  petImage: {
    width: "100%",
    height: "100%",
  },
});
