import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle,
  Lightning,
  Notebook,
  Target,
  TrendUp,
} from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import useData from "../hooks/useData";
import { api } from "../context/AppContext";
import Button from "../components/Button";
import s from "./FeatureHub.module.css";

const tracks = {
  "NEET PG": { days: 126, goal: 40, done: 28, focus: "Pathology" },
  USMLE: { days: 182, goal: 30, done: 21, focus: "Pharmacology" },
  FMGE: { days: 94, goal: 35, done: 24, focus: "Medicine" },
};
const weakAreas = [
  ["Renal physiology", "Physiology", 42],
  ["Autonomic pharmacology", "Pharmacology", 48],
  ["Cardiac murmurs", "Medicine", 55],
  ["Brachial plexus", "Anatomy", 61],
  ["Nephrotic syndrome", "Pathology", 64],
];
const pyqs = [
  ["2025", "Anatomy", "Axillary artery branches", "3 min"],
  ["2024", "Medicine", "Approach to metabolic acidosis", "5 min"],
  ["2023", "Pharmacology", "Beta blocker contraindications", "4 min"],
  ["2022", "Pathology", "Nephrotic syndrome patterns", "6 min"],
];
const mistakes = [
  ["What is the most common cause of nephrotic syndrome in children?", "Pathology", "Minimal change disease"],
  ["Which nerve supplies the deltoid?", "Anatomy", "Axillary nerve"],
];
const revision = [
  ["Cushing reflex", "Raised ICP causes hypertension, bradycardia and irregular respiration."],
  ["Starling forces", "Net filtration = hydrostatic pressure minus oncotic pressure across the capillary."],
  ["Anion gap", "Na⁺ − (Cl⁻ + HCO₃⁻); use it to uncover unmeasured anions."],
];

export default function ExamPrep() {
  usePageMeta("Exam prep", "A focused workspace for NEET PG, USMLE and FMGE preparation.");
  const [track, setTrack] = useState(() => localStorage.getItem("mp:exam-track") || "NEET PG");
  const [year, setYear] = useState("All years");
  const [subject, setSubject] = useState("All subjects");
  const [notes, setNotes] = useState({});
  const [revealed, setRevealed] = useState(null);
  const [practice, setPractice] = useState("");
  const { data: featureState } = useData("/features");
  const current = tracks[track] || tracks["NEET PG"];
  useEffect(() => {
    if (!featureState) return;
    if (tracks[featureState.exam_track]) setTrack(featureState.exam_track);
    setNotes(featureState.mistake_notes || {});
  }, [featureState]);
  useEffect(() => localStorage.setItem("mp:exam-track", track), [track]);
  function chooseTrack(value) {
    setTrack(value);
    api.patch("/features", { exam_track: value }).catch(() => {});
  }
  function updateNote(index, value) {
    const next = { ...notes, [index]: value };
    setNotes(next);
    api.patch("/features", { mistake_notes: next }).catch(() => {});
  }
  const visiblePyqs = useMemo(
    () => pyqs.filter((item) => (year === "All years" || item[0] === year) && (subject === "All subjects" || item[1] === subject)),
    [year, subject],
  );
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div>
          <span className={s.eyebrow}>YOUR EXAM, YOUR DAILY EDGE</span>
          <h1>Prep that remembers where you get stuck.</h1>
          <p>One home for your target track, weak areas, previous year questions and the mistakes worth revisiting.</p>
        </div>
        <div className={s.heroActions}>
          <Button to="/mcqs?mode=mistakes" variant="white" small><Notebook size={17} /> Mistake notebook</Button>
          <Button to="/planner" variant="secondary" small>Open planner <ArrowRight size={16} /></Button>
        </div>
      </section>
      <div className={s.trackPicker} aria-label="Choose exam track">
        {Object.keys(tracks).map((name) => <button key={name} aria-pressed={track === name} onClick={() => chooseTrack(name)}>{name}</button>)}
      </div>
      <div className={s.trackMeta}>
        <div className={s.metric}><strong>{track}</strong><span>Current target</span></div>
        <div className={s.metric}><strong>{current.days}</strong><span>Days to target</span></div>
        <div className={s.metric}><strong>{current.done}/{current.goal}</strong><span>Questions today</span></div>
        <div className={s.metric}><strong>{current.focus}</strong><span>Focus subject</span></div>
      </div>
      <div className={s.layout}>
        <div className={s.stack}>
          <section className={s.card}>
            <div className={s.cardHeader}><div><h2>Your weakest 5 topics</h2><p>Built from every answer you have missed.</p></div><span className={s.iconTile}><TrendUp size={22} /></span></div>
            <div className={s.weakList}>{weakAreas.map(([topic, area, accuracy]) => <div className={s.weakItem} key={topic}><div><strong>{topic}</strong><small>{area}</small><div className={s.progress}><span style={{ width: `${accuracy}%` }} /></div></div><span className={s.accuracy}>{accuracy}%</span><button className={s.compactButton} onClick={() => setPractice(topic)}>{practice === topic ? "Queued" : "Practice"}</button></div>)}</div>
          </section>
          <section className={s.card}>
            <div className={s.cardHeader}><div><h2>Previous year questions</h2><p>Do a timed set, then read the explanation.</p></div><span className={s.iconTile}><BookOpen size={22} /></span></div>
            <div className={s.filterRow}><label>Year<select value={year} onChange={(e) => setYear(e.target.value)}><option>All years</option>{["2025", "2024", "2023", "2022"].map((x) => <option key={x}>{x}</option>)}</select></label><label>Subject<select value={subject} onChange={(e) => setSubject(e.target.value)}><option>All subjects</option>{["Anatomy", "Medicine", "Pharmacology", "Pathology"].map((x) => <option key={x}>{x}</option>)}</select></label></div>
            <div className={s.questionList}>{visiblePyqs.map(([itemYear, itemSubject, title, time]) => <div className={s.questionItem} key={title}><span className={s.iconTile}><span style={{ fontWeight: 800 }}>{itemYear.slice(2)}</span></span><div><strong>{title}</strong><small>{itemSubject} · {time} read</small></div><button className={s.compactButton} onClick={() => setPractice(title)}>Start <ArrowRight size={14} /></button></div>)}</div>
          </section>
          <section className={s.card}>
            <div className={s.cardHeader}><div><h2>Mistake notebook</h2><p>Add the reason behind the miss so the next recall sticks.</p></div><span className={s.iconTile}><Brain size={22} /></span></div>
            <div className={s.questionList}>{mistakes.map(([question, area, answer], index) => <div className={s.questionItem} key={question}><div><strong>{question}</strong><small>{area} · Correct answer: {answer}</small><textarea className={s.noteInput} placeholder="Why did I get this wrong?" value={notes[index] || ""} onChange={(e) => updateNote(index, e.target.value)} /></div><CheckCircle size={20} color={notes[index] ? "var(--success)" : "var(--line)"} /></div>)}</div>
          </section>
        </div>
        <aside className={s.stack}>
          <section className={s.highlight}><span className={s.eyebrow} style={{ color: "var(--purple-700)" }}>TODAY'S PLAN</span><h3>Keep the streak small and real.</h3><p>{current.done} of {current.goal} questions done. Ten more minutes on {current.focus} would complete your daily goal.</p><div className={s.progress} style={{ marginTop: 15 }}><span style={{ width: `${(current.done / current.goal) * 100}%` }} /></div><Button to="/mcqs?set=10" small style={{ marginTop: 18 }}>Continue questions <ArrowRight size={15} /></Button></section>
          <section className={s.card}><div className={s.cardHeader}><div><h2>Rapid revision</h2><p>High-yield one-liners for the night before.</p></div><span className={s.iconTile}><Lightning size={22} /></span></div><div className={s.revisionList}>{revision.map(([title, copy], index) => <div className={s.revisionItem} key={title}><div><strong>{title}</strong>{revealed === index && <div className={s.revealed}>{copy}</div>}</div><button className={s.compactButton} onClick={() => setRevealed(revealed === index ? null : index)}>{revealed === index ? "Hide" : "Reveal"}</button></div>)}</div></section>
          <section className={s.card}><div className={s.cardHeader}><div><h2>Track signal</h2><p>Accuracy is trending up this week.</p></div><span className={s.iconTile}><Target size={22} /></span></div><strong style={{ fontSize: "2rem" }}>+12%</strong><p className={s.muted}>Compared with your previous 50 answers</p><div className={s.progress} style={{ marginTop: 14 }}><span style={{ width: "72%" }} /></div></section>
        </aside>
      </div>
    </div>
  );
}
