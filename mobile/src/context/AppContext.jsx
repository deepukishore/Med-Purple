import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { createApi } from "@med-purple/api-client";
import { colors, fonts } from "../theme";
const baseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000/api/v1"
    : "http://localhost:8000/api/v1");
export const mediaUrl =
  process.env.EXPO_PUBLIC_MEDIA_URL || baseUrl.replace(/\/api\/v1\/?$/, "");
export const api = createApi({
  baseUrl,
  native: true,
  storage: {
    get: () => SecureStore.getItemAsync("mp_refresh"),
    set: (v) => SecureStore.setItemAsync("mp_refresh", v),
    remove: () => SecureStore.deleteItemAsync("mp_refresh"),
  },
});
const Context = createContext(null);
export function AppProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(null),
    [revision, setRevision] = useState(0);
  const initialize = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUser(await api.bootstrap());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    initialize();
  }, [initialize]);
  const notify = useCallback((message) => {
    setNotice({ message, time: Date.now() });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3300);
    return () => clearTimeout(t);
  }, [notice]);
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        loading,
        error,
        initialize,
        notify,
        revision,
        changed: () => setRevision((x) => x + 1),
      }}
    >
      {children}
      {notice && (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={s.toast}
        >
          <Text style={s.toastText}>{notice.message}</Text>
        </View>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
const s = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 100,
    backgroundColor: colors.ink,
    padding: 17,
    borderRadius: 14,
    elevation: 7,
  },
  toastText: {
    fontFamily: fonts.medium,
    color: "white",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
