import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { ErrorState, Skeleton } from "../components/States";
import useData from "../hooks/useData";
import { api, useApp } from "../context/AppContext";
import { colors, styles as s } from "../theme";

const kinds = ["all", "note", "link", "voice", "photo"];
export default function CapturesScreen() {
  const { notify } = useApp();
  const { data, loading, error, reload } = useData("/captures");
  const [kind, setKind] = useState("all"),
    [form, setForm] = useState(null);
  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return notify("Allow photo access to attach a page.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const photo = result.assets[0];
    setForm((old) => ({
      ...old,
      kind: "photo",
      media_name: photo.fileName || "Study photo",
      media_data: photo.base64
        ? `data:${photo.mimeType || "image/jpeg"};base64,${photo.base64}`
        : "",
      title: old.title || photo.fileName || "Study photo",
    }));
  }
  async function save() {
    if (
      !form?.content?.trim() &&
      !form?.source_url?.trim() &&
      !form?.media_data
    )
      return notify("Add a note, link, or photo first.");
    try {
      await api.post("/captures", {
        ...form,
        title: form.title.trim() || "Quick capture",
      });
      setForm(null);
      reload();
      notify("Saved to your capture inbox.");
    } catch (e) {
      notify(e.message);
    }
  }
  function remove(item) {
    Alert.alert("Move capture to trash?", item.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move to trash",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/captures/${item.id}`);
            reload();
          } catch (e) {
            notify(e.message);
          }
        },
      },
    ]);
  }
  if (loading && !data) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = (data || []).filter(
    (item) => kind === "all" || item.kind === kind,
  );
  return (
    <Screen onRefresh={reload} refreshing={loading}>
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
          INBOX IT NOW. SORT IT LATER.
        </Text>
        <Text style={[s.title, { color: "white", fontSize: 30 }]}>
          Capture now. Sort when you have a minute.
        </Text>
        <Text style={[s.subtitle, { color: "#e3d4f0" }]}>
          Save notes, links, voice transcripts and ideas for later revision.
        </Text>
      </View>
      <View style={s.between}>
        <Text style={s.heading}>Capture inbox</Text>
        <Text style={s.small}>{items.length} waiting</Text>
      </View>
      <Button
        title={form ? "Close capture form" : "＋ Quick capture"}
        onPress={() =>
          setForm(
            form
              ? null
              : { kind: "note", title: "", content: "", source_url: "" },
          )
        }
      />
      {form && (
        <View style={s.card}>
          <View style={s.row}>
            {["note", "link", "voice", "photo"].map((item) => (
              <Pressable
                key={item}
                onPress={() => setForm({ ...form, kind: item })}
                style={[
                  s.pill,
                  {
                    backgroundColor:
                      form.kind === item
                        ? colors.purple[700]
                        : colors.purple[50],
                  },
                ]}
              >
                <Text
                  style={[s.pillText, form.kind === item && { color: "white" }]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={s.input}
            placeholder="Title"
            value={form.title}
            onChangeText={(title) => setForm({ ...form, title })}
          />
          {form.kind === "link" && (
            <TextInput
              style={s.input}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
              value={form.source_url}
              onChangeText={(source_url) => setForm({ ...form, source_url })}
            />
          )}
          {form.kind === "photo" && (
            <Button
              title={form.media_name || "Choose a photo"}
              variant="secondary"
              onPress={pickPhoto}
            />
          )}
          {form.media_data ? (
            <Text style={s.small}>Photo ready to save: {form.media_name}</Text>
          ) : null}
          <TextInput
            style={[s.input, { minHeight: 110, textAlignVertical: "top" }]}
            multiline
            placeholder={
              form.kind === "voice"
                ? "Type or dictate your transcript"
                : "Write a quick thought, question, or reminder"
            }
            value={form.content}
            onChangeText={(content) => setForm({ ...form, content })}
          />
          <Button
            title="Save capture"
            icon={<Ionicons name="bookmark-outline" color="white" size={18} />}
            onPress={save}
          />
        </View>
      )}
      <View style={s.row}>
        {kinds.map((item) => (
          <Pressable
            key={item}
            onPress={() => setKind(item)}
            style={[
              s.pill,
              {
                backgroundColor:
                  kind === item ? colors.purple[700] : colors.purple[50],
              },
            ]}
          >
            <Text style={[s.pillText, kind === item && { color: "white" }]}>
              {item === "all" ? "Everything" : item}
            </Text>
          </Pressable>
        ))}
      </View>
      {items.map((item) => (
        <View key={item.id} style={s.card}>
          <View style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.heading}>{item.title}</Text>
              <Text style={s.small}>
                {item.kind} ·{" "}
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString()
                  : "Saved"}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Delete ${item.title}`}
              onPress={() => remove(item)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
          <Text style={s.small}>
            {item.content || item.source_url || item.media_name || "No preview"}
          </Text>
          {item.kind === "photo" && item.media_data ? (
            <Image
              source={{ uri: item.media_data }}
              style={{ width: 150, height: 110, borderRadius: 12 }}
              resizeMode="cover"
            />
          ) : null}
          <Button
            title="Make note"
            variant="secondary"
            onPress={async () => {
              try {
                await api.post("/saved", {
                  kind: "note",
                  title: item.title,
                  content: item.content || item.source_url || item.media_name,
                  subject: "Captured",
                });
                notify("Added to saved study.");
              } catch (e) {
                notify(e.message);
              }
            }}
          />
        </View>
      ))}
      {!items.length && (
        <View style={s.card}>
          <Text style={s.small}>
            Nothing in this view yet. Add a quick note or save a link to revisit
            later.
          </Text>
        </View>
      )}
    </Screen>
  );
}
