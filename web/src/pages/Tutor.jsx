import { useState } from "react";
import { MagnifyingGlass, Sparkle, ArrowUpRight } from "@phosphor-icons/react";
import usePageMeta from "../hooks/usePageMeta";
import useData from "../hooks/useData";
import { api } from "../context/AppContext";
import Button from "../components/Button";
import { PageSkeleton, ErrorState } from "../components/States";
import s from "./Studio.module.css";
export default function Tutor() {
  usePageMeta("Study coach");
  const { data, loading, error, reload } = useData("/tutor");
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(null),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  async function ask(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      setAnswer(await api.post("/tutor", { question }));
    } catch (e) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>UNTANGLE A TRICKY IDEA</span>
          <h1>A little help. A clearer head.</h1>
          <p>
            Find explanations in the foundation library and choose your next
            study step.
          </p>
        </div>
        <Sparkle size={36} color="#9670ca" />
      </div>
      <section className={s.panel}>
        <form className={s.form} onSubmit={ask}>
          <label>
            What are you studying?
            <input
              required
              minLength={2}
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Try cardiac conduction, gas exchange, or the nephron"
            />
          </label>
          <div className={s.row}>
            <Button type="submit" disabled={busy}>
              <MagnifyingGlass size={18} />
              {busy ? "Finding explanations…" : "Find an explanation"}
            </Button>
            {["Cardiac conduction", "Gas exchange", "Nephron"].map((q) => (
              <button
                type="button"
                key={q}
                className={s.chip}
                style={{ border: 0 }}
                onClick={() => setQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </form>
        <p className={s.muted} style={{ marginTop: 16 }}>
          This coach searches your curated study library. It does not generate
          AI answers.
        </p>
      </section>
      {failure && (
        <p className={s.error} role="alert">
          {failure}
        </p>
      )}
      {answer && (
        <section className={s.stack} aria-live="polite">
          <h2>{answer.message}</h2>
          {answer.results.map((r, i) => (
            <article className={s.card} key={i}>
              <span className={s.chip}>{r.subject}</span>
              <h2>{r.title}</h2>
              <p className={s.text}>{r.content}</p>
              <a
                href={r.source_url}
                target="_blank"
                rel="noreferrer"
                className={s.chip}
              >
                Read the source <ArrowUpRight size={16} />
              </a>
            </article>
          ))}
        </section>
      )}
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <section className={s.panel}>
          <h2>Your next three steps</h2>
          {data.suggestions.map((tip, i) => (
            <div className={s.quest} key={tip}>
              <span className={s.icon}>{i + 1}</span>
              <p>{tip}</p>
            </div>
          ))}
          <Button
            to={"/mcqs?set=5&subject=" + encodeURIComponent(data.subject)}
            small
          >
            Practice {data.subject || "a quick set"}
          </Button>
        </section>
      )}
    </div>
  );
}
