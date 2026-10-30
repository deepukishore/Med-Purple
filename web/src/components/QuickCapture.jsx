import { useEffect, useRef, useState } from "react";
import { Camera, FloppyDisk, LinkSimple, Microphone, Note, Plus, X } from "@phosphor-icons/react";
import { api, useApp } from "../context/AppContext";
import s from "./QuickCapture.module.css";

const draftKey = "mp:quick-capture-draft";

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [form, setForm] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey)) || { kind: "note", title: "", content: "", source_url: "", media_name: "", media_data: "" };
    } catch {
      return { kind: "note", title: "", content: "", source_url: "", media_name: "", media_data: "" };
    }
  });
  const input = useRef(null);
  const { notify } = useApp();
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch {}
  }, [form]);
  function update(key, value) { setForm((old) => ({ ...old, [key]: value })); }
  function openCapture() {
    const selection = window.getSelection?.().toString().trim();
    if (selection) setForm((old) => ({ ...old, content: selection, title: old.title || "Highlighted idea" }));
    setOpen(true);
    setTimeout(() => input.current?.focus(), 0);
  }
  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { notify("Voice dictation is not available in this browser."); return; }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); notify("Voice capture could not start."); };
    recognition.onresult = (event) => update("content", `${form.content}${form.content ? " " : ""}${event.results[0][0].transcript}`);
    recognition.start();
  }
  function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((old) => ({ ...old, kind: "photo", media_name: file.name, media_data: String(reader.result || ""), title: old.title || file.name }));
    reader.readAsDataURL(file);
  }
  async function save(event) {
    event.preventDefault();
    if (!form.content.trim() && !form.source_url && !form.media_data) { notify("Add a note, link, photo, or voice memo first."); return; }
    setSaving(true);
    try {
      await api.post("/captures", { ...form, title: form.title.trim() || "Quick capture" });
      localStorage.removeItem(draftKey);
      setForm({ kind: "note", title: "", content: "", source_url: "", media_name: "", media_data: "" });
      setOpen(false);
      notify("Captured to your inbox. Sort it later when you have time.");
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  }
  return (
    <>
      <button className={s.fab} data-player-overlay="capture" onClick={openCapture} aria-label="Quick capture"><Plus size={18} /> <span>Capture</span></button>
      {open && <div className={s.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <form className={s.modal} onSubmit={save} aria-label="Quick capture form">
          <div className={s.head}><div><span className={s.eyebrow}>INBOX IT NOW. SORT IT LATER.</span><h2>Quick capture</h2></div><button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Close capture"><X size={20} /></button></div>
          <div className={s.types} role="group" aria-label="Capture type">
            {[["note", Note, "Note"], ["photo", Camera, "Photo"], ["voice", Microphone, "Voice"], ["link", LinkSimple, "Link"]].map(([kind, Icon, label]) => <button type="button" key={kind} aria-pressed={form.kind === kind} onClick={() => update("kind", kind)}><Icon size={17} /> {label}</button>)}
          </div>
          <label>Title<input ref={input} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Ask about this ECG" maxLength={200} /></label>
          {form.kind === "link" && <label>Link<input type="url" value={form.source_url} onChange={(e) => update("source_url", e.target.value)} placeholder="https://..." /></label>}
          {form.kind === "photo" && <label>Textbook page<input type="file" accept="image/*" onChange={chooseFile} /></label>}
          <label>{form.kind === "voice" ? "Voice transcript" : "Your thought"}<textarea value={form.content} onChange={(e) => update("content", e.target.value)} placeholder={form.kind === "voice" ? "Tap dictate and speak..." : "Write a quick thought, question, or reminder..."} rows={5} /></label>
          <div className={s.actions}><button type="button" className={s.voice} onClick={startVoice} aria-pressed={listening}><Microphone size={17} /> {listening ? "Listening..." : "Dictate"}</button><button className={s.save} disabled={saving}><FloppyDisk size={17} /> {saving ? "Saving..." : "Save capture"}</button></div>
          {form.media_name && <small className={s.file}>Attached: {form.media_name}</small>}
          <p className={s.draft}><span>Drafts autosave on this device.</span> <button type="button" onClick={() => { localStorage.removeItem(draftKey); setForm({ kind: "note", title: "", content: "", source_url: "", media_name: "", media_data: "" }); }}>Clear draft</button></p>
        </form>
      </div>}
    </>
  );
}
