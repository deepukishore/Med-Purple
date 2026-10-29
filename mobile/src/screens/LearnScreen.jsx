import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import useData from "../hooks/useData";
import { styles as s, colors, fonts } from "../theme";
import { quickTools } from "../components/QuickAccess";

const descriptions = {
  MCQs: "Practice a short set and read the explanation after each answer.",
  MedBytes: "Watch a captioned concept and try its quick check.",
  Notes: "Keep your own topics, outlines, and mistake reviews together.",
  Flashcards: "Build recall cards and review them when you are ready.",
  Anatomy: "Explore named body structures or study schematic organs.",
  Progress: "Review recorded practice, streaks, and achievements.",
  Lectures: "Choose a captioned foundation animation by subject.",
  Planner: "Set up a study block and return to your plan.",
  ExamPrep: "Focus practice on areas you want to revisit.",
  Clinical: "Explore ECGs, clinical reasoning, and virtual patients.",
  StudyTools: "Combine questions, notes, cards, and videos into a study set.",
  Toolbox: "Search formulas, calculators, diagrams, and definitions.",
  Captures: "Sort links, photos, and ideas saved on the go.",
  Preferences: "Choose study subjects, language, and display settings.",
  Tutor: "Find source-linked explanations from the learning library.",
};
const groups = ["Everything", "Test myself", "Understand it", "Get organised"];
const groupFor = (route) => {
  if (["MCQs", "ExamPrep", "Clinical", "Flashcards"].includes(route)) return "Test myself";
  if (["Anatomy", "MedBytes", "Lectures", "Resources", "Toolbox", "Tutor"].includes(route)) return "Understand it";
  return "Get organised";
};

export default function LearnScreen({ navigation }) {
  const [filter, setFilter] = useState("Everything");
  const [search, setSearch] = useState("");
  const progress = useData("/progress");
  const flashcards = useData("/flashcards");
  const totalAnswered = progress.data?.total_answered || 0;
  const practicedSubjects = useMemo(
    () =>
      (progress.data?.subjects || [])
        .filter((subject) => subject.answered > 0 && Number.isFinite(subject.accuracy))
        .sort((a, b) => a.accuracy - b.accuracy),
    [progress.data?.subjects],
  );
  const focusSubject = practicedSubjects[0];
  const result = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return quickTools.filter(([label, route]) => {
      const matchesGroup = filter === "Everything" || groupFor(route) === filter;
      const matchesText =
        !needle ||
        `${label} ${route} ${descriptions[route] || ""}`
          .toLocaleLowerCase()
          .includes(needle);
      return matchesGroup && matchesText;
    });
  }, [filter, search]);
  const questionAction = () =>
    navigation.navigate("MCQs", focusSubject ? { subject: focusSubject.subject } : { set: 5 });

  return (
    <Screen>
      <View style={h.hero}>
        <View style={h.heroGlow} />
        <View style={h.heroTop}>
          <View style={h.heroMark}>
            <Ionicons name="sparkles" size={19} color={colors.purple[900]} />
          </View>
          <Text style={h.kicker}>YOUR REVISION SPACE</Text>
        </View>
        <Text style={h.title}>Find your next study move.</Text>
        <Text style={h.copy}>
          Choose a format that fits the time and focus you have today.
        </Text>
        <View style={h.heroActions}>
          <Pressable
            accessibilityRole="button"
            onPress={questionAction}
            style={h.primaryButton}
          >
            <Ionicons name="flash" size={17} color="#33431f" />
            <Text style={h.primaryText}>
              {focusSubject ? `Review ${focusSubject.subject}` : "Start a 5-question set"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#33431f" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Anatomy")}
            style={h.secondaryButton}
          >
            <Ionicons name="cube-outline" size={17} color="#fff" />
            <Text style={h.secondaryText}>Explore anatomy</Text>
          </Pressable>
        </View>
        {focusSubject ? (
          <Text style={h.recommendation}>
            Suggested from your recorded accuracy: {focusSubject.subject} · {focusSubject.accuracy}%
          </Text>
        ) : (
          <Text style={h.recommendation}>Your subject suggestions appear after you answer questions.</Text>
        )}
      </View>

      <View style={h.metrics}>
        <View style={[h.metric, h.metricFirst]}>
          <Ionicons name="checkmark-done-outline" size={18} color="#7650a0" />
          <Text style={h.metricValue}>{progress.data ? totalAnswered : "—"}</Text>
          <Text style={h.metricLabel}>Answered</Text>
        </View>
        <View style={[h.metric, h.metricMiddle]}>
          <Ionicons name="stats-chart-outline" size={18} color="#597b42" />
          <Text style={h.metricValue}>{totalAnswered ? `${progress.data.accuracy}%` : "—"}</Text>
          <Text style={h.metricLabel}>Accuracy</Text>
        </View>
        <View style={[h.metric, h.metricLast]}>
          <Ionicons name="albums-outline" size={18} color="#9a6540" />
          <Text style={h.metricValue}>{flashcards.data ? flashcards.data.length : "—"}</Text>
          <Text style={h.metricLabel}>Cards</Text>
        </View>
      </View>

      <View style={h.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={h.sectionKicker}>A GOOD PLACE TO PICK UP</Text>
          <Text style={s.heading}>Continue your revision</Text>
          <Text style={h.sectionCopy}>Real study actions, ready when you are.</Text>
        </View>
      </View>
      <View style={h.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("MCQs", { mode: "mistakes" })}
          style={[h.actionCard, h.actionWarm]}
        >
          <View style={h.actionIconWarm}><Ionicons name="bookmark-outline" size={20} color="#986341" /></View>
          <Text style={h.actionTitle}>Review mistakes</Text>
          <Text style={h.actionCopy}>Revisit missed answers and explanations.</Text>
          <Text style={h.actionLink}>Open review <Ionicons name="arrow-forward" size={14} color="#986341" /></Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Flashcards")}
          style={[h.actionCard, h.actionLilac]}
        >
          <View style={h.actionIconLilac}><Ionicons name="albums-outline" size={20} color="#7650a0" /></View>
          <Text style={h.actionTitle}>{flashcards.data?.length ? "Review recall cards" : "Create a recall card"}</Text>
          <Text style={h.actionCopy}>{flashcards.data?.length ? `${flashcards.data.length} saved cards in your deck.` : "Save a prompt and practise before revealing the answer."}</Text>
          <Text style={h.actionLink}>Open flashcards <Ionicons name="arrow-forward" size={14} color="#7650a0" /></Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Notes")}
          style={[h.actionCard, h.actionGreen]}
        >
          <View style={h.actionIconGreen}><Ionicons name="document-text-outline" size={20} color="#597b42" /></View>
          <Text style={h.actionTitle}>Keep your own notes</Text>
          <Text style={h.actionCopy}>Organise a topic, viva outline, or mistake review.</Text>
          <Text style={h.actionLink}>Open notebook <Ionicons name="arrow-forward" size={14} color="#597b42" /></Text>
        </Pressable>
      </View>

      <View style={h.directoryHead}>
        <View>
          <Text style={h.sectionKicker}>THE FULL TOOLKIT</Text>
          <Text style={s.heading}>Choose a study tool</Text>
          <Text style={h.sectionCopy}>Search or filter by what you want to do.</Text>
        </View>
        <View style={h.toolCount}><Text style={h.toolCountText}>{result.length}</Text></View>
      </View>
      <View style={h.searchBox}>
        <Ionicons name="search-outline" size={19} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes, anatomy, planning…"
          placeholderTextColor="#988ca0"
          accessibilityLabel="Search study tools"
          returnKeyType="search"
          style={h.searchInput}
        />
        {search ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={h.filters}
        accessibilityRole="tablist"
        accessibilityLabel="Filter study tools"
      >
        {groups.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === item }}
            onPress={() => setFilter(item)}
            style={[h.filter, filter === item && h.filterSelected]}
          >
            <Text style={[h.filterText, filter === item && h.filterTextSelected]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {result.length ? (
        <View style={h.toolList}>
          {result.map(([label, route, icon], index) => (
            <Pressable
              key={route}
              accessibilityRole="button"
              onPress={() => navigation.navigate(route)}
              android_ripple={{ color: `${colors.purple[200]}55` }}
              style={h.toolCard}
            >
              <View style={[h.toolIndex, index % 3 === 1 && h.toolIndexMint, index % 3 === 2 && h.toolIndexPeach]}>
                <Text style={h.toolIndexText}>{String(index + 1).padStart(2, "0")}</Text>
              </View>
              <View style={h.toolIcon}>
                <Ionicons name={icon} size={22} color={colors.purple[700]} />
              </View>
              <View style={h.toolCopy}>
                <Text style={h.toolGroup}>{groupFor(route).toUpperCase()}</Text>
                <Text style={h.toolTitle}>{label}</Text>
                <Text style={h.toolDescription}>{descriptions[route] || "Choose a useful next step for your study session."}</Text>
              </View>
              <View style={h.toolArrow}><Ionicons name="arrow-up-outline" size={16} color={colors.purple[700]} /></View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={h.empty}>
          <Ionicons name="search-outline" size={23} color={colors.purple[500]} />
          <Text style={s.heading}>No tools found</Text>
          <Text style={s.small}>Try another search or clear the current filter.</Text>
          <Pressable accessibilityRole="button" onPress={() => { setSearch(""); setFilter("Everything"); }}>
            <Text style={h.emptyAction}>Show all tools</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const h = StyleSheet.create({
  hero: { position: "relative", overflow: "hidden", padding: 22, paddingTop: 23, borderRadius: 25, backgroundColor: "#2a1c3b", borderWidth: 1, borderColor: "#5d4378", gap: 9, shadowColor: colors.purple[900], shadowOffset: { width: 0, height: 13 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 6 },
  heroGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, right: -106, top: -91, backgroundColor: "#68508b", opacity: 0.48 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  heroMark: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#d8f294" },
  kicker: { color: "#d4c2e8", fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.25 },
  title: { maxWidth: 310, color: "white", fontFamily: fonts.display, fontSize: 31, lineHeight: 36 },
  copy: { maxWidth: 305, color: "#e3d9ed", fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
  heroActions: { gap: 9, marginTop: 9 },
  primaryButton: { minHeight: 46, paddingHorizontal: 12, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#d8f294" },
  primaryText: { flex: 1, color: "#33431f", fontFamily: fonts.bold, fontSize: 11 },
  secondaryButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "#ffffff38", backgroundColor: "#ffffff09" },
  secondaryText: { color: "white", fontFamily: fonts.bold, fontSize: 11 },
  recommendation: { marginTop: 3, color: "#d3c6e0", fontFamily: fonts.medium, fontSize: 9, lineHeight: 15 },
  metrics: { flexDirection: "row", overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: "#e6dced", backgroundColor: "#fffdfb" },
  metric: { flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 12, paddingHorizontal: 5, gap: 3 },
  metricFirst: { backgroundColor: "#f6effb" }, metricMiddle: { backgroundColor: "#f4f8ed" }, metricLast: { backgroundColor: "#fff6ef" },
  metricValue: { color: "#342443", fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.5 },
  metricLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionKicker: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.1, marginBottom: 5 },
  sectionCopy: { marginTop: 4, color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
  actions: { gap: 10 },
  actionCard: { position: "relative", minHeight: 132, padding: 15, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  actionWarm: { backgroundColor: "#fff7ef", borderColor: "#f0dfd0" }, actionLilac: { backgroundColor: "#f7f1fb", borderColor: "#e4d7ee" }, actionGreen: { backgroundColor: "#f3f8ed", borderColor: "#dfe8d5" },
  actionIconWarm: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#ffecdb" }, actionIconLilac: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#eee1f8" }, actionIconGreen: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#e6efd9" },
  actionTitle: { marginTop: 10, color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  actionCopy: { marginTop: 4, color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
  actionLink: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 11, color: colors.purple[700], fontFamily: fonts.bold, fontSize: 10 },
  directoryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  toolCount: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.purple[100] },
  toolCountText: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 12 },
  searchBox: { minHeight: 47, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, color: colors.ink, fontFamily: fonts.body, fontSize: 13 },
  filters: { flexDirection: "row", gap: 7, paddingBottom: 3 },
  filter: { minHeight: 35, justifyContent: "center", paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  filterSelected: { borderColor: colors.purple[900], backgroundColor: colors.purple[900] },
  filterText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 9 }, filterTextSelected: { color: "#e2f4b5" },
  toolList: { gap: 8 },
  toolCard: { position: "relative", overflow: "hidden", minHeight: 92, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  toolIndex: { alignSelf: "stretch", width: 27, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#f2eafa" },
  toolIndexMint: { backgroundColor: "#eaf4e4" }, toolIndexPeach: { backgroundColor: "#fff0e3" },
  toolIndexText: { color: "#8d74a2", fontFamily: fonts.bold, fontSize: 8, writingDirection: "ltr" },
  toolIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.purple[50] },
  toolCopy: { flex: 1, minWidth: 0, gap: 2 },
  toolGroup: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 7, letterSpacing: 0.9 },
  toolTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12 },
  toolDescription: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, lineHeight: 14 },
  toolArrow: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.purple[50] },
  empty: { alignItems: "center", gap: 8, padding: 26, borderRadius: 17, borderWidth: 1, borderStyle: "dashed", borderColor: colors.purple[200], backgroundColor: colors.surface },
  emptyAction: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 11, padding: 8 },
});
