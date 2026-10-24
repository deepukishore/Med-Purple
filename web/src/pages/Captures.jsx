import { useState } from "react";
import { Camera, LinkSimple, Microphone, Note, Trash, ArrowRight } from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { api, useApp } from "../context/AppContext";
import Button from "../components/Button";
import s from "./Productivity.module.css";

const icons = { note: Note, photo: Camera, voice: Microphone, link: LinkSimple };
export default function Captures() {
  usePageMeta("Capture inbox", "Sort quick notes, voice memos, textbook photos and links when you have a moment.");
  const { notify } = useApp();
  const { data, loading, reload } = useData("/captures");
  const [filter, setFilter] = useState("all");
  const items = (data || []).filter((item) => filter === "all" || item.kind === filter);
  async function makeNote(item) {
    try {
      await api.post("/saved", { kind: "note", title: item.title, content: item.content || item.source_url || item.media_name, subject: "Captured" });
      notify("Capture turned into a study note.");
    } catch (error) { notify(error.message); }
  }
  async function remove(item) {
    try { await api.delete(`/captures/${item.id}`); reload(); notify("Moved to trash."); } catch (error) { notify(error.message); }
  }
  return <div className={s.page}><section className={s.hero}><div><span className={s.eyebrow}>YOUR INBOX FOR GOOD IDEAS</span><h1>Capture now. Sort when the ward gets quiet.</h1><p>Everything you saved from the floating Capture button lands here, ready to become a note, flashcard, study set, or just stay as a reference.</p></div><Button to="/study-tools" variant="white" small>Build a study set <ArrowRight size={15} /></Button></section><section className={s.card}><div className={s.head}><div><h2>Capture inbox</h2><p className={s.subtext}>{items.length} item{items.length === 1 ? "" : "s"} waiting to be sorted.</p></div><div className={s.chips}>{["all", "note", "photo", "voice", "link"].map((kind) => <button key={kind} aria-pressed={filter === kind} onClick={() => setFilter(kind)}>{kind === "all" ? "Everything" : kind}</button>)}</div></div>{loading ? <p className={s.subtext}>Loading captures...</p> : <div className={s.setList}>{items.map((item) => { const Icon = icons[item.kind] || Note; return <article className={s.setItem} key={item.id}><span className={s.icon}><Icon size={19} /></span><div><strong>{item.title}</strong><small>{item.kind} · {new Date(item.created_at).toLocaleString()}</small>{item.kind === "photo" && item.media_data ? <img src={item.media_data} alt={item.media_name || item.title} style={{ maxWidth: 180, maxHeight: 120, marginTop: 8, borderRadius: 9 }} /> : <p className={s.subtext} style={{ marginTop: 6 }}>{item.content || item.source_url || item.media_name}</p>}</div><div className={s.row}><button className={s.action} onClick={() => makeNote(item)}>Make note</button><button className={s.action} onClick={() => remove(item)} aria-label={`Move ${item.title} to trash`}><Trash size={15} /></button></div></article>; })}</div>}{!loading && !items.length && <div className={s.notice}>No captures in this view. Select a line anywhere and press the floating Capture button to save it.</div>}</section></div>;
}
