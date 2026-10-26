import React from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { styles as s, colors, fonts } from "../theme";
export default function Chips({ items, value, onChange, label }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {items.map((item) => {
          const key = typeof item === "string" ? item : item.value,
            title = typeof item === "string" ? item : item.label;
          return (
            <Pressable
              key={key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: key === value }}
              style={{
                minHeight: 44,
                paddingHorizontal: 15,
                paddingVertical: 11,
                borderRadius: 11,
                borderWidth: 1,
                borderColor: key === value ? colors.purple[600] : colors.line,
                backgroundColor:
                  key === value ? colors.purple[600] : colors.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 13,
                  color: key === value ? "white" : colors.muted,
                }}
              >
                {title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
