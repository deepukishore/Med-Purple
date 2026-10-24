import { BookmarkSimple, CheckCircle, XCircle } from "@phosphor-icons/react";
import Button from "./Button";
import u from "./ui.module.css";
import s from "../pages/MCQs.module.css";
export default function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  result,
  onSubmit,
  onNext,
  onBookmark,
  pending,
  bookmarkPending,
  requestError,
}) {
  const q = question;
  return (
    <article className={s.question}>
      <div className={s.questionTop}>
        <div className={s.questionTags}>
          <span className={u.pill}>{q.subject}</span>
          <span className={u.pill}>{q.difficulty}</span>
        </div>
        <button
          className={`${u.iconButton} ${q.bookmarked ? s.bookmarkActive : ""}`}
          aria-label={q.bookmarked ? "Remove bookmark" : "Bookmark question"}
          aria-pressed={q.bookmarked}
          onClick={onBookmark}
          disabled={bookmarkPending}
        >
          <BookmarkSimple
            size={22}
            weight={q.bookmarked ? "fill" : "regular"}
          />
        </button>
      </div>
      <p className={s.counter}>
        Question {index + 1} of {total} / {q.topic}
      </p>
      <h2 className={s.stem}>{q.stem}</h2>
      <div className={s.options} role="group" aria-label="Answer options">
        {q.options.map((option, i) => (
          <button
            key={i}
            className={`${s.option} ${selected === i && !result ? s.chosen : ""} ${result && i === result.correct_index ? s.correct : ""} ${result && i === result.selected_index && !result.correct ? s.incorrect : ""}`}
            aria-pressed={selected === i}
            onClick={() => onSelect(i)}
            disabled={!!result || pending}
          >
            <span className={s.letter}>{String.fromCharCode(65 + i)}</span>
            <span style={{ flex: 1 }}>{option}</span>
            {result && i === result.correct_index && (
              <CheckCircle size={21} color="var(--success)" />
            )}
            {result && i === result.selected_index && !result.correct && (
              <XCircle size={21} color="var(--danger)" />
            )}
          </button>
        ))}
      </div>
      {result && (
        <div className={s.feedback} role="status">
          <h3>
            {result.correct ? (
              <CheckCircle color="var(--success)" size={21} />
            ) : (
              <XCircle color="var(--danger)" size={21} />
            )}{" "}
            {result.correct
              ? "That’s right. Keep it with you."
              : "A useful one to remember."}
          </h3>
          <p>
            <strong>
              Answer key: {String.fromCharCode(65 + result.correct_index)}.{" "}
              {q.options[result.correct_index]}
            </strong>
          </p>
          <p>{result.explanation}</p>
          <a href={result.source_url} target="_blank" rel="noreferrer">
            Read the source in OpenStax
          </a>
        </div>
      )}
      {requestError && (
        <p role="alert" style={{ color: "var(--danger)", marginTop: 16 }}>
          {requestError}
        </p>
      )}
      <div className={s.questionFoot}>
        <small>
          {result ? "One concept clearer." : "Take your time. You’ve got this."}
        </small>
        {result ? (
          <Button onClick={onNext} disabled={pending}>
            {pending
              ? "Saving set…"
              : index + 1 === total
                ? "Finish session"
                : "Next question"}
          </Button>
        ) : (
          <Button disabled={selected === null || pending} onClick={onSubmit}>
            {pending ? "Checking…" : "Check answer"}
          </Button>
        )}
      </div>
    </article>
  );
}
