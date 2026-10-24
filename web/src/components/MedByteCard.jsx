import { useRef, useState, useEffect } from "react";
import {
  Play,
  Stack,
  Notebook,
  Check,
  BookmarkSimple,
  UserPlus,
  CheckCircle,
} from "@phosphor-icons/react";
import { api, useApp } from "../context/AppContext";
import Button from "./Button";
import s from "../pages/MedBytes.module.css";
const media = (path) => (import.meta.env.VITE_MEDIA_URL || "") + path;
const quizFor = (clip) => clip.quiz || {
  questions: [
    {
      question: clip.subject?.toLowerCase().includes("physiology")
        ? "What drives oxygen movement across the alveolar membrane?"
        : "What is the key takeaway from this MedByte?",
      options: clip.subject?.toLowerCase().includes("physiology")
        ? ["A pressure gradient", "Active transport", "Osmosis only"]
        : ["A linked mechanism", "A random fact", "A lab value alone"],
      answer: 0,
    },
    {
      question: "What is the best next step after learning this concept?",
      options: ["Explain it in your own words", "Skip all recall", "Only reread the title"],
      answer: 0,
    },
  ],
};
export default function MedByteCard({
  clip,
  onComplete,
  playbackId = clip.id,
  autoPlay = false,
  immersive = false,
  onSave,
}) {
  const video = useRef();
  const [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false),
    [saving, setSaving] = useState(""),
    [saved, setSaved] = useState({
      note: clip.saved_note,
      flashcard: clip.saved_flashcard,
    });
  const [savedLater, setSavedLater] = useState(clip.saved_later || false);
  const [followed, setFollowed] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const { notify } = useApp();
  const quiz = quizFor(clip);
  const questions = quiz.questions || [quiz];
  const currentQuiz = questions[quizIndex];
  useEffect(() => {
    api.get("/features")
      .then((state) => setFollowed((state.followed_creators || []).includes(clip.creator)))
      .catch(() => {});
  }, [clip.creator]);
  useEffect(() => {
    const pause = (e) => {
      if (e.detail !== playbackId) {
        video.current?.pause();
        setPlaying(false);
      }
    };
    window.addEventListener("mp:video", pause);
    const visibility = () => {
      if (document.hidden) video.current?.pause();
    };
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6)
          video.current?.pause();
        else if (
          autoPlay &&
          !document.hidden &&
          video.current.paused &&
          !video.current.ended
        ) {
          video.current.play().catch(() => {});
        }
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(video.current);
    return () => {
      window.removeEventListener("mp:video", pause);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
    };
  }, [playbackId, autoPlay]);
  async function save(kind) {
    setSaving(kind);
    try {
      await api.post(`/medbytes/${clip.id}/save`, { kind });
      setSaved((x) => ({ ...x, [kind]: true }));
      onSave?.(clip.id, kind);
      notify(
        kind === "note"
          ? "Added to your notes."
          : "Saved as a question and answer flashcard.",
      );
    } catch (e) {
      notify(e.message);
    } finally {
      setSaving("");
    }
  }
  async function toggleSaveLater() {
    try {
      if (savedLater) {
        await api.delete(`/medbytes/${clip.id}/save?kind=later`);
        setSavedLater(false);
        notify("Removed from Save for later.");
      } else {
        await api.post(`/medbytes/${clip.id}/save`, { kind: "later" });
        setSavedLater(true);
        notify("Saved for later.");
      }
    } catch (e) {
      notify(e.message);
    }
  }
  async function toggleCreatorFollow() {
    try {
      const featureState = await api.get("/features");
      const creators = new Set(featureState.followed_creators || []);
      if (creators.has(clip.creator)) creators.delete(clip.creator);
      else creators.add(clip.creator);
      await api.patch("/features", { followed_creators: [...creators] });
      const next = creators.has(clip.creator);
      setFollowed(next);
      notify(next ? `Following ${clip.creator}.` : `Unfollowed ${clip.creator}.`);
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <article className={`${s.clip} ${immersive ? s.immersive : ""}`}>
      <div className={s.videoWrap}>
        <video
          ref={video}
          poster={media(clip.poster_path)}
          src={media(clip.video_path)}
          preload={autoPlay ? "auto" : "none"}
          playsInline
          muted={autoPlay}
          controls={playing}
          aria-label={clip.title}
          onPlay={() => {
            setPlaying(true);
            window.dispatchEvent(
              new CustomEvent("mp:video", { detail: playbackId }),
            );
          }}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          onEnded={() => {
            setPlaying(false);
            onComplete(clip.id);
          }}
        >
          <track
            kind="captions"
            src={media(clip.video_path.replace(".mp4", ".vtt"))}
            srcLang="en"
            label="English"
          />
        </video>
        {!playing && !failed && (
          <button
            className={s.playButton}
            aria-label={`Play ${clip.title}`}
            onClick={() => video.current.play().catch(() => setFailed(true))}
          >
            <Play size={25} weight="fill" />
          </button>
        )}
        {failed && (
          <div className={s.error}>
            <p>This clip couldn’t load.</p>
            <button
              onClick={() => {
                setFailed(false);
                video.current.load();
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <div className={s.clipBody}>
        <p className={s.topic}>
          {clip.subject} / {clip.topic}
        </p>
        <h2 className={s.clipTitle}>{clip.title}</h2>
        <div className={s.creator}>
          <span className={s.creatorIcon}>m</span>
          <div>
            <b>{clip.creator}</b>
            {clip.credentials}
          </div>
          <button
            className={s.followCreator}
            aria-pressed={followed}
            onClick={toggleCreatorFollow}
          >
            <UserPlus size={14} /> {followed ? "Following" : "Follow"}
          </button>
          {clip.watched && (
            <Check
              style={{ marginLeft: "auto" }}
              size={20}
              color="var(--success)"
              aria-label="Watched today"
            />
          )}
        </div>
        <div className={s.actions}>
          <Button
            variant="secondary"
            disabled={!!saving || saved.flashcard}
            onClick={() => save("flashcard")}
          >
            <Stack size={19} />
            {saved.flashcard
              ? "Flashcard saved"
              : saving === "flashcard"
                ? "Saving…"
                : "Save to Flashcards"}
          </Button>
          <Button
            variant="secondary"
            disabled={!!saving || saved.note}
            onClick={() => save("note")}
          >
            <Notebook size={19} />
            {saved.note
              ? "Added to Notes"
              : saving === "note"
                ? "Saving…"
                : "Add to Notes"}
          </Button>
        </div>
        <div className={s.laterRow}>
          <button
            className={s.laterButton}
            aria-pressed={savedLater}
            onClick={toggleSaveLater}
          >
            <BookmarkSimple size={16} weight={savedLater ? "fill" : "regular"} />
            {savedLater ? "Saved for later" : "Save for later"}
          </button>
          <span className={s.creatorHint}>Follow creators to shape your feed</span>
        </div>
        <details className={s.quiz}>
          <summary><span>2-question recall check</span><span>+10 XP</span></summary>
          <p>{currentQuiz.question}</p>
          <div className={s.quizOptions}>
            {currentQuiz.options.map((option, index) => (
              <button
                key={option}
                className={quizChoice === index ? s.quizSelected : ""}
                aria-pressed={quizChoice === index}
                onClick={() => {
                  setQuizChoice(index);
                  setQuizChecked(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
          <Button
            small
            disabled={quizChoice === null}
            onClick={() => {
              if (quizChecked && quizIndex < questions.length - 1) {
                setQuizIndex((value) => value + 1);
                setQuizChoice(null);
                setQuizChecked(false);
                return;
              }
              setQuizChecked(true);
              notify(quizChoice === currentQuiz.answer ? "Correct recall. +10 XP" : "Good attempt — revisit the transcript.");
            }}
          >
            {quizChecked ? <><CheckCircle size={15} /> {quizIndex < questions.length - 1 ? "Next question" : "Answers saved"}</> : "Check answer"}
          </Button>
        </details>
        <details className={s.transcript}>
          <summary>Read transcript & source</summary>
          <p>{clip.transcript}</p>
          <a href={clip.source_url} target="_blank" rel="noreferrer">
            Further reading in OpenStax
          </a>
        </details>
      </div>
    </article>
  );
}
