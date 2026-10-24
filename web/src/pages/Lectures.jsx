import { useState } from "react";
import { PlayCircle } from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { PageSkeleton, ErrorState } from "../components/States";
import { api } from "../context/AppContext";
import MedByteCard from "../components/MedByteCard";
import Button from "../components/Button";
import s from "./Studio.module.css";
export default function Lectures() {
  usePageMeta("Video lessons");
  const { data, loading, error, reload } = useData("/lectures");
  const [subject, setSubject] = useState(""),
    [selected, setSelected] = useState(null),
    [failure, setFailure] = useState("");
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = data.items.filter((x) => !subject || x.subject === subject);
  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>THE WATCH & UNDERSTAND COLLECTION</span>
          <h1>Short lessons. Lasting connections.</h1>
          <p>Original captioned foundation animations, organized by subject.</p>
        </div>
        <Button to="/medbytes" variant="secondary">
          Open scrolling feed
        </Button>
      </div>
      <label className={s.toolbar}>
        Subject
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">All subjects</option>
          {[...new Set(data.items.map((x) => x.subject))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      {failure && (
        <p role="alert" className={s.error}>
          {failure}
        </p>
      )}
      {selected && (
        <section
          className={s.panel}
          style={{ maxWidth: 460, margin: "auto", width: "100%" }}
        >
          <div className={s.sectionHead}>
            <h2>Now learning</h2>
            <Button small variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          <MedByteCard
            key={selected.id}
            clip={selected}
            onComplete={async (id) => {
              try {
                await api.post(`/medbytes/${id}/complete`);
                setSelected(null);
                reload();
              } catch (e) {
                setFailure(e.message);
              }
            }}
          />
        </section>
      )}
      <div className={s.grid}>
        {items.map((item) => (
          <article className={s.card} key={item.id}>
            <img
              className={s.cover}
              src={(import.meta.env.VITE_MEDIA_URL || "") + item.poster_path}
              alt=""
              loading="lazy"
            />
            <span className={s.chip}>
              {item.subject} · {item.duration}s{" "}
              {item.watched ? "· Watched" : ""}
            </span>
            <h2>{item.title}</h2>
            <p>{item.topic}</p>
            <Button variant="secondary" onClick={() => setSelected(item)}>
              <PlayCircle size={20} /> Watch lesson
            </Button>
          </article>
        ))}
      </div>
      {!items.length && (
        <p className={s.empty}>No lessons in this subject yet.</p>
      )}
    </div>
  );
}
