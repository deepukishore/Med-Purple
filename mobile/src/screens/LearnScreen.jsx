import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors } from "../theme";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { quickTools } from "../components/QuickAccess";
const descriptions = {
  MCQs: "Practice, understand, and revisit mistakes.",
  Anatomy: "Explore the heart from every angle.",
  Notes: "Connect the dots from your books and postings.",
  Flashcards: "Say it out loud. Flip to check. Review when due.",
  Lectures: "Short captioned video lessons by subject.",
  Planner: "Plan, reschedule, and complete study sessions.",
  Progress: "Real XP, badges, and subject progress.",
  Tutor: "Find explanations in your foundation library.",
  ExamPrep: "Focus weak areas and revisit mistakes ahead of your exam.",
  Clinical:
    "Practice ECGs, clinical reasoning, virtual patients and viva recall.",
  StudyTools: "Build timed mixed sessions, custom sets and a weekly plan.",
  Toolbox: "Search references, calculate common scores and review diagrams.",
  Captures: "Save quick notes and useful links to sort later.",
  Preferences:
    "Choose study subjects, language, difficulty and display settings.",
};
export default function LearnScreen({ navigation }) {
  return (
    <Screen>
      <View style={h.hero}>
        <View style={h.sparkle}>
          <Ionicons name="sparkles" size={19} color={colors.purple[900]} />
        </View>
        <Text style={h.kicker}>YOUR STUDY TOOLKIT</Text>
        <Text style={h.title}>Make your next study move.</Text>
        <Text style={h.copy}>
          Pick a tool, find your flow, and get straight into learning.
        </Text>
        <View style={h.heroFooter}>
          <Text style={h.heroFootText}>LEARN YOUR WAY</Text>
          <View style={h.dotRow}>
            <View style={h.dot} />
            <View style={h.dot} />
            <View style={h.dot} />
          </View>
        </View>
      </View>
      <View style={h.sectionHead}>
        <View>
          <Text style={s.heading}>Pick your next move</Text>
          <Text style={h.sectionCopy}>A little progress still counts.</Text>
        </View>
        <View style={h.count}>
          <Text style={h.countText}>{quickTools.length}</Text>
        </View>
      </View>
      <Button
        title="Ask or solve a doubt"
        icon={
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color="white"
          />
        }
        onPress={() => navigation.navigate("Doubts")}
      />
      {quickTools.map(([label, route, icon], index) => (
        <Pressable
          key={route}
          accessibilityRole="button"
          onPress={() => navigation.navigate(route)}
          android_ripple={{ color: `${colors.purple[200]}55` }}
          style={[
            s.card,
            h.toolCard,
            {
              borderTopColor:
                colors.purple[200 + (index % 2) * 200] || colors.purple[200],
            },
          ]}
        >
          <View
            style={[
              h.iconTile,
              {
                backgroundColor: ["#efe3ff", "#e4f5ef", "#fff0dc", "#ffebf3"][
                  index % 4
                ],
              },
            ]}
          >
            <Ionicons name={icon} size={25} color={colors.purple[600]} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.heading}>{label}</Text>
            <Text style={s.small}>
              {descriptions[route] || "Choose your next learning adventure."}
            </Text>
          </View>
          <View style={h.arrow}>
            <Ionicons
              name="arrow-up-right"
              size={17}
              color={colors.purple[700]}
            />
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
const h = StyleSheet.create({
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: 23,
    paddingTop: 25,
    borderRadius: 27,
    backgroundColor: colors.purple[800],
    gap: 9,
    borderWidth: 1,
    borderColor: colors.purple[600],
    shadowColor: colors.purple[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  sparkle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#e0ff91",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  kicker: {
    color: "#d9c4f2",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: "white",
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    letterSpacing: -0.8,
    maxWidth: 300,
  },
  copy: { color: "#e6d9f1", fontSize: 13, lineHeight: 20, maxWidth: 300 },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ffffff24",
    marginTop: 9,
    paddingTop: 13,
  },
  heroFootText: {
    color: "#d9c4f2",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  dotRow: { flexDirection: "row", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e0ff91" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sectionCopy: { color: colors.muted, fontSize: 12, marginTop: 3 },
  count: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.purple[100],
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: colors.purple[700], fontSize: 13, fontWeight: "800" },
  toolCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 15,
    borderTopWidth: 3,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.purple[50],
    alignItems: "center",
    justifyContent: "center",
  },
});
