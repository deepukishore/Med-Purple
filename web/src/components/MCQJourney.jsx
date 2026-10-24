import { Trophy, Lightning, CheckCircle } from "@phosphor-icons/react";
import s from "../pages/MCQs.module.css";
import u from "./ui.module.css";

export function MCQLevels({ journey, difficulty, onChange, disabled }) {
  const levels = journey?.levels || [
    { name: "Foundation", number: 1, description: "Build your basics" },
    { name: "Applied", number: 2, description: "Put concepts to work" },
    { name: "Challenge", number: 3, description: "Test deeper recall" },
  ];
  return (
    <section className={s.levelSection} aria-label="Difficulty levels">
      <div className={u.sectionHead}>
        <h2>Choose your challenge</h2>
        <button
          className={s.mixedButton}
          disabled={disabled}
          aria-pressed={!difficulty}
          onClick={() => onChange("")}
        >
          Mixed practice
        </button>
      </div>
      <div className={s.levels}>
        {levels.map((level) => (
          <button
            key={level.name}
            disabled={disabled}
            className={`${s.levelCard} ${difficulty === level.name ? s.activeLevel : ""}`}
            aria-pressed={difficulty === level.name}
            onClick={() => onChange(level.name)}
          >
            <span className={s.levelTop}>
              <span>LEVEL {level.number}</span>
              {level.done ? (
                <CheckCircle size={21} weight="fill" />
              ) : (
                <span>{["I", "II", "III"][level.number - 1]}</span>
              )}
            </span>
            <strong>{level.name}</strong>
            <span>{level.description}</span>
            {level.total != null && (
              <small>
                {level.mastered}/{level.total} mastered ·{" "}
                {level.done ? "Quest complete" : `+${level.xp} XP quest`}
              </small>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

export function MCQXP({ progress }) {
  if (!progress) return null;
  return (
    <section className={s.xpCard} aria-label="Your XP progress">
      <div className={s.xpHeading}>
        <span className={s.xpIcon}>
          <Trophy size={26} weight="duotone" />
        </span>
        <div>
          <small>YOUR LEARNING LEVEL</small>
          <h2>Level {progress.level}</h2>
        </div>
        <strong>{progress.xp} XP</strong>
      </div>
      <div
        className={u.progress}
        role="progressbar"
        aria-label="XP toward next level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.level_progress}
      >
        <span style={{ width: `${progress.level_progress}%` }} />
      </div>
      <p>
        {100 - progress.level_progress} XP to level {progress.level + 1}. Every
        100 XP levels you up.
      </p>
      <details className={s.quests} open>
        <summary>
          <Lightning size={18} weight="fill" /> Level-up quests
        </summary>
        {progress.mcq_journey?.tasks.map((task) => (
          <div key={task.key} className={s.quest}>
            <span>
              {task.done ? (
                <CheckCircle size={18} weight="fill" />
              ) : (
                <span className={s.questDot} />
              )}
            </span>
            <div>
              <strong>{task.title}</strong>
              <small>
                {task.done ? "Completed" : `${task.current} / ${task.target}`} ·{" "}
                {task.xp} XP
              </small>
            </div>
          </div>
        ))}
      </details>
      <p className={s.xpRules}>
        +10 XP for each new question, +10 for its first correct answer. Quest
        rewards are earned once. Retries help you learn without losing XP.
      </p>
    </section>
  );
}

export function MCQAnswerKey({ results }) {
  return (
    <section className={s.answerKey} aria-label="Answer key and explanations">
      <h2>Answer key & explanations</h2>
      <p>Review the reasoning, then give any missed questions another go.</p>
      {results.map((answer, index) => (
        <article key={answer.question.id} className={s.reviewItem}>
          <div className={s.reviewHeading}>
            <h3>
              {index + 1}. {answer.question.stem}
            </h3>
            <span className={answer.correct ? s.rightLabel : s.wrongLabel}>
              {answer.correct ? "Correct" : "Try again"}
            </span>
          </div>
          <p>
            <strong>Your answer:</strong>{" "}
            {String.fromCharCode(65 + answer.selected_index)}.{" "}
            {answer.question.options[answer.selected_index]}
          </p>
          <p className={s.keyAnswer}>
            <strong>Answer key:</strong>{" "}
            {String.fromCharCode(65 + answer.correct_index)}.{" "}
            {answer.question.options[answer.correct_index]}
          </p>
          <p>{answer.explanation}</p>
          <a href={answer.source_url} target="_blank" rel="noreferrer">
            Read the source
          </a>
        </article>
      ))}
    </section>
  );
}
