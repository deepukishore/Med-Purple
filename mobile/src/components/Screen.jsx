import React from "react";
import {
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
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }]}>{children}</View>
      )}
      <CaptureShortcut />
      <HelpBot />
    </KeyboardAvoidingView>
  );
}
