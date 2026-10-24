import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors, fonts } from "../theme";
import { api, mediaUrl, useApp } from "../context/AppContext";
import Button from "./Button";
export default function MedByteCard({ clip, active, onComplete, height }) {
  const [saving, setSaving] = useState(""),
    [saved, setSaved] = useState({
      note: clip.saved_note,
      flashcard: clip.saved_flashcard,
    }),
    [transcript, setTranscript] = useState(false),
    [videoError, setVideoError] = useState(false),
    [status, setStatus] = useState("loading");
  const { notify } = useApp();
  const player = useVideoPlayer(mediaUrl + clip.video_path, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);
  useEffect(() => {
    setStatus(player.status);
    setVideoError(player.status === "error");
    const ended = player.addListener("playToEnd", () => onComplete(clip.id));
    const status = player.addListener("statusChange", ({ status }) => {
      setStatus(status);
      setVideoError(status === "error");
    });
    return () => {
      ended.remove();
      status.remove();
    };
  }, [player, onComplete, clip.id]);
  async function save(kind) {
    setSaving(kind);
    try {
      await api.post(`/medbytes/${clip.id}/save`, { kind });
      setSaved((x) => ({ ...x, [kind]: true }));
      notify(kind === "note" ? "Added to Notes." : "Saved to Flashcards.");
    } catch (e) {
      notify(e.message);
    } finally {
      setSaving("");
    }
  }
  return (
    <>
      <View style={[m.card, { height }]}>
        <View style={m.video}>
          <VideoView
            player={player}
            style={{ flex: 1 }}
            nativeControls
            contentFit="contain"
            allowsFullscreen={false}
            accessibilityLabel={clip.title}
          />
          {status === "loading" && (
            <View pointerEvents="none" style={m.overlay}>
              <Text style={{ color: "white", fontFamily: fonts.medium }}>
                Loading your MedByte…
              </Text>
            </View>
          )}
          {videoError && (
            <View style={m.overlay}>
              <Text style={{ color: "white", fontFamily: fonts.medium }}>
                This clip couldn’t load.
              </Text>
              <Button
                title="Retry video"
                variant="white"
                onPress={() =>
                  player
                    .replaceAsync(mediaUrl + clip.video_path)
                    .catch(() =>
                      notify(
                        "The clip is still unavailable. Try again shortly.",
                      ),
                    )
                }
              />
            </View>
          )}
        </View>
        <View style={m.body}>
          <View style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.pillText}>
                {clip.subject} / {clip.topic}
              </Text>
              <Text style={[s.heading, { fontSize: 16, marginTop: 5 }]}>
                {clip.title}
              </Text>
              <Text style={s.small}>
                {clip.creator} / {clip.credentials}
              </Text>
            </View>
            {clip.watched && (
              <Ionicons
                name="checkmark-circle"
                color={colors.success}
                size={23}
              />
            )}
          </View>
          <View style={s.row}>
            <Button
              title={saved.flashcard ? "Flashcard saved" : "Save flashcard"}
              disabled={saved.flashcard || !!saving}
              loading={saving === "flashcard"}
              variant="secondary"
              onPress={() => save("flashcard")}
              style={{ flex: 1 }}
            />
            <Button
              title={saved.note ? "Note saved" : "Add to Notes"}
              disabled={saved.note || !!saving}
              loading={saving === "note"}
              variant="secondary"
              onPress={() => save("note")}
              style={{ flex: 1 }}
            />
          </View>
          <Pressable
            onPress={() => setTranscript((x) => !x)}
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={s.pillText}>
              {transcript ? "Close transcript" : "Transcript & source"}
            </Text>
          </Pressable>
        </View>
      </View>
      <Modal
        visible={transcript}
        transparent
        animationType="slide"
        onRequestClose={() => setTranscript(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: `${colors.ink}88`,
            justifyContent: "flex-end",
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              maxHeight: "75%",
              padding: 24,
              paddingBottom: 40,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: colors.surface,
              gap: 20,
            }}
          >
            <Text style={s.heading}>{clip.title}</Text>
            <ScrollView>
              <Text style={s.body}>{clip.transcript}</Text>
            </ScrollView>
            <Button
              title="Read in OpenStax"
              variant="secondary"
              onPress={() => Linking.openURL(clip.source_url)}
            />
            <Button
              title="Back to the clip"
              onPress={() => setTranscript(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
const m = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 21,
    overflow: "hidden",
    marginBottom: 0,
    shadowColor: "#160d24",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  video: { flex: 1, minHeight: 80, backgroundColor: colors.purple[900] },
  body: { padding: 12, gap: 6 },
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: colors.purple[900],
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 25,
  },
});
