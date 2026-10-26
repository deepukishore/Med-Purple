import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
} from "react-native";
import { styles as s, colors } from "../theme";
import { api } from "../context/AppContext";
import useData from "../hooks/useData";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormField from "../components/FormField";
import Chips from "../components/Chips";
import XPLevel from "../components/XPLevel";
import StoryShelf from "../components/StoryShelf";
import { POST_REACTIONS } from "../../../shared/post-reactions.js";
import { Skeleton, ErrorState } from "../components/States";

function Author({ item, navigation }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${item.author}, Level ${item.author_level}. View profile`}
      onPress={() => navigation.navigate("Students", { id: item.author_id })}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Text style={s.heading}>{item.author}</Text>
      <Text style={s.pillText}>Level {item.author_level} · {item.author_xp} XP</Text>
    </Pressable>
  );
}

function PostReactions({ item, busy, onReact }) {
  return (
    <View accessibilityRole="group" accessibilityLabel="React to this post" style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
      {POST_REACTIONS.map(({ id, emoji, label }) => {
        const count = item.reaction_counts?.[id] || 0;
        const active = item.my_reactions?.includes(id) || false;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${label}${count ? `, ${count}` : ""}`}
            accessibilityState={{ selected: active, disabled: busy }}
            disabled={busy}
            onPress={() => onReact(item, id, !active)}
            style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 8, borderRadius: 22, borderWidth: 1, borderColor: active ? colors.purple[600] : colors.line, backgroundColor: active ? colors.purple[50] : colors.surface, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4, opacity: busy ? 0.65 : 1 }}
          >
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
            {!!count && <Text style={{ color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 11 }}>{count}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
export default function SocialScreen({ navigation, route, doubts = false }) {
  const endpoint = doubts ? "/doubts" : "/community";
  const [selected, setSelected] = useState(null),
    [search, setSearch] = useState(""),
    [subject, setSubject] = useState(""),
    [status, setStatus] = useState("all"),
    [offset, setOffset] = useState(0),
    [form, setForm] = useState(null),
    [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const { data, loading, error, reload } = useData(
    selected
      ? `${endpoint}/${selected}`
      : `${endpoint}?${new URLSearchParams({ search, subject, status, offset })}`,
  );
  async function run(fn, after) {
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      const value = await fn();
      after?.(value);
      reload();
    } catch (e) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  function react(item, reaction, active) {
    run(() => api.put(`${endpoint}/${item.id}/reactions`, { reaction, active }));
  }
  function remove(path, isPost) {
    Alert.alert("Delete this item?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          run(
            () => api.delete(path),
            () => {
              if (isPost) setSelected(null);
            },
          ),
      },
    ]);
  }
  const field = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <View>
        <Text style={s.title}>
          {doubts
            ? "Every doubt deserves an answer."
            : "Your medical community."}
        </Text>
        <Text style={s.subtitle}>
          {doubts
            ? "Ask, explain, and help each other understand."
            : "Medical ideas, resources, and conversations for every student."}
        </Text>
      </View>
      <View style={s.between}>
        <Button
          title={doubts ? "Community" : "Doubts"}
          variant="secondary"
          onPress={() =>
            doubts
              ? navigation.navigate("Main", { screen: "Community" })
              : navigation.navigate("Doubts")
          }
        />
        <Button
          title="Students"
          variant="secondary"
          onPress={() => navigation.navigate("Students", { id: null })}
        />
      </View>
      <XPLevel navigation={navigation} />
      <Button
        title={doubts ? "Ask a doubt" : "Create a post"}
        disabled={busy}
        onPress={() =>
          setForm({ title: "", subject: "General medicine", content: "" })
        }
      />
      <Text style={s.small}>
        Open to all students, including guests. Share medical-related content
        and cite sources. Leave patient identifiers out of posts.
      </Text>
      {!!failure && (
        <Text accessibilityRole="alert" style={s.error}>
          {failure}
        </Text>
      )}
      {form && (
        <View style={s.card}>
          <FormField
            label="Title"
            value={form.title}
            maxLength={150}
            editable={!busy}
            onChangeText={(v) => field("title", v)}
          />
          <FormField
            label="Medical subject"
            value={form.subject}
            maxLength={50}
            editable={!busy}
            onChangeText={(v) => field("subject", v)}
          />
          <FormField
            label={doubts ? "Your doubt and what you have tried" : "Post"}
            multiline
            value={form.content}
            maxLength={5000}
            editable={!busy}
            onChangeText={(v) => field("content", v)}
          />
          <Button
            title={doubts ? "Post doubt" : "Publish post"}
            loading={busy}
            onPress={() =>
              run(
                () => api.post(endpoint, form),
                (result) => {
                  setForm(null);
                  setSelected(result.id);
                },
              )
            }
          />
          <Button
            title="Cancel"
            variant="secondary"
            disabled={busy}
            onPress={() => setForm(null)}
          />
        </View>
      )}
      {!doubts && !selected && (
        <StoryShelf
          navigation={navigation}
          initialStoryId={route?.params?.storyId}
          initialCreate={route?.params?.createStory}
        />
      )}
      {selected ? (
        <Button
          title={doubts ? "All doubts" : "All posts"}
          variant="secondary"
          disabled={busy}
          onPress={() => {
            setSelected(null);
            setReply("");
          }}
        />
      ) : (
        <>
          <FormField
            label="Search"
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setOffset(0);
            }}
          />
          <FormField
            label="Subject filter"
            value={subject}
            onChangeText={(v) => {
              setSubject(v);
              setOffset(0);
            }}
          />
          {doubts && (
            <Chips
              label="Status"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setOffset(0);
              }}
              items={[
                { value: "all", label: "All doubts" },
                { value: "open", label: "Unsolved" },
                { value: "solved", label: "Solved" },
              ]}
            />
          )}
        </>
      )}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : selected ? (
        <>
          <View style={s.card}>
            <Author item={data} navigation={navigation} />
            <Text style={s.pillText}>
              {data.subject}
              {doubts ? (data.solved ? " · ✓ Solved" : " · Open doubt") : ""}
            </Text>
            <Text style={s.heading}>{data.title}</Text>
            <Text style={s.body}>{data.content}</Text>
            <Button
              title={`${data.liked ? "♥" : "♡"} ${data.likes} appreciations`}
              variant="secondary"
              disabled={busy}
              onPress={() =>
                run(() =>
                  api.put(`${endpoint}/${data.id}/like`, {
                    liked: !data.liked,
                  }),
                )
              }
            />
            <PostReactions item={data} busy={busy} onReact={react} />
            {data.mine && (
              <Button
                title="Delete post"
                variant="secondary"
                disabled={busy}
                onPress={() => remove(`${endpoint}/${data.id}`, true)}
              />
            )}
          </View>
          <Text style={s.heading}>
            {data.messages.length}{" "}
            {doubts
              ? data.messages.length === 1
                ? "answer"
                : "answers"
              : data.messages.length === 1
                ? "reply"
                : "replies"}
          </Text>
          {data.messages.map((message) => (
            <View
              key={message.id}
              style={[
                s.card,
                message.accepted && { borderColor: colors.success },
              ]}
            >
              <Author item={message} navigation={navigation} />
              {message.accepted && (
                <Text style={[s.pillText, { color: colors.success }]}>
                  ✓ Accepted solution
                </Text>
              )}
              <Text style={s.body}>{message.content}</Text>
              {doubts && data.mine && !message.mine && (
                <Button
                  title={message.accepted ? "Reopen doubt" : "Mark as solved"}
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    run(() =>
                      api.put(`${endpoint}/${data.id}/solution`, {
                        reply_id: message.accepted ? null : message.id,
                      }),
                    )
                  }
                />
              )}
              {message.mine && (
                <Button
                  title="Delete reply"
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    remove(`${endpoint}/replies/${message.id}`, false)
                  }
                />
              )}
            </View>
          ))}
          <View style={s.card}>
            <FormField
              label={
                doubts
                  ? "Share an answer with your reasoning"
                  : "Join the conversation"
              }
              multiline
              maxLength={5000}
              value={reply}
              editable={!busy}
              onChangeText={setReply}
            />
            <Button
              title={doubts ? "Post answer" : "Post reply"}
              loading={busy}
              onPress={() =>
                run(
                  () =>
                    api.post(`${endpoint}/${selected}/replies`, {
                      content: reply,
                    }),
                  () => setReply(""),
                )
              }
            />
          </View>
        </>
      ) : (
        <>
          {!data.items.length && (
            <Text style={s.small}>
              No matching posts yet. Start a medical conversation or ask your
              doubt.
            </Text>
          )}
          {data.items.map((item) => (
            <View key={item.id} style={s.card}>
              <Author item={item} navigation={navigation} />
              <Text style={s.pillText}>
                {item.subject}
                {doubts ? (item.solved ? " · ✓ Solved" : " · Open doubt") : ""}
              </Text>
              <Text style={s.heading}>{item.title}</Text>
              <Text style={s.body}>{item.content.slice(0, 200)}</Text>
              <Text style={s.small}>
                {item.likes} appreciations · {item.replies}{" "}
                {doubts
                  ? item.replies === 1
                    ? "answer"
                    : "answers"
                  : item.replies === 1
                    ? "reply"
                    : "replies"}
              </Text>
              <PostReactions item={item} busy={busy} onReact={react} />
              <Button
                title={doubts ? "View doubt" : "Join conversation"}
                variant="secondary"
                onPress={() => setSelected(item.id)}
              />
            </View>
          ))}
          <Button
            title="Previous page"
            variant="secondary"
            disabled={!offset}
            onPress={() => setOffset(Math.max(0, offset - 20))}
          />
          <Button
            title="Next page"
            variant="secondary"
            disabled={!data.has_more}
            onPress={() => setOffset(offset + 20)}
          />
        </>
      )}
    </Screen>
  );
}
