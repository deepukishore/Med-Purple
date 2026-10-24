import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors } from "../theme";
import Button from "./Button";
import useReducedMotion from "../hooks/useReducedMotion";
export function Skeleton() {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reduced]);
  return (
    <View
      accessibilityLabel="Loading your study space"
      style={[s.content, { flex: 1 }]}
    >
      {[45, 210, 100, 170].map((height, i) => (
        <Animated.View
          key={i}
          style={{
            height,
            width: i === 0 ? "70%" : "100%",
            backgroundColor: colors.line,
            borderRadius: 16,
            opacity,
          }}
        />
      ))}
    </View>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <View
      style={[
        s.content,
        { alignItems: "center", justifyContent: "center", flex: 1 },
      ]}
    >
      <Ionicons
        name="cloud-offline-outline"
        size={44}
        color={colors.purple[500]}
      />
      <Text style={s.heading}>Let’s try that again</Text>
      <Text style={[s.small, { textAlign: "center" }]}>{message}</Text>
      <Button title="Retry" onPress={onRetry} />
    </View>
  );
}
export function EmptyState({ title, description, children }) {
  return (
    <View style={[s.card, { alignItems: "center", paddingVertical: 42 }]}>
      <Ionicons name="book-outline" size={38} color={colors.purple[500]} />
      <Text style={[s.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[s.small, { textAlign: "center" }]}>{description}</Text>
      {children}
    </View>
  );
}
