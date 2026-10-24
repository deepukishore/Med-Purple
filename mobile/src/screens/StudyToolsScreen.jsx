import React, { useState } from "react";
import { View, Text, TextInput, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors } from "../theme";
import { api, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { Skeleton, ErrorState } from "../components/States";
import MedByteCard from "../components/MedByteCard";

function Field({ label, value, onChange, multiline = false, numeric = false }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          s.input,
          multiline && { minHeight: 120, textAlignVertical: "top" },
        ]}
        value={String(value ?? "")}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={numeric ? "numeric" : "default"}
        maxLength={multiline ? 5000 : 200}
      />
    </View>
  );
}
const titles = {
  planner: "Make room for progress.",
  progress: "Your learning story.",
  tutor: "A little help. A clearer head.",
  resources: "Your curiosity toolkit.",
  lectures: "Short lessons. Big ideas.",
  community: "Your study circle.",
  notes: "Your ideas live here.",
  flashcards: "Make it stick.",
};
export default function StudyToolsScreen({ feature, navigation }) {
  const { user, notify } = useApp();
  const [selected, setSelected] = useState(null),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [query, setQuery] = useState(""),
    [answer, setAnswer] = useState(null),
    [reply, setReply] = useState(""),
    [offset, setOffset] = useState(0),
    [revealed, setRevealed] = useState(new Set());
  const path =
    feature === "community"
      ? selected
        ? "/community/" + selected
        : "/community?offset=" + offset
      : "/" + feature;
  const { data, loading, error, reload } = useData(path);
  const reviewData = useData("/flashcards/reviews");
  async function run(action, after) {
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      const result = await action();
      after?.(result);
      reload();
      reviewData.reload();
    } catch (e) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  function remove(path) {
    Alert.alert("Delete this item?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          run(
            () => api.delete(path),
            () => {
              setSelected(null);
              notify("Item deleted.");
            },
          ),
      },
    ]);
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: user.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const blank =
    feature === "planner"
      ? {
          title: "",
          subject: "General",
          day: today,
          time: "09:00",
          minutes: 25,
          done: false,
        }
      : feature === "community"
        ? { title: "", subject: "General", content: "" }
        : {
            title: "",
            subject: "General",
            content: "",
            kind: feature === "notes" ? "note" : "flashcard",
          };
  const editable = ["planner", "notes", "flashcards", "community"].includes(
    feature,
  );
  async function save() {
    const payload = { ...form };
    if (feature === "planner") payload.minutes = Number(payload.minutes);
    const endpoint =
      feature === "notes" || feature === "flashcards"
        ? "/saved"
        : "/" + feature;
    await run(
      () =>
        form.id
          ? api.put(endpoint + "/" + form.id, payload)
          : api.post(endpoint, payload),
      () => {
        setForm(null);
        notify("Saved to your study space.");
      },
    );
  }
  if (loading && !data) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <View>
        <Text style={s.pillText}>MED PURPLE · YOUR NEXT SMALL WIN</Text>
        <Text style={s.title}>{titles[feature]}</Text>
      </View>
      {failure ? (
        <Text style={s.error} accessibilityRole="alert">
          {failure}
        </Text>
      ) : null}
      {editable && (
        <Button
          title={
            feature === "community"
              ? "Start a discussion"
              : feature === "planner"
                ? "Add a study session"
                : "Create " + (feature === "notes" ? "note" : "flashcard")
          }
          onPress={() => setForm({ ...blank })}
        />
      )}
      {form && (
        <View style={s.card}>
          <Text style={s.heading}>
            {form.id ? "Edit your item" : "A fresh start"}
          </Text>
          <Field
            label={feature === "flashcards" ? "Question" : "Title"}
            value={form.title}
            onChange={(title) => setForm({ ...form, title })}
          />
          <Field
            label="Subject"
            value={form.subject}
            onChange={(subject) => setForm({ ...form, subject })}
          />
          {feature === "planner" ? (
            <>
              <Field
                label="Date (YYYY-MM-DD)"
                value={form.day}
                onChange={(day) => setForm({ ...form, day })}
              />
              <Field
                label="Start time (HH:MM)"
                value={form.time}
                onChange={(time) => setForm({ ...form, time })}
              />
              <Field
                label="Duration in minutes"
                numeric
                value={form.minutes}
                onChange={(minutes) => setForm({ ...form, minutes })}
              />
            </>
          ) : (
            <Field
              label={feature === "flashcards" ? "Answer" : "Content"}
              multiline
              value={form.content}
              onChange={(content) => setForm({ ...form, content })}
            />
          )}
          <Button title="Save" loading={busy} onPress={save} />
          <Button
            title="Cancel"
            disabled={busy}
            variant="secondary"
            onPress={() => setForm(null)}
          />
        </View>
      )}
      {feature === "planner" && (
        <>
          {!data?.length && (
            <Text style={s.small}>
              Your schedule is clear. Add a block for your next small win.
            </Text>
          )}
          {(data || []).map((b) => (
            <View style={s.card} key={b.id}>
              <Text style={s.pillText}>
                {b.day} · {b.time} · {b.minutes} min
              </Text>
              <Text style={s.heading}>{b.title}</Text>
              <Text style={s.small}>{b.subject}</Text>
              <Button
                title={
                  b.done ? "Completed · Mark incomplete" : "Mark completed"
                }
                disabled={busy}
                onPress={() =>
                  run(() =>
                    api.put("/planner/" + b.id, { ...b, done: !b.done }),
                  )
                }
              />
              <Button
                title="Edit or reschedule"
                variant="secondary"
                onPress={() => setForm(b)}
              />
              <Button
                title="Delete session"
                variant="secondary"
                disabled={busy}
                onPress={() => remove("/planner/" + b.id)}
              />
            </View>
          ))}
        </>
      )}
      {feature === "progress" && data && (
        <>
          <View style={[s.card, { backgroundColor: "#ede4fb" }]}>
            <Ionicons
              name="trophy-outline"
              size={36}
              color={colors.purple[600]}
            />
            <Text style={s.heading}>
              Level {data.level} · {data.xp} XP
            </Text>
            <Text style={s.small}>
              {data.streak} day streak · {data.accuracy}% accuracy
            </Text>
            <View style={s.progress}>
              <View
                style={[s.progressFill, { width: data.level_progress + "%" }]}
              />
            </View>
            <Text style={s.small}>
              {100 - data.level_progress} XP to the next level. New questions,
              videos, notes, planning, resources, and helping others all build
              one shared level.
            </Text>
          </View>
          <View style={s.card}>
            <Text style={s.heading}>Ways to earn XP</Text>
            {data.reward_rules?.map((rule) => (
              <Text style={s.body} key={rule.activity}>
                {rule.title}:{" "}
                {rule.points ? `+${rule.points} XP` : "quest rewards"}
                {rule.daily_cap ? ` · up to ${rule.daily_cap}/day` : ""}
              </Text>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.heading}>Recent XP activity</Text>
            {data.xp_history?.map((event) => (
              <Text style={s.body} key={event.id}>
                {data.reward_rules.find(
                  (rule) => rule.activity === event.activity,
                )?.title || event.activity}{" "}
                · +{event.points} XP · {event.day}
              </Text>
            ))}
          </View>
          {data.subjects.map((x) => (
            <View style={s.card} key={x.subject}>
              <Text style={s.heading}>{x.subject}</Text>
              <Text style={s.small}>
                {x.answered}/{x.total} explored ·{" "}
                {x.accuracy === null
                  ? "Ready to start"
                  : x.accuracy + "% accuracy"}
              </Text>
              <Button
                title="Practice"
                onPress={() =>
                  navigation.navigate("MCQs", { subject: x.subject })
                }
              />
            </View>
          ))}
          <Text style={s.heading}>Your badge shelf</Text>
          {data.badges.map((b) => (
            <View
              style={[s.card, b.earned && { backgroundColor: "#fff4d9" }]}
              key={b.name}
            >
              <Text style={s.heading}>
                {b.earned ? "★ " : "☆ "}
                {b.name}
              </Text>
              <Text style={s.small}>{b.description}</Text>
            </View>
          ))}
        </>
      )}
      {feature === "tutor" && (
        <>
          <Text style={s.small}>
            Source-linked explanations from your library. This coach does not
            generate AI answers.
          </Text>
          <Field
            label="What are you studying?"
            value={query}
            onChange={setQuery}
          />
          <Button
            title="Find explanations"
            loading={busy}
            onPress={() =>
              run(() => api.post("/tutor", { question: query }), setAnswer)
            }
          />
          {answer && (
            <>
              <Text style={s.heading}>{answer.message}</Text>
              {answer.results.map((r, i) => (
                <View style={s.card} key={i}>
                  <Text style={s.heading}>{r.title}</Text>
                  <Text style={s.body}>{r.content}</Text>
                  <Button
                    title="Read source"
                    variant="secondary"
                    onPress={() =>
                      Linking.openURL(r.source_url).catch(() =>
                        notify("Cannot open this link."),
                      )
                    }
                  />
                </View>
              ))}
            </>
          )}
          {data?.suggestions.map((t) => (
            <Text style={s.body} key={t}>
              • {t}
            </Text>
          ))}
        </>
      )}
      {feature === "resources" && (
        <>
          <Field label="Search resources" value={query} onChange={setQuery} />
          {data?.items
            .filter((x) =>
              (x.title + " " + x.subject)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((r) => (
              <View style={s.card} key={r.url}>
                <Text style={s.pillText}>{r.subject}</Text>
                <Text style={s.heading}>{r.title}</Text>
                <Button
                  title="Open textbook reading"
                  onPress={async () => {
                    try {
                      await Linking.openURL(r.url);
                      const result = await api.post("/activities/resource", {
                        url: r.url,
                      });
                      if (result.xp_earned)
                        notify(`Resource explored. +${result.xp_earned} XP`);
                    } catch (e) {
                      notify(e.message || "Cannot open this link.");
                    }
                  }}
                />
              </View>
            ))}
        </>
      )}
      {feature === "lectures" && (
        <>
          <Text style={s.small}>
            Captioned foundation animations, organized by subject.
          </Text>
          {selected ? (
            <>
              <Button
                title="Back to lessons"
                variant="secondary"
                onPress={() => setSelected(null)}
              />
              <MedByteCard
                clip={selected}
                active
                height={650}
                onComplete={(id) =>
                  run(
                    () => api.post("/medbytes/" + id + "/complete"),
                    () => setSelected(null),
                  )
                }
              />
            </>
          ) : (
            data?.items.map((c) => (
              <View style={s.card} key={c.id}>
                <Text style={s.pillText}>
                  {c.subject} · {c.duration}s
                </Text>
                <Text style={s.heading}>{c.title}</Text>
                <Button
                  title={c.watched ? "Watch again" : "Watch lesson"}
                  onPress={() => setSelected(c)}
                />
              </View>
            ))
          )}
        </>
      )}
      {["notes", "flashcards"].includes(feature) && (
        <>
          <Field label="Search your ideas" value={query} onChange={setQuery} />
          {!data?.length && (
            <Text style={s.small}>
              Create your first idea, or save a takeaway from MedBytes.
            </Text>
          )}
          {(data || [])
            .filter((x) =>
              (x.title + " " + x.subject + " " + x.content)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((item) => {
              const flash = feature === "flashcards",
                review = reviewData.data?.find((r) => r.item_id === item.id),
                due = !review || review.due <= today;
              return (
                <View style={s.card} key={item.id}>
                  <Text style={s.pillText}>
                    {item.subject}
                    {flash
                      ? " · " + (due ? "Due today" : "Review " + review.due)
                      : ""}
                  </Text>
                  <Text style={s.heading}>{item.title}</Text>
                  {(!flash || revealed.has(item.id)) && (
                    <Text style={s.body}>{item.content}</Text>
                  )}
                  {flash && (
                    <Button
                      title={
                        revealed.has(item.id) ? "Hide answer" : "Reveal answer"
                      }
                      variant="secondary"
                      onPress={() =>
                        setRevealed((old) => {
                          const next = new Set(old);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                    />
                  )}
                  {flash &&
                    revealed.has(item.id) &&
                    due &&
                    ["again", "good", "easy"].map((rating) => (
                      <Button
                        key={rating}
                        title={
                          {
                            again: "Again today",
                            good: "Got it",
                            easy: "Easy",
                          }[rating]
                        }
                        disabled={busy}
                        variant="secondary"
                        onPress={() =>
                          run(
                            () =>
                              api.post("/flashcards/" + item.id + "/review", {
                                rating,
                              }),
                            () => {
                              setRevealed((old) => {
                                const next = new Set(old);
                                next.delete(item.id);
                                return next;
                              });
                              notify("Next review saved.");
                            },
                          )
                        }
                      />
                    ))}
                  <Button
                    title="Edit"
                    variant="secondary"
                    onPress={() => setForm(item)}
                  />
                  <Button
                    title="Delete"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => remove("/saved/" + item.id)}
                  />
                </View>
              );
            })}
        </>
      )}
      {feature === "community" && (
        <>
          <Text style={s.small}>
            Visible to other students. Be kind and protect personal details.
          </Text>
          {selected ? (
            <>
              <Button
                title="All discussions"
                variant="secondary"
                onPress={() => setSelected(null)}
              />
              <View style={s.card}>
                <Text style={s.heading}>{data.title}</Text>
                <Text style={s.body}>{data.content}</Text>
                <Text style={s.small}>By {data.author}</Text>
                {data.mine && (
                  <Button
                    title="Delete discussion"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => remove("/community/" + data.id)}
                  />
                )}
              </View>
              {data.messages?.map((m) => (
                <View style={s.card} key={m.id}>
                  <Text style={s.heading}>{m.author}</Text>
                  <Text style={s.body}>{m.content}</Text>
                  {m.mine && (
                    <Button
                      title="Delete reply"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => remove("/community/replies/" + m.id)}
                    />
                  )}
                </View>
              ))}
              <Field
                label="Reply"
                multiline
                value={reply}
                onChange={setReply}
              />
              <Button
                title="Post reply"
                loading={busy}
                onPress={() =>
                  run(
                    () =>
                      api.post("/community/" + selected + "/replies", {
                        content: reply,
                      }),
                    () => setReply(""),
                  )
                }
              />
            </>
          ) : (
            <>
              {!data?.items.length && (
                <Text style={s.small}>
                  The circle starts with a hello. Start the first discussion.
                </Text>
              )}
              {data?.items.map((t) => (
                <View style={s.card} key={t.id}>
                  <Text style={s.pillText}>{t.subject}</Text>
                  <Text style={s.heading}>{t.title}</Text>
                  <Text style={s.small}>
                    {t.author} · {t.replies} replies
                  </Text>
                  <Button
                    title="Join discussion"
                    variant="secondary"
                    onPress={() => setSelected(t.id)}
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
                disabled={!data?.has_more}
                onPress={() => setOffset(offset + 20)}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
