import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import { colors, fonts, styles as s } from "../theme";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { ErrorState, Skeleton } from "../components/States";

const samples = [
  ["mcq-renal", "MCQ", "Renal physiology sprint", "Physiology"],
  ["card-ecg", "Flashcard", "ECG axis basics", "Medicine"],
  ["note-shock", "Note", "Shock: first principles", "Medicine"],
  [
    "video-nephron",
    "Video",
    "How the nephron concentrates urine",
    "Physiology",
  ],
];
const presets = [5, 15, 60];
function Action({ title, onPress, danger = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        s.pill,
        { backgroundColor: danger ? colors.dangerTint : colors.purple[50] },
      ]}
    >
      <Text style={[s.pillText, danger && { color: colors.danger }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export default function StudyHubScreen({ navigation }) {
  const { notify } = useApp();
  const sets = useData("/study-sets"),
    history = useData("/study-history"),
    shared = useData("/shared-notes");
  const [minutes, setMinutes] = useState(15),
    [selected, setSelected] = useState(["mcq-renal", "card-ecg"]),
    [remaining, setRemaining] = useState(0),
    [running, setRunning] = useState(false);
  const [form, setForm] = useState(null),
    [note, setNote] = useState(null);
  const chosen = samples
    .filter((item) => selected.includes(item[0]))
    .map(([id, kind, title, subject]) => ({ id, kind, title, subject }));
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(
      () =>
        setRemaining((n) => {
          if (n <= 1) {
            clearInterval(timer);
            setRunning(false);
            notify("Study mode complete. Nice work!");
            return 0;
          }
          return n - 1;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [running, notify]);
  async function start() {
    setRemaining(minutes * 60);
    setRunning(true);
    try {
      await api.post("/study-history", {
        kind: "timed-session",
        title: `${minutes}-minute study mode`,
        subject: "Mixed revision",
        metadata: { minutes, items: chosen },
      });
      history.reload();
    } catch (e) {
      notify(e.message);
    }
  }
  async function saveSet() {
    if (!form?.title?.trim()) return;
    try {
      await api.post("/study-sets", { ...form, items: chosen });
      setForm(null);
      sets.reload();
      notify("Study set saved.");
    } catch (e) {
      notify(e.message);
    }
  }
  async function saveSharedNote() {
    if (!note?.title?.trim()) return;
    try {
      note.id
        ? await api.put(`/shared-notes/${note.id}`, note)
        : await api.post("/shared-notes", note);
      setNote(null);
      shared.reload();
      notify("Shared class note saved.");
    } catch (e) {
      notify(e.message);
    }
  }
  async function removeSet(item) {
    Alert.alert("Delete this study set?", item.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/study-sets/${item.id}`);
            sets.reload();
          } catch (e) {
            notify(e.message);
          }
        },
      },
    ]);
  }
  async function buildPlan() {
    try {
      const result = await api.post("/planner/auto", {
        subjects: ["Anatomy", "Medicine", "Physiology"],
        days: 7,
        minutes: 30,
      });
      notify(
        result.length
          ? "Your seven-day plan is ready."
          : "Your planner already has sessions for those days.",
      );
    } catch (e) {
      notify(e.message);
    }
  }
  if (sets.loading && !sets.data) return <Skeleton />;
  if (sets.error)
    return <ErrorState message={sets.error} onRetry={sets.reload} />;
  return (
    <Screen onRefresh={sets.reload} refreshing={sets.loading}>
      <View style={s.card}>
        <Text style={s.pillText}>MAKE THE TIME YOU HAVE COUNT</Text>
        <Text style={s.title}>Build a study session that fits real life.</Text>
        <Text style={s.subtitle}>
          Mix questions, cards, notes and videos, then choose five minutes,
          fifteen, or an hour.
        </Text>
        <Button
          title="Open study planner"
          variant="secondary"
          onPress={() => navigation.navigate("Planner")}
        />
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <Text style={s.heading}>Timed study mode</Text>
          <Ionicons name="timer-outline" size={23} color={colors.purple[600]} />
        </View>
        <Text style={s.small}>A small session is still a real session.</Text>
        <View style={s.row}>
          {presets.map((n) => (
            <Pressable
              key={n}
              onPress={() => setMinutes(n)}
              style={[
                s.pill,
                {
                  backgroundColor:
                    minutes === n ? colors.purple[700] : colors.purple[50],
                },
              ]}
            >
              <Text style={[s.pillText, minutes === n && { color: "white" }]}>
                {n} min
              </Text>
            </Pressable>
          ))}
        </View>
        {samples.map(([id, kind, title]) => (
          <Pressable
            key={id}
            onPress={() =>
              setSelected((v) =>
                v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
              )
            }
            style={[s.between, { paddingVertical: 7 }]}
          >
            <Text style={[s.small, { flex: 1 }]}>
              {kind} · {title}
            </Text>
            <Ionicons
              name={selected.includes(id) ? "checkbox" : "square-outline"}
              color={colors.purple[600]}
              size={21}
            />
          </Pressable>
        ))}
        <View
          style={[
            s.between,
            { borderTopWidth: 1, borderColor: colors.line, paddingTop: 14 },
          ]}
        >
          <View>
            <Text style={s.heading}>
              {running
                ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
                : `${minutes}:00`}
            </Text>
            <Text style={s.small}>
              {running
                ? "Focus mode is running"
                : `${chosen.length} items selected`}
            </Text>
          </View>
          <Button
            title={running ? "In progress" : "Start session"}
            disabled={!chosen.length || running}
            onPress={start}
          />
        </View>
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <View>
            <Text style={s.heading}>Your custom study sets</Text>
            <Text style={s.small}>Build a playlist for your revision.</Text>
          </View>
          <Action
            title="+ New set"
            onPress={() => setForm({ title: "", description: "" })}
          />
        </View>
        {form && (
          <View style={{ gap: 10 }}>
            <TextInput
              style={s.input}
              placeholder="Set name"
              value={form.title}
              onChangeText={(title) => setForm({ ...form, title })}
            />
            <TextInput
              style={[s.input, { minHeight: 75 }]}
              multiline
              placeholder="Description"
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
            />
            <View style={s.row}>
              <Button title="Save set" onPress={saveSet} />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setForm(null)}
              />
            </View>
          </View>
        )}
        {(sets.data || []).map((item) => (
          <View
            key={item.id}
            style={[
              s.between,
              {
                paddingVertical: 10,
                borderTopWidth: 1,
                borderColor: colors.line,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.heading}>{item.title}</Text>
              <Text style={s.small}>
                {item.description || "Mixed revision"}
              </Text>
            </View>
            <Action
              title="Use"
              onPress={() => {
                setSelected(item.items.map((x) => x.id));
                notify("Set loaded into your timer.");
              }}
            />
            <Action title="Delete" danger onPress={() => removeSet(item)} />
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Copy a starter template</Text>
        {[
          [
            "Cardiology revision week",
            "MCQs, ECG flashcards, short video",
            ["mcq-renal", "card-ecg"],
          ],
          [
            "Night-before rapid review",
            "High-yield notes and mistakes",
            ["note-shock", "card-ecg"],
          ],
        ].map(([title, description, ids]) => (
          <View key={title} style={[s.between, { paddingVertical: 9 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.heading}>{title}</Text>
              <Text style={s.small}>{description}</Text>
            </View>
            <Action
              title="Copy"
              onPress={async () => {
                try {
                  await api.post("/study-sets", {
                    title,
                    description,
                    items: samples
                      .filter((x) => ids.includes(x[0]))
                      .map(([id, kind, name, subject]) => ({
                        id,
                        kind,
                        title: name,
                        subject,
                      })),
                  });
                  sets.reload();
                  notify("Template copied to your study sets.");
                } catch (e) {
                  notify(e.message);
                }
              }}
            />
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Continue where you left off</Text>
        {(history.data || []).slice(0, 5).map((item) => (
          <View key={item.id} style={{ paddingVertical: 8 }}>
            <Text style={s.heading}>{item.title}</Text>
            <Text style={s.small}>{item.subject}</Text>
          </View>
        ))}
        {!(history.data || []).length && (
          <Text style={s.small}>Your next session will appear here.</Text>
        )}
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>Shared class note</Text>
            <Text style={s.small}>A collaborative study-circle summary.</Text>
          </View>
          <Action
            title="+ New"
            onPress={() => setNote({ title: "", content: "" })}
          />
        </View>
        {note && (
          <View style={{ gap: 10 }}>
            <TextInput
              style={s.input}
              placeholder="Title"
              value={note.title}
              onChangeText={(title) => setNote({ ...note, title })}
            />
            <TextInput
              style={[s.input, { minHeight: 90 }]}
              multiline
              placeholder="Write a class note"
              value={note.content}
              onChangeText={(content) => setNote({ ...note, content })}
            />
            <View style={s.row}>
              <Button title="Save note" onPress={saveSharedNote} />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setNote(null)}
              />
            </View>
          </View>
        )}
        {(shared.data || []).slice(0, 4).map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              setNote({ id: item.id, title: item.title, content: item.content })
            }
            style={{ paddingVertical: 9 }}
          >
            <Text style={s.heading}>{item.title} · Edit</Text>
            <Text style={s.small}>{item.content?.slice(0, 100)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Smart nudge</Text>
        <Text style={s.small}>
          Let your planner turn these sessions into a weekly routine.
        </Text>
        <Button title="Build a 7-day plan" onPress={buildPlan} />
      </View>
    </Screen>
  );
}
