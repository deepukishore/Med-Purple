import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Button from "../components/Button";
import useData from "../hooks/useData";
import { api } from "../context/AppContext";
import { colors, styles as s } from "../theme";

const ecgAnswers = [
  "Sinus rhythm",
  "Atrial fibrillation",
  "Ventricular tachycardia",
  "Heart block",
];
const differentialOptions = [
  "Pulmonary embolism",
  "Pneumonia",
  "Acute pericarditis",
  "Myocardial infarction",
];
const viva = [
  [
    "First-line treatment for anaphylaxis?",
    "IM adrenaline in the anterolateral thigh.",
  ],
  [
    "Boundaries of the femoral triangle?",
    "Inguinal ligament, sartorius and adductor longus.",
  ],
  [
    "What does a raised JVP suggest?",
    "Raised right atrial pressure, often from right heart failure or fluid overload.",
  ],
];
export default function ClinicalScreen({ navigation }) {
  const { data } = useData("/features");
  const [state, setState] = useState({}),
    [logs, setLogs] = useState([]),
    [answer, setAnswer] = useState(""),
    [checked, setChecked] = useState(false),
    [differentials, setDifferentials] = useState([]),
    [chat, setChat] = useState([
      {
        from: "patient",
        text: "I have had chest pain for two hours, especially when I walk.",
      },
    ]),
    [question, setQuestion] = useState(""),
    [diagnosis, setDiagnosis] = useState(""),
    [openViva, setOpenViva] = useState(-1),
    [logName, setLogName] = useState(""),
    [logNote, setLogNote] = useState("");
  useEffect(() => {
    if (!data) return;
    setState(data.clinical_state || {});
    setLogs(data.clinical_logs || []);
    setAnswer(data.clinical_state?.image_answer || "");
    setChecked(Boolean(data.clinical_state?.image_done));
    setDifferentials(data.clinical_state?.differentials || []);
    setChat(
      data.clinical_state?.patient_messages || [
        {
          from: "patient",
          text: "I have had chest pain for two hours, especially when I walk.",
        },
      ],
    );
    setDiagnosis(data.clinical_state?.diagnosis || "");
  }, [data]);
  async function saveState(next) {
    const merged = { ...state, ...next };
    setState(merged);
    try {
      await api.patch("/features", { clinical_state: merged });
    } catch {
      /* keep interaction usable offline */
    }
  }
  function chooseDifferential(item) {
    const next = differentials.includes(item)
      ? differentials.filter((x) => x !== item)
      : [...differentials, item];
    setDifferentials(next);
    saveState({ differentials: next });
  }
  function ask() {
    if (!question.trim()) return;
    const next = [
      ...chat,
      { from: "you", text: question.trim() },
      {
        from: "patient",
        text: question.toLowerCase().includes("fever")
          ? "Yes, I have felt feverish since yesterday."
          : "No, I have not noticed anything else.",
      },
    ];
    setChat(next);
    setQuestion("");
    saveState({ patient_messages: next });
  }
  async function addLog() {
    if (!logName.trim()) return;
    const next = [
      { caseName: logName.trim(), type: "Case seen", note: logNote.trim() },
      ...logs,
    ];
    setLogs(next);
    setLogName("");
    setLogNote("");
    try {
      await api.patch("/features", { clinical_logs: next });
    } catch {
      Alert.alert(
        "Saved on this screen",
        "Could not sync the posting log right now.",
      );
    }
  }
  const choice = (title, active, onPress) => (
    <Pressable
      key={title}
      onPress={onPress}
      style={[
        s.pill,
        {
          backgroundColor: active ? colors.purple[700] : colors.purple[50],
          marginBottom: 5,
        },
      ]}
    >
      <Text style={[s.pillText, active && { color: "white" }]}>
        {active ? "✓ " : ""}
        {title}
      </Text>
    </Pressable>
  );
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
          FROM THEORY TO THE WARD
        </Text>
        <Text style={[s.title, { color: "white", fontSize: 28 }]}>
          Think like a clinician, one case at a time.
        </Text>
        <Text style={[s.subtitle, { color: "#e6d9f1" }]}>
          Interpret findings, take a history, build a differential, and log what
          you learn.
        </Text>
        <Button
          title="Medicine question sprint"
          variant="accent"
          onPress={() =>
            navigation.navigate("MCQs", { subject: "Medicine", set: 5 })
          }
        />
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <Text style={s.heading}>Image interpretation</Text>
          <Ionicons name="pulse-outline" size={22} color={colors.purple[600]} />
        </View>
        <Text style={s.small}>Read the ECG before choosing the finding.</Text>
        <View
          style={{
            minHeight: 120,
            borderRadius: 16,
            backgroundColor: "#29183e",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Text style={{ color: "#dfff91", fontSize: 22, letterSpacing: 2 }}>
            〰 ──╱╲╱╲────
          </Text>
          <Text style={{ color: "#e6d9f1", fontSize: 10, marginTop: 5 }}>
            ECG / CASE 04
          </Text>
        </View>
        <Text style={s.heading}>What is the most likely rhythm?</Text>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {ecgAnswers.map((item) =>
            choice(item, answer === item, () => setAnswer(item)),
          )}
        </View>
        <Button
          title={checked ? "Correct — sinus rhythm · +20 XP" : "Check finding"}
          disabled={!answer || checked}
          onPress={() => {
            const correct = answer === "Sinus rhythm";
            setChecked(true);
            saveState({ image_answer: answer, image_done: true });
            if (!correct)
              Alert.alert(
                "Review the tracing",
                "The correct answer is sinus rhythm. Try again tomorrow.",
              );
          }}
        />
        {checked && (
          <Text style={s.pillText}>This tracing shows sinus rhythm.</Text>
        )}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Virtual patient</Text>
        <Text style={s.small}>
          Ask history questions, then enter your diagnosis.
        </Text>
        {chat.slice(-6).map((item, i) => (
          <View
            key={i}
            style={[
              s.pill,
              {
                alignSelf: item.from === "you" ? "flex-end" : "flex-start",
                backgroundColor:
                  item.from === "you" ? colors.purple[100] : colors.canvas,
                maxWidth: "90%",
              },
            ]}
          >
            <Text style={s.small}>{item.text}</Text>
          </View>
        ))}
        <TextInput
          style={s.input}
          placeholder="Ask about symptoms..."
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={ask}
        />
        <Button title="Ask patient" variant="secondary" onPress={ask} />
        <TextInput
          style={s.input}
          placeholder="Your diagnosis"
          value={diagnosis}
          onChangeText={(value) => {
            setDiagnosis(value);
            saveState({ diagnosis: value });
          }}
        />
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Differential diagnosis game</Text>
        <Text style={s.small}>
          Sudden pleuritic chest pain + tachycardia. Choose each plausible
          diagnosis.
        </Text>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {differentialOptions.map((item) =>
            choice(item, differentials.includes(item), () =>
              chooseDifferential(item),
            ),
          )}
        </View>
        <Text style={s.small}>{differentials.length} diagnoses selected</Text>
        <Button
          title="Score differential"
          variant="secondary"
          onPress={() =>
            Alert.alert(
              "Differential scored",
              "Pulmonary embolism and pneumonia are plausible. Consider the full context of the case.",
            )
          }
        />
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Viva practice</Text>
        <Text style={s.small}>Try saying the answer before revealing it.</Text>
        {viva.map(([prompt, model], index) => (
          <View
            key={prompt}
            style={{
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingVertical: 11,
              gap: 8,
            }}
          >
            <Text style={s.heading}>{prompt}</Text>
            {openViva === index && <Text style={s.small}>{model}</Text>}
            <Button
              title={openViva === index ? "Hide answer" : "Reveal answer"}
              variant="secondary"
              onPress={() => setOpenViva(openViva === index ? -1 : index)}
            />
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Clinical postings log</Text>
        <Text style={s.small}>
          Keep a private record of cases and learning points.
        </Text>
        <TextInput
          style={s.input}
          placeholder="Case or procedure"
          value={logName}
          onChangeText={setLogName}
        />
        <TextInput
          style={[s.input, { minHeight: 75, textAlignVertical: "top" }]}
          multiline
          placeholder="What will you remember?"
          value={logNote}
          onChangeText={setLogNote}
        />
        <Button title="Add to log" onPress={addLog} />
        {logs.map((item, index) => (
          <View
            key={`${item.caseName}-${index}`}
            style={{
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingTop: 10,
            }}
          >
            <Text style={s.heading}>{item.caseName}</Text>
            <Text style={s.small}>
              {item.type} · {item.note || "No learning point yet."}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
