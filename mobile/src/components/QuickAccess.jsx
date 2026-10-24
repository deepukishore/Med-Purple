import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";
export const quickTools = [
  ["MCQs", "MCQs", "checkbox-outline"],
  ["MedBytes", "MedBytes", "play-circle-outline"],
  ["Notes", "Notes", "document-text-outline"],
  ["Flashcards", "Flashcards", "albums-outline"],
  ["3D Anatomy", "Anatomy", "cube-outline"],
  ["Progress", "Progress", "stats-chart-outline"],
  ["Lectures", "Lectures", "videocam-outline"],
  ["Planner", "Planner", "calendar-outline"],
  ["Exam prep", "ExamPrep", "trophy-outline"],
  ["Clinical lab", "Clinical", "medkit-outline"],
  ["Study tools", "StudyTools", "timer-outline"],
  ["Reference toolbox", "Toolbox", "calculator-outline"],
  ["Capture inbox", "Captures", "bookmark-outline"],
  ["Personalize desk", "Preferences", "options-outline"],
];
const homeQuickTools = quickTools.slice(0, 8);
export default function QuickAccess({ navigation }) {
  return (
    <View style={s.grid}>
      {homeQuickTools.map(([label, route, icon]) => (
        <Pressable
          key={route}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => navigation.navigate(route)}
          style={s.tool}
        >
          <View
            style={[
              s.icon,
              (route === "MCQs" ||
                route === "MedBytes" ||
                route === "Anatomy" ||
                route === "ExamPrep" ||
                route === "Clinical") &&
                s.featured,
            ]}
          >
            <Ionicons
              name={icon}
              size={26}
              color={
                route === "MCQs" ||
                route === "MedBytes" ||
                route === "Anatomy" ||
                route === "ExamPrep" ||
                route === "Clinical"
                  ? colors.purple[600]
                  : colors.muted
              }
            />
          </View>
          <Text style={s.text}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 20 },
  tool: { width: "25%", alignItems: "center", gap: 9, paddingHorizontal: 2 },
  icon: {
    height: 53,
    width: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
  },
  featured: {
    backgroundColor: colors.purple[50],
    borderColor: colors.purple[100],
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.ink,
    textAlign: "center",
  },
});
