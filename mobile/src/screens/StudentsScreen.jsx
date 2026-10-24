import React, { useState } from "react";
import { View, Text } from "react-native";
import { styles as s } from "../theme";
import useData from "../hooks/useData";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormField from "../components/FormField";
import { Skeleton, ErrorState } from "../components/States";

function ProfileHighlights({ userId, navigation }) {
  const { data, loading, error } = useData(`/stories/highlights/${userId}`);
  if (loading && !data) return null;
  if (error) return <Text style={s.small}>Study highlights could not be loaded.</Text>;
  if (!data?.items?.length) return null;
  const collections = [...new Set(data.items.map((story) => story.highlight))];
  return (
    <View style={s.card}>
      <Text style={s.pillText}>STUDY HIGHLIGHTS</Text>
      <Text style={s.heading}>Stories worth keeping</Text>
      {collections.map((collection) => {
        const story = data.items.find((item) => item.highlight === collection);
        const count = data.items.filter((item) => item.highlight === collection).length;
        return (
          <View key={collection} style={{ gap: 5, paddingVertical: 10 }}>
            <Text style={s.heading}>{collection}</Text>
            <Text style={s.small}>
              {count} {count === 1 ? "story" : "stories"} · {story.title}
            </Text>
            <Button
              title="Open collection"
              variant="secondary"
              onPress={() => navigation.navigate("Community", { storyId: story.id })}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function StudentsScreen({ navigation, route }) {
  const id = route.params?.id;
  const [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0);
  const { data, loading, error, reload } = useData(
    id
      ? `/profiles/${id}`
      : `/profiles?${new URLSearchParams({ search, offset })}`,
  );
  return (
    <Screen>
      <Text style={s.title}>
        {id ? "Student profile" : "Meet the students."}
      </Text>
      {!id && (
        <FormField
          label="Find a student"
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setOffset(0);
          }}
        />
      )}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : id ? (
        <>
          <View style={s.card}>
            <Text style={s.heading}>{data.name}</Text>
            <Text style={s.small}>{data.year}</Text>
            <Text style={s.pillText}>
              Level {data.level} · {data.xp} XP
            </Text>
            <View style={s.progress}>
              <View
                style={[s.progressFill, { width: `${data.level_progress}%` }]}
              />
            </View>
            <Text style={s.small}>
              {100 - data.level_progress} XP to level {data.level + 1}
            </Text>
            <Text style={s.body}>
              {data.posts} medical posts · {data.doubts} doubts asked ·{" "}
              {data.solutions} accepted solutions
            </Text>
          </View>
          <ProfileHighlights userId={id} navigation={navigation} />
          <Button
            title="All students"
            variant="secondary"
            onPress={() => navigation.setParams({ id: null })}
          />
        </>
      ) : (
        <>
          {data.items.map((person) => (
            <View style={s.card} key={person.id}>
              <Text style={s.heading}>{person.name}</Text>
              <Text style={s.small}>{person.year}</Text>
              <Text style={s.pillText}>
                Level {person.level} · {person.xp} XP
              </Text>
              <Button
                title="View profile"
                variant="secondary"
                onPress={() => navigation.setParams({ id: person.id })}
              />
            </View>
          ))}
          {!data.items.length && (
            <Text style={s.small}>No students match this name.</Text>
          )}
          <Button
            title="Previous"
            variant="secondary"
            disabled={!offset}
            onPress={() => setOffset(Math.max(0, offset - 20))}
          />
          <Button
            title="Next"
            variant="secondary"
            disabled={!data.has_more}
            onPress={() => setOffset(offset + 20)}
          />
        </>
      )}
    </Screen>
  );
}
