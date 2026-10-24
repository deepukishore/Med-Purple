import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";
import questions from "../../../shared/help.json";

export default function HelpBot() {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const log = useRef(null);
  const matches = questions.filter((item) =>
    `${item.question} ${item.answer}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const navigate = (item) => {
    setOpen(false);
    if (["Learn", "MedBytes", "Profile"].includes(item.screen))
      navigation.navigate("Main", { screen: item.screen });
    else navigation.navigate(item.screen);
  };
  return (
    <>
      <Pressable
        style={s.launcher}
        accessibilityRole="button"
        accessibilityLabel="Open Med Purple help chat"
        onPress={() => setOpen(true)}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="white" />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close help chat"
            onPress={() => setOpen(false)}
          />
          <View style={s.panel} accessibilityViewIsModal>
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>Med Purple Guide</Text>
                <Text style={s.subtitle}>Your app help companion</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close help chat"
                onPress={() => setOpen(false)}
                style={s.close}
              >
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
            <ScrollView
              ref={log}
              style={s.log}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              onContentSizeChange={() => log.current?.scrollToEnd()}
            >
              <Text style={s.answer}>
                Hi! Choose a question below and I’ll help you find your way
                around Med Purple.
              </Text>
              {history.map((item, index) => (
                <View key={index} style={{ gap: 8 }}>
                  <Text style={s.question}>{item.question}</Text>
                  <View style={s.bubble}>
                    <Text style={s.body}>{item.answer}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => navigate(item)}
                      style={{ paddingVertical: 12 }}
                    >
                      <Text style={s.link}>{item.label} ↗</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={s.choices}>
              <Text style={s.label}>Find a help topic</Text>
              <TextInput
                accessibilityLabel="Search help topics"
                placeholder="Search questions…"
                value={search}
                onChangeText={setSearch}
                style={s.input}
                placeholderTextColor={colors.muted}
              />
              <ScrollView
                style={{ maxHeight: 180 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
              >
                {matches.map((item) => (
                  <Pressable
                    key={item.question}
                    accessibilityRole="button"
                    style={s.topic}
                    onPress={() =>
                      setHistory((previous) => [...previous, item])
                    }
                  >
                    <Text style={s.link}>{item.question}</Text>
                  </Pressable>
                ))}
                {!matches.length && (
                  <Text style={s.body}>
                    No matching topic. Try notes, profile, or questions.
                  </Text>
                )}
              </ScrollView>
              <View style={s.footer}>
                <Text style={s.small}>Prewritten help for using the app.</Text>
                {history.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setHistory([])}
                    style={{ padding: 8 }}
                  >
                    <Text style={s.link}>Reset chat</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  launcher: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.purple[700],
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  overlay: {
    flex: 1,
    backgroundColor: "#251a3366",
    justifyContent: "center",
    padding: 20,
  },
  panel: {
    maxHeight: "85%",
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: colors.purple[700],
  },
  title: { color: "white", fontFamily: fonts.bold, fontSize: 18 },
  subtitle: { color: "white", fontSize: 12, marginTop: 4 },
  close: { padding: 10 },
  log: { maxHeight: 250, flexShrink: 1 },
  answer: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.purple[100],
    color: colors.ink,
    lineHeight: 22,
  },
  bubble: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.purple[100],
  },
  question: {
    marginLeft: 24,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.purple[700],
    color: "white",
    lineHeight: 22,
  },
  body: { color: colors.ink, lineHeight: 22, fontSize: 14 },
  link: { color: colors.purple[700], fontFamily: fonts.bold, fontSize: 13 },
  choices: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexShrink: 1,
  },
  label: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    color: colors.ink,
  },
  topic: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  small: { color: colors.muted, fontSize: 10 },
});
