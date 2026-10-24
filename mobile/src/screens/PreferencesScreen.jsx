import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import Button from "../components/Button";
import useData from "../hooks/useData";
import { api, useApp } from "../context/AppContext";
import { colors, styles as s } from "../theme";

const subjects = [
  "Anatomy",
  "Physiology",
  "Medicine",
  "Pathology",
  "Pharmacology",
  "Community medicine",
];
const defaultPrefs = {
  language: "English",
  difficulty: "Suggested",
  subjects: ["Anatomy", "Physiology"],
  widgets: [
    "Daily question",
    "Planner",
    "Streak",
    "Community feed",
    "Exam countdown",
  ],
  readingMode: false,
  nightMode: false,
};
const Choice = ({ values, value, onChange }) => (
  <View style={[s.row, { flexWrap: "wrap" }]}>
    {values.map((item) => (
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
export default function PreferencesScreen({ navigation }) {
  const { data } = useData("/features"),
    { notify } = useApp();
  const [prefs, setPrefs] = useState(defaultPrefs);
  useEffect(() => {
    if (data?.preferences)
      setPrefs((old) => ({
        ...old,
        ...data.preferences,
        widgets: data.preferences.widgets || old.widgets,
      }));
  }, [data]);
  async function save(next) {
    setPrefs(next);
    try {
      await api.patch("/features", { preferences: next });
      notify("Preferences saved.");
    } catch (e) {
      notify(e.message);
    }
  }
  function toggleSubject(subject) {
    const selected = prefs.subjects.includes(subject)
      ? prefs.subjects.filter((x) => x !== subject)
      : [...prefs.subjects, subject];
    save({ ...prefs, subjects: selected });
  }
  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= prefs.widgets.length) return;
    const widgets = [...prefs.widgets];
    [widgets[index], widgets[target]] = [widgets[target], widgets[index]];
    save({ ...prefs, widgets });
  }
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
          YOUR DESK, YOUR RULES
        </Text>
        <Text style={[s.title, { color: "white", fontSize: 29 }]}>
          Make Med Purple fit the way you study.
        </Text>
        <Text style={[s.subtitle, { color: "#e6d9f1" }]}>
          Your choices shape suggestions and study sessions. Change them
          anytime.
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Choose your focus</Text>
        <Text style={s.small}>
          Pick the subjects you want to see in your suggestions.
        </Text>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {subjects.map((subject) => {
            const active = prefs.subjects.includes(subject);
            return (
              <Pressable
                key={subject}
                onPress={() => toggleSubject(subject)}
                style={[
                  s.pill,
                  {
                    backgroundColor: active
                      ? colors.purple[700]
                      : colors.purple[50],
                  },
                ]}
              >
                <Text style={[s.pillText, active && { color: "white" }]}>
                  {active ? "✓ " : "+ "}
                  {subject}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Language and difficulty</Text>
        <Text style={s.label}>Explanation language</Text>
        <Choice
          values={["English", "हिन्दी", "বাংলা", "தமிழ்", "తెలుగు", "मराठी"]}
          value={prefs.language}
          onChange={(language) => save({ ...prefs, language })}
        />
        <Text style={s.label}>Quiz difficulty</Text>
        <Choice
          values={["Suggested", "Easy", "Medium", "Exam-level"]}
          value={prefs.difficulty}
          onChange={(difficulty) => save({ ...prefs, difficulty })}
        />
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Comfortable reading</Text>
        {[
          ["readingMode", "Reading mode", "text-outline"],
          ["nightMode", "Night mode", "moon-outline"],
        ].map(([key, label, icon]) => (
          <Pressable
            key={key}
            onPress={() => save({ ...prefs, [key]: !prefs[key] })}
            style={[s.between, { paddingVertical: 8 }]}
          >
            <View style={s.row}>
              <Ionicons name={icon} size={20} color={colors.purple[600]} />
              <Text style={s.heading}>{label}</Text>
            </View>
            <Ionicons
              name={prefs[key] ? "toggle" : "toggle-outline"}
              size={27}
              color={prefs[key] ? colors.purple[600] : colors.muted}
            />
          </Pressable>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Arrange your home</Text>
        <Text style={s.small}>Move what matters most to the top.</Text>
        {prefs.widgets.map((widget, index) => (
          <View
            key={widget}
            style={[
              s.between,
              {
                borderTopWidth: 1,
                borderColor: colors.line,
                paddingVertical: 8,
              },
            ]}
          >
            <Text style={s.heading}>
              {index + 1}. {widget}
            </Text>
            <View style={s.row}>
              <Pressable
                accessibilityLabel={`Move ${widget} up`}
                onPress={() => move(index, -1)}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  color={colors.purple[600]}
                  size={25}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={`Move ${widget} down`}
                onPress={() => move(index, 1)}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  color={colors.purple[600]}
                  size={25}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <Button
        title="Back to profile"
        variant="secondary"
        onPress={() => navigation.navigate("Profile")}
      />
    </Screen>
  );
}
