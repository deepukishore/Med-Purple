import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AVATARS } from "../../../shared/avatar-presets.js";
import { colors, styles as s } from "../theme";
import AvatarPortrait from "./AvatarPortrait";

export default function AvatarPicker({ value, onChange, saved, onSave, saving, compact = false }) {
  const [gender, setGender] = useState(() => value?.startsWith("male-") ? "male" : "female");
  useEffect(() => setGender(value?.startsWith("male-") ? "male" : "female"), [value]);
  const options = AVATARS.filter((avatar) => avatar.gender === gender);
  return (
    <View style={[!compact && s.card, { gap: compact ? 10 : 14 }]}>
      <View>
        <Text style={s.pillText}>MAKE IT YOURS</Text>
        <Text style={s.heading}>Choose your avatar</Text>
        <Text style={s.small}>20 original portraits. Tap one to see it greet you.</Text>
      </View>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {[["female", "Female"], ["male", "Male"]].map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: gender === key }}
            onPress={() => setGender(key)}
            style={[s.pill, { minHeight: 44, justifyContent: "center", backgroundColor: gender === key ? colors.purple[700] : colors.purple[50] }]}
          >
            <Text style={[s.pillText, gender === key && { color: "#FFFDFF" }]}>{label} · 10</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: compact ? 6 : 10 }}>
        {options.map((avatar) => {
          const selected = value === avatar.id;
          return (
            <Pressable
              key={avatar.id}
              accessibilityRole="radio"
              accessibilityLabel={`Choose ${avatar.gender} avatar ${avatar.id.slice(-2)}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(avatar.id)}
              style={{ width: "19%", minHeight: compact ? 66 : 78, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 14, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.purple[600] : "transparent", backgroundColor: selected ? colors.purple[50] : "transparent" }}
            >
              <AvatarPortrait avatarId={avatar.id} name="friend" size={compact ? 48 : 56} />
              <Text style={s.small}>{avatar.id.slice(-2)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.small}>Your portrait appears on your profile.</Text>
      <Pressable
        accessibilityRole="button"
        disabled={saving || saved === value}
        onPress={onSave}
        style={{ minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.purple[700], opacity: saving || saved === value ? 0.72 : 1 }}
      >
        <Text style={{ color: "#FFFDFF", fontFamily: "Manrope_700Bold", fontSize: 14 }}>{saving ? "Saving…" : saved === value ? "Avatar saved" : "Save avatar"}</Text>
      </Pressable>
    </View>
  );
}
