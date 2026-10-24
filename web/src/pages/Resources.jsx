import { useState } from "react";
import { ArrowUpRight, BookOpen, DownloadSimple } from "@phosphor-icons/react";
import useData from "../hooks/useData";
import usePageMeta from "../hooks/usePageMeta";
import { api, useApp } from "../context/AppContext";
import { PageSkeleton, ErrorState } from "../components/States";
import s from "./Studio.module.css";
export default function Resources() {
  usePageMeta("Resource library");
  const { notify } = useApp();
  const { data, loading, error, reload } = useData("/resources");
  const [search, setSearch] = useState("");
  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const items = data.items.filter((x) =>
    (x.title + " " + x.subject).toLowerCase().includes(search.toLowerCase()),
  );
  function download() {
    const text = [
      "MY REVISION SHEET",
      "",
      "Topic:",
      "Date:",
      "",
      "What I already know:",
      "",
      "Three key ideas:",
      "1.",
      "2.",
      "3.",
      "",
      "What I need to check:",
      "",
      "Recall questions:",
      "",
      "Next review date:",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "med-purple-revision-sheet.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>GOOD SOURCES. LESS TAB CHAOS.</span>
          <h1>Your curiosity toolkit.</h1>
          <p>
            Open textbook readings referenced by your question bank and video
            lessons.
          </p>
        </div>
        <button className={s.chip} onClick={download}>
          <DownloadSimple size={17} /> Download revision template
        </button>
      </div>
      <label className={s.toolbar}>
        Find a resource
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topic or subject"
        />
      </label>
      <div className={s.grid}>
        {items.map((item) => (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            key={item.url}
            onClick={() =>
              api
                .post("/activities/resource", { url: item.url })
                .then((r) => {
                  if (r.xp_earned)
                    notify(`Resource explored. +${r.xp_earned} XP`);
                })
                .catch((e) => notify(e.message))
            }
            className={`${s.card} ${s.resource}`}
          >
            <span className={s.icon}>
              <BookOpen size={28} />
            </span>
            <span className={s.chip}>{item.subject}</span>
            <h2>{item.title}</h2>
            <p>Read the source, connect the ideas, and make them your own.</p>
            <div className={s.row}>
              <b style={{ fontSize: 13 }}>Open textbook</b>
              <ArrowUpRight size={18} />
            </div>
          </a>
        ))}
      </div>
      {!items.length && (
        <p className={s.empty}>No matching readings. Try a broader topic.</p>
      )}
    </div>
  );
}
