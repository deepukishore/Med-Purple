import React, { useRef } from "react";
import {
  Pressable,
  Text,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, motion } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";
export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  icon,
  accessibilityLabel,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const spring = (toValue) => {
    if (!reduced)
      Animated.spring(scale, {
        toValue,
        ...motion.spring,
        useNativeDriver: true,
      }).start();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: disabled || loading }}
        disabled={disabled || loading}
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        style={[
          s.button,
          variant === "secondary" && s.secondary,
          variant === "white" && s.white,
          variant === "accent" && { backgroundColor: colors.accent },
          variant === "danger" && s.danger,
          (disabled || loading) && { opacity: 0.55 },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "primary" ? "white" : colors.purple[700]}
          />
        ) : (
          icon
        )}
        <Text
          style={[
            s.text,
            variant === "secondary" && s.dark,
            variant === "white" && { color: colors.purple[700] },
            variant === "accent" && { color: colors.accentInk },
          ]}
        >
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.purple[600],
    paddingHorizontal: 17,
    paddingVertical: 13,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  text: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "white",
    textAlign: "center",
  },
  secondary: { backgroundColor: colors.surface, borderColor: colors.line },
  white: { backgroundColor: "white" },
  dark: { color: colors.ink },
  danger: { backgroundColor: colors.danger },
});
