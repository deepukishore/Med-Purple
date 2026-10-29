import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Stack, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import { api, useApp } from "../context/AppContext";
import MedByteCard from "../components/MedByteCard";
import Button from "../components/Button";
import { PageSkeleton, ErrorState, EmptyState } from "../components/States";
import u from "../components/ui.module.css";
import s from "./MedBytes.module.css";

function Feed({ subject, exam, onOptions }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watched, setWatched] = useState(0);
  const [completed, setCompleted] = useState(new Set());
  const cursor = useRef("");
  const cycle = useRef(0);
  const busy = useRef(false);
  const alive = useRef(true);
  const [active, setActive] = useState(0);
  const feed = useRef(null);
  const gesture = useRef({ y: 0, wheel: 0, last: 0 });
  const { notify } = useApp();
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const page = await api.get(
        "/medbytes?" +
          new URLSearchParams({
            subject,
            exam,
            cursor: cursor.current,
            limit: 6,
          }),
      );
      if (!alive.current) return;
      onOptions({ subjects: page.subjects, exams: page.exams });
      setWatched((old) => Math.max(old, page.completed_today));
      const batch = page.items.map((clip) => ({
        ...clip,
        feedKey: `${cycle.current}:${clip.id}`,
        replay: cycle.current > 0,
      }));
      setItems((old) => [...old, ...batch]);
      if (page.next_cursor) cursor.current = page.next_cursor;
      else {
        cursor.current = "";
        cycle.current += 1;
      }
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  }, [subject, exam, onOptions]);
  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);
  function navigate(direction) {
    if (direction < 0) setActive((index) => Math.max(0, index - 1));
    else if (active < items.length - 1) setActive(active + 1);
    else if (!loading) load();
  }
  useEffect(() => {
    if (items.length && active >= items.length - 2 && !loading && !error)
      load();
  }, [active, items.length, loading, error, load]);
  useEffect(() => {
    const element = feed.current;
    if (!element) return;
    const wheel = (event) => {
      if (event.target.closest("details")) return;
      event.preventDefault();
      const now = Date.now();
      if (now - gesture.current.last < 650) return;
      gesture.current.wheel += event.deltaY;
      if (Math.abs(gesture.current.wheel) > 65) {
        navigate(gesture.current.wheel > 0 ? 1 : -1);
        gesture.current.wheel = 0;
        gesture.current.last = now;
      }
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  });
  async function complete(id) {
    try {
      const result = await api.post(`/medbytes/${id}/complete`);
      if (!alive.current) return;
      setWatched(result.completed_today);
      setCompleted((old) => new Set([...old, id]));
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <p className={s.watchCount}>
        <Timer size={17} /> {watched} videos explored today · Keep scrolling to
        explore more
      </p>
      {!items.length ? (
        loading ? (
          <PageSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <EmptyState
            title="No clips in this collection yet"
            description="Try another subject or exam focus."
          />
        )
      ) : (
        <section className={s.theater} aria-label="MedBytes video viewer">
          <div className={s.stageGlow} aria-hidden="true" />
          <div
            className={s.feed}
            ref={feed}
            tabIndex={0}
            aria-label="Video feed. Use up and down arrows to change video."
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                navigate(event.key === "ArrowDown" ? 1 : -1);
              }
            }}
            onTouchStart={(event) => {
              gesture.current.y = event.touches[0].clientY;
            }}
            onTouchEnd={(event) => {
              if (event.target.closest("button, details")) return;
              const delta = gesture.current.y - event.changedTouches[0].clientY;
              if (Math.abs(delta) > 55) navigate(delta > 0 ? 1 : -1);
            }}
          >
            {items[active + 1] && (
              <div className={s.nextReelPeek} aria-hidden="true">
                <span>UP NEXT · {items[active + 1].subject}</span>
                <strong>{items[active + 1].title}</strong>
                <small>A little more anatomy, just ahead.</small>
              </div>
            )}
            <div className={s.reel} key={items[active].feedKey}>
              <MedByteCard
                clip={{
                  ...items[active],
                  watched:
                    items[active].watched || completed.has(items[active].id),
                }}
                playbackId={items[active].feedKey}
                autoPlay
                immersive
                onSave={(id, kind) =>
                  setItems((current) =>
                    current.map((item) =>
                      item.id === id
                        ? { ...item, [`saved_${kind}`]: true }
                        : item,
                    ),
                  )
                }
                onComplete={complete}
              />
            </div>
          </div>
          <nav className={s.reelNav} aria-label="Video navigation">
            <span className={s.reelLabel}>ONE BYTE AT A TIME</span>
            <button
              aria-label="Previous video"
              disabled={active === 0}
              onClick={() => navigate(-1)}
            >
              <ArrowUp size={22} />
            </button>
            <span aria-live="polite">
              {String(active + 1).padStart(2, "0")}
            </span>
            <button
              aria-label="Next video"
              disabled={loading && active === items.length - 1}
              onClick={() => navigate(1)}
            >
              <ArrowDown size={22} />
            </button>
            <small>
              Swipe or scroll
              <br />
              to explore
            </small>
            {items[active].replay && <small>Collection replay</small>}
          </nav>
          {error && (
            <div className={s.feedError}>
              <ErrorState message={error} onRetry={load} />
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default function MedBytes() {
  usePageMeta(
    "MedBytes",
    "Scroll through short medical learning videos and save ideas to notes and flashcards.",
  );
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [options, setOptions] = useState({ subjects: [], exams: [] });
  return (
    <div className={s.page}>
      <div className={`${u.pageHead} ${s.pageHead}`}>
        <div>
          <h1>Big ideas. Small bytes.</h1>
          <p>Your daily dose of discovery. One video at a time.</p>
        </div>
        <Button to="/flashcards" variant="secondary" small>
          <Stack size={18} /> Saved flashcards
        </Button>
      </div>
      <div className={s.filters}>
        <label>
          Subject
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All subjects</option>
            {options.subjects.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Exam focus
          <select value={exam} onChange={(e) => setExam(e.target.value)}>
            <option value="">All foundations</option>
            {options.exams.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </div>
      <Feed
        key={`${subject}:${exam}`}
        subject={subject}
        exam={exam}
        onOptions={setOptions}
      />
    </div>
  );
}
