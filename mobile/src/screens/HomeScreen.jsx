import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { styles as s, colors, fonts } from "../theme";
import { api, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { CountUp } from "../components/ProgressRing";
import DepthCard from "../components/DepthCard";
import QuickAccess from "../components/QuickAccess";
import HeartViewer from "../components/HeartViewer";
import StoryBar from "../components/StoryBar";
import { Skeleton, ErrorState } from "../components/States";
const sessions = [
  {
    label: "Question sprint",
    title: "Less panic.\nMore recall.",
    copy: "Five questions for the gap between postings, lectures, and your next chai.",
    cta: "Start my 5-question sprint",
    route: "MCQs",
    params: { set: 5 },
  },
  {
    label: "Viva warm-up",
    title: "You know it.\nNow explain it.",
    copy: "Say the answer out loud before you flip. Your viva voice needs practice too.",
    cta: "Open my recall cards",
    route: "Flashcards",
  },
  {
    label: "Low battery",
    title: "Low energy?\nTiny session.",
    copy: "One short MedByte, one useful idea. Keep a little energy for being a human.",
    cta: "Watch a MedByte",
    route: "MedBytes",
  },
];
export default function HomeScreen({ navigation }) {
  const [session, setSession] = useState(0);
  const [sprintSize, setSprintSize] = useState(5),
    [sprintSubject, setSprintSubject] = useState("");
  const choice = sessions[session];
  const { data, loading, error, reload } = useData("/dashboard");
  const rewards = useData("/progress");
  const storyOfDay = useData("/stories/featured");
  const featureState = useData("/features");
  const playfulCopy = featureState.data?.preferences?.copyTone === "playful";
  const { notify, changed } = useApp();
  const [pending, setPending] = useState(false),
    [now, setNow] = useState(Date.now());
  const previousLevel = useRef(null);
  useEffect(() => {
    const level = rewards.data?.level;
    if (!Number.isFinite(level)) return;
    if (previousLevel.current !== null && level > previousLevel.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
    previousLevel.current = level;
  }, [rewards.data?.level]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  if (loading && !data) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const d = data,
    hour = Number(
      new Intl.DateTimeFormat("en", {
        hour: "numeric",
        hour12: false,
        timeZone: d.user.timezone,
      }).format(new Date()),
    ),
    diff = Math.max(0, new Date(d.exam_at).getTime() - now),
    completedGoals = d.goals.filter((item) => item.done).length,
    remainingQuestions = Math.max(d.daily_target - d.answered_today, 0);
  async function goal(g) {
    setPending(true);
    try {
      await api.put(`/dashboard/goals/${g.key}`, { done: !g.done });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      changed();
      notify(g.done ? "Goal reopened." : "One more small win.");
    } catch (e) {
      notify(e.message);
    } finally {
      setPending(false);
    }
  }
  const chooseSession = (index) => {
    Haptics.selectionAsync().catch(() => {});
    setSession(index);
  };
  const chooseSprintSize = (size) => {
    Haptics.selectionAsync().catch(() => {});
    setSprintSize(size);
  };
  const chooseSprintSubject = (subject) => {
    Haptics.selectionAsync().catch(() => {});
    setSprintSubject(subject);
  };
  return (
    <Screen onRefresh={reload} refreshing={loading} stagger>
      <View>
        <Text style={s.pillText}>YOUR MED-SCHOOL STUDY DESK</Text>
        <Text style={s.title}>
          {hour < 12
            ? "Good morning"
            : hour < 17
              ? "Good afternoon"
              : "Good evening"}
          , {d.user.name}.
        </Text>
        <Text style={s.subtitle}>
          {d.user.year} / {d.user.location}
        </Text>
        <Text style={h.humanNote}>Coffee optional. Breaks are not.</Text>
      </View>
      <StoryBar navigation={navigation} />
      {storyOfDay.data?.item ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate("Community", {
              storyId: storyOfDay.data.item.id,
            })
          }
          style={[
            s.card,
            { backgroundColor: "#faf6ff", borderColor: "#e7ddf1", gap: 7 },
          ]}
        >
          <Text style={s.pillText}>COMMUNITY PICK</Text>
          <Text style={s.heading}>Story of the day</Text>
          <Text style={s.body}>
            {storyOfDay.data.item.title} · {storyOfDay.data.item.subject}
          </Text>
          <Text style={[s.pillText, { color: colors.purple[700] }]}>
            Read this story →
          </Text>
        </Pressable>
      ) : storyOfDay.error ? (
        <View style={s.card}>
          <Text style={s.small}>The featured story could not be loaded.</Text>
          <Button
            title="Retry"
            variant="secondary"
            onPress={storyOfDay.reload}
          />
        </View>
      ) : null}
      <DepthCard style={h.hero}>
        <View style={h.sessionTabs}>
          {sessions.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: session === index }}
              onPress={() => chooseSession(index)}
              style={[h.sessionTab, session === index && h.selectedTab]}
            >
              <Text
                style={[
                  h.tabLabel,
                  session === index && { color: colors.accent },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.between}>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={h.eyebrow}>TODAY’S QUICK WIN</Text>
            <Text style={h.heroTitle}>{choice.title}</Text>
            <Text style={h.heroCopy}>
              {playfulCopy && session === 0
                ? "Five questions. Neurons on overtime. Let's see what sticks."
                : choice.copy}
            </Text>
          </View>
        </View>
        {session === 0 && (
          <View style={{ gap: 12, marginTop: 20 }}>
            <Text style={h.eyebrow}>MAKE THIS SESSION YOURS</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[3, 5, 10].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} questions`}
                  accessibilityState={{ selected: sprintSize === n }}
                  onPress={() => chooseSprintSize(n)}
                  style={[
                    h.sessionTab,
                    {
                      borderWidth: 1,
                      borderColor:
                        sprintSize === n ? colors.accent : "#ffffff35",
                      backgroundColor:
                        sprintSize === n ? "#ffffff18" : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      h.tabLabel,
                      { color: sprintSize === n ? colors.accent : "#ded4e7" },
                    ]}
                  >
                    {n} questions
                  </Text>
                </Pressable>
              ))}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {["", ...new Set(d.topics.map((t) => t.subject))].map(
                (subject) => (
                  <Pressable
                    key={subject}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sprintSubject === subject }}
                    onPress={() => chooseSprintSubject(subject)}
                    style={[
                      h.sessionTab,
                      sprintSubject === subject && h.selectedTab,
                    ]}
                  >
                    <Text style={h.tabLabel}>{subject || "All subjects"}</Text>
                  </Pressable>
                ),
              )}
            </ScrollView>
          </View>
        )}
        <Button
          title={
            session === 0
              ? `Start my ${sprintSize}-question sprint`
              : choice.cta
          }
          variant="accent"
          onPress={() =>
            navigation.navigate(
              choice.route,
              session === 0
                ? {
                    set: sprintSize,
                    subject: sprintSubject,
                    mode: "all",
                    topic: "",
                  }
                : choice.params,
            )
          }
          style={{ alignSelf: "flex-start", marginTop: 18 }}
        />
        <View style={h.quest}>
          <View style={s.between}>
            <Text style={h.questTitle}>Daily MCQ target</Text>
            <Text style={[h.questCount, { color: colors.accent }]}>
              {Math.min(d.answered_today, d.daily_target)}/{d.daily_target}
            </Text>
          </View>
          <View style={h.questTrack}>
            <View
              style={[
                h.questFill,
                {
                  width: `${Math.min((d.answered_today / d.daily_target) * 100, 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={h.questHint}>
            {remainingQuestions
              ? `${remainingQuestions} to go. One question at a time.`
              : "Target cleared. Please hydrate and unclench your jaw."}
          </Text>
        </View>
        <View style={h.stats}>
          {[
            [d.streak, "day streak"],
            [d.days_to_exam, "days to exam"],
            [d.answered_today, `of ${d.daily_target} daily MCQs`],
          ].map(([value, label]) => (
            <View key={label} style={{ flex: 1, gap: 4 }}>
              <CountUp value={value} style={h.statNumber} />
              <Text style={h.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </DepthCard>
      {rewards.data && (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Progress")}
          style={[
            s.card,
            { backgroundColor: "#eae0f5", borderColor: "#d8c9e9" },
          ]}
        >
          <Text style={s.pillText}>YOUR STUDY ID</Text>
          <View style={s.between}>
            <Text style={s.heading}>
              Level {rewards.data.level} · {rewards.data.xp} XP
            </Text>
            <Ionicons
              name="arrow-forward"
              size={22}
              color={colors.purple[700]}
            />
          </View>
          <View style={s.progress}>
            <View
              style={[
                s.progressFill,
                { width: `${rewards.data.level_progress}%` },
              ]}
            />
          </View>
          <Text style={s.small}>
            {100 - rewards.data.level_progress} XP to the next level. Actually
            earned.
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("MCQs", { mode: "mistakes" })}
        style={[s.card, { backgroundColor: "#fff0e4", borderColor: "#ebd7c7" }]}
      >
        <View style={s.between}>
          <Text style={s.heading}>The mistake notebook</Text>
          <Ionicons
            name="arrow-up-outline"
            style={{ transform: [{ rotate: "45deg" }] }}
            size={24}
            color="#a06342"
          />
        </View>
        <Text style={s.small}>
          Turn “wait, why?” into “got it”. Revisit the questions that tripped
          you up.
        </Text>
      </Pressable>
      <QuickAccess navigation={navigation} />
      <View style={s.section}>
        <Text style={s.heading}>Continue learning</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 13 }}
        >
          {d.topics.map((t) => (
            <Pressable
              key={t.topic}
              accessibilityRole="button"
              onPress={() => navigation.navigate("MCQs", { topic: t.topic })}
              style={[s.card, { width: 245, gap: 12 }]}
            >
              <Ionicons
                name={
                  t.topic.includes("Cardiac") ? "heart-outline" : "book-outline"
                }
                size={27}
                color={colors.purple[600]}
              />
              <Text style={s.pillText}>{t.subject}</Text>
              <Text style={s.heading}>{t.topic}</Text>
              <Text style={s.small}>
                {t.answered} of {t.total} questions explored
              </Text>
              <View style={s.progress}>
                <View style={[s.progressFill, { width: `${t.progress}%` }]} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={h.anatomy}>
        <View style={{ flex: 1, padding: 20, gap: 10 }}>
          <Text style={s.pillText}>The anatomy studio</Text>
          <Text style={[s.title, { fontSize: 25, lineHeight: 30 }]}>
            See the bigger picture.
          </Text>
          <Text style={s.small}>
            Swipe the model to turn it. Explore every angle.
          </Text>
          <Button
            title="Explore the heart"
            variant="secondary"
            onPress={() => navigation.navigate("Anatomy")}
          />
        </View>
        <View style={{ width: 130 }}>
          <HeartViewer compact interactiveCompact height={220} />
        </View>
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <Text style={s.heading}>Daily quests</Text>
          <Text style={h.questCount}>
            {completedGoals}/{d.goals.length} done
          </Text>
        </View>
        <Text style={s.small}>
          {completedGoals === d.goals.length
            ? "All quests cleared. Close the books and take the win."
            : "Small missions, no boss fight required."}
        </Text>
        {d.goals.map((g) => (
          <Pressable
            key={g.key}
            disabled={pending}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: g.done, disabled: pending }}
            onPress={() => goal(g)}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
            }}
          >
            <Ionicons
              name={g.done ? "checkbox" : "square-outline"}
              size={25}
              color={g.done ? colors.purple[600] : colors.muted}
            />
            <Text
              style={[
                s.body,
                {
                  fontSize: 14,
                  flex: 1,
                  textDecorationLine: g.done ? "line-through" : "none",
                  color: g.done ? colors.muted : colors.ink,
                },
              ]}
            >
              {g.title}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[s.card, h.wins]}>
        <View style={s.row}>
          <Ionicons name="trophy-outline" size={22} color="#725311" />
          <Text style={s.heading}>Your wins</Text>
        </View>
        {d.badges.length ? (
          <View style={h.badges}>
            {d.badges.map((badge) => (
              <Text key={badge} style={h.badge}>
                {badge}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={s.small}>
            Your first badge is one answered question away. No cape required.
          </Text>
        )}
        <Text style={s.small}>
          {d.total_answered} questions answered so far
        </Text>
      </View>
      <View
        style={[
          s.card,
          {
            backgroundColor: colors.purple[50],
            borderColor: colors.purple[100],
          },
        ]}
      >
        <Text style={s.pillText}>Your next exam</Text>
        <Text style={s.heading}>{d.user.exam_name}</Text>
        <Text style={[s.title, { fontSize: 31 }]}>
          {Math.floor(diff / 86400000)}d / {Math.floor(diff / 3600000) % 24}h /{" "}
          {Math.floor(diff / 60000) % 60}m
        </Text>
        <Button
          title="Set my exam date"
          variant="secondary"
          onPress={() => navigation.navigate("Profile")}
        />
      </View>
      <View style={s.section}>
        <View style={s.between}>
          <Text style={s.heading}>Today’s schedule</Text>
          <Text style={s.pillText}>Your saved sessions</Text>
        </View>
        {!d.schedule.length && (
          <Text style={s.small}>
            No sessions planned yet. Make room for a small win.
          </Text>
        )}
        {d.schedule.map((item, index) => (
          <View key={index} style={s.row}>
            <View style={{ width: 53 }}>
              <Text style={s.small}>{item.time}</Text>
            </View>
            <View style={{ flex: 1, paddingVertical: 8 }}>
              <Text style={[s.body, { fontFamily: fonts.bold, fontSize: 14 }]}>
                {item.title}
              </Text>
              <Text style={s.small}>{item.detail}</Text>
            </View>
          </View>
        ))}
        <Button
          title="Open study planner"
          variant="secondary"
          onPress={() => navigation.navigate("Planner")}
        />
      </View>
      <View style={s.card}>
        <Ionicons name="people-outline" color={colors.purple[600]} size={30} />
        <Text style={s.heading}>Same syllabus. Shared chaos.</Text>
        <Text style={s.small}>
          Ask the “silly” question. It probably isn't. Find your study circle.
        </Text>
        <Button
          title="Visit community"
          variant="secondary"
          onPress={() => navigation.navigate("Community")}
        />
      </View>
    </Screen>
  );
}
const h = StyleSheet.create({
  hero: {
    backgroundColor: colors.purple[900],
    borderRadius: 25,
    padding: 22,
    shadowColor: colors.purple[900],
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  eyebrow: { fontFamily: fonts.bold, color: colors.purple[100], fontSize: 12 },
  sessionTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff20",
    paddingBottom: 14,
  },
  sessionTab: {
    minHeight: 44,
    justifyContent: "center",
    padding: 10,
    borderRadius: 9,
  },
  selectedTab: { backgroundColor: "#ffffff18" },
  tabLabel: { fontFamily: fonts.bold, fontSize: 12, color: "#c8bbd8" },
  humanNote: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  quest: {
    marginTop: 19,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#FFFFFF35",
    gap: 9,
  },
  questTitle: { fontFamily: fonts.bold, fontSize: 12, color: "white" },
  questCount: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.purple[700],
  },
  questTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF35",
    overflow: "hidden",
  },
  questFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#C6F16A",
  },
  questHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.purple[100],
  },
  wins: { backgroundColor: "#FFFCF2", borderColor: "#F1E8CF" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    overflow: "hidden",
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#FFF4D2",
    color: "#725311",
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  heroTitle: {
    fontFamily: fonts.display,
    color: colors.accent,
    fontSize: 35,
    lineHeight: 40,
  },
  heroCopy: {
    fontFamily: fonts.body,
    color: colors.purple[100],
    fontSize: 12,
    lineHeight: 19,
  },
  stats: {
    borderTopWidth: 1,
    borderTopColor: "#FFFFFF35",
    flexDirection: "row",
    paddingTop: 19,
    marginTop: 22,
    gap: 10,
  },
  statNumber: { fontFamily: fonts.bold, color: "white", fontSize: 23 },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.purple[100],
  },
  anatomy: {
    borderRadius: 20,
    backgroundColor: colors.anatomy,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
});
