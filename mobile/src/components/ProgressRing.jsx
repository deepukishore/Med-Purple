import React, { useRef, useEffect, useState } from "react";
import { View, Text, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { fonts, colors } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";
const ACircle = Animated.createAnimatedComponent(Circle);
export function CountUp({ value, style }) {
  const n = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const listener = n.addListener(({ value }) =>
      setDisplay(Math.round(value)),
    );
    Animated.timing(n, {
      toValue: value,
      duration: reduce ? 0 : 800,
      useNativeDriver: false,
    }).start();
    return () => n.removeListener(listener);
  }, [value, reduce]);
  return <Text style={style}>{display}</Text>;
}
export default function ProgressRing({ value, size = 112 }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    Animated.timing(progress, {
      toValue: value,
      duration: reduced ? 0 : 1100,
      useNativeDriver: false,
    }).start();
  }, [value, reduced]);
  return (
    <View
      accessibilityLabel={`${value} percent of question bank explored`}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx="60"
          cy="60"
          r="51"
          stroke="#FFFFFF40"
          strokeWidth="7"
          fill="none"
        />
        <ACircle
          cx="60"
          cy="60"
          r="51"
          stroke="white"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="320.44"
          strokeDashoffset={progress.interpolate({
            inputRange: [0, 100],
            outputRange: [320.44, 0],
          })}
        />
      </Svg>
      <CountUp
        value={value}
        style={{ fontFamily: fonts.bold, fontSize: 30, color: "white" }}
      />
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 10,
          color: colors.purple[100],
        }}
      >
        bank explored
      </Text>
    </View>
  );
}
