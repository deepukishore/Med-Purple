import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, FlatList, useWindowDimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { styles as s } from "../theme";
import { api, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import Screen, { StaggeredItem } from "../components/Screen";
import Chips from "../components/Chips";
import Button from "../components/Button";
import MedByteCard from "../components/MedByteCard";
import { Skeleton, ErrorState, EmptyState } from "../components/States";
import useReducedMotion from "../hooks/useReducedMotion";
export default function MedBytesScreen({ navigation }) {
  const [subject, setSubject] = useState(""),
    [exam, setExam] = useState(""),
    [active, setActive] = useState(0),
    [started, setStarted] = useState(false),
    [completed, setCompleted] = useState(new Set());
  const { notify } = useApp();
  const [dailyWatched, setDailyWatched] = useState(0);
  const [extra, setExtra] = useState([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState("");
  const pageState = useRef({ cursor: "", cycle: 0, busy: false });
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const [cardHeight, setCardHeight] = useState(Math.max(320, height - 220));
  const { data, loading, error, reload } = useData(
    "/medbytes?" + new URLSearchParams({ subject, exam }),
  );
  useEffect(() => {
    setExtra([]);
    setMoreError("");
    setMoreLoading(false);
    setActive(0);
    pageState.current = {
      cursor: data?.next_cursor || "",
      cycle: data?.next_cursor ? 0 : 1,
      busy: false,
    };
  }, [data]);
  async function loadMore() {
    const state = pageState.current;
    if (state.busy || !data?.items.length || loading) return;
    state.busy = true;
    setMoreLoading(true);
    setMoreError("");
    try {
      const page = await api.get(
        "/medbytes?" +
          new URLSearchParams({ subject, exam, cursor: state.cursor }),
      );
      if (pageState.current !== state) return;
      const batch = page.items.map((clip) => ({
        ...clip,
        feedKey: `${state.cycle}:${clip.id}`,
      }));
      setExtra((old) => [...old, ...batch]);
      state.cursor = page.next_cursor || "";
      if (!page.next_cursor) state.cycle += 1;
    } catch (e) {
      if (pageState.current === state) setMoreError(e.message);
    } finally {
      state.busy = false;
      if (pageState.current === state) setMoreLoading(false);
    }
  }
  const complete = useCallback(
    async (id) => {
      try {
        const response = await api.post(`/medbytes/${id}/complete`);
        setDailyWatched(response.completed_today);
        setCompleted((old) => new Set([...old, id]));
        notify("MedByte completed. A little more understood.");
      } catch (e) {
        notify(e.message);
      }
    },
    [notify],
  );
  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const watched = Math.max(data.completed_today, dailyWatched);
  if (!started)
    return (
      <Screen scroll={false} decorations={false}>
        <Text style={s.title}>Big ideas.{"\n"}Small bytes.</Text>
        <Text style={s.subtitle}>
          Choose a focus, then swipe through medical learning videos.
        </Text>
        <Chips
          label="Subject"
          items={[{ value: "", label: "All subjects" }, ...data.subjects]}
          value={subject}
          onChange={setSubject}
        />
        <Chips
          label="Exam focus"
          items={[{ value: "", label: "All foundations" }, ...data.exams]}
          value={exam}
          onChange={setExam}
        />
        <View style={s.card}>
          <Text style={s.heading}>Keep scrolling. Keep learning.</Text>
          <Text style={s.small}>
            Original, captioned study animations. Save any idea straight to your
            notes or flashcards.
          </Text>
          <Text style={s.pillText}>{watched} videos explored today</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Button
          title="Start watching"
          disabled={!data.items.length}
          onPress={() => setStarted(true)}
        />
        <Button
          title="Open saved flashcards"
          variant="secondary"
          onPress={() => navigation.navigate("Flashcards")}
        />
      </Screen>
    );
  return (
    <View style={s.screen}>
      <StaggeredItem index={0} reduced={reduced}>
        <View style={[s.between, { paddingHorizontal: 20, paddingVertical: 13 }]}>
          <Text style={s.pillText}>{watched} explored today</Text>
          <Button
            title="Change focus"
            variant="secondary"
            onPress={() => setStarted(false)}
          />
        </View>
      </StaggeredItem>
      <StaggeredItem index={1} reduced={reduced} style={{ flex: 1 }}>
        <FlatList
          key={cardHeight}
          style={{ flex: 1 }}
          onLayout={(event) =>
            setCardHeight(Math.round(event.nativeEvent.layout.height))
          }
        initialScrollIndex={active}
        getItemLayout={(_, index) => ({
          length: cardHeight,
          offset: cardHeight * index,
          index,
        })}
        pagingEnabled
        extraData={{ active, focused, completed }}
        data={[
          ...data.items.map((clip) => ({ ...clip, feedKey: `0:${clip.id}` })),
          ...extra,
        ]}
        keyExtractor={(x) => x.feedKey}
        onEndReached={() => {
          if (!moreError) loadMore();
        }}
        onEndReachedThreshold={1}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        snapToInterval={cardHeight}
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setActive(Math.round(e.nativeEvent.contentOffset.y / cardHeight))
        }
        renderItem={({ item, index }) => (
          <MedByteCard
            clip={{ ...item, watched: item.watched || completed.has(item.id) }}
            active={focused && active === index}
            height={cardHeight}
            onComplete={complete}
          />
        )}
          ListFooterComponent={
          <View style={[s.card, { marginTop: 10 }]}>
            <Text style={[s.title, { fontSize: 29 }]}>
              {moreLoading ? "Loading videos…" : "Keep exploring"}
            </Text>
            <Text style={s.small}>
              {moreError ||
                "The available collection repeats while more videos are added."}
            </Text>
            <Button
              title={
                moreLoading
                  ? "Loading…"
                  : moreError
                    ? "Try again"
                    : "Load more videos"
              }
              disabled={moreLoading}
              onPress={loadMore}
            />
            <Button
              title="Back to Home"
              variant="secondary"
              onPress={() => navigation.navigate("Home")}
            />
          </View>
          }
        />
      </StaggeredItem>
    </View>
  );
}
