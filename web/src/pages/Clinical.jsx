import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle, ClipboardText, ImageSquare, Plus, Stethoscope, UsersThree } from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import useData from "../hooks/useData";
import { api } from "../context/AppContext";
import Button from "../components/Button";
import s from "./FeatureHub.module.css";

const differentialChoices = ["Pulmonary embolism", "Pneumonia", "Acute pericarditis", "Myocardial infarction"];
const viva = [
  ["What is the first-line treatment for anaphylaxis?", "IM adrenaline in the anterolateral thigh."],
  ["Name the boundaries of the femoral triangle.", "Inguinal ligament, sartorius and adductor longus."],
  ["What does a raised JVP suggest?", "Raised right atrial pressure, often from right heart failure or fluid overload."],
];

export default function Clinical() {
  usePageMeta("Clinical lab", "Practice image interpretation, virtual patients, differentials and viva recall.");
  const [imageAnswer, setImageAnswer] = useState("");
  const [imageDone, setImageDone] = useState(false);
  const [vivaOpen, setVivaOpen] = useState(null);
  const [chosenDifferentials, setChosenDifferentials] = useState([]);
  const [patientMessages, setPatientMessages] = useState([{ from: "patient", text: "I have had chest pain for two hours, especially when I walk." }]);
  const [question, setQuestion] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [logs, setLogs] = useState([]);
  const [clinicalState, setClinicalState] = useState({});
  const [logForm, setLogForm] = useState({ caseName: "", type: "Case seen", note: "" });
  const { data: featureState } = useData("/features");
  useEffect(() => {
    if (!featureState) return;
    setLogs(featureState.clinical_logs || []);
    const saved = featureState.clinical_state || {};
    setClinicalState(saved);
    setImageAnswer(saved.image_answer || "");
    setImageDone(Boolean(saved.image_done));
    setDiagnosis(saved.diagnosis || "");
    if (Array.isArray(saved.patient_messages)) setPatientMessages(saved.patient_messages);
    if (Array.isArray(saved.differentials)) setChosenDifferentials(saved.differentials);
  }, [featureState]);
  function saveClinical(next) {
    setClinicalState((previous) => {
      const merged = { ...previous, ...next };
      api.patch("/features", { clinical_state: merged }).catch(() => {});
      return merged;
    });
  }
  useEffect(() => {
    if (imageDone) saveClinical({ image_answer: imageAnswer, image_done: true });
  }, [imageDone]);
  useEffect(() => {
    if (diagnosis) saveClinical({ diagnosis });
  }, [diagnosis]);
  function askPatient(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setPatientMessages((items) => {
      const next = [...items, { from: "you", text: question.trim() }, { from: "patient", text: question.toLowerCase().includes("fever") ? "Yes, I have felt feverish since yesterday." : "No, I have not noticed anything else." }];
      saveClinical({ patient_messages: next });
      return next;
    });
    setQuestion("");
  }
  function toggleDifferential(item) { setChosenDifferentials((items) => { const next = items.includes(item) ? items.filter((x) => x !== item) : [...items, item]; saveClinical({ differentials: next }); return next; }); }
  function addLog(e) { e.preventDefault(); if (!logForm.caseName.trim()) return; setLogs((items) => { const next = [{ ...logForm, caseName: logForm.caseName.trim() }, ...items]; api.patch("/features", { clinical_logs: next }).catch(() => {}); return next; }); setLogForm({ caseName: "", type: "Case seen", note: "" }); }
  return (
    <div className={s.page}>
      <section className={s.hero}><div><span className={s.eyebrow}>FROM THEORY TO THE WARD</span><h1>Think like a clinician, one case at a time.</h1><p>Interpret the image. Ask the right history. Build a differential. Then log what you learned from the day.</p></div><div className={s.heroActions}><Button to="/mcqs?subject=Medicine&set=5" variant="white" small><Stethoscope size={17} /> Medicine questions</Button><Button to="/planner" variant="secondary" small>Add a clinical block <ArrowRight size={15} /></Button></div></section>
      <div className={s.clinicalGrid}>
        <section className={s.card}><div className={s.cardHeader}><div><h2>Image interpretation</h2><p>Read the ECG before choosing the finding.</p></div><span className={s.iconTile}><ImageSquare size={22} /></span></div><div className={s.imageFrame}><div className={s.ecg} /></div><strong>What is the most likely rhythm?</strong><div className={s.choiceGrid}>{["Sinus rhythm", "Atrial fibrillation", "Ventricular tachycardia", "Heart block"].map((item) => <button className={s.choice} aria-pressed={imageAnswer === item} key={item} onClick={() => setImageAnswer(item)}>{item}</button>)}</div><Button small disabled={!imageAnswer || imageDone} onClick={() => setImageDone(true)} style={{ marginTop: 14 }}>{imageDone ? <><CheckCircle size={16} /> +20 XP earned</> : "Check finding"}</Button>{imageDone && <p className={s.success} style={{ marginTop: 10 }}>Correct — this tracing shows sinus rhythm. Try another image tomorrow.</p>}</section>
        <section className={s.card}><div className={s.cardHeader}><div><h2>Virtual patient</h2><p>Ask history questions, then reach a diagnosis.</p></div><span className={s.iconTile}><UsersThree size={22} /></span></div><div className={s.patientChat}>{patientMessages.map((message, index) => <div key={index} className={`${s.bubble} ${message.from === "you" ? s.you : ""}`}>{message.text}</div>)}</div><form className={s.inlineForm} onSubmit={askPatient}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about symptoms..." aria-label="Ask the patient a question" /><button className={s.compactButton} type="submit">Ask</button></form><label style={{ display: "grid", gap: 7, marginTop: 15, fontSize: "0.76rem", color: "var(--muted)" }}>Your diagnosis<input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. stable angina" /></label>{diagnosis && <p className={s.muted} style={{ marginTop: 10 }}>Case saved as a practice attempt. Submit when you are ready to see your score.</p>}<Button small variant="secondary" style={{ marginTop: 12 }} onClick={() => setPatientMessages((items) => [...items, { from: "patient", text: "The case will be scored after you submit your final diagnosis." }])}>Submit case <ArrowRight size={15} /></Button></section>
        <section className={s.card}><div className={s.cardHeader}><div><h2>Differential diagnosis game</h2><p>Choose every plausible diagnosis for this presentation.</p></div><span className={s.iconTile}><Stethoscope size={22} /></span></div><div className={s.highlight}><strong>Sudden pleuritic chest pain + tachycardia</strong><p>Build the differential before the timer runs out.</p></div><div className={s.choiceGrid}>{differentialChoices.map((item) => <button className={s.choice} aria-pressed={chosenDifferentials.includes(item)} key={item} onClick={() => toggleDifferential(item)}>{chosenDifferentials.includes(item) ? "✓ " : ""}{item}</button>)}</div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}><span className={s.muted}>{chosenDifferentials.length} diagnoses selected</span><Button small onClick={() => setChosenDifferentials(["Pulmonary embolism", "Pneumonia"])}>Score differential</Button></div></section>
        <section className={s.card}><div className={s.cardHeader}><div><h2>Viva practice</h2><p>Flip to reveal the model answer.</p></div><span className={s.iconTile}><ClipboardText size={22} /></span></div><div className={s.vivaList}>{viva.map(([prompt, answer], index) => <div className={s.vivaItem} key={prompt}><div><strong>{prompt}</strong>{vivaOpen === index && <div className={s.revealed}>{answer}</div>}</div><button className={s.compactButton} onClick={() => setVivaOpen(vivaOpen === index ? null : index)}>{vivaOpen === index ? "Hide" : "Reveal"}</button></div>)}</div></section>
      </div>
      <section className={s.card}><div className={s.cardHeader}><div><h2>Clinical postings log</h2><p>Keep a private record of cases seen, procedures observed and learning points.</p></div><span className={s.iconTile}><ClipboardText size={22} /></span></div><form className={s.logForm} onSubmit={addLog}><div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}><input required value={logForm.caseName} onChange={(e) => setLogForm({ ...logForm, caseName: e.target.value })} placeholder="Case or procedure" /><select value={logForm.type} onChange={(e) => setLogForm({ ...logForm, type: e.target.value })}><option>Case seen</option><option>Procedure observed</option><option>Learning point</option></select></div><textarea value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} placeholder="What will you remember from this?" /><Button type="submit" small><Plus size={16} /> Add to log</Button></form><div className={s.logList}>{logs.map((item, index) => <div className={s.logItem} key={`${item.caseName}-${index}`}><span className={s.iconTile}><Stethoscope size={19} /></span><div><strong>{item.caseName}</strong><span className={s.logTag}>{item.type}</span><small style={{ display: "block", marginTop: 6 }}>{item.note || "No learning point added yet."}</small></div><small>Today</small></div>)}</div></section>
    </div>
  );
}
