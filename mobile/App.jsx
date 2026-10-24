import React from "react";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { AppProvider } from "./src/context/AppContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { Skeleton, ErrorState } from "./src/components/States";
import { colors } from "./src/theme";

function DepthEnvironment() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 150,
          right: -86,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: "#e1d5f1",
          shadowColor: "#49355f",
          shadowOffset: { width: -14, height: 22 },
          shadowOpacity: 0.16,
          shadowRadius: 34,
          elevation: 4,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 28,
            left: 36,
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#ffffff88",
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 90,
          left: -60,
          width: 170,
          height: 170,
          borderRadius: 85,
          backgroundColor: "#e5ebd2",
          shadowColor: "#424b31",
          shadowOffset: { width: 12, height: 18 },
          shadowOpacity: 0.13,
          shadowRadius: 25,
          elevation: 3,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 20,
            left: 26,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#ffffff80",
          }}
        />
      </View>
    </View>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    DMSerifDisplay_400Regular,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
          <DepthEnvironment />
          {error ? (
            <View style={{ padding: 32 }}>
              <Text>
                The app fonts could not load. Close and reopen Med Purple.
              </Text>
            </View>
          ) : !loaded ? (
            <Skeleton />
          ) : (
            <AppProvider>
              <RootNavigator />
            </AppProvider>
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
