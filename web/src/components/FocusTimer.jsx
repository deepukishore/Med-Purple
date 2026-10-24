import { useEffect, useRef, useState } from "react";
import { Timer, ArrowsOut, X, Moon, CheckCircle } from "@phosphor-icons/react";
import { api, useApp } from "../context/AppContext";
import Button from "./Button";
import s from "./FocusTimer.module.css";
export default function FocusTimer() {
  const { user, notify } = useApp();
  const key = "mp:focus:" + user.id;
  const [timer, setTimer] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (
        stored &&
        Number.isFinite(stored.remaining) &&
        stored.remaining >= 0 &&
        (!stored.end || Number.isFinite(stored.end))
      )
        return {
          ...stored,
          duration: stored.duration || Math.max(300, stored.remaining),
          task: typeof stored.task === "string" ? stored.task : "",
        };
    } catch {}
    return { remaining: 1500, duration: 1500, end: null, task: "" };
  });
  const [now, setNow] = useState(Date.now()),
    [expanded, setExpanded] = useState(false),
    [saving, setSaving] = useState(false),
    [rewardError, setRewardError] = useState("");
  const room = useRef(null),
    enter = useRef(null);
  const remaining = timer.end
    ? Math.max(0, Math.ceil((timer.end - now) / 1000))
    : timer.remaining;
  const display =
    String(Math.floor(remaining / 60)).padStart(2, "0") +
    ":" +
    String(remaining % 60).padStart(2, "0");
  const fraction = Math.min(1, remaining / timer.duration);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(timer));
    } catch {}
  }, [key, timer]);
  useEffect(() => {
    if (!timer.end) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer.end]);
  useEffect(() => {
    if (timer.end && remaining === 0) {
      setTimer((t) => ({ ...t, remaining: 0, end: null }));
      notify("Focus session complete. Stretch, sip, and take five.");
      if (timer.sessionId) saveReward(timer.sessionId);
    }
  }, [remaining, timer.end, notify]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  async function saveReward(id) {
    setRewardError("");
    try {
      const result = await api.post(`/activities/focus/${id}/complete`);
      if (result.xp_earned)
        notify(`Focus session complete. +${result.xp_earned} XP`);
      setTimer((t) => (t.sessionId === id ? { ...t, sessionId: null } : t));
    } catch (e) {
      setRewardError(e.message);
    }
  }
  async function toggle() {
    if (saving) return;
    let sessionId = timer.sessionId;
    if (!timer.end && (!sessionId || remaining === 0)) {
      setSaving(true);
      try {
        sessionId = (
          await api.post("/activities/focus", { seconds: timer.duration })
        ).id;
      } catch (e) {
        notify(e.message);
        return;
      } finally {
        setSaving(false);
      }
    }
    const time = Date.now();
    setNow(time);
    setTimer((t) => ({
      ...t,
      sessionId,
      remaining: remaining || t.duration,
      end: t.end ? null : time + (remaining || t.duration) * 1000,
    }));
  }
  function reset() {
    setRewardError("");
    setTimer((t) => ({
      ...t,
      remaining: t.duration,
      end: null,
      sessionId: null,
    }));
  }
  function controls() {
    return (
      <>
        <div className={s.buttons}>
          <Button small onClick={toggle} disabled={saving}>
            {timer.end
              ? "Pause"
              : remaining === 0
                ? "Focus again"
                : "Start focus"}
          </Button>
          <Button small variant="secondary" onClick={reset} disabled={saving}>
            Reset
          </Button>
        </div>
        <div className={s.presets} role="group" aria-label="Focus duration">
          {[5, 15, 25].map((n) => (
            <button
              key={n}
              disabled={!!timer.end || saving}
              aria-pressed={timer.duration === n * 60}
              onClick={() =>
                setTimer((t) => ({
                  ...t,
                  remaining: n * 60,
                  duration: n * 60,
                  end: null,
                  sessionId: null,
                }))
              }
            >
              {n} min
            </button>
          ))}
        </div>
        {rewardError && (
          <p role="alert">
            {rewardError}{" "}
            <button onClick={() => saveReward(timer.sessionId)}>
              Retry saving XP
            </button>
          </p>
        )}
      </>
    );
  }
  function clock() {
    return (
      <div className={s.clock} style={{ "--progress": fraction * 360 + "deg" }}>
        <div>
          <span role="timer" aria-label="Focus time remaining">
            {display}
          </span>
          <small>
            {timer.end
              ? "one thing at a time"
              : remaining === 0
                ? "you made room for you"
                : "a little room to think"}
          </small>
        </div>
      </div>
    );
  }
  return (
    <section className={s.panel} id="focus-timer">
      <div className={s.heading}>
        <span>
          <Timer size={17} /> THE FOCUS CORNER
        </span>
        <button
          ref={enter}
          aria-label="Open focus room"
          onClick={() => {
            room.current.showModal();
            setExpanded(true);
          }}
        >
          <ArrowsOut size={19} />
        </button>
      </div>
      <h2>
        Less noise.
        <br />
        More headspace.
      </h2>
      {clock()}
      {controls()}
      <button
        className={s.enter}
        onClick={() => {
          room.current.showModal();
          setExpanded(true);
        }}
      >
        Enter my focus room <ArrowsOut size={15} />
      </button>
      <dialog
        ref={room}
        className={s.room}
        aria-labelledby="focus-room-title"
        onClose={() => {
          setExpanded(false);
          enter.current?.focus();
        }}
      >
        <header>
          <span>
            <Moon size={22} /> MED PURPLE / QUIET SPACE
          </span>
          <button
            aria-label="Close focus room"
            onClick={() => room.current.close()}
          >
            <X size={22} />
          </button>
        </header>
        <div className={s.roomBody}>
          <span className={s.status}>
            {remaining === 0 ? <CheckCircle size={16} /> : <span />}
            {remaining === 0
              ? "SESSION COMPLETE"
              : timer.end
                ? "IN YOUR FOCUS ERA"
                : "THE REST CAN WAIT"}
          </span>
          <h2 id="focus-room-title">Just you. One thing.</h2>
          <label htmlFor="focus-intention">
            What are you making space for?
          </label>
          <input
            id="focus-intention"
            value={timer.task}
            maxLength={120}
            placeholder="e.g. Make cardiac physiology finally click"
            onChange={(e) => setTimer((t) => ({ ...t, task: e.target.value }))}
          />
          {clock()}
          {controls()}
          <p className={s.roomNote}>
            {remaining === 0
              ? "You showed up. Take a break, stretch, and let it settle."
              : "Phone down. Shoulders soft. You don't have to finish everything today."}
          </p>
        </div>
      </dialog>
    </section>
  );
}
