import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useIsFocused } from "@react-navigation/native";
import useReducedMotion from "../hooks/useReducedMotion";

const RATE = 72;
const HEIGHT = 66;
const BASELINE = HEIGHT * 0.52;

function tracePath(width, step) {
  let path = `M 0 ${BASELINE}`;
  for (let x = -step; x < width + step * 2; x += step) {
    path += ` L ${x + step * 0.14} ${BASELINE}`;
    path += ` L ${x + step * 0.19} ${BASELINE - 3}`;
    path += ` L ${x + step * 0.24} ${BASELINE}`;
    path += ` L ${x + step * 0.32} ${BASELINE}`;
    path += ` L ${x + step * 0.36} ${BASELINE + 6}`;
    path += ` L ${x + step * 0.41} ${BASELINE - 23}`;
    path += ` L ${x + step * 0.47} ${BASELINE + 12}`;
    path += ` L ${x + step * 0.52} ${BASELINE}`;
    path += ` L ${x + step * 0.72} ${BASELINE}`;
    path += ` L ${x + step * 0.78} ${BASELINE - 5}`;
    path += ` L ${x + step * 0.84} ${BASELINE}`;
    path += ` L ${x + step} ${BASELINE}`;
  }
  return path;
}

export default function PatientMonitor() {
  const [width, setWidth] = useState(0);
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const step = width ? Math.max(52, Math.min(108, width / 3.4)) : 0;
  const path = useMemo(
    () => (width && step ? tracePath(width + step * 2, step) : ""),
    [width, step],
  );

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);
    if (!focused || reducedMotion || !step) return undefined;
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -step,
        duration: (60000 / RATE),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [focused, reducedMotion, step, translateX]);

  useEffect(() => {
    if (!focused || reducedMotion || !hapticsEnabled) return undefined;
    let secondBeat;
    const pulse = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      secondBeat = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
      }, 120);
    };
    const timer = setInterval(pulse, 60000 / RATE);
    return () => {
      clearInterval(timer);
      clearTimeout(secondBeat);
    };
  }, [focused, hapticsEnabled, reducedMotion]);

  return (
    <View style={styles.monitor} accessibilityLabel="Study rhythm monitor, sinus rhythm at 72 beats per minute">
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>STUDY SESSION MONITOR</Text>
          <Text style={styles.rhythm}>Rhythm steady</Text>
        </View>
        <View style={styles.rate}>
          <Text style={styles.rateValue}>{RATE}</Text>
          <Text style={styles.rateUnit}>BPM</Text>
        </View>
      </View>
      <View
        style={styles.traceWindow}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessibilityLabel="Animated electrocardiogram trace at 72 beats per minute"
      >
        {width > 0 && (
          <Animated.View style={{ transform: [{ translateX }] }}>
            <Svg width={width + step * 2} height={HEIGHT}>
              <Path
                d={path}
                fill="none"
                stroke="#b9ed9e"
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
        )}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>TEACHING TRACE</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Haptic heartbeat"
          accessibilityState={{ checked: hapticsEnabled, disabled: reducedMotion }}
          disabled={reducedMotion}
          onPress={() => setHapticsEnabled((enabled) => !enabled)}
          style={[styles.hapticToggle, reducedMotion && styles.hapticDisabled]}
        >
          <Text style={styles.hapticText}>
            {reducedMotion ? "Haptics off in Reduce Motion" : hapticsEnabled ? "Haptics on" : "Feel heartbeat"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monitor: {
    width: "100%",
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#4d3d59",
    backgroundColor: "#21192d",
    overflow: "hidden",
    gap: 8,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: { color: "#c5b2d1", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  rhythm: { color: "#b9ed9e", fontSize: 13, fontWeight: "700", marginTop: 4 },
  rate: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  rateValue: { color: "#f8f1ff", fontSize: 25, fontWeight: "800" },
  rateUnit: { color: "#b9ed9e", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  traceWindow: {
    height: HEIGHT,
    overflow: "hidden",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#b9ed9e28",
  },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLabel: { color: "#93869d", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  hapticToggle: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#7a6390",
  },
  hapticDisabled: { opacity: 0.55 },
  hapticText: { color: "#e8d9f2", fontSize: 10, fontWeight: "700" },
});
