import React, { useMemo, useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { colors, styles as s } from "../theme";

const references = [
  ["Normal sodium", "135–145 mmol/L", "Lab values"],
  ["Normal potassium", "3.5–5.0 mmol/L", "Lab values"],
  [
    "Paracetamol adult dose",
    "500–1000 mg every 4–6 hours; follow local guidance.",
    "Drugs",
  ],
  ["Anion gap", "Na − (Cl + HCO3)", "Formulae"],
  ["GCS", "Eye 4 · Verbal 5 · Motor 6", "Scoring"],
];
const glossary = [
  ["Aphasia", "A language disorder affecting expression or understanding."],
  ["Cyanosis", "Bluish discoloration from increased deoxygenated haemoglobin."],
  ["Tachypnoea", "An abnormally rapid respiratory rate."],
  ["Orthopnoea", "Breathlessness that is worse when lying flat."],
];
const diagrams = ["Cardiac cycle", "Coagulation cascade", "Brachial plexus"];
const calculators = ["BMI", "GCS", "APGAR", "Drip rate"];
function Segmented({ values, value, onChange }) {
  return (
    <View style={[s.row, { flexWrap: "wrap" }]}>
      {values.map((x) => (
        <Pressable
          key={x}
          onPress={() => onChange(x)}
          style={[
            s.pill,
            {
              backgroundColor:
                value === x ? colors.purple[700] : colors.purple[50],
            },
          ]}
        >
          <Text style={[s.pillText, value === x && { color: "white" }]}>
            {x}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export default function ToolboxScreen() {
  const [query, setQuery] = useState(""),
    [calc, setCalc] = useState("BMI"),
    [weight, setWeight] = useState("65"),
    [height, setHeight] = useState("170"),
    [gcs, setGcs] = useState([4, 5, 6]),
    [diagram, setDiagram] = useState(diagrams[0]);
  const results = useMemo(
    () =>
      references.filter((x) =>
        x.join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  const bmi = (Number(weight) / (Number(height) / 100) ** 2).toFixed(1);
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
          SMALL TOOLS, FEWER TAB SWITCHES
        </Text>
        <Text style={[s.title, { color: "white", fontSize: 29 }]}>
          Your pocket reference.
        </Text>
        <Text style={[s.subtitle, { color: "#e6d9f1" }]}>
          Quick checks for learning and revision. Always follow local clinical
          guidance.
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Reference search</Text>
        <Text style={s.small}>
          Lab values, common doses, formulas and scores.
        </Text>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search sodium, GCS, anion gap..."
        />
        {results.map(([title, value, group]) => (
          <View
            key={title}
            style={{
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingVertical: 10,
            }}
          >
            <Text style={s.pillText}>{group.toUpperCase()}</Text>
            <Text style={s.heading}>{title}</Text>
            <Text style={s.small}>{value}</Text>
          </View>
        ))}
        {!results.length && (
          <Text style={s.small}>No matching reference found.</Text>
        )}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Quick calculators</Text>
        <Segmented values={calculators} value={calc} onChange={setCalc} />
        {calc === "BMI" && (
          <>
            <Text style={s.label}>Weight (kg)</Text>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <Text style={s.label}>Height (cm)</Text>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              value={height}
              onChangeText={setHeight}
            />
            <Text style={s.heading}>BMI: {bmi}</Text>
          </>
        )}
        {calc === "GCS" && (
          <>
            {[
              ["Eye response", 4],
              ["Verbal response", 5],
              ["Motor response", 6],
            ].map(([label, max], i) => (
              <View key={label} style={s.between}>
                <Text style={s.small}>{label}</Text>
                <View style={s.row}>
                  <Pressable
                    onPress={() =>
                      setGcs((v) =>
                        v.map((n, j) => (j === i ? Math.max(1, n - 1) : n)),
                      )
                    }
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={24}
                      color={colors.purple[600]}
                    />
                  </Pressable>
                  <Text style={s.heading}>
                    {gcs[i]} / {max}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setGcs((v) =>
                        v.map((n, j) => (j === i ? Math.min(max, n + 1) : n)),
                      )
                    }
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color={colors.purple[600]}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
            <Text style={s.heading}>
              GCS: {gcs.reduce((a, b) => a + b, 0)} / 15
            </Text>
          </>
        )}
        {calc === "APGAR" && (
          <Text style={s.small}>
            Score appearance, pulse, grimace, activity and respiration from 0–2
            each.
          </Text>
        )}
        {calc === "Drip rate" && (
          <Text style={s.small}>
            Example: 500 mL over 4 hours at 20 drops/mL ≈ 42 drops/min.
          </Text>
        )}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Timeline & diagram viewer</Text>
        <Segmented values={diagrams} value={diagram} onChange={setDiagram} />
        <View
          style={{
            alignItems: "center",
            gap: 8,
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.purple[50],
          }}
        >
          <Text style={s.pillText}>STEP 01</Text>
          <Text style={s.heading}>
            {diagram === diagrams[0]
              ? "Ventricular filling"
              : diagram === diagrams[1]
                ? "Tissue factor"
                : "Roots → trunks"}
          </Text>
          <Ionicons name="arrow-down" color={colors.purple[600]} size={20} />
          <Text style={s.heading}>
            {diagram === diagrams[0]
              ? "Isovolumetric contraction"
              : diagram === diagrams[1]
                ? "Thrombin"
                : "Divisions → cords"}
          </Text>
          <Ionicons name="arrow-down" color={colors.purple[600]} size={20} />
          <Text style={s.heading}>Clinical endpoint / recall cue</Text>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Tap-to-define glossary</Text>
        {glossary.map(([term, definition]) => (
          <View
            key={term}
            style={{
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingVertical: 10,
            }}
          >
            <Text style={s.heading}>{term}</Text>
            <Text style={s.small}>{definition}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
