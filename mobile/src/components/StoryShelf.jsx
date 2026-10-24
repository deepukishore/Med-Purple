import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, mediaUrl, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import Button from "./Button";
import Chips from "./Chips";
import FormField from "./FormField";
import { ErrorState, Skeleton } from "./States";
import { colors, fonts, styles as s } from "../theme";

const types = [
  { value: "quiz", label: "Quiz" },
  { value: "mnemonic", label: "Mnemonic" },
  { value: "flashcard", label: "Flashcard" },
  { value: "diagram", label: "Diagram" },
  { value: "video", label: "30-sec video" },
  { value: "study_with_me", label: "Study with me" },
  { value: "milestone", label: "Milestone" },
  { value: "text", label: "Explainer" },
];
const stickerTypes = [
  { value: "", label: "No sticker" },
  { value: "poll", label: "Poll" },
  { value: "this_or_that", label: "This or that" },
  { value: "question", label: "Question box" },
  { value: "doubt", label: "Doubt" },
  { value: "countdown", label: "Countdown" },
  { value: "progress", label: "MCQ progress" },
  { value: "streak", label: "Study streak" },
];
const reactionItems = [
  { value: "helpful", label: "💡" },
  { value: "learned", label: "🧠" },
  { value: "fire", label: "🔥" },
  { value: "motivated", label: "👏" },
];
const blank = () => ({
  title: "",
  subject: "Anatomy",
  kind: "quiz",
  question: "",
  text: "",
  front: "",
  back: "",
  options: ["", "", ""],
  correctIndex: "0",
  explanation: "",
  sticker: "",
  stickerPrompt: "",
  pollOptions: ["", ""],
  audience: "everyone",
  groupId: "",
  anonymous: false,
  duration: "24",
  highlight: "",
  minutes: "50",
  schedule: "",
  countdownAt: "",
  replyToStoryId: "",
  file: null,
});

async function readFileAsDataUrl(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected media."));
    reader.readAsDataURL(blob);
  });
}

export default function StoryShelf({ navigation, initialStoryId, initialCreate }) {
  const { user } = useApp();
  const [subject, setSubject] = useState("");
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [answer, setAnswer] = useState("");
  const [responseText, setResponseText] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState("");
  const [excludedUserIds, setExcludedUserIds] = useState([]);
  const [clock, setClock] = useState(Date.now());
  const feed = useData(`/stories?subject=${encodeURIComponent(subject)}`);
  const mine = useData("/stories/mine");
  const featured = useData("/stories/featured");
  const leaderboard = useData("/stories/leaderboard");
  const groups = useData("/stories/groups");
  const milestones = useData("/stories/milestones");
  const creatorStreak = useData("/stories/creator-streak");
  const closeFriends = useData("/stories/close-friends");
  const students = useData(`/profiles?search=${encodeURIComponent(peopleSearch)}`);
  const items = feed.data?.items || [];
  const slide = selected?.slides?.[slideIndex] || {};
  const sticker = slide.sticker || {};
  const answered = selected?.my_responses || {};
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!initialStoryId) return;
    let active = true;
    api.get(`/stories/${initialStoryId}`).then((story) => {
      if (active) {
        setSelected(story);
        setSlideIndex(0);
      }
    }).catch((error) => {
      if (active) setFailure(error.message);
    }).finally(() => {
      if (active) navigation.setParams({ storyId: undefined });
    });
    return () => {
      active = false;
    };
  }, [initialStoryId, navigation]);
  useEffect(() => {
    if (!initialCreate) return;
    setForm(blank());
    navigation.setParams({ createStory: undefined });
  }, [initialCreate, navigation]);

  function field(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  function option(key, index, value) {
    setForm((old) => ({
      ...old,
      [key]: old[key].map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  }
  async function openStory(story) {
    try {
      setFailure("");
      setSelected(await api.get(`/stories/${story.id}?slide_index=0`));
      setSlideIndex(0);
      setChosen(null);
    } catch (error) {
      setFailure(error.message);
    }
  }
  async function refreshSelected() {
    if (selected) setSelected(await api.get(`/stories/${selected.id}?slide_index=${slideIndex}`));
  }
  async function showSlide(index) {
    if (!selected || index < 0 || index >= selected.slides.length || index === slideIndex) return;
    try {
      setSelected(await api.get(`/stories/${selected.id}?slide_index=${index}`));
      setSlideIndex(index);
      setChosen(null);
      setAnswer("");
      setResponseText("");
    } catch (error) {
      setFailure(error.message);
    }
  }
  async function run(action) {
    setBusy(true);
    setFailure("");
    try {
      const result = await action();
      feed.reload();
      mine.reload();
      return result;
    } catch (error) {
      setFailure(error.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function attachMedia() {
    const isVideo = form.kind === "video";
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isVideo ? ["videos"] : ["images"],
      base64: false,
      quality: 0.75,
      videoMaxDuration: isVideo ? 30 : undefined,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (isVideo && asset.duration > 30_000) {
      return setFailure("Explain-in-30-seconds videos must be 30 seconds or shorter.");
    }
    field("file", asset);
  }
  async function createStory(draft = false) {
    if (form.file) {
      const consent = await new Promise((resolve) => {
        Alert.alert(
          "Protect patient privacy",
          "Do not post identifiable patient information or clinical photos. Confirm this media is safe to share.",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "I checked", onPress: () => resolve(true) },
          ],
        );
      });
      if (!consent) return;
    }
    setBusy(true);
    setFailure("");
    try {
      let slide = {};
      if (form.kind === "quiz") {
        slide = {
          text: form.question.trim(),
          options: form.options.map((item) => item.trim()),
          correct_index: Number(form.correctIndex),
          explanation: form.explanation.trim(),
        };
      } else if (form.kind === "flashcard") {
        slide = { front: form.front.trim(), back: form.back.trim() };
      } else {
        slide = { text: form.text.trim() };
      }
      if (form.kind === "study_with_me") slide.minutes = Number(form.minutes);
      if (form.kind === "milestone") {
        const stats = milestones.data || {};
        slide.text = form.text.trim() || `${stats.level || 1} level reached · ${stats.streak_days || 0}-day streak`;
      }
      if (["poll", "this_or_that"].includes(form.sticker)) {
        slide.sticker = {
          type: form.sticker,
          prompt: form.stickerPrompt,
          options: form.pollOptions.map((item) => item.trim()).filter(Boolean),
        };
      } else if (["question", "doubt", "countdown"].includes(form.sticker)) {
        slide.sticker = {
          type: form.sticker,
          prompt: form.stickerPrompt,
          target_at: form.countdownAt ? new Date(form.countdownAt).toISOString() : null,
        };
      } else if (["progress", "streak"].includes(form.sticker)) {
        slide.sticker = { type: form.sticker };
      }
      const payload = {
        title: form.title.trim(),
        subject: form.subject.trim(),
        kind: form.kind,
        slides: [slide],
        audience: form.audience,
        group_id: form.audience === "group" ? form.groupId : null,
        excluded_user_ids: excludedUserIds,
        anonymous: form.anonymous,
        duration_hours: Number(form.duration),
        highlight: form.highlight.trim(),
        scheduled_at: draft || !form.schedule ? null : new Date(form.schedule).toISOString(),
        draft,
        reply_to_story_id: form.replyToStoryId || null,
      };
      if (form.file) {
        const dataUrl = await readFileAsDataUrl(form.file.uri);
        const uploaded = await api.post("/stories/media", { data_url: dataUrl });
        payload.slides[0][form.kind === "video" ? "video_url" : "media_url"] = uploaded.media_url;
        if (form.kind === "video") {
          payload.slides[0].duration_seconds = Math.ceil((form.file.duration || 30_000) / 1000);
        }
      }
      await api.post("/stories", payload);
      setForm(null);
      setExcludedUserIds([]);
      feed.reload();
      mine.reload();
    } catch (error) {
      setFailure(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function respond(response_type, values = {}) {
    const result = await run(() => api.post(`/stories/${selected.id}/responses`, {
      response_type,
      slide_index: slideIndex,
      sticker_key: sticker.key || "",
      ...values,
    }));
    if (result) {
      setAnswer("");
      setResponseText("");
      setChosen(null);
      await refreshSelected();
    }
  }
  const timeLeft = useMemo(() => {
    const minutes = Number(slide.minutes || 50);
    if (!selected?.published_at) return minutes * 60;
    return Math.max(0, minutes * 60 - Math.floor((clock - new Date(selected.published_at).getTime()) / 1000));
  }, [selected, slide.minutes, clock]);
  const responseKey = (type) => sticker.key
    ? `${type}:${slideIndex}:${sticker.key}`
    : slideIndex ? `${type}:${slideIndex}` : type;
  const quizOptions = slide.options || sticker.options || [];
  const quizCorrectIndex = slide.correct_index ?? sticker.correct_index ?? sticker.correct;
  const quizAnsweredCorrect = slide.correct ?? sticker.is_correct;

  return (
    <View style={{ gap: 14 }}>
      <View style={s.card}>
        <Text style={s.pillText}>STUDY, SHARE, REMEMBER</Text>
        <Text style={s.heading}>Stories for your next study break</Text>
        <Text style={s.small}>Quick quizzes, mnemonics and explainers from your study community.</Text>
        <Button title="＋ Create a study story" onPress={() => setForm(blank())} />
        <Chips
          label="Filter stories by subject"
          value={subject}
          onChange={setSubject}
          items={[
            { value: "", label: "All" },
            { value: "Anatomy", label: "Anatomy" },
            { value: "Physiology", label: "Physiology" },
            { value: "Medicine", label: "Medicine" },
            { value: "NEET PG", label: "NEET PG" },
          ]}
        />
        {failure ? <Text accessibilityRole="alert" style={s.error}>{failure}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          <Pressable onPress={() => setForm(blank())} style={[s.card, { width: 90, minHeight: 124, alignItems: "center", justifyContent: "center", backgroundColor: colors.purple[800] }]}>
            <Text style={{ color: "#e7f8ba", fontSize: 27 }}>＋</Text>
            <Text style={{ color: "white", fontFamily: fonts.bold, fontSize: 11 }}>Your story</Text>
          </Pressable>
          {feed.loading && !feed.data ? <Skeleton /> : null}
          {feed.error ? <ErrorState message={feed.error} onRetry={feed.reload} /> : null}
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.kind} story: ${item.title}`}
              onPress={() => openStory(item)}
              style={[s.card, {
                width: 180,
                minHeight: 124,
                justifyContent: "space-between",
                backgroundColor: ["#32213f", "#23454a", "#5a3546"][index % 3],
                borderColor: colors.purple[300],
              }]}
            >
              <Text style={[s.pillText, { color: "#e7f8ba" }]}>{item.subject} · {item.kind.replaceAll("_", " ")}</Text>
              <Text style={[s.heading, { color: "white", fontSize: 15 }]}>{item.title}</Text>
              <Text style={[s.small, { color: "#e0d6eb" }]}>{item.creator}</Text>
            </Pressable>
          ))}
          {!feed.loading && !items.length ? <Text style={s.small}>No live stories for this subject yet.</Text> : null}
        </ScrollView>
        <Text style={s.label}>Story of the day</Text>
        {featured.data?.item ? <Button title={featured.data.item.title} variant="secondary" onPress={() => openStory(featured.data.item)} /> : <Text style={s.small}>Helpful stories will appear here.</Text>}
        <Text style={s.label}>Top story creators this week</Text>
        {(leaderboard.data?.items || []).slice(0, 3).map((person, index) => (
          <Text key={person.user_id} style={s.small}>{index + 1}. {person.name} · {person.score} helpful interactions</Text>
        ))}
        <Text style={s.small}>Your story creator streak: {creatorStreak.data?.story_streak || 0} days</Text>
        <FormField label="Find a student · close friends and audience controls" value={peopleSearch} onChangeText={setPeopleSearch} placeholder="Search by name" />
        {(students.data?.items || []).filter((person) => person.id !== user?.id).slice(0, 5).map((person) => {
          const close = closeFriends.data?.items?.some((item) => item.id === person.id);
          return (
            <View key={person.id} style={s.between}>
              <Text style={s.small}>{person.name}</Text>
              <Button title={close ? "Remove close friend" : "Add close friend"} small variant="secondary" onPress={() => run(() => api.put(`/stories/close-friends/${person.id}?active=${!close}`)).then(() => closeFriends.reload())} />
            </View>
          );
        })}
        {(groups.data?.items || []).map((group) => (
          <View key={group.id} style={s.between}>
            <Text style={s.small}>{group.name}</Text>
            <Button title="Invite students" small variant="secondary" onPress={() => setInviteGroupId(group.id)} />
          </View>
        ))}
        {inviteGroupId && (students.data?.items || []).filter((person) => person.id !== user?.id).slice(0, 5).map((person) => (
          <Button key={`${inviteGroupId}-${person.id}`} title={`Invite ${person.name}`} small variant="secondary" onPress={() => run(() => api.post(`/stories/groups/${inviteGroupId}/members`, { user_ids: [person.id] }))} />
        ))}
        <FormField label="New study group" value={groupName} onChangeText={setGroupName} />
        <Button title="Create study group" disabled={!groupName.trim()} variant="secondary" onPress={() => run(() => api.post("/stories/groups", { name: groupName })).then((result) => {
          if (result) {
            setGroupName("");
            groups.reload();
          }
        })} />
        {!!mine.data?.items?.length && (
          <View style={s.section}>
            <Text style={s.label}>Your stories, drafts and schedule</Text>
            {mine.data.items.map((item) => (
              <View key={item.id} style={s.between}>
                <Text style={[s.small, { flex: 1 }]}>{item.title} · {item.published_at ? `${item.views} views` : item.scheduled_at ? "Scheduled" : "Draft"}</Text>
                {!item.published_at && !item.scheduled_at && <Button title="Publish" small onPress={() => run(() => api.post(`/stories/${item.id}/publish`))} />}
                <Button title="Delete" small variant="secondary" onPress={() => Alert.alert("Delete this story?", item.title, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => run(() => api.delete(`/stories/${item.id}`)) },
                ])} />
              </View>
            ))}
          </View>
        )}
      </View>

      {form && (
        <View style={[s.card, { borderColor: colors.purple[400] }]}>
          <Text style={s.heading}>Create a study story</Text>
          <Chips label="Story format" value={form.kind} onChange={(kind) => field("kind", kind)} items={types} />
          <FormField label="Title" value={form.title} onChangeText={(value) => field("title", value)} maxLength={150} />
          <FormField label="Subject tag" value={form.subject} onChangeText={(value) => field("subject", value)} maxLength={50} />
          {form.kind === "quiz" && <>
            <FormField label="One-question MCQ" value={form.question} onChangeText={(value) => field("question", value)} />
            {form.options.map((value, index) => <FormField key={index} label={`Option ${index + 1}`} value={value} onChangeText={(next) => option("options", index, next)} />)}
            <Chips label="Correct answer" value={form.correctIndex} onChange={(value) => field("correctIndex", value)} items={form.options.map((_, index) => ({ value: String(index), label: `Option ${index + 1}` }))} />
            <FormField label="Explanation" value={form.explanation} onChangeText={(value) => field("explanation", value)} />
          </>}
          {form.kind === "flashcard" && <>
            <FormField label="Question / front" value={form.front} onChangeText={(value) => field("front", value)} />
            <FormField label="Answer / back" value={form.back} onChangeText={(value) => field("back", value)} multiline />
          </>}
          {!["quiz", "flashcard"].includes(form.kind) && (
            <FormField label={form.kind === "mnemonic" ? "Mnemonic" : "Story text"} value={form.text} onChangeText={(value) => field("text", value)} multiline />
          )}
          {form.kind === "study_with_me" && <FormField label="Timer minutes" value={form.minutes} onChangeText={(value) => field("minutes", value)} keyboardType="number-pad" />}
          {["diagram", "video"].includes(form.kind) && <>
            <Button title={form.file?.fileName || (form.kind === "video" ? "Choose a video · 30 seconds max" : "Choose a sketch or diagram image")} variant="secondary" onPress={attachMedia} />
            {form.file?.uri && form.kind !== "video" ? <Image source={{ uri: form.file.uri }} style={{ height: 190, borderRadius: 14 }} resizeMode="contain" /> : null}
          </>}
          <Chips label="Interactive sticker" value={form.sticker} onChange={(value) => field("sticker", value)} items={stickerTypes} />
          {["poll", "this_or_that"].includes(form.sticker) && <>
            <FormField label="Poll question" value={form.stickerPrompt} onChangeText={(value) => field("stickerPrompt", value)} />
            {form.pollOptions.map((value, index) => <FormField key={index} label={`Choice ${index + 1}`} value={value} onChangeText={(next) => option("pollOptions", index, next)} />)}
          </>}
          {["question", "doubt", "countdown"].includes(form.sticker) && <FormField label={form.sticker === "countdown" ? "Exam / event" : "Prompt"} value={form.stickerPrompt} onChangeText={(value) => field("stickerPrompt", value)} />}
          {form.sticker === "countdown" && <FormField label="Countdown target (ISO date/time)" value={form.countdownAt} onChangeText={(value) => field("countdownAt", value)} placeholder="2026-11-01T09:00:00+05:30" />}
          <Chips label="Audience" value={form.audience} onChange={(value) => field("audience", value)} items={[
            { value: "everyone", label: "Everyone" },
            { value: "friends", label: "Friends" },
            { value: "close_friends", label: "Close friends" },
            { value: "group", label: "Group" },
          ]} />
          {form.audience === "group" && (groups.data?.items?.length ? <Chips label="Study group" value={form.groupId} onChange={(value) => field("groupId", value)} items={groups.data.items.map((item) => ({ value: item.id, label: item.name }))} /> : <FormField label="Study group ID" value={form.groupId} onChangeText={(value) => field("groupId", value)} />)}
          {form.audience === "group" && !!groups.data?.items?.length && <Text style={s.small}>Invite classmates from the student search above before posting to this private group.</Text>}
          <Chips label="Story duration" value={form.duration} onChange={(value) => field("duration", value)} items={[
            { value: "24", label: "24 hours" },
            { value: "48", label: "48 hours" },
            { value: "72", label: "3 days" },
            { value: "168", label: "7 days" },
          ]} />
          <FormField label="Pin to Highlights collection (optional)" value={form.highlight} onChangeText={(value) => field("highlight", value)} />
          <FormField label="Schedule date/time (ISO format, optional)" value={form.schedule} onChangeText={(value) => field("schedule", value)} placeholder="2026-10-22T18:00:00+05:30" />
          <Button title={form.anonymous ? "Anonymous story · tap to change" : "Post as yourself · tap for anonymous"} variant="secondary" onPress={() => field("anonymous", !form.anonymous)} />
          <Text style={s.label}>Hide this story from specific people</Text>
          {(students.data?.items || []).filter((person) => person.id !== user?.id).slice(0, 5).map((person) => {
            const hidden = excludedUserIds.includes(person.id);
            return <Button key={person.id} title={`${hidden ? "✓ Hidden from" : "Hide from"} ${person.name}`} variant="secondary" onPress={() => setExcludedUserIds((old) => hidden ? old.filter((id) => id !== person.id) : [...old, person.id])} />;
          })}
          <Text style={[s.small, { color: colors.danger }]}>Do not post identifiable patient information or clinical photos.</Text>
          <Button title="Save draft" variant="secondary" loading={busy} onPress={() => createStory(true)} />
          <Button title={form.schedule ? "Schedule story" : "Post story"} loading={busy} onPress={() => createStory(false)} />
          <Button title="Cancel" variant="secondary" disabled={busy} onPress={() => setForm(null)} />
        </View>
      )}

      {selected && (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelected(null)}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 18, backgroundColor: "#20182a" }}>
        <View style={[s.card, { flex: 1, backgroundColor: "#20182a", borderColor: colors.purple[500] }]}>
          <View style={s.between}>
            <Text style={[s.pillText, { color: "#e7f8ba" }]}>{selected.creator} · {selected.subject}</Text>
            <Button title="Close" small variant="secondary" onPress={() => setSelected(null)} />
          </View>
          {selected.slides.length > 1 && (
            <View style={{ flexDirection: "row", gap: 5 }}>
              {selected.slides.map((_, index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`Show slide ${index + 1}`}
                  accessibilityState={{ selected: slideIndex === index }}
                  onPress={() => showSlide(index)}
                  style={{ flex: 1, height: 18, justifyContent: "center" }}
                >
                  <View style={{ height: 3, borderRadius: 3, backgroundColor: slideIndex === index ? "#e7f8ba" : "#ffffff55" }} />
                </Pressable>
              ))}
            </View>
          )}
          <Text style={[s.heading, { color: "white" }]}>{selected.title}</Text>
          {selected.mine && selected.needs_review && (
            <Text accessibilityRole="alert" style={[s.small, { color: "#ffc078" }]}>
              Viewers flagged this story as potentially incorrect. Verify, update, or delete it.
            </Text>
          )}
          {slide.media_url && <Image source={{ uri: `${mediaUrl}${slide.media_url}` }} style={{ width: "100%", height: 220, borderRadius: 14 }} resizeMode="contain" />}
          {slide.video_url && <Text style={[s.small, { color: "white" }]}>Video story: {mediaUrl}{slide.video_url}</Text>}
          {slide.text && <Text style={[s.body, { color: "white" }]}>{slide.text}</Text>}
          {(selected.kind === "quiz" || sticker.type === "quiz") && <>
            <Text style={[s.heading, { color: "white", fontSize: 16 }]}>{slide.text}</Text>
            {quizOptions.map((item, index) => <Button key={index} title={`${item}${slide.your_answer === index ? quizAnsweredCorrect ? " · Correct" : " · Your answer" : ""}${selected.mine && index === quizCorrectIndex ? " · Answer" : ""}`} disabled={!!answered[responseKey("quiz")] || busy} variant={chosen === index ? "primary" : "secondary"} onPress={() => setChosen(index)} />)}
            {!selected.mine && !answered[responseKey("quiz")] && <Button title="Check answer" disabled={chosen === null} loading={busy} onPress={() => respond("quiz", { option_index: chosen })} />}
            {quizAnsweredCorrect !== undefined && <Text style={[s.small, { color: quizAnsweredCorrect ? colors.success : "#ffc078" }]}>{quizAnsweredCorrect ? "Correct!" : "Not quite."} {slide.explanation || sticker.explanation}</Text>}
            {!selected.mine && <Button title="Save quiz to flashcards" variant="secondary" onPress={() => run(() => api.post(`/stories/${selected.id}/save`, { kind: "flashcard", slide_index: slideIndex, sticker_key: sticker.key || "" }))} />}
          </>}
          {selected.kind === "flashcard" && <View style={s.card}><Text style={s.label}>{slide.front}</Text><Text style={s.body}>{slide.back}</Text><Button title="Save to flashcards" variant="secondary" onPress={() => run(() => api.post(`/stories/${selected.id}/save`, { kind: "flashcard", slide_index: slideIndex, sticker_key: sticker.key || "" }))} /></View>}
          {selected.kind !== "flashcard" && !selected.mine && (slide.mnemonic || slide.text) && <Button title="Save to my notes" variant="secondary" onPress={() => run(() => api.post(`/stories/${selected.id}/save`, { kind: "note", slide_index: slideIndex, sticker_key: sticker.key || "" }))} />}
          {["poll", "this_or_that"].includes(sticker.type) && <>
            <Text style={[s.label, { color: "white" }]}>{sticker.prompt}</Text>
            {(sticker.options || []).map((item, index) => <Button key={index} title={`${item}${sticker.results?.[index] !== undefined ? ` · ${sticker.results[index]} votes` : ""}`} disabled={!!answered[responseKey("poll")]} variant={chosen === index ? "primary" : "secondary"} onPress={() => setChosen(index)} />)}
            {!selected.mine && !answered[responseKey("poll")] && <Button title="Vote" disabled={chosen === null} onPress={() => respond("poll", { option_index: chosen })} />}
          </>}
          {["question", "question_box", "doubt"].includes(sticker.type) && <>
            <FormField label={sticker.prompt || "Your response"} value={responseText} onChangeText={setResponseText} multiline />
            <Button title={sticker.type === "doubt" ? "Answer doubt" : "Send question"} disabled={!responseText.trim()} onPress={() => respond(sticker.type === "question_box" ? "question_box" : sticker.type, { answer: responseText })} />
          </>}
          {sticker.type === "countdown" && <Text style={[s.small, { color: "#e7f8ba" }]}>⏳ {sticker.prompt}</Text>}
          {sticker.data?.mcqs_today !== undefined && <Text style={[s.small, { color: "white" }]}>📈 Finished {sticker.data.mcqs_today} MCQs today</Text>}
          {sticker.data?.streak_days !== undefined && <Text style={[s.small, { color: "white" }]}>🔥 {sticker.data.streak_days}-day streak</Text>}
          {selected.kind === "study_with_me" && <>
            <Text style={[s.heading, { color: "#e7f8ba" }]}>{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")} left</Text>
            {!selected.mine && <Button title={answered.join ? "Joined session" : "Join shared timer"} disabled={!!answered.join} onPress={() => respond("join")} />}
          </>}
          {!selected.mine && selected.creator_id && <Button title="Reply with a story" variant="secondary" onPress={() => {
            setForm({ ...blank(), title: `Reply: ${selected.title}`, subject: selected.subject, replyToStoryId: selected.id });
            setSelected(null);
          }} />}
          {!selected.mine && (
            <>
              <Chips label="React to this story" value="" onChange={(reaction) => run(() => api.put(`/stories/${selected.id}/reactions`, { reaction, active: !selected.my_reactions?.includes(reaction) })).then(() => refreshSelected())} items={reactionItems} />
              <Button title="Report / needs verification" variant="secondary" onPress={() => Alert.alert("Report this story?", "Choose how you want to flag it.", [
                { text: "Cancel", style: "cancel" },
                { text: "Needs verification", onPress: () => run(() => api.post(`/stories/${selected.id}/flags`, { flag: "needs_verification", details: "Please verify this medical study information." })) },
                { text: "Incorrect information", onPress: () => run(() => api.post(`/stories/${selected.id}/flags`, { flag: "wrong_info", details: "Potentially incorrect study information." })) },
                { text: "Patient information", style: "destructive", onPress: () => run(() => api.post(`/stories/${selected.id}/flags`, { flag: "patient_info", details: "Potentially identifiable patient information." })) },
              ])} />
              {selected.creator_id && <Button title="Hide / block this creator" variant="secondary" onPress={() => Alert.alert("Hide or block?", selected.creator, [
                { text: "Cancel", style: "cancel" },
                { text: "Hide stories", onPress: () => run(() => api.post(`/stories/${selected.id}/hide`)) },
                { text: "Block", style: "destructive", onPress: () => run(() => api.post(`/stories/users/${selected.creator_id}/block`)) },
              ])} />}
            </>
          )}
          {selected.mine && <>
            <Text style={[s.label, { color: "white" }]}>Story insights · {selected.views} views</Text>
            {(selected.viewers || []).map((person) => <Text key={person.user_id} style={[s.small, { color: "white" }]}>{person.name}</Text>)}
            {(selected.responses || []).map((item) => <Text key={item.id} style={[s.small, { color: "white" }]}>{item.author}: {item.answer || (item.correct ? "Correct" : "Incorrect")}</Text>)}
            {(selected.flags || []).map((item) => <Text key={item.flag} style={[s.small, { color: "#ffc078" }]}>{item.flag}: {item.details}</Text>)}
          </>}
          {selected.slides.length > 1 && (
            <View style={s.between}>
              <Button title="Previous slide" variant="secondary" disabled={slideIndex === 0} onPress={() => showSlide(slideIndex - 1)} />
              <Text style={[s.small, { color: "white" }]}>{slideIndex + 1} / {selected.slides.length}</Text>
              <Button title="Next slide" variant="secondary" disabled={slideIndex === selected.slides.length - 1} onPress={() => showSlide(slideIndex + 1)} />
            </View>
          )}
        </View>
        </ScrollView>
        </Modal>
      )}
    </View>
  );
}
