import React from "react";
import { View, Text, TextInput } from "react-native";
import { styles as s, colors } from "../theme";
export default function FormField({ label, value, onChangeText, ...props }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={String(value ?? "")}
        onChangeText={onChangeText}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}
