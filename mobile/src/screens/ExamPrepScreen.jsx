import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import useData from "../hooks/useData";
import { api } from "../context/AppContext";
import { colors, styles as s } from "../theme";

const tracks = {
  "NEET PG": { days: 126, goal: 40, focus: "Pathology" },
  USMLE: { days: 182, goal: 30, focus: "Pharmacology" },
  FMGE: { days: 94, goal: 35, focus: "Medicine" },
};
const weakAreas = [
  ["Renal physiology", "Physiology", 42],
  ["Autonomic pharmacology", "Pharmacology", 48],
  ["Cardiac murmurs", "Medicine", 55],
  ["Brachial plexus", "Anatomy", 61],
  ["Nephrotic syndrome", "Pathology", 64],
];
const pyqs = [
  ["2025", "Anatomy", "Axillary artery branches", "3 min"],
  ["2024", "Medicine", "Approach to metabolic acidosis", "5 min"],
  ["2023", "Pharmacology", "Beta blocker contraindications", "4 min"],
  ["2022", "Pathology", "Nephrotic syndrome patterns", "6 min"],
];
const recalls = [
  [
    "Cushing reflex",
    "Raised ICP causes hypertension, bradycardia and irregular respiration.",
  ],
  [
    "Starling forces",
    "Net filtration depends on hydrostatic and oncotic pressure across the capillary.",
  ],
  ["Anion gap", "Na − (Cl + HCO3); use it to uncover unmeasured anions."],
];
const Choice = ({ items, value, onChange }) => (
  <View style={[s.row, { flexWrap: "wrap" }]}>
    {items.map((item) => (
      <Pressable
        key={item}
        onPress={() => onChange(item)}
        style={[
          s.pill,
          {
            backgroundColor:
              item === value ? colors.purple[700] : colors.purple[50],
          },
        ]}
      >
        <Text style={[s.pillText, item === value && { color: "white" }]}>
          {item}
        </Text>
      </Pressable>
    ))}
  </View>
);
export default function ExamPrepScreen({ navigation }) {
  const feature = useData("/features"),
    dashboard = useData("/dashboard");
  const [track, setTrack] = useState("NEET PG"),
    [year, setYear] = useState("All years"),
    [subject, setSubject] = useState("All subjects"),
    [revealed, setRevealed] = useState(-1),
    [notes, setNotes] = useState({});
  useEffect(() => {
    if (tracks[feature.data?.exam_track]) setTrack(feature.data.exam_track);
    if (feature.data?.mistake_notes) setNotes(feature.data.mistake_notes);
  }, [feature.data]);
  async function chooseTrack(value) {
    setTrack(value);
    try {
      await api.patch("/features", { exam_track: value });
    } catch {
      /* keep local choice available */
    }
  }
  async function updateNote(key, value) {
    const next = { ...notes, [key]: value };
    setNotes(next);
    try {
      await api.patch("/features", { mistake_notes: next });
    } catch {
      /* draft remains visible */
    }
  }
  const current = tracks[track],
    done = dashboard.data?.answered_today || 0,
    accuracy = dashboard.data?.accuracy || 0;
  return (
    <Screen>
      <View
        style={[
          s.card,
          {
            backgroundColor: colors.purple[800],
            borderColor: colors.purple[600],
          },
        ]}
      >
        <Text style={[s.pillText, { color: colors.purple[100] }]}>
          YOUR EXAM, YOUR DAILY EDGE
        </Text>
        <Text style={[s.title, { color: "white", fontSize: 28 }]}>
          Prep that remembers where you get stuck.
        </Text>
        <Text style={[s.subtitle, { color: "#e6d9f1" }]}>
          A focused home for your target track, weak areas and the mistakes
          worth revisiting.
        </Text>
        <Button
          title="Open mistake notebook"
          variant="accent"
          onPress={() => navigation.navigate("MCQs", { mode: "mistakes" })}
        />
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Choose your exam track</Text>
        <Choice
          items={Object.keys(tracks)}
          value={track}
          onChange={chooseTrack}
        />
        <View style={[s.row, { marginTop: 12 }]}>
          {[
            [track, "Current target"],
            [current.days, "Days to target"],
            [`${done}/${current.goal}`, "Questions today"],
            [`${accuracy}%`, "Accuracy"],
          ].map(([value, label]) => (
            <View key={label} style={{ flex: 1, minWidth: 70, gap: 4 }}>
              <Text style={[s.heading, { color: colors.purple[700] }]}>
                {value}
              </Text>
              <Text style={s.small}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={s.progress}>
          <View
            style={[
              s.progressFill,
              { width: `${Math.min((done / current.goal) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={s.small}>
          {current.goal - Math.min(done, current.goal)} questions to reach
          today’s target. Focus: {current.focus}.
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Weak areas to revisit</Text>
        {weakAreas.map(([title, area, score]) => (
          <Pressable
            key={title}
            onPress={() => navigation.navigate("MCQs", { subject: area })}
            style={{
              paddingVertical: 10,
              borderTopWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View style={s.between}>
              <Text style={s.heading}>{title}</Text>
              <Text style={[s.pillText, { color: colors.danger }]}>
                {score}%
              </Text>
            </View>
            <Text style={s.small}>{area} · Tap to practice questions</Text>
            <View style={s.progress}>
              <View style={[s.progressFill, { width: `${score}%` }]} />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Previous-year questions</Text>
        <Text style={s.small}>Browse a quick mixed set from recent exams.</Text>
        <Choice
          items={["All years", "2025", "2024", "2023", "2022"]}
          value={year}
          onChange={setYear}
        />
        <Choice
          items={[
            "All subjects",
            "Anatomy",
            "Medicine",
            "Pharmacology",
            "Pathology",
          ]}
          value={subject}
          onChange={setSubject}
        />
        {pyqs
          .filter(
            (x) =>
              (year === "All years" || x[0] === year) &&
              (subject === "All subjects" || x[1] === subject),
          )
          .map(([y, area, title, time]) => (
            <Pressable
              key={title}
              onPress={() => navigation.navigate("MCQs", { subject: area })}
              style={{
                paddingVertical: 10,
                borderTopWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Text style={s.pillText}>
                {y} · {area} · {time}
              </Text>
              <Text style={s.heading}>{title}</Text>
            </Pressable>
          ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Mistake notebook</Text>
        <Text style={s.small}>Keep a short cue for your next revision.</Text>
        {weakAreas.slice(0, 3).map(([title], index) => (
          <View key={title} style={{ gap: 5, marginTop: 9 }}>
            <Text style={s.label}>{title}</Text>
            <TextInput
              style={s.input}
              placeholder="What will you remember next time?"
              value={notes[index] || ""}
              onChangeText={(value) => updateNote(index, value)}
            />
          </View>
        ))}
        <Button
          title="Review missed questions"
          variant="secondary"
          onPress={() => navigation.navigate("MCQs", { mode: "mistakes" })}
        />
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Rapid recall</Text>
        {recalls.map(([prompt, answer], index) => (
          <View
            key={prompt}
            style={{
              paddingVertical: 10,
              borderTopWidth: 1,
              borderColor: colors.line,
              gap: 7,
            }}
          >
            <Text style={s.heading}>{prompt}</Text>
            {revealed === index && <Text style={s.small}>{answer}</Text>}
            <Button
              title={revealed === index ? "Hide answer" : "Reveal answer"}
              variant="secondary"
              onPress={() => setRevealed(revealed === index ? -1 : index)}
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}
