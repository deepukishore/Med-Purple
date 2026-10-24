import React, { useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { colors, fonts, styles as s } from "../theme";
import useData from "../hooks/useData";
const baseSubjects = ["Anatomy", "Physiology", "Pharmacology", "Medicine", "NEET PG"];

export default function StoryBar({ navigation }) {
  const [subject, setSubject] = useState("");
  const { data, error, loading, reload } = useData(
    `/stories?subject=${encodeURIComponent(subject)}`,
  );
  const items = data?.items || [];
  const creators = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const key = item.creator_id || item.id;
      if (!groups.has(key)) groups.set(key, { ...item, stories: [item] });
      else {
        const group = groups.get(key);
        group.stories.push(item);
        if (group.seen && !item.seen) Object.assign(group, item, { stories: group.stories });
      }
    });
    return [...groups.values()];
  }, [items]);
  const subjects = [...new Set([...baseSubjects, ...items.map((item) => item.subject)])];
  return (
    <View style={[s.card, { gap: 12, backgroundColor: "#fffdf9" }]}>
      <View style={s.between}>
        <View>
          <Text style={s.pillText}>STUDY WITH YOUR COMMUNITY</Text>
          <Text style={s.heading}>Stories</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Community", { createStory: true })}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={[s.pillText, { color: colors.purple[700] }]}>＋ Your story</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ tag: "", label: "All" }, ...subjects.map((tag) => ({ tag, label: tag }))].map(({ tag, label }) => {
          const active = tag ? subject.toLowerCase() === tag.toLowerCase() : !subject;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={label}
              onPress={() => setSubject(active ? "" : tag)}
              style={{
                minHeight: 36,
                justifyContent: "center",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: active ? colors.purple[600] : colors.line,
                backgroundColor: active ? "#efe7f7" : "#fff",
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: active ? colors.purple[700] : colors.muted, fontFamily: fonts.medium, fontSize: 11 }}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error ? (
        <Pressable accessibilityRole="button" onPress={reload}><Text style={s.small}>Stories could not be loaded. Retry</Text></Pressable>
      ) : loading && !data ? (
        <Text style={s.small}>Loading stories…</Text>
      ) : creators.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15 }}>
          {creators.map((creator) => {
            const story = creator.stories.find((item) => !item.seen) || creator.stories[0];
            return (
              <Pressable
                key={creator.creator_id || creator.id}
                accessibilityRole="button"
                accessibilityLabel={`${story.creator}, ${story.title}, ${story.seen ? "seen" : "unseen"}`}
                onPress={() => navigation.navigate("Community", { storyId: story.id })}
                style={{ alignItems: "center", gap: 4, width: 76 }}
              >
                <View style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  borderWidth: 3,
                  borderColor: story.seen ? "#cfc8d3" : colors.purple[600],
                  backgroundColor: "#f3edf8",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Text style={{ color: colors.purple[700], fontFamily: fonts.display, fontSize: 20 }}>{story.creator?.[0] || "S"}</Text>
                </View>
                <Text numberOfLines={1} style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 11 }}>{story.creator}</Text>
                <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10 }}>{story.subject}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={s.small}>No live stories yet. Share a useful study tip.</Text>
      )}
    </View>
  );
}
