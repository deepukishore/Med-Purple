import React from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors, fonts, motion } from "../theme";
import HelpBot from "./HelpBot";
import AmbientDepth from "./AmbientDepth";
import useReducedMotion from "../hooks/useReducedMotion";
function CaptureShortcut() {
  const navigation = useNavigation();
  const route = useRoute();
  if (["Captures", "Login", "CreateAccount"].includes(route.name)) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quick capture"
      onPress={() => navigation.navigate("Captures")}
      style={{
        position: "absolute",
        right: 18,
        bottom: 82,
        minHeight: 48,
        paddingHorizontal: 15,
        borderRadius: 24,
        backgroundColor: colors.accent,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        elevation: 5,
        shadowColor: colors.purple[900],
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      }}
    >
      <Ionicons name="add" size={20} color={colors.accentInk} />
      <Text
        style={{
          color: colors.accentInk,
          fontFamily: fonts.bold,
          fontSize: 12,
        }}
      >
        Capture
      </Text>
    </Pressable>
  );
}
export default function Screen({
  children,
  refreshing = false,
  onRefresh,
  scroll = true,
  onScroll,
  stagger = true,
  decorations = true,
  ambient = true,
}) {
  const reduced = useReducedMotion();
  const entrance = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const scrollHandler = React.useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true, listener: onScroll },
      ),
    [onScroll, scrollY],
  );
  React.useEffect(() => {
    if (reduced) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduced]);
  const pageMotion = reduced
    ? undefined
    : {
        opacity: entrance,
        transform: [
          { perspective: 1200 },
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
          { rotateX: entrance.interpolate({ inputRange: [0, 1], outputRange: ["1deg", "0deg"] }) },
          { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1] }) },
        ],
      };
  const screenChildren = stagger
    ? React.Children.map(children, (child, index) => {
        if (child == null) return child;
        const childStyle = child?.props?.style;
        const cardStyle =
          childStyle && typeof childStyle !== "function"
            ? StyleSheet.flatten(childStyle)
            : undefined;
        const depth =
          cardStyle?.borderRadius === s.card.borderRadius &&
          cardStyle?.shadowRadius === s.card.shadowRadius &&
          cardStyle?.padding === s.card.padding;
        return (
          <StaggeredItem
            key={child.key || index}
            index={index}
            reduced={reduced}
            depth={depth}
          >
            {child}
          </StaggeredItem>
        );
      })
    : children;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.screen}
    >
      {ambient && <AmbientDepth scrollY={scrollY} reduced={reduced} />}
      {scroll ? (
        <Animated.ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.purple[600]}
              />
            ) : undefined
          }
        >
          <Animated.View style={[{ gap: 20 }, pageMotion]}>
            {screenChildren}
          </Animated.View>
        </Animated.ScrollView>
      ) : (
        <Animated.View style={[s.content, { flex: 1 }, pageMotion]}>
          {screenChildren}
        </Animated.View>
      )}
      {decorations && <CaptureShortcut />}
      {decorations && <HelpBot />}
    </KeyboardAvoidingView>
  );
}

export function StaggeredItem({
  children,
  index,
  reduced,
  style,
  depth = false,
}) {
  const entrance = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const tiltX = React.useRef(new Animated.Value(0)).current;
  const tiltY = React.useRef(new Animated.Value(0)).current;
  const bounds = React.useRef({ width: 1, height: 1 });
  React.useEffect(() => {
    if (reduced) {
      entrance.setValue(1);
      return undefined;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      delay: Math.min(index, 9) * 38,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, index, reduced]);
  const touchTilt = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    Animated.spring(tiltX, {
      toValue: Math.max(
        -0.5,
        Math.min(0.5, locationX / bounds.current.width - 0.5),
      ),
      ...motion.gentleSpring,
      useNativeDriver: true,
    }).start();
    Animated.spring(tiltY, {
      toValue: Math.max(
        -0.5,
        Math.min(0.5, locationY / bounds.current.height - 0.5),
      ),
      ...motion.gentleSpring,
      useNativeDriver: true,
    }).start();
  };
  const resetTilt = () => {
    Animated.spring(tiltX, {
      toValue: 0,
      ...motion.gentleSpring,
      useNativeDriver: true,
    }).start();
    Animated.spring(tiltY, {
      toValue: 0,
      ...motion.gentleSpring,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Animated.View
      onLayout={
        depth
          ? (event) => {
              bounds.current = event.nativeEvent.layout;
            }
          : undefined
      }
      onTouchStart={depth && !reduced ? touchTilt : undefined}
      onTouchEnd={depth && !reduced ? resetTilt : undefined}
      onTouchCancel={depth && !reduced ? resetTilt : undefined}
      style={[
        style,
        reduced
          ? undefined
          : {
              opacity: entrance,
              transform: [
                ...(depth
                  ? [
                      { perspective: 1000 },
                      {
                        rotateX: tiltY.interpolate({
                          inputRange: [-0.5, 0.5],
                          outputRange: ["2.4deg", "-2.4deg"],
                        }),
                      },
                      {
                        rotateY: tiltX.interpolate({
                          inputRange: [-0.5, 0.5],
                          outputRange: ["-2.4deg", "2.4deg"],
                        }),
                      },
                    ]
                  : []),
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
      ]}
    >
      {children}
    </Animated.View>
  );
}
