import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Trophy, Target, BookOpen } from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { api, useApp } from "../context/AppContext";
import Button from "../components/Button";
import QuestionCard from "../components/QuestionCard";
import MCQPatient from "../components/MCQPatient";
import { MCQLevels, MCQXP, MCQAnswerKey } from "../components/MCQJourney";
import { PageSkeleton, ErrorState, EmptyState } from "../components/States";
import u from "../components/ui.module.css";
import s from "./MCQs.module.css";
import { createRequestId } from "../utils/requestId";
import { sessionSize as parseSessionSize } from "../utils/sessionSize";
export default function MCQs() {
  usePageMeta(
    "MCQ bank",
    "Practice medical foundation questions with explanations, bookmarks, and a personal mistake review.",
  );
  const [params] = useSearchParams();
  const [subject, setSubject] = useState(params.get("subject") || ""),
    [topic, setTopic] = useState(params.get("topic") || ""),
    [difficulty, setDifficulty] = useState(
      params.get("set") || params.get("mode") || params.get("subject")
        ? ""
        : "Foundation",
    ),
    [mode, setMode] = useState(
      ["mistakes", "bookmarked"].includes(params.get("mode"))
        ? params.get("mode")
        : "all",
    ),
    [sessionSize, setSessionSize] = useState(
      parseSessionSize(params.get("set")),
    );
  const [index, setIndex] = useState(0),
    [selected, setSelected] = useState(null),
    [result, setResult] = useState(null),
    [examMode, setExamMode] = useState(false),
    [examSession, setExamSession] = useState(null),
    [examIndex, setExamIndex] = useState(0),
    [examSelected, setExamSelected] = useState(null),
    [examResult, setExamResult] = useState(null),
    [examExpired, setExamExpired] = useState(false),
    [examClock, setExamClock] = useState(Date.now()),
    [examPending, setExamPending] = useState(false),
    [examError, setExamError] = useState(""),
    [pending, setPending] = useState(false),
    [bookmarkPending, setBookmarkPending] = useState(false),
    [requestError, setRequestError] = useState(""),
    [results, setResults] = useState([]),
    [finished, setFinished] = useState(false),
    [items, setItems] = useState([]),
    [round, setRound] = useState(1),
    [reward, setReward] = useState(null);
  const originalSet = useRef([]);
  const startingProgress = useRef(null);
  const submissionLock = useRef(false);
  const examLock = useRef(false);
  const sessionAnchor = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => setExamClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const examSecondsLeft = examSession
    ? Math.max(
        0,
        Math.ceil((Date.parse(examSession.expires_at) - examClock) / 1000),
      )
    : 0;
  useEffect(() => {
    if (examSession && !examResult && examSecondsLeft === 0) {
      setExamExpired(true);
      completeExam();
    }
  }, [examSession, examResult, examSecondsLeft]);
  useEffect(() => {
    if (finished || round > 1 || index > 0) {
      sessionAnchor.current?.focus({ preventScroll: true });
      sessionAnchor.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    }
  }, [finished, round, index]);
  const requestId = useRef(null);
  if (requestId.current === null) requestId.current = createRequestId();
  const { notify } = useApp();
  const {
    data: progress,
    error: progressError,
    reload: reloadProgress,
  } = useData("/progress");
  const { data: featureState } = useData("/features");
  const copyTone =
    featureState?.preferences?.copyTone === "playful" ? "playful" : "focused";
  const path =
    "/mcqs?" +
    new URLSearchParams({
      subject,
      topic,
      difficulty,
      mode,
      limit: sessionSize,
      shuffle: sessionSize < 50,
    });
  const { data, loading, error, reload } = useData(path);
  useEffect(() => {
    setSubject(params.get("subject") || "");
    setTopic(params.get("topic") || "");
    setMode(
      ["mistakes", "bookmarked"].includes(params.get("mode"))
        ? params.get("mode")
        : "all",
    );
    setSessionSize(parseSessionSize(params.get("set")));
    setDifficulty(
      params.get("set") || params.get("mode") || params.get("subject")
        ? ""
        : "Foundation",
    );
  }, [params]);
  useEffect(() => {
    if (!data) return;
    originalSet.current = data.items;
    resetRound(data.items, 1);
  }, [data]);
  function resetRound(questions, nextRound) {
    setItems(questions);
    setIndex(0);
    setSelected(null);
    setResult(null);
    setResults([]);
    setFinished(false);
    setRequestError("");
    setReward(null);
    setRound(nextRound);
    startingProgress.current = null;
    requestId.current = createRequestId();
  }
  const q = items[index];
  async function submit() {
    if (selected === null || submissionLock.current || result || !q) return;
    submissionLock.current = true;
    if (!startingProgress.current && progress)
      startingProgress.current = progress;
    setPending(true);
    setRequestError("");
    try {
      const answer = await api.post(`/mcqs/${q.id}/answer`, {
        selected_index: selected,
        request_id: requestId.current,
      });
      setResult(answer);
      setResults((r) => [
        ...r,
        { ...answer, question: q, request_id: requestId.current },
      ]);
      reloadProgress();
    } catch (e) {
      setRequestError(e.message);
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
    if (index === items.length - 1) {
      submissionLock.current = true;
      setPending(true);
      setRequestError("");
      try {
        const completed = await api.post("/mcqs/complete", {
          request_ids: results.map((r) => r.request_id),
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
        setRequestError(
          `Your answers are saved. Could not finish the set: ${e.message} Try Finish session again.`,
        );
      } finally {
        setPending(false);
        submissionLock.current = false;
      }
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setResult(null);
    setRequestError("");
    requestId.current = createRequestId();
  }
  const correct = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.correct);
  const patientRhythm =
    examMode && examSession
      ? examResult
        ? examExpired
          ? "flatline"
          : examResult.passed
            ? "revived"
            : "arrhythmia"
        : examSecondsLeft <= 10
          ? "codeBlue"
          : "steady"
      : finished
        ? correct / Math.max(results.length, 1) >= 0.7
          ? "revived"
          : "steady"
        : result
          ? result.correct
            ? "steady"
            : "arrhythmia"
          : "steady";
  const nextDifficulty = { Foundation: "Applied", Applied: "Challenge" }[
    difficulty
  ];
  function chooseLevel(value) {
    setDifficulty(value);
    setTopic("");
    if (value === difficulty) reload();
  }
  async function startExam() {
    setExamPending(true);
    setExamError("");
    try {
      const session = await api.post("/mcqs/exam-sessions", {
        subject,
        topic,
        difficulty,
        mode,
        limit: Math.min(sessionSize, 50),
        pass_mark: 70,
      });
      setExamSession(session);
      setExamIndex(0);
      setExamSelected(null);
      setExamResult(null);
      setExamExpired(false);
      setExamClock(Date.now());
      examLock.current = false;
    } catch (error) {
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
          item.id === question.id
            ? { ...item, selected_index: examSelected }
            : item,
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
  async function completeExam() {
    if (!examSession || examLock.current) return;
    examLock.current = true;
    setExamPending(true);
    setExamError("");
    try {
      const completed = await api.post(
        `/mcqs/exam-sessions/${examSession.id}/complete`,
      );
      setExamResult(completed);
      reloadProgress();
    } catch (error) {
      examLock.current = false;
      setExamError(error.message);
    } finally {
      setExamPending(false);
    }
  }
  return (
    <>
      <div className={u.pageHead}>
        <div>
          <h1>One question closer.</h1>
          <p>Three levels. Small quests. A little stronger with every set.</p>
        </div>
        <span className={u.pill}>
          <BookOpen size={16} />
          Practice & level up
        </span>
      </div>
      <MCQLevels
        journey={progress?.mcq_journey}
        difficulty={difficulty}
        onChange={chooseLevel}
        disabled={
          pending ||
          bookmarkPending ||
          loading ||
          (!!examSession && !examResult)
        }
      />
      <div className={s.modes} aria-label="Study session type">
        <button
          aria-pressed={!examMode}
          className={`${s.mode} ${!examMode ? s.selectedMode : ""}`}
          disabled={!!examSession && !examResult}
          onClick={() => setExamMode(false)}
        >
          Practice · instant feedback
        </button>
        <button
          aria-pressed={examMode}
          className={`${s.mode} ${examMode ? s.selectedMode : ""}`}
          disabled={!!examSession && !examResult}
          onClick={() => setExamMode(true)}
        >
          Exam · timed, results at end
        </button>
      </div>
      <div className={s.modes} aria-label="Question mode">
        {[
          ["all", "All questions"],
          ["bookmarked", "Bookmarked"],
          ["mistakes", "Review mistakes"],
        ].map(([key, label]) => (
          <button
            aria-pressed={mode === key}
            disabled={
              pending || bookmarkPending || (!!examSession && !examResult)
            }
            className={`${s.mode} ${mode === key ? s.selectedMode : ""}`}
            key={key}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={s.filters}>
        <label>
          Subject
          <select
            value={subject}
            disabled={
              pending || bookmarkPending || (!!examSession && !examResult)
            }
            onChange={(e) => {
              setSubject(e.target.value);
              setTopic("");
            }}
          >
            <option value="">All subjects</option>
            {data?.subjects.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select
            value={topic}
            disabled={
              pending || bookmarkPending || (!!examSession && !examResult)
            }
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">All topics</option>
            {data?.topics.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Set size
          <select
            value={sessionSize}
            disabled={
              pending || bookmarkPending || (!!examSession && !examResult)
            }
            onChange={(e) => setSessionSize(Number(e.target.value))}
          >
            <option value={3}>3 questions</option>
            <option value={5}>5 questions</option>
            <option value={10}>10 questions</option>
            <option value={50}>All matching questions</option>
          </select>
        </label>
      </div>
      <MCQPatient rhythm={patientRhythm} exam={examMode} />
      <div ref={sessionAnchor} tabIndex={-1} className={s.sessionAnchor}>
        {examMode ? (
          !examSession ? (
            <section className={s.examPanel}>
              <h2>Timed exam mode</h2>
              <p>
                Fixed question set, 60 seconds per question, and a 70% pass
                mark. Answers and explanations stay hidden until you submit.
              </p>
              {examError && <p role="alert">{examError}</p>}
              <Button
                disabled={examPending || !data?.items?.length}
                onClick={startExam}
              >
                {examPending
                  ? "Starting…"
                  : `Start ${Math.min(sessionSize, data?.total || sessionSize)}-question exam`}
              </Button>
            </section>
          ) : examResult ? (
            <section className={s.examPanel}>
              <Trophy size={48} weight="duotone" color="var(--accent-ink)" />
              <h2>{examResult.passed ? "Exam passed" : "Exam complete"}</h2>
              <p>
                Score: {examResult.score}% · Pass mark: {examResult.pass_mark}%
                · {examResult.items.filter((item) => item.correct).length} of{" "}
                {examResult.items.length} correct.
              </p>
              <p>
                {examResult.progress?.xp ?? progress?.xp} XP total · exam
                rewards are higher for passing.
              </p>
              {examResult.items.map((item, itemIndex) => (
                <article className={s.examReview} key={item.id}>
                  <strong>
                    {itemIndex + 1}. {item.stem}
                  </strong>
                  <p>
                    Your answer:{" "}
                    {item.selected_index === null
                      ? "Not answered"
                      : item.options[item.selected_index]}
                  </p>
                  <p>Correct answer: {item.options[item.correct_index]}</p>
                  <p>{item.explanation}</p>
                  <a href={item.source_url} target="_blank" rel="noreferrer">
                    Read the source
                  </a>
                </article>
              ))}
              <Button
                onClick={() => {
                  setExamSession(null);
                  setExamResult(null);
                  setExamMode(false);
                }}
              >
                Back to practice
              </Button>
            </section>
          ) : (
            <section className={s.examPanel}>
              {(() => {
                const question = examSession.items[examIndex];
                return (
                  <>
                    <div className={s.examHead}>
                      <span>
                        Code Blue · {examIndex + 1} / {examSession.items.length}
                      </span>
                      <strong role="timer">
                        {Math.floor(examSecondsLeft / 60)}:
                        {String(examSecondsLeft % 60).padStart(2, "0")}
                      </strong>
                    </div>
                    {examSecondsLeft <= 10 && (
                      <div
                        className={s.defibCharge}
                        role="progressbar"
                        aria-label="Defibrillator charging"
                        aria-valuemin={0}
                        aria-valuemax={10}
                        aria-valuenow={10 - examSecondsLeft}
                        style={{
                          "--charge": `${((10 - examSecondsLeft) / 10) * 100}%`,
                        }}
                      >
                        <span />
                        <small>DEFIBRILLATOR CHARGING</small>
                      </div>
                    )}
                    <h2>{question.stem}</h2>
                    <div className={s.examOptions}>
                      {question.options.map((option, optionIndex) => (
                        <button
                          className={
                            examSelected === optionIndex
                              ? s.examOptionSelected
                              : s.examOption
                          }
                          key={optionIndex}
                          aria-pressed={examSelected === optionIndex}
                          onClick={() => setExamSelected(optionIndex)}
                        >
                          <span>{String.fromCharCode(65 + optionIndex)}.</span>{" "}
                          {option}
                        </button>
                      ))}
                    </div>
                    {examError && <p role="alert">{examError}</p>}
                    <div className={s.examActions}>
                      <Button
                        variant="secondary"
                        disabled={examIndex === 0 || examPending}
                        onClick={() => {
                          setExamIndex((current) => current - 1);
                          setExamSelected(
                            examSession.items[examIndex - 1].selected_index ??
                              null,
                          );
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={examPending}
                        onClick={() => {
                          if (examIndex + 1 < examSession.items.length) {
                            setExamIndex((current) => current + 1);
                            setExamSelected(
                              examSession.items[examIndex + 1].selected_index ??
                                null,
                            );
                          } else completeExam();
                        }}
                      >
                        Skip / submit
                      </Button>
                      <Button
                        disabled={examSelected === null || examPending}
                        onClick={saveExamAnswer}
                      >
                        {examPending
                          ? "Saving…"
                          : examIndex + 1 === examSession.items.length
                            ? "Save & submit exam"
                            : "Save & next"}
                      </Button>
                    </div>
                    <p className={s.examHint}>
                      Your answer is saved without revealing correctness. You
                      can return to an earlier question before submitting.
                    </p>
                  </>
                );
              })()}
            </section>
          )
        ) : loading ? (
          <PageSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !items.length ? (
          <EmptyState
            title={
              mode === "mistakes"
                ? "A clean slate."
                : "No questions in this view"
            }
            description={
              mode === "mistakes"
                ? "Questions you answer incorrectly appear here until you get them right."
                : "Try another subject or bookmark a question to keep it close."
            }
          >
            <Button
              onClick={() => {
                setSubject("");
                setTopic("");
                setDifficulty("");
                setMode("all");
              }}
            >
              Browse all questions
            </Button>
          </EmptyState>
        ) : finished ? (
          <div className={s.layout}>
            <div>
              <div className={s.complete} role="status">
                <Trophy size={58} weight="duotone" color="var(--accent-ink)" />
                <h2>
                  {missed.length
                    ? "A chance to come back stronger."
                    : "Set cleared. Nicely done."}
                </h2>
                <p>
                  {correct} of {results.length} correct (
                  {Math.round((correct / results.length) * 100)}%). Round{" "}
                  {round} saved.
                  {missed.length
                    ? " Review the answer key, then try again."
                    : " Every answer correct. Ready for your next challenge?"}
                </p>
                {reward && (
                  <div
                    className={`${s.reward} ${reward.leveledUp ? s.levelUpReward : ""}`}
                  >
                    {reward.leveledUp
                      ? `Level up! You reached level ${reward.level}. `
                      : ""}
                    {reward.xp !== null && `+${reward.xp} XP this round`}
                    {reward.leveledUp && (
                      <span className={s.levelUpConfetti} aria-hidden="true">
                        💊　🧬　🩺
                      </span>
                    )}
                  </div>
                )}
                <div className={s.completeActions}>
                  {missed.length > 0 && (
                    <Button
                      onClick={() =>
                        resetRound(
                          missed.map((r) => r.question),
                          round + 1,
                        )
                      }
                    >
                      Try again · {missed.length} missed
                    </Button>
                  )}
                  {!missed.length && nextDifficulty && (
                    <Button
                      onClick={() => {
                        setSubject("");
                        setMode("all");
                        chooseLevel(nextDifficulty);
                      }}
                    >
                      Try {nextDifficulty}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => resetRound(originalSet.current, round + 1)}
                  >
                    Retry full set
                  </Button>
                  <Button variant="secondary" onClick={reload}>
                    Start another session
                  </Button>
                </div>
              </div>
              <MCQAnswerKey results={results} />
            </div>
            <aside className={s.summary}>
              <MCQXP progress={progress} />
              {progressError && (
                <ErrorState message={progressError} onRetry={reloadProgress} />
              )}
            </aside>
          </div>
        ) : (
          <div className={s.layout}>
            {q && (
              <QuestionCard
                key={q.id}
                question={q}
                tone={copyTone}
                index={index}
                total={items.length}
                selected={selected}
                onSelect={(value) => {
                  setSelected(value);
                  setRequestError("");
                  requestId.current = createRequestId();
                }}
                result={result}
                onSubmit={submit}
                onNext={next}
                onBookmark={bookmark}
                pending={pending}
                bookmarkPending={bookmarkPending}
                requestError={requestError}
              />
            )}
            <aside className={s.summary}>
              <MCQXP progress={progress} />
              {progressError && (
                <ErrorState message={progressError} onRetry={reloadProgress} />
              )}
              <div className={u.card}>
                <div className={u.sectionHead}>
                  <h2>Your session · round {round}</h2>
                  <Target size={22} color="var(--purple-600)" />
                </div>
                <div className={s.summaryNumber}>
                  {results.length}
                  <span style={{ fontSize: 20, color: "var(--muted)" }}>
                    {" "}
                    / {items.length}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    margin: "10px 0 20px",
                  }}
                >
                  questions completed · {items.length} available in this set
                </p>
                <div className={u.progress}>
                  <span
                    style={{
                      width: `${(results.length / items.length) * 100}%`,
                    }}
                  />
                </div>
                <div className={s.summaryGrid}>
                  <div>
                    <strong>{correct}</strong>
                    <small>Correct</small>
                  </div>
                  <div>
                    <strong>
                      {results.length
                        ? Math.round((correct / results.length) * 100)
                        : 0}
                      %
                    </strong>
                    <small>Accuracy</small>
                  </div>
                </div>
                <Button
                  disabled={pending}
                  className={s.setButton}
                  variant="secondary"
                  small
                  onClick={() => {
                    if (sessionSize === 5) reload();
                    else setSessionSize(5);
                  }}
                >
                  Fresh 5-question set
                </Button>
              </div>
              <div className={s.tip}>
                <h3 style={{ color: "var(--ink)", marginBottom: 8 }}>
                  Make mistakes useful.
                </h3>
                <p>
                  Read the explanation before moving on. A missed question is a
                  concept you now know to revisit.
                </p>
                <p style={{ marginTop: 12, fontSize: 12 }}>
                  Original starter questions. Educational practice, not an
                  official exam bank.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
