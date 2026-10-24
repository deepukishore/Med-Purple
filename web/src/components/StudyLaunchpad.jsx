import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Lightning,
  Stack,
  PlayCircle,
  Sparkle,
} from "@phosphor-icons/react";
import DepthCard from "./DepthCard";
import s from "./StudyLaunchpad.module.css";
const sessions = [
  {
    label: "Question practice",
    icon: Lightning,
    kicker: "ACTIVE RECALL / EXAM PREPARATION",
    title: "Lock in.",
    accent: "One question at a time.",
    copy: "Strengthen recall with a focused set, immediate explanations, and a subject you choose.",
    cta: "Begin question set",
    to: "/mcqs",
  },
  {
    label: "Viva rehearsal",
    icon: Stack,
    kicker: "RETRIEVAL / SPOKEN RECALL",
    title: "Know your stuff.",
    accent: "Say it with confidence.",
    copy: "Rehearse concise answers with your saved cards and build confidence for the viva.",
    cta: "Review due cards",
    to: "/flashcards?review=1",
  },
  {
    label: "Short video",
    icon: PlayCircle,
    kicker: "VISUAL LEARNING / QUICK REVIEW",
    title: "Quick watch.",
    accent: "Big brain energy.",
    copy: "Review a concise, captioned medical concept whenever you need a change of pace.",
    cta: "Browse MedBytes",
    to: "/medbytes",
  },
];
export default function StudyLaunchpad({
  subjects = [],
  recommendedSubject = "",
}) {
  const [mode, setMode] = useState(0),
    [size, setSize] = useState(5),
    [subject, setSubject] = useState(recommendedSubject);
  const choice = sessions[mode],
    Icon = choice.icon;
  const to =
    mode === 0
      ? "/mcqs?" + new URLSearchParams({ set: String(size), subject })
      : choice.to;
  return (
    <DepthCard>
      <section
        className={s.launchpad}
        aria-label="Choose a study session"
        data-mode={mode}
      >
        <div className={s.tabs} role="group" aria-label="Choose your study mode">
          {sessions.map((x, i) => (
            <button
              key={x.label}
              aria-pressed={i === mode}
              onClick={() => setMode(i)}
            >
              <x.icon size={17} weight={i === mode ? "fill" : "regular"} />
              {x.label}
            </button>
          ))}
        </div>
        <div className={s.stage}>
          <div className={s.copy} key={mode}>
            <p className={s.kicker}>
              <span />
              {choice.kicker}
            </p>
            <h2>
              {choice.title}
              <br />
              <em>{choice.accent}</em>
            </h2>
            <p className={s.description}>{choice.copy}</p>
            {mode === 0 ? (
              <div className={s.controls}>
                <div>
                  <span className={s.label}>How many questions?</span>
                  <div
                    className={s.sizes}
                    role="group"
                    aria-label="Sprint size"
                  >
                    {[3, 5, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setSize(n)}
                        aria-pressed={n === size}
                      >
                        {n}
                        <small>
                          {n === 3 ? "a little" : n === 5 ? "a few" : "a run"}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
                <label className={s.subject}>
                  Subject focus
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="">All subjects</option>
                    {subjects.map((x) => (
                      <option key={x.subject} value={x.subject}>
                        {x.subject}
                      </option>
                    ))}
                  </select>
                  <small className={s.subjectHint}>
                    {subject && subject === recommendedSubject
                      ? "Suggested from your question accuracy"
                      : "Choose a subject or review them all"}
                  </small>
                </label>
              </div>
            ) : (
              <div className={s.modeNote}>
                <Sparkle size={18} />
                {mode === 1
                  ? "Use your saved cards to rehearse concise spoken answers."
                  : "Choose a captioned concept for a short visual review."}
              </div>
            )}
            <Link to={to} className={s.cta}>
              <Icon size={21} weight="fill" />
              {mode === 0 ? `Start ${size}-question set` : choice.cta}
              <ArrowUpRight size={20} />
            </Link>
            <p className={s.foot}>
              {mode === 0
                ? `Up to ${size} questions with explanations after each answer`
                : "A short, focused session at your own pace."}
            </p>
          </div>
          <aside className={s.sessionPreview} aria-live="polite">
            <div className={s.previewTop}>
                <span>YOUR NEXT PLAY</span>
              <span className={s.ready}>
                <i /> READY
              </span>
            </div>
            <div className={s.previewSymbol}>
              <Icon size={30} weight="light" />
            </div>
            <p className={s.previewLabel}>{choice.label}</p>
            <h3>
              {mode === 0
                ? `${size} focused questions`
                : choice.title.replace(".", "")}
            </h3>
            <p className={s.previewCopy}>
              {mode === 0
                ? "Active recall with an explanation after every answer."
                : mode === 1
                  ? "Retrieve from memory, then review your saved cards."
                  : "A concise, captioned concept for a quick review."}
            </p>
            <dl className={s.previewDetails}>
              <div>
                <dt>FOCUS</dt>
                <dd>
                  {mode === 0
                    ? subject || "All subjects"
                    : mode === 1
                      ? "Spoken recall"
                      : "Visual review"}
                </dd>
              </div>
              <div>
                <dt>{mode === 0 ? "SET SIZE" : "FORMAT"}</dt>
                <dd>
                  {mode === 0
                    ? `${size} questions`
                    : mode === 1
                      ? "Spoken recall"
                      : "Captioned video"}
                </dd>
              </div>
            </dl>
            <div className={s.previewFlow}>
              {(mode === 0
                ? ["Recall", "Answer", "Review"]
                : mode === 1
                  ? ["Prompt", "Speak", "Reveal"]
                  : ["Watch", "Connect", "Review"]
              ).map((step, index) => (
                <span key={step}>
                  {index > 0 && <i aria-hidden="true" />}
                  {step}
                </span>
              ))}
            </div>
            <small>Your session structure</small>
          </aside>
        </div>
      </section>
    </DepthCard>
  );
}
