import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "../theme";

export default function AmbientDepth({ scrollY, reduced }) {
  const travel = reduced
    ? 0
    : scrollY.interpolate({
        inputRange: [0, 420, 1200],
        outputRange: [0, -30, -86],
        extrapolate: "clamp",
      });
  const turn = reduced
    ? "0deg"
    : scrollY.interpolate({
        inputRange: [0, 500, 1400],
        outputRange: ["-10deg", "12deg", "48deg"],
        extrapolate: "clamp",
      });
  const tilt = reduced
    ? "0deg"
    : scrollY.interpolate({
        inputRange: [0, 700, 1500],
        outputRange: ["-4deg", "7deg", "17deg"],
        extrapolate: "clamp",
      });

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.scene,
        {
          transform: [
            { translateY: travel },
            { perspective: 900 },
            { rotateY: turn },
            { rotateX: tilt },
          ],
        },
      ]}
    >
      <View style={styles.outerOrbit} />
      <View style={styles.innerOrbit} />
      <View style={styles.sphere}>
        <View style={styles.highlight} />
        <View style={styles.shadowArc} />
      </View>
      <View style={styles.satellite} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: "absolute",
    top: 92,
    right: -88,
    width: 244,
    height: 244,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.22,
    zIndex: 0,
  },
  outerOrbit: {
    position: "absolute",
    width: 226,
    height: 226,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: colors.purple[400],
    transform: [{ perspective: 700 }, { rotateX: "66deg" }, { rotateZ: "-24deg" }],
  },
  innerOrbit: {
    position: "absolute",
    width: 192,
    height: 192,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: colors.purple[200],
    transform: [{ perspective: 700 }, { rotateY: "62deg" }, { rotateZ: "32deg" }],
  },
  sphere: {
    width: 142,
    height: 142,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: colors.purple[400],
    backgroundColor: colors.purple[200],
    shadowColor: colors.purple[900],
    shadowOffset: { width: 12, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 8,
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    top: 15,
    left: 25,
    width: 48,
    height: 30,
    borderRadius: 30,
    backgroundColor: colors.surface,
    opacity: 0.56,
    transform: [{ rotate: "-34deg" }],
  },
  shadowArc: {
    position: "absolute",
    width: 156,
    height: 88,
    left: 20,
    bottom: -21,
    borderRadius: 80,
    backgroundColor: colors.purple[700],
    opacity: 0.22,
    transform: [{ rotate: "-24deg" }],
  },
  satellite: {
    position: "absolute",
    top: 32,
    right: 24,
    width: 18,
    height: 18,
    borderRadius: 10,
    backgroundColor: colors.purple[100],
    borderWidth: 1,
    borderColor: colors.purple[400],
  },
});
