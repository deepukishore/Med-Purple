import React, { useState, useEffect, useRef } from "react";
import { View, Text, Linking, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { styles as s, colors } from "../theme";
import { api, useApp } from "../context/AppContext";
import useData from "../hooks/useData";
import Screen from "../components/Screen";
import Button from "../components/Button";
import Chips from "../components/Chips";
import QuestionCard from "../components/QuestionCard";
import { Skeleton, ErrorState, EmptyState } from "../components/States";
// Unique submission identifiers support safe retries without double-counting.
const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === "x" ? n : (n & 3) | 8).toString(16);
  });
export default function MCQScreen({ navigation, route }) {
  const [subject, setSubject] = useState(route.params?.subject || ""),
    [topic, setTopic] = useState(route.params?.topic || ""),
    [difficulty, setDifficulty] = useState(
      route.params?.set || route.params?.mode || route.params?.subject
        ? ""
        : "Foundation",
    ),
    [mode, setMode] = useState(
      ["mistakes", "bookmarked"].includes(route.params?.mode)
        ? route.params.mode
        : "all",
    ),
    [items, setItems] = useState([]),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState(null),
    [result, setResult] = useState(null),
    [examMode, setExamMode] = useState(false),
    [examSession, setExamSession] = useState(null),
    [examIndex, setExamIndex] = useState(0),
    [examSelected, setExamSelected] = useState(null),
    [examResult, setExamResult] = useState(null),
    [examClock, setExamClock] = useState(Date.now()),
    [examPending, setExamPending] = useState(false),
    [examError, setExamError] = useState(""),
    [pending, setPending] = useState(false),
    [bookmarkPending, setBookmarkPending] = useState(false),
    [answers, setAnswers] = useState([]),
    [finished, setFinished] = useState(false),
    [round, setRound] = useState(1),
    [reward, setReward] = useState(null),
    [finishError, setFinishError] = useState("");
  const id = useRef(uuid());
  const originalSet = useRef([]);
  const startingProgress = useRef(null);
  const submissionLock = useRef(false);
  const examLock = useRef(false);
  const { notify } = useApp();
  const {
    data: progress,
    error: progressError,
    reload: reloadProgress,
  } = useData("/progress");
  const examSecondsLeft = examSession
    ? Math.max(0, Math.ceil((Date.parse(examSession.expires_at) - examClock) / 1000))
    : 0;
  useEffect(() => {
    const timer = setInterval(() => setExamClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (examSession && !examResult && examSecondsLeft === 0) completeExam();
  }, [examSession, examResult, examSecondsLeft]);
  useEffect(() => {
    setSubject(route.params?.subject || "");
    setTopic(route.params?.topic || "");
    setDifficulty(
      route.params?.set || route.params?.mode || route.params?.subject
        ? ""
        : "Foundation",
    );
    setMode(
      ["mistakes", "bookmarked"].includes(route.params?.mode)
        ? route.params.mode
        : "all",
    );
  }, [
    route.params?.subject,
    route.params?.topic,
    route.params?.mode,
    route.params?.set,
  ]);
  const { data, loading, error, reload } = useData(
    "/mcqs?" +
      new URLSearchParams({
        subject,
        topic,
        difficulty,
        mode,
        limit: String(route.params?.set || 50),
        shuffle: [3, 5, 10].includes(route.params?.set),
      }),
  );
  useEffect(() => {
    if (data) {
      originalSet.current = data.items;
      resetRound(data.items, 1);
    }
  }, [data]);
  function resetRound(questions, nextRound) {
    setItems(questions);
    setIndex(0);
    setSelected(null);
    setResult(null);
    setAnswers([]);
    setFinished(false);
    setRound(nextRound);
    setReward(null);
    setFinishError("");
    startingProgress.current = null;
    id.current = uuid();
  }
  const q = items[index];
  async function submit() {
    if (submissionLock.current || selected === null || result || !q) return;
    submissionLock.current = true;
    if (!startingProgress.current && progress)
      startingProgress.current = progress;
    setPending(true);
    try {
      const r = await api.post(`/mcqs/${q.id}/answer`, {
        selected_index: selected,
        request_id: id.current,
      });
      setResult(r);
      setAnswers((a) => [...a, { ...r, question: q, request_id: id.current }]);
      reloadProgress();
      Haptics.notificationAsync(
        r.correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    } catch (e) {
      notify(e.message);
    } finally {
      setPending(false);
      submissionLock.current = false;
    }
  }
  async function bookmark() {
    setBookmarkPending(true);
    try {
      await api.put(`/mcqs/${q.id}/bookmark`, { saved: !q.bookmarked });
      setItems((a) =>
        a.map((x) => (x.id === q.id ? { ...x, bookmarked: !x.bookmarked } : x)),
      );
      notify(q.bookmarked ? "Bookmark removed." : "Question bookmarked.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBookmarkPending(false);
    }
  }
  async function next() {
    if (submissionLock.current || !result) return;
    if (index + 1 === items.length) {
      submissionLock.current = true;
      setPending(true);
      setFinishError("");
      try {
        const completed = await api.post("/mcqs/complete", {
          request_ids: answers.map((a) => a.request_id),
        });
        setReward({
          xp: startingProgress.current
            ? completed.progress.xp - startingProgress.current.xp
            : null,
          leveledUp:
            startingProgress.current &&
            completed.progress.level > startingProgress.current.level,
          level: completed.progress.level,
        });
        setFinished(true);
        reloadProgress();
      } catch (e) {
        setFinishError(
          `Your answers are saved. ${e.message} Try Finish session again.`,
        );
      } finally {
        setPending(false);
        submissionLock.current = false;
      }
      return;
    }
    setIndex((x) => x + 1);
    setSelected(null);
    setResult(null);
    id.current = uuid();
  }
  const missed = answers.filter((a) => !a.correct);
  const nextDifficulty = { Foundation: "Applied", Applied: "Challenge" }[
    difficulty
  ];
  async function startExam() {
    setExamPending(true);
    setExamError("");
    try {
      const session = await api.post("/mcqs/exam-sessions", {
        subject,
        topic,
        difficulty,
        limit: [3, 5, 10].includes(Number(route.params?.set)) ? Number(route.params.set) : 10,
        mode,
        pass_mark: 70,
      });
      setExamSession(session);
      setExamIndex(0);
      setExamSelected(null);
      setExamResult(null);
      setExamClock(Date.now());
      examLock.current = false;
    } catch (error) {
      setExamError(error.message);
    } finally {
      setExamPending(false);
    }
  }
  async function completeExam() {
    if (!examSession || examLock.current) return;
    examLock.current = true;
    setExamPending(true);
    setExamError("");
    try {
      const completed = await api.post(`/mcqs/exam-sessions/${examSession.id}/complete`);
      setExamResult(completed);
      reloadProgress();
    } catch (error) {
      examLock.current = false;
      setExamError(error.message);
    } finally {
      setExamPending(false);
    }
  }
  async function saveExamAnswer() {
    const question = examSession?.items[examIndex];
    if (!question || examSelected === null) return;
    setExamPending(true);
    setExamError("");
    try {
      await api.post(`/mcqs/exam-sessions/${examSession.id}/answers`, {
        question_id: question.id,
        selected_index: examSelected,
      });
      setExamSession((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === question.id ? { ...item, selected_index: examSelected } : item,
        ),
      }));
      if (examIndex + 1 < examSession.items.length) {
        setExamIndex((current) => current + 1);
        setExamSelected(null);
      } else {
        completeExam();
      }
    } catch (error) {
      setExamError(error.message);
    } finally {
      setExamPending(false);
    }
  }
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <Screen>
      <View>
        <Text style={s.title}>One question closer.</Text>
        <Text style={s.subtitle}>
          Three levels. Small quests. Grow with every set.
        </Text>
      </View>
      {progress && (
        <View style={s.card}>
          <View style={s.between}>
            <Text style={s.heading}>Learning level {progress.level}</Text>
            <Text style={s.pillText}>{progress.xp} XP</Text>
          </View>
          <View
            style={s.progress}
            accessible
            accessibilityLabel={`${progress.level_progress} of 100 XP toward the next level`}
          >
            <View
              style={[s.progressFill, { width: `${progress.level_progress}%` }]}
            />
          </View>
          <Text style={s.small}>
            {100 - progress.level_progress} XP to level {progress.level + 1}.
            Every 100 XP levels you up.
          </Text>
        </View>
      )}
      {progressError && (
        <ErrorState message={progressError} onRetry={reloadProgress} />
      )}
      <Chips
        label="Session type"
        value={examMode ? "exam" : "practice"}
        onChange={(value) => {
          if (!examSession || examResult) setExamMode(value === "exam");
        }}
        items={[
          { value: "practice", label: "Practice · instant feedback" },
          { value: "exam", label: "Exam · results at end" },
        ]}
      />
      <Chips
        label="Question mode"
        value={mode}
        onChange={(v) => !pending && !bookmarkPending && setMode(v)}
        items={[
          { value: "all", label: "All questions" },
          { value: "bookmarked", label: "Bookmarks" },
          { value: "mistakes", label: "Mistakes" },
        ]}
      />
      <Chips
        label="Subject"
        value={subject}
        onChange={(v) => {
          if (!pending && !bookmarkPending) {
            setSubject(v);
            setTopic("");
          }
        }}
        items={[
          { value: "", label: "All subjects" },
          ...(data?.subjects || []),
        ]}
      />
      <Chips
        label="Topic"
        value={topic}
        onChange={(v) => !pending && !bookmarkPending && setTopic(v)}
        items={[{ value: "", label: "All topics" }, ...(data?.topics || [])]}
      />
      <Chips
        label="Choose your challenge"
        value={difficulty}
        onChange={(v) => {
          if (!pending && !bookmarkPending) {
            setDifficulty(v);
            setTopic("");
          }
        }}
        items={[
          { value: "Foundation", label: "1 · Foundation" },
          { value: "Applied", label: "2 · Applied" },
          { value: "Challenge", label: "3 · Challenge" },
          { value: "", label: "Mixed practice" },
        ]}
      />
      {examMode ? (
        !examSession ? (
          <View style={s.card}>
            <Text style={s.heading}>Timed exam mode</Text>
            <Text style={s.body}>
              Fixed set · 60 seconds per question · 70% pass mark. Answers and
              explanations remain hidden until submission.
            </Text>
            {!!examError && <Text style={[s.body, { color: colors.danger }]}>{examError}</Text>}
            <Button
              title={examPending ? "Starting…" : "Start timed exam · 10 questions"}
              loading={examPending}
              disabled={examPending || loading}
              onPress={startExam}
            />
          </View>
        ) : examResult ? (
          <View style={s.card}>
            <Ionicons name="trophy-outline" size={48} color={colors.accentInk} />
            <Text style={s.heading}>{examResult.passed ? "Exam passed" : "Exam complete"}</Text>
            <Text style={s.body}>
              Score: {examResult.score}% · Pass mark: {examResult.pass_mark}% ·{" "}
              {examResult.items.filter((item) => item.correct).length} of {examResult.items.length} correct.
            </Text>
            <Text style={s.small}>Exam XP is higher for passing.</Text>
            {examResult.items.map((item, itemIndex) => (
              <View key={item.id} style={s.card}>
                <Text style={s.heading}>{itemIndex + 1}. {item.stem}</Text>
                <Text style={s.body}>
                  Your answer: {item.selected_index === null ? "Not answered" : item.options[item.selected_index]}
                </Text>
                <Text style={s.pillText}>Correct answer: {item.options[item.correct_index]}</Text>
                <Text style={s.body}>{item.explanation}</Text>
                <Button
                  title="Read the source"
                  variant="secondary"
                  onPress={() => Linking.openURL(item.source_url).catch(() => notify("Could not open the source."))}
                />
              </View>
            ))}
            <Button
              title="Back to practice"
              variant="secondary"
              onPress={() => { setExamSession(null); setExamResult(null); setExamMode(false); }}
            />
          </View>
        ) : (
          <View style={s.card}>
            {(() => {
              const question = examSession.items[examIndex];
              return <>
                <View style={s.between}>
                  <Text style={s.small}>Exam · {examIndex + 1} / {examSession.items.length}</Text>
                  <Text style={[s.pillText, { color: colors.danger }]}>
                    {Math.floor(examSecondsLeft / 60)}:{String(examSecondsLeft % 60).padStart(2, "0")}
                  </Text>
                </View>
                <Text style={s.heading}>{question.stem}</Text>
                {question.options.map((option, optionIndex) => (
                  <Pressable
                    key={optionIndex}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: examSelected === optionIndex }}
                    onPress={() => setExamSelected(optionIndex)}
                    style={{
                      borderWidth: 1,
                      borderColor: examSelected === optionIndex ? colors.purple[600] : colors.line,
                      backgroundColor: examSelected === optionIndex ? colors.purple[50] : colors.surface,
                      borderRadius: 12,
                      padding: 15,
                      minHeight: 54,
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <Text style={s.pillText}>{String.fromCharCode(65 + optionIndex)}.</Text>
                    <Text style={[s.body, { flex: 1 }]}>{option}</Text>
                  </Pressable>
                ))}
                {!!examError && <Text style={[s.body, { color: colors.danger }]}>{examError}</Text>}
                <View style={{ gap: 8 }}>
                  <Button
                    title="Previous"
                    variant="secondary"
                    disabled={examIndex === 0 || examPending}
                    onPress={() => {
                      setExamIndex((current) => current - 1);
                      setExamSelected(examSession.items[examIndex - 1].selected_index ?? null);
                    }}
                  />
                  <Button
                    title={examIndex + 1 === examSession.items.length ? "Submit exam" : "Skip / next"}
                    variant="secondary"
                    disabled={examPending}
                    onPress={() => {
                      if (examIndex + 1 < examSession.items.length) {
                        setExamIndex((current) => current + 1);
                        setExamSelected(examSession.items[examIndex + 1].selected_index ?? null);
                      } else completeExam();
                    }}
                  />
                  <Button
                    title={examPending ? "Saving…" : examIndex + 1 === examSession.items.length ? "Save & submit" : "Save & next"}
                    disabled={examSelected === null || examPending}
                    loading={examPending}
                    onPress={saveExamAnswer}
                  />
                </View>
                <Text style={s.small}>Correctness and explanations stay hidden until you submit.</Text>
              </>;
            })()}
          </View>
        )
      ) : loading ? (
        <Skeleton />
      ) : !items.length ? (
        <EmptyState
          title={
            mode === "mistakes" ? "A clean slate." : "No questions here yet"
          }
          description="Try another filter. Incorrect answers appear in Mistakes until you get them right."
        />
      ) : finished ? (
        <>
          <View style={[s.card, { alignItems: "center", paddingVertical: 35 }]}>
            <Ionicons
              name="trophy-outline"
              size={52}
              color={colors.accentInk}
            />
            <Text style={[s.title, { textAlign: "center", fontSize: 29 }]}>
              {missed.length ? "Come back stronger." : "Set cleared!"}
            </Text>
            <Text style={s.small}>
              {answers.filter((x) => x.correct).length} of {answers.length}{" "}
              correct. Round {round} saved.
            </Text>
            {reward && (
              <Text style={s.pillText}>
                {reward.leveledUp ? `Level up! Level ${reward.level}. ` : ""}
                {reward.xp !== null ? `+${reward.xp} XP this round` : ""}
              </Text>
            )}
            {missed.length > 0 && (
              <Button
                title={`Try again · ${missed.length} missed`}
                onPress={() =>
                  resetRound(
                    missed.map((a) => a.question),
                    round + 1,
                  )
                }
              />
            )}
            {!missed.length && nextDifficulty && (
              <Button
                title={`Try ${nextDifficulty}`}
                onPress={() => {
                  setSubject("");
                  setTopic("");
                  setMode("all");
                  setDifficulty(nextDifficulty);
                }}
              />
            )}
            <Button
              title="Retry full set"
              variant="secondary"
              onPress={() => resetRound(originalSet.current, round + 1)}
            />
            <Button
              title="Start another session"
              variant="secondary"
              onPress={reload}
            />
            <Button
              title="Back to Home"
              variant="secondary"
              onPress={() => navigation.navigate("Main", { screen: "Home" })}
            />
          </View>
          <Text style={s.heading}>Answer key & explanations</Text>
          {answers.map((answer, i) => (
            <View key={answer.question.id} style={s.card}>
              <Text
                style={[
                  s.pillText,
                  { color: answer.correct ? colors.success : colors.danger },
                ]}
              >
                {answer.correct ? "Correct" : "Try again"}
              </Text>
              <Text style={s.heading}>
                {i + 1}. {answer.question.stem}
              </Text>
              <Text style={s.body}>
                Your answer: {String.fromCharCode(65 + answer.selected_index)}.{" "}
                {answer.question.options[answer.selected_index]}
              </Text>
              <Text style={s.pillText}>
                Answer key: {String.fromCharCode(65 + answer.correct_index)}.{" "}
                {answer.question.options[answer.correct_index]}
              </Text>
              <Text style={s.body}>{answer.explanation}</Text>
              <Button
                title="Read the source"
                variant="secondary"
                onPress={() =>
                  Linking.openURL(answer.source_url).catch(() =>
                    notify("Could not open the source."),
                  )
                }
              />
            </View>
          ))}
        </>
      ) : (
        q && (
          <>
            <View style={s.between}>
              <Text style={s.small}>
                Round {round} · {answers.length}/{items.length} completed
              </Text>
              <Text style={s.pillText}>
                {answers.filter((x) => x.correct).length} correct
              </Text>
            </View>
            <View style={s.progress}>
              <View
                style={[
                  s.progressFill,
                  { width: `${(answers.length / items.length) * 100}%` },
                ]}
              />
            </View>
            <QuestionCard
              q={q}
              index={index}
              total={items.length}
              selected={selected}
              onSelect={(value) => {
                setSelected(value);
                id.current = uuid();
              }}
              result={result}
              onSubmit={submit}
              onNext={next}
              onBookmark={bookmark}
              pending={pending}
              bookmarkPending={bookmarkPending}
            />
          </>
        )
      )}
      {!!finishError && (
        <Text
          accessibilityRole="alert"
          style={[s.body, { color: colors.danger }]}
        >
          {finishError}
        </Text>
      )}
      {progress?.mcq_journey && (
        <View style={s.card}>
          <Text style={s.heading}>Level-up quests</Text>
          {progress.mcq_journey.tasks.map((task) => (
            <View key={task.key} style={s.between}>
              <View style={{ flex: 1 }}>
                <Text style={s.body}>
                  {task.done ? "✓ " : ""}
                  {task.title}
                </Text>
                <Text style={s.small}>
                  {task.done ? "Completed" : `${task.current} / ${task.target}`}
                </Text>
              </View>
              <Text style={s.pillText}>{task.xp} XP</Text>
            </View>
          ))}
          <Text style={s.small}>
            +10 XP per new question, +10 for its first correct answer. Quest
            rewards are earned once. Retries never remove XP.
          </Text>
        </View>
      )}
      <Text style={s.small}>
        Original foundation questions for learning. Not an official exam bank.
      </Text>
    </Screen>
  );
}
