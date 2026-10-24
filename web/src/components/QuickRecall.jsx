import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Lightning,
  ArrowUpRight,
  CheckCircle,
  ArrowClockwise,
} from "@phosphor-icons/react";
import useData from "../hooks/useData";
import { api } from "../context/AppContext";
import { createRequestId } from "../utils/requestId";
import Button from "./Button";
import s from "./QuickRecall.module.css";

export default function QuickRecall({ onCompleted }) {
  const { data, loading, error, reload } = useData(
    "/mcqs?limit=1&shuffle=true",
  );
  return (
    <section className={s.card} aria-labelledby="quick-recall-title">
      <header className={s.header}>
        <div>
          <span className={s.kicker}>
            <Lightning size={17} weight="fill" /> THE ONE-QUESTION WARM-UP
          </span>
          <h2 id="quick-recall-title">Give your brain a little plot twist.</h2>
        </div>
        <span className={s.live}>Try it here</span>
      </header>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button small onClick={reload}>
            Try again
          </Button>
        </div>
      ) : loading ? (
        <p className={s.loading}>Finding your next question…</p>
      ) : data?.items?.[0] ? (
        <RecallQuestion
          key={data.items[0].id}
          question={data.items[0]}
          onCompleted={onCompleted}
          onNext={reload}
        />
      ) : (
        <p>
          No questions available yet. Try the{" "}
          <Link to="/mcqs">question bank</Link>.
        </p>
      )}
    </section>
  );
}

function RecallQuestion({ question: q, onCompleted, onNext }) {
  const [selected, setSelected] = useState(null),
    [result, setResult] = useState(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const id = useRef(null),
    sending = useRef(false),
    attempted = useRef(false);
  if (!id.current) id.current = createRequestId();
  async function submit() {
    if (selected === null || sending.current || result) return;
    sending.current = true;
    attempted.current = true;
    setPending(true);
    setError("");
    try {
      const answer = await api.post(`/mcqs/${q.id}/answer`, {
        selected_index: selected,
        request_id: id.current,
      });
      setResult(answer);
      onCompleted?.();
    } catch (e) {
      setError(e.message);
    } finally {
      sending.current = false;
      setPending(false);
    }
  }
  return (
    <div className={s.body}>
      <div className={s.meta}>
        <span>{q.subject}</span>
        <span>{q.topic}</span>
        <span>{q.difficulty}</span>
      </div>
      <h3>{q.stem}</h3>
      <div
        className={s.options}
        role="group"
        aria-label="Warm-up answer options"
      >
        {q.options.map((option, index) => (
          <button
            key={index}
            aria-pressed={selected === index}
            aria-label={`${String.fromCharCode(65 + index)}. ${option}${result && index === result.correct_index ? ". Correct answer." : result && index === result.selected_index ? ". Your answer, incorrect." : ""}`}
            disabled={pending || !!result || attempted.current}
            onClick={() => setSelected(index)}
            className={`${selected === index ? s.selected : ""} ${result && index === result.correct_index ? s.correct : ""} ${result && index === result.selected_index && !result.correct ? s.incorrect : ""}`}
          >
            <span>{String.fromCharCode(65 + index)}</span>
            <b>{option}</b>
            {result && index === result.correct_index && (
              <CheckCircle size={20} weight="fill" />
            )}
          </button>
        ))}
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error} Retry to recover this answer safely.
        </p>
      )}
      {result && (
        <div
          className={`${s.feedback} ${result.correct ? s.celebrate : ""}`}
          role="status"
        >
          <strong>
            {result.correct
              ? "Brain: 1. Self-doubt: 0."
              : "A plot twist worth remembering."}
          </strong>
          <p>{result.explanation}</p>
          <a href={result.source_url} target="_blank" rel="noreferrer">
            Check the source <ArrowUpRight size={15} />
          </a>
        </div>
      )}
      <footer className={s.footer}>
        <p>
          {result
            ? "Saved to your real practice progress."
            : "No timer. Just you and a little recall."}
        </p>
        {result ? (
          <Button small variant="secondary" onClick={onNext}>
            <ArrowClockwise size={17} />
            Another question
          </Button>
        ) : (
          <Button
            small
            disabled={selected === null || pending}
            onClick={submit}
          >
            {pending ? "Checking…" : "Lock in my answer"}
            <ArrowUpRight size={17} />
          </Button>
        )}
      </footer>
    </div>
  );
}
