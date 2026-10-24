import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChatCircleDots, X, ArrowUpRight } from "@phosphor-icons/react";
import questions from "../../../shared/help.json";
import s from "./HelpBot.module.css";

export default function HelpBot() {
  const dialog = useRef(null);
  const launcher = useRef(null);
  const conversation = useRef(null);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    conversation.current?.scrollTo({ top: conversation.current.scrollHeight });
  }, [history]);
  const close = () => dialog.current.close();
  const matches = questions.filter((item) =>
    `${item.question} ${item.answer}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <>
      <button
        ref={launcher}
        className={s.launcher}
        aria-label="Open Med Purple help chat"
        aria-haspopup="dialog"
        onClick={() => dialog.current.showModal()}
      >
        <ChatCircleDots size={28} weight="fill" />
      </button>
      <dialog
        ref={dialog}
        className={s.panel}
        aria-labelledby="help-chat-title"
        onClose={() => launcher.current?.focus()}
        onClick={(event) => {
          if (event.target === dialog.current) {
            const bounds = dialog.current.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              close();
          }
        }}
      >
        <header className={s.header}>
          <ChatCircleDots size={28} weight="duotone" />
          <div>
            <h2 id="help-chat-title">Med Purple Guide</h2>
            <p>Your app help companion</p>
          </div>
          <button aria-label="Close help chat" onClick={close}>
            <X size={22} />
          </button>
        </header>
        <div
          className={s.conversation}
          ref={conversation}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          <p className={s.answer}>
            Hi! Need a hand finding your way? Choose a question below and I’ll
            help you take the next step.
          </p>
          {history.map((item, index) => (
            <div key={index} className={s.exchange}>
              <p className={s.question}>{item.question}</p>
              <div className={s.answer}>
                <p>{item.answer}</p>
                <Link to={item.path} onClick={close}>
                  {item.label} <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className={s.choices}>
          <label htmlFor="help-search">Find a help topic</label>
          <input
            id="help-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions…"
          />
          <div className={s.topics}>
            {matches.map((item) => (
              <button
                key={item.question}
                onClick={() => setHistory((previous) => [...previous, item])}
              >
                {item.question}
              </button>
            ))}
            {!matches.length && (
              <p>No matching topic. Try “notes”, “profile”, or “questions”.</p>
            )}
          </div>
          <div className={s.note}>
            <span>Prewritten help for using the app.</span>
            {history.length > 0 && (
              <button onClick={() => setHistory([])}>Reset chat</button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
