import React, { useRef } from "react";
import { Animated, PanResponder } from "react-native";
import { motion } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";
export default function DepthCard({ children, style }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const reset = () => {
    for (const value of [x, y]) {
      Animated.spring(value, {
        toValue: 0,
        ...motion.gentleSpring,
        useNativeDriver: true,
      }).start();
    }
    Animated.spring(scale, {
      toValue: 1,
      ...motion.gentleSpring,
      useNativeDriver: true,
    }).start();
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        Animated.spring(scale, {
          toValue: 1.015,
          ...motion.spring,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        x.setValue(Math.max(-4, Math.min(4, gesture.dy / 15)));
        y.setValue(Math.max(-4, Math.min(4, gesture.dx / 15)));
      },
      onPanResponderRelease: reset,
      onPanResponderTerminate: reset,
    }),
  ).current;
  const transform = reduced
    ? []
    : [
        { perspective: 1000 },
        {
          rotateX: x.interpolate({
            inputRange: [-4, 4],
            outputRange: ["-4deg", "4deg"],
          }),
        },
        {
          rotateY: y.interpolate({
            inputRange: [-4, 4],
            outputRange: ["-4deg", "4deg"],
          }),
        },
        { scale },
      ];
  return (
    <Animated.View
      {...(!reduced ? pan.panHandlers : {})}
      style={[
        style,
        {
          transform,
          shadowColor: "#2B2155",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 7,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
