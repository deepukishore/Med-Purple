import { useState } from "react";
import {
  CalendarDots,
  CaretLeft,
  CaretRight,
  Plus,
  Printer,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { api, useApp } from "../context/AppContext";
import Button from "../components/Button";
import { PageSkeleton, ErrorState } from "../components/States";
import u from "../components/ui.module.css";
import s from "./Planner.module.css";

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function moveDate(day, amount) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}
function label(day, options) {
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, options);
}
function monday(day) {
  const weekday = new Date(`${day}T12:00:00`).getDay();
  return moveDate(day, -(weekday === 0 ? 6 : weekday - 1));
}

export default function Planner() {
  usePageMeta(
    "Study Planner",
    "Plan study sessions and keep your revision on track.",
  );
  const { user, notify } = useApp();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: user.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [week, setWeek] = useState(() => monday(today));
  const [form, setForm] = useState(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { data, loading, error, reload } = useData("/planner");
  const blocks = Array.isArray(data) ? data : [];
  const days = Array.from({ length: 7 }, (_, i) => moveDate(week, i));
  const weekly = blocks.filter((block) => days.includes(block.day));
  const completed = weekly.filter((block) => block.done).length;
  const minutes = weekly.reduce((total, block) => total + block.minutes, 0);

  function open(block = {}) {
    setSaveError("");
    setForm({
      title: "",
      subject: "Anatomy",
      day: today,
      time: "09:00",
      minutes: 30,
      done: false,
      ...block,
    });
  }
  async function mutate(action, success) {
    if (pending) return false;
    setPending(true);
    setSaveError("");
    try {
      await action();
      reload();
      notify(success);
      return true;
    } catch (e) {
      setSaveError(e.message);
      return false;
    } finally {
      setPending(false);
    }
  }
  async function save(event) {
    event.preventDefault();
    const payload = {
      ...form,
      title: form.title.trim(),
      subject: form.subject.trim(),
      minutes: Number(form.minutes),
    };
    if (!payload.title || !payload.subject) {
      setSaveError("Enter a session title and subject.");
      return;
    }
    const saved = await mutate(
      () =>
        form.id
          ? api.put(`/planner/${form.id}`, payload)
          : api.post("/planner", payload),
      "Study session saved.",
    );
    if (saved) {
      setWeek(monday(form.day));
      setForm(null);
    }
  }

  return (
    <>
      <div className={u.pageHead}>
        <div>
          <h1>A little structure. More progress.</h1>
          <p>Make room for learning, one study block at a time.</p>
        </div>
        <Button disabled={pending || loading || !!error} onClick={() => open()}>
          <Plus size={18} /> Add study session
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={17} /> Print / PDF
        </Button>
      </div>
      <p className={s.saved}>
        Sessions are saved automatically to your{" "}
        {user?.is_guest ? "guest study space" : "account"}.
      </p>
      {form && (
        <section
          className={`${u.card} ${s.editor}`}
          aria-labelledby="session-heading"
        >
          <h2 id="session-heading">
            {form.id ? "Edit or reschedule session" : "Plan a study session"}
          </h2>
          <form onSubmit={save}>
            <fieldset disabled={pending} className={s.fields}>
              <label className={s.title}>
                Session title
                <input
                  required
                  maxLength={150}
                  autoFocus
                  value={form.title}
                  placeholder="e.g. Revise the brachial plexus"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                Subject
                <input
                  required
                  maxLength={50}
                  list="planner-subjects"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                />
                <datalist id="planner-subjects">
                  {[
                    "Anatomy",
                    "Physiology",
                    "Biochemistry",
                    "Pathology",
                    "Pharmacology",
                    "Microbiology",
                  ].map((subject) => (
                    <option key={subject} value={subject} />
                  ))}
                </datalist>
              </label>
              <label>
                Date
                <input
                  required
                  type="date"
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: e.target.value })}
                />
              </label>
              <label>
                Start time
                <input
                  required
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </label>
              <label>
                Duration (minutes)
                <input
                  required
                  type="number"
                  min={5}
                  max={480}
                  value={form.minutes}
                  onChange={(e) =>
                    setForm({ ...form, minutes: e.target.value })
                  }
                />
              </label>
            </fieldset>
            {saveError && (
              <p className={s.error} role="alert">
                {saveError}
              </p>
            )}
            <div className={s.actions}>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save session"}
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setForm(null);
                  setSaveError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}
      {!form && saveError && (
        <p className={s.error} role="alert">
          {saveError}
        </p>
      )}
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className={s.stats}>
            <div className={u.card}>
              <strong>{weekly.length}</strong>
              <span>Sessions this week</span>
            </div>
            <div className={u.card}>
              <strong>
                {Math.floor(minutes / 60)}h {minutes % 60}m
              </strong>
              <span>Planned study time</span>
            </div>
            <div className={u.card}>
              <strong>
                {completed} / {weekly.length}
              </strong>
              <span>Sessions completed</span>
            </div>
          </div>
          <section className={s.schedule} aria-label="Weekly study schedule">
            <div className={s.toolbar}>
              <h2>
                <CalendarDots size={24} />{" "}
                {label(week, { month: "short", day: "numeric" })} –{" "}
                {label(days[6], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <div className={s.actions}>
                <button
                  className={u.iconButton}
                  aria-label="Previous week"
                  onClick={() => setWeek(moveDate(week, -7))}
                >
                  <CaretLeft size={20} />
                </button>
                <Button
                  small
                  variant="secondary"
                  onClick={() => setWeek(monday(today))}
                >
                  This week
                </Button>
                <button
                  className={u.iconButton}
                  aria-label="Next week"
                  onClick={() => setWeek(moveDate(week, 7))}
                >
                  <CaretRight size={20} />
                </button>
              </div>
            </div>
            {!weekly.length && (
              <p className={s.empty}>
                Your week has room for a fresh start. Add a session to plan your
                revision.
              </p>
            )}
            <div className={s.days}>
              {days.map((day) => (
                <section
                  key={day}
                  className={`${s.day} ${day === today ? s.today : ""}`}
                  aria-label={label(day, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                >
                  <div className={s.dayHead}>
                    <h3>
                      {label(day, { weekday: "short" })}
                      <span>
                        {label(day, { day: "numeric", month: "short" })}
                      </span>
                    </h3>
                    {day === today && <span className={u.pill}>Today</span>}
                  </div>
                  {blocks
                    .filter((block) => block.day === day)
                    .map((block) => (
                      <article
                        className={`${s.block} ${block.done ? s.done : ""}`}
                        key={block.id}
                      >
                        <small>
                          {block.time} · {block.minutes} min
                        </small>
                        <h4>{block.title}</h4>
                        <p>{block.subject}</p>
                        <label className={s.check}>
                          <input
                            type="checkbox"
                            checked={block.done}
                            disabled={pending}
                            onChange={() =>
                              mutate(
                                () =>
                                  api.put(`/planner/${block.id}`, {
                                    ...block,
                                    done: !block.done,
                                  }),
                                block.done
                                  ? "Session reopened."
                                  : "Session completed.",
                              )
                            }
                          />{" "}
                          Completed
                        </label>
                        <div className={s.blockActions}>
                          <button
                            disabled={pending}
                            onClick={() => open(block)}
                          >
                            Edit
                          </button>
                          <button
                            disabled={pending}
                            onClick={() =>
                              mutate(
                                () => api.delete(`/planner/${block.id}`),
                                "Session deleted.",
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  <button
                    className={s.add}
                    disabled={pending}
                    onClick={() => open({ day })}
                  >
                    <Plus size={16} /> Add session
                  </button>
                </section>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
