import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Books,
  CalendarDots,
  CheckCircle,
  Clock,
  FileText,
  Lightning,
  PlayCircle,
  Plus,
  Stack,
  Timer,
  Trash,
  TrendUp,
} from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import useData from "../hooks/useData";
import { api, useApp } from "../context/AppContext";
import Button from "../components/Button";
import s from "./Productivity.module.css";

const mixItems = [
  { id: "mcq-renal", kind: "MCQ", title: "Renal physiology sprint", subject: "Physiology" },
  { id: "card-ecg", kind: "Flashcard", title: "ECG axis basics", subject: "Medicine" },
  { id: "note-shock", kind: "Note", title: "Shock: first principles", subject: "Medicine" },
  { id: "video-nephron", kind: "Video", title: "How the nephron concentrates urine", subject: "Physiology" },
];
const templates = [
  ["Cardiology revision week", "MCQs, ECG flashcards, and one short video", ["mcq-renal", "card-ecg"]],
  ["Night-before rapid review", "One-liners, mistakes, and high-yield notes", ["note-shock", "card-ecg"]],
];

function iconFor(kind) {
  if (kind === "MCQ") return <Books size={15} />;
  if (kind === "Flashcard") return <Stack size={15} />;
  if (kind === "Video") return <PlayCircle size={15} />;
  return <FileText size={15} />;
}

export default function StudyHub() {
  usePageMeta("Study tools", "Build custom study sets and fit revision into the time you actually have.");
  const { notify } = useApp();
  const sets = useData("/study-sets");
  const history = useData("/study-history");
  const sharedNotes = useData("/shared-notes");
  const [selected, setSelected] = useState(["mcq-renal", "card-ecg"]);
  const [form, setForm] = useState(null);
  const [minutes, setMinutes] = useState(15);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [planning, setPlanning] = useState(false);
  const [sharedForm, setSharedForm] = useState(null);
  const chosen = useMemo(() => mixItems.filter((item) => selected.includes(item.id)), [selected]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          notify("Study mode complete. Nice work.");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, notify]);

  function toggle(id) {
    setSelected((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }
  async function createSet(event) {
    event.preventDefault();
    try {
      await api.post("/study-sets", { ...form, items: chosen });
      notify("Study set saved.");
      sets.reload();
      setForm(null);
    } catch (error) {
      notify(error.message);
    }
  }
  async function useTemplate(template) {
    try {
      await api.post("/study-sets", {
        title: template[0],
        description: template[1],
        items: mixItems.filter((item) => template[2].includes(item.id)),
      });
      notify("Template copied to your study sets.");
      sets.reload();
    } catch (error) {
      notify(error.message);
    }
  }
  async function startSession() {
    setRemaining(minutes * 60);
    setRunning(true);
    try {
      await api.post("/study-history", {
        kind: "timed-session",
        title: `${minutes}-minute study mode`,
        subject: "Mixed revision",
        metadata: { minutes, items: chosen },
      });
      history.reload();
    } catch (error) {
      notify(error.message);
    }
  }
  async function removeSet(id) {
    try {
      await api.delete(`/study-sets/${id}`);
      sets.reload();
    } catch (error) {
      notify(error.message);
    }
  }
  async function buildPlan() {
    setPlanning(true);
    try {
      const result = await api.post("/planner/auto", { subjects: ["Anatomy", "Medicine", "Physiology"], days: 7, minutes: 30 });
      notify(result.length ? "A seven-day plan was added to your planner." : "Your planner already has sessions for those days.");
    } catch (error) { notify(error.message); }
    finally { setPlanning(false); }
  }
  async function saveSharedNote(event) {
    event.preventDefault();
    try {
      const request = sharedForm.id ? api.put(`/shared-notes/${sharedForm.id}`, sharedForm) : api.post("/shared-notes", sharedForm);
      await request;
      notify("Shared note saved for the study circle.");
      sharedNotes.reload();
      setSharedForm(null);
    } catch (error) { notify(error.message); }
  }

  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div>
          <span className={s.eyebrow}>MAKE THE TIME YOU HAVE COUNT</span>
          <h1>Build a study session that fits real life.</h1>
          <p>Mix questions, cards, notes, and videos, then choose five minutes, fifteen, or a full hour.</p>
        </div>
        <Button to="/planner" variant="white" small><CalendarDots size={17} /> Open planner</Button>
      </section>
      <div className={s.grid}>
        <div className={s.stack}>
          <section className={s.card}>
            <div className={s.head}><div><h2>Timed study mode</h2><p className={s.subtext}>A small session is still a real session.</p></div><span className={s.icon}><Timer size={21} /></span></div>
            <div className={s.modes}>{[5, 15, 60].map((value) => <button key={value} className={s.mode} aria-pressed={minutes === value} onClick={() => setMinutes(value)}>{value} minutes</button>)}</div>
            <div className={s.mix}>{mixItems.map((item) => <button key={item.id} aria-pressed={selected.includes(item.id)} onClick={() => toggle(item.id)}>{iconFor(item.kind)}{item.title}</button>)}</div>
            <div className={s.timer}><Clock size={24} color="var(--purple-700)" /><div><strong>{running ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}` : `${minutes}:00`}</strong><span>{running ? "Focus mode is running" : `${chosen.length} items selected for this session`}</span></div><Button small disabled={!chosen.length || running} onClick={startSession}>{running ? "In progress" : "Start session"} <ArrowRight size={15} /></Button></div>
          </section>
          <section className={s.card}>
            <div className={s.head}><div><h2>Your custom study sets</h2><p className={s.subtext}>Make a playlist for this week's rotation or exam block.</p></div><Button small onClick={() => setForm({ title: "", description: "" })}><Plus size={16} /> New set</Button></div>
            {form && <form className={s.form} onSubmit={createSet}><label>Set name<input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cardiology revision week" /></label><label>Description<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What do you want to be able to do after this set?" /></label><div className={s.row}><Button type="submit" small>Save set</Button><Button type="button" variant="secondary" small onClick={() => setForm(null)}>Cancel</Button></div></form>}
            {sets.loading ? <p className={s.subtext}>Loading your sets...</p> : <div className={s.setList}>{(sets.data || []).map((item) => <div className={s.setItem} key={item.id}><span className={s.count}>{item.items.length}</span><div><strong>{item.title}</strong><small>{item.description || "Mixed revision"}</small></div><button className={s.action} onClick={() => { setSelected(item.items.map((x) => x.id)); notify("Set loaded into the timer."); }}>Use set</button><button className={s.action} aria-label={`Delete ${item.title}`} onClick={() => removeSet(item.id)}><Trash size={15} /></button></div>)}</div>}
          </section>
        </div>
        <aside className={s.stack}>
          <section className={s.card}><div className={s.head}><div><h2>Copy a template</h2><p className={s.subtext}>Start with a structure, then make it yours.</p></div><Lightning size={22} color="var(--purple-600)" /></div><div className={s.templateList}>{templates.map((template) => <div className={s.template} key={template[0]}><span className={s.icon}><TrendUp size={18} /></span><div><strong>{template[0]}</strong><small>{template[1]}</small></div><button className={s.action} onClick={() => useTemplate(template)}>Copy</button></div>)}</div></section>
          <section className={s.card}><div className={s.head}><div><h2>Continue where you left off</h2><p className={s.subtext}>Your recent study history.</p></div><CheckCircle size={22} color="var(--success)" /></div><div className={s.history}>{(history.data || []).slice(0, 5).map((item) => <div className={s.historyItem} key={item.id}><span className={s.icon}><Clock size={17} /></span><div><strong>{item.title}</strong><small>{item.subject}</small></div><button className={s.action} onClick={() => notify(`Resuming ${item.title}.`)}>Resume</button></div>)}{!history.loading && !(history.data || []).length && <p className={s.subtext}>Your next session will appear here.</p>}</div></section>
          <section className={s.card}><div className={s.head}><div><h2>Shared class note</h2><p className={s.subtext}>A collaborative summary anyone in the study circle can edit.</p></div><Button small onClick={() => setSharedForm({ title: "", content: "" })}><Plus size={15} /> New</Button></div>{sharedForm && <form className={s.form} onSubmit={saveSharedNote}><label>Title<input required value={sharedForm.title} onChange={(e) => setSharedForm({ ...sharedForm, title: e.target.value })} /></label><label>Note<textarea rows={4} value={sharedForm.content} onChange={(e) => setSharedForm({ ...sharedForm, content: e.target.value })} /></label><div className={s.row}><Button small type="submit">Save</Button><Button small type="button" variant="secondary" onClick={() => setSharedForm(null)}>Cancel</Button></div></form>}<div className={s.history}>{(sharedNotes.data || []).slice(0, 4).map((note) => <div className={s.historyItem} key={note.id}><span className={s.icon}><FileText size={17} /></span><div><strong>{note.title}</strong><small>{note.content.slice(0, 90) || "Empty note"}</small></div><button className={s.action} onClick={() => setSharedForm({ id: note.id, title: note.title, content: note.content })}>Edit</button></div>)}</div></section>
          <section className={s.notice}><strong>Smart nudge</strong><br />Your planner and exam focus can shape these sessions automatically as you answer more questions.<div className={s.row} style={{ marginTop: 10 }}><button className={s.action} disabled={planning} onClick={buildPlan}>{planning ? "Building..." : "Build 7-day plan"}</button><Button to="/preferences" variant="ghost" small>Set preferences <ArrowRight size={14} /></Button></div></section>
        </aside>
      </div>
    </div>
  );
}
