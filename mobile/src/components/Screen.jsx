import React from "react";
import {
  Animated,
  Easing,
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors, fonts } from "../theme";
import HelpBot from "./HelpBot";
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
}) {
  const reduced = useReducedMotion();
  const entrance = React.useRef(new Animated.Value(reduced ? 1 : 0)).current;
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
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.screen}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
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
          <Animated.View style={[{ gap: 20 }, pageMotion]}>{children}</Animated.View>
        </ScrollView>
      ) : (
        <Animated.View style={[s.content, { flex: 1 }, pageMotion]}>{children}</Animated.View>
      )}
      <CaptureShortcut />
      <HelpBot />
    </KeyboardAvoidingView>
  );
}
