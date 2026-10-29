import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Linking, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { DeviceMotion } from "expo-sensors";
import { useIsFocused } from "@react-navigation/native";
import { styles as s, colors, fonts } from "../theme";
import { api, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import useReducedMotion from "../hooks/useReducedMotion";
import Screen from "../components/Screen";
import HeartViewer from "../components/HeartViewer";
import { referenceModels } from "@med-purple/anatomy";
import Button from "../components/Button";
import { Skeleton, ErrorState } from "../components/States";
export default function AnatomyScreen({ navigation }) {
  const { data, loading, error, reload } = useData("/anatomy");
  const [modelId, setModelId] = useState("heart");
  const [selected, setSelected] = useState("lv"),
    [exploded, setExploded] = useState(false),
    [vessels, setVessels] = useState(true),
    [tilt, setTilt] = useState(false),
    [shakeToExplode, setShakeToExplode] = useState(false),
    [pending, setPending] = useState(false),
    [studied, setStudied] = useState(new Set()),
    [quiz, setQuiz] = useState(false),
    [feedback, setFeedback] = useState("");
  const [structureSearch, setStructureSearch] = useState("");
  const engine = useRef(),
    focused = useIsFocused(),
    reduced = useReducedMotion();
  const previousAcceleration = useRef(null),
    lastShake = useRef(0);
  const { notify } = useApp();
  useEffect(() => {
    if (!tilt || !focused || reduced) return;
    DeviceMotion.setUpdateInterval(40);
    const subscription = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation || !engine.current) return;
      engine.current.targets.x = Math.max(
        -0.3,
        Math.min(0.3, rotation.beta * 0.15),
      );
      engine.current.targets.y = Math.max(
        -0.4,
        Math.min(0.4, rotation.gamma * 0.4),
      );
    });
    return () => subscription.remove();
  }, [tilt, focused, reduced]);
  useEffect(() => {
    if (!shakeToExplode || !focused || reduced || modelId !== "heart") return;
    DeviceMotion.setUpdateInterval(80);
    const subscription = DeviceMotion.addListener(({ acceleration }) => {
      if (!acceleration) return;
      const current = [acceleration.x || 0, acceleration.y || 0, acceleration.z || 0];
      const previous = previousAcceleration.current;
      previousAcceleration.current = current;
      if (!previous) return;
      const change = Math.hypot(
        current[0] - previous[0],
        current[1] - previous[1],
        current[2] - previous[2],
      );
      const now = Date.now();
      if (change > 3.4 && now - lastShake.current > 1200) {
        lastShake.current = now;
        setExploded((value) => !value);
        Haptics.selectionAsync().catch(() => {});
      }
    });
    return () => {
      previousAcceleration.current = null;
      subscription.remove();
    };
  }, [shakeToExplode, focused, reduced, modelId]);
  async function toggleTilt() {
    if (tilt) {
      setTilt(false);
      notify("Tilt control off.");
      return;
    }
    try {
      if (reduced) {
        notify("Tilt is disabled while Reduce Motion is enabled.");
        return;
      }
      if (!(await DeviceMotion.isAvailableAsync())) {
        notify("Device motion is not available. Use touch controls.");
        return;
      }
      const permission = await DeviceMotion.requestPermissionsAsync();
      if (!permission.granted) {
        notify("Motion permission was not granted. Touch controls still work.");
        return;
      }
      setTilt(true);
      notify("Tilt control on. Move your phone gently.");
    } catch {
      notify("Motion is unavailable. Touch controls still work.");
    }
  }
  async function toggleShake() {
    if (shakeToExplode) {
      setShakeToExplode(false);
      notify("Shake-to-explode off.");
      return;
    }
    try {
      if (reduced) {
        notify("Motion gestures are disabled while Reduce Motion is enabled.");
        return;
      }
      if (!(await DeviceMotion.isAvailableAsync())) {
        notify("Motion is not available. Use the chamber controls instead.");
        return;
      }
      const permission = await DeviceMotion.requestPermissionsAsync();
      if (!permission.granted) {
        notify("Motion permission was not granted. Touch controls still work.");
        return;
      }
      setShakeToExplode(true);
      notify("Shake-to-explode on. A small shake separates the heart chambers.");
    } catch {
      notify("Motion is unavailable. Use the chamber controls instead.");
    }
  }
  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const item = data.structures.find((x) => x.id === selected),
    done = item.studied || studied.has(selected);
  function choose(id) {
    Haptics.selectionAsync().catch(() => {});
    setSelected(id);
    if (quiz)
      api
        .post("/anatomy/recall", { structure_id: id })
        .then((r) => {
          if (r.xp_earned) notify(`Recall complete. +${r.xp_earned} XP`);
        })
        .catch((e) => notify(e.message));
    if (quiz)
      setFeedback(
        id === "rv"
          ? "Correct. The right ventricle supplies the pulmonary circuit."
          : "Try again. Find the ventricle that supplies the lungs.",
      );
  }
  async function mark() {
    setPending(true);
    try {
      await api.put(`/anatomy/${selected}/studied`);
      setStudied((x) => new Set([...x, selected]));
      notify(`${item.name} marked as studied.`);
    } catch (e) {
      notify(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Screen>
      <View>
        <Text style={s.title}>Get a feel for anatomy.</Text>
        <Text style={s.subtitle}>
          Rotate the model, then tap a structure to study it.
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.pillText}>CHOOSE A 3D STUDY MODEL</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[{ id: "heart", name: "Heart" }, ...referenceModels].map((model) => (
            <Pressable
              key={model.id}
              accessibilityRole="button"
              accessibilityState={{ selected: modelId === model.id }}
              onPress={() => {
                setModelId(model.id);
                setStructureSearch("");
                setSelected(
                  model.id === "heart" ? "lv" : model.structures[0].id,
                );
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 13,
                borderRadius: 99,
                backgroundColor:
                  modelId === model.id ? colors.purple[800] : colors.surface,
                borderWidth: 1,
                borderColor:
                  modelId === model.id ? colors.purple[800] : colors.line,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 12,
                  color: modelId === model.id ? "white" : colors.ink,
                }}
              >
                {model.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {modelId === "heart" ? (
        <>
          <View
            style={{
              borderRadius: 22,
              overflow: "hidden",
              backgroundColor: colors.anatomy,
            }}
          >
            <HeartViewer
              selected={selected}
              onSelect={choose}
              controlsRef={engine}
              exploded={exploded}
              vessels={vessels}
              height={360}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 12,
                paddingBottom: 15,
              }}
            >
              {[
                ["add", () => engine.current?.zoom(-0.7), "Zoom in"],
                ["remove", () => engine.current?.zoom(0.7), "Zoom out"],
                ["refresh", () => engine.current?.reset(), "Reset view"],
              ].map(([name, action, label]) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={action}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Ionicons name={name} size={23} color={colors.ink} />
                </Pressable>
              ))}
            </View>
            <Text
              style={[
                s.small,
                { textAlign: "center", paddingBottom: 16, fontSize: 12 },
              ]}
            >
              Drag to rotate / Pinch to zoom
            </Text>
          </View>
          <View style={s.row}>
            <Button
              title={exploded ? "Join chambers" : "Separate chambers"}
              variant="secondary"
              onPress={() => setExploded((x) => !x)}
              style={{ flex: 1 }}
            />
            <Button
              title={vessels ? "Hide vessels" : "Show vessels"}
              variant="secondary"
              onPress={() => setVessels((x) => !x)}
              style={{ flex: 1 }}
            />
          </View>
          <Button
            title={tilt ? "Disable tilt control" : "Enable tilt control"}
            variant="secondary"
            onPress={toggleTilt}
          />
          <Button
            title={shakeToExplode ? "Disable shake-to-explode" : "Enable shake-to-explode"}
            variant="secondary"
            onPress={toggleShake}
            disabled={reduced}
          />
          <View style={s.section}>
            <Text style={s.heading}>Explore the structures</Text>
            <TextInput
              value={structureSearch}
              onChangeText={setStructureSearch}
              placeholder="Find a heart structure"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Search heart structures"
              returnKeyType="search"
              style={{
                minHeight: 46,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 12,
                color: colors.ink,
                backgroundColor: colors.surface,
              }}
            />
            <View style={s.grid}>
              {data.structures
                .filter((x) =>
                  x.name
                    .toLowerCase()
                    .includes(structureSearch.trim().toLowerCase()),
                )
                .map((x) => (
                  <Pressable
                    key={x.id}
                    onPress={() => choose(x.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: x.id === selected }}
                    style={{
                      width: "47%",
                      minHeight: 50,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor:
                        x.id === selected ? colors.purple[500] : colors.line,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <View
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 3,
                        backgroundColor: x.color,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 12,
                        color: colors.ink,
                        flex: 1,
                      }}
                    >
                      {x.name}
                    </Text>
                    {(x.studied || studied.has(x.id)) && (
                      <Ionicons
                        name="checkmark"
                        color={colors.success}
                        size={15}
                      />
                    )}
                  </Pressable>
                ))}
            </View>
          </View>
          <View style={s.card}>
            <Text style={s.pillText}>{item.category}</Text>
            <Text style={[s.title, { fontSize: 30 }]}>{item.name}</Text>
            <Text style={s.body}>{item.description}</Text>
            <Text style={s.label}>Make the connection</Text>
            <Text style={s.small}>{item.clinical_note}</Text>
            <Button
              title={done ? "Studied" : "Mark as studied"}
              loading={pending}
              disabled={done}
              onPress={mark}
            />
            <Button
              title="Read in OpenStax"
              variant="secondary"
              onPress={() => Linking.openURL(item.source_url)}
            />
          </View>
          <Text style={s.small}>{data.scope}</Text>
          <View style={s.card}>
            <Text style={s.heading}>
              {quiz ? "Find it on the model" : "A quick recall moment"}
            </Text>
            <Text style={s.small}>
              {quiz
                ? "Which chamber pumps blood toward the lungs? Select it above."
                : "Turn exploration into understanding."}
            </Text>
            {!!feedback && (
              <Text accessibilityLiveRegion="polite" style={s.pillText}>
                {feedback}
              </Text>
            )}
            <Button
              title={quiz ? "Close recall question" : "Test my recall"}
              variant="secondary"
              onPress={() => {
                setQuiz((x) => !x);
                setFeedback("");
              }}
            />
            <Button
              title="Practice cardiac MCQs"
              onPress={() =>
                navigation.navigate("MCQs", { topic: "Cardiac anatomy" })
              }
            />
          </View>
        </>
      ) : (
        (() => {
          const model = referenceModels.find((entry) => entry.id === modelId);
          const structure =
            model.structures.find((entry) => entry.id === selected) ||
            model.structures[0];
          return (
            <>
              <View
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  backgroundColor: colors.anatomy,
                }}
              >
                <HeartViewer
                  key={modelId}
                  modelId={modelId}
                  selected={selected}
                  onSelect={setSelected}
                  height={360}
                />
                <Text style={[s.small, { textAlign: "center", padding: 12 }]}>
                  Drag to rotate / Pinch to zoom
                </Text>
              </View>
              <View style={{ gap: 10 }}>
                <Text style={s.heading}>Explore the structures</Text>
                <TextInput
                  value={structureSearch}
                  onChangeText={setStructureSearch}
                  placeholder={`Find a ${model.system.toLowerCase()} structure`}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={`Search ${model.system} structures`}
                  returnKeyType="search"
                  style={{
                    minHeight: 46,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: 12,
                    color: colors.ink,
                    backgroundColor: colors.surface,
                  }}
                />
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {model.structures
                    .filter((part) =>
                      part.name
                        .toLowerCase()
                        .includes(structureSearch.trim().toLowerCase()),
                    )
                    .map((part) => (
                      <Pressable
                        key={part.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selected === part.id }}
                        onPress={() => setSelected(part.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          minHeight: 44,
                          paddingVertical: 9,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor:
                            selected === part.id
                              ? colors.purple[500]
                              : colors.line,
                          backgroundColor: colors.surface,
                        }}
                      >
                        <View
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: 5,
                            backgroundColor: part.color,
                          }}
                        />
                        <Text
                          style={{
                            fontFamily: fonts.bold,
                            fontSize: 12,
                            color: colors.ink,
                          }}
                        >
                          {part.name}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>
              <View style={s.card}>
                <Text style={s.pillText}>{model.system}</Text>
                <Text style={s.heading}>{structure.name}</Text>
                <Text style={s.body}>{structure.description}</Text>
                <Text style={s.label}>Clinical connection</Text>
                <Text style={s.small}>{structure.clinical_note}</Text>
                <Button
                  title="Read in OpenStax"
                  variant="secondary"
                  onPress={() => Linking.openURL(model.source_url)}
                />
              </View>
              <Text style={s.small}>
                Colour coded reference models. Shapes are schematic and intended
                for study.
              </Text>
            </>
          );
        })()
      )}
    </Screen>
  );
}
