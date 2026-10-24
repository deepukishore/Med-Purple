import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MagnifyingGlass, ArrowUpRight, X } from "@phosphor-icons/react";
import s from "./StudySearch.module.css";
const tools = [
  ["Question bank", "MCQs, practice, sprint", "/mcqs?set=5"],
  ["Review mistakes", "wrong answers, revision", "/mcqs?mode=mistakes"],
  ["Viva & flashcards", "recall, memory, spaced review", "/flashcards"],
  ["My notes", "notebook, write, concepts", "/notes"],
  ["Anatomy lab", "heart, 3D, structures", "/anatomy"],
  ["MedBytes", "short videos, reels", "/medbytes"],
  ["Video lessons", "lectures, watch", "/lectures"],
  ["Study planner", "schedule, calendar, time", "/planner"],
  ["Progress & rewards", "XP, badges, accuracy", "/progress"],
  ["Study coach", "explanations, help", "/tutor"],
  ["Community", "medical posts, community, discuss", "/community"],
  ["Doubts", "ask questions, answers, solutions", "/doubts"],
  ["Students", "public profiles, XP levels", "/students"],
  ["Resources", "textbook, reading", "/resources"],
];
export default function StudySearch() {
  const [query, setQuery] = useState("");
  const dialog = useRef(null),
    trigger = useRef(null);
  const navigate = useNavigate();
  const results = tools.filter((x) =>
    (x[0] + " " + x[1]).toLowerCase().includes(query.toLowerCase()),
  );
  function open() {
    setQuery("");
    if (!dialog.current.open) dialog.current.showModal();
  }
  function close() {
    dialog.current.close();
    trigger.current?.focus();
  }
  useEffect(() => {
    const shortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current.open) dialog.current.close();
        else open();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <>
      <button
        ref={trigger}
        className={s.trigger}
        onClick={open}
        aria-label="Find a study tool"
      >
        <MagnifyingGlass size={18} />
        <span>Jump to a tool</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className={s.dialog}
        aria-labelledby="tool-search-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className={s.content}>
          <div className={s.heading}>
            <h2 id="tool-search-title">Where are we headed?</h2>
            <button onClick={close} aria-label="Close tool search">
              <X size={20} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (results[0]) {
                navigate(results[0][2]);
                close();
              }
            }}
          >
            <label htmlFor="tool-search" className="sr-only">
              Search study tools
            </label>
            <input
              id="tool-search"
              autoFocus
              type="search"
              placeholder="Try mistakes, viva, notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <div className={s.results}>
            {results.map(([name, hint, to]) => (
              <Link key={to} to={to} onClick={close}>
                <div>
                  <b>{name}</b>
                  <small>{hint}</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))}
            {!results.length && <p>No matching tools. Try a broader word.</p>}
          </div>
          <p className={s.hint}>Enter opens the first result · Esc closes</p>
        </div>
      </dialog>
    </>
  );
}
