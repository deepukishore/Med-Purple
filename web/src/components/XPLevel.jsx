import { Link } from "react-router-dom";
import { Lightning } from "@phosphor-icons/react";
import useData from "../hooks/useData";
import { ErrorState } from "./States";
import EvolutionAvatar from "./EvolutionAvatar";
import s from "../pages/Social.module.css";

export function XPBadge() {
  const { data } = useData("/progress");
  return data ? (
    <Link
      className={s.xpBadge}
      to="/progress"
      aria-label={`Level ${data.level}, ${data.xp} XP across the app`}
    >
      <Lightning size={16} weight="fill" /> Lv {data.level}
      <span> · {data.xp} XP</span>
    </Link>
  ) : null;
}

export default function XPLevel({ compact = false }) {
  const { data, error, reload } = useData("/progress");
  const dashboard = useData("/dashboard");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <p role="status">Loading your level…</p>;
  const goalComplete = Boolean(
    dashboard.data?.goals?.length &&
      dashboard.data.goals.every((goal) => goal.done),
  );
  return (
    <section className={s.xpPanel} aria-label="App-wide XP level">
      <span className={s.eyebrow}>EVERY PART OF YOUR LEARNING COUNTS</span>
      <div className={s.xpVisual}>
        <EvolutionAvatar
          level={data.level}
          streak={data.streak}
          goalComplete={goalComplete}
        />
        <div className={s.xpDetails}>
          <div className={s.xpTitle}>
            <h2>Level {data.level}</h2>
            <strong>
              <Lightning size={20} weight="fill" /> {data.xp} XP
            </strong>
          </div>
          <div
            className={s.bar}
            role="progressbar"
            aria-label="XP toward next level"
            aria-valuenow={data.level_progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${data.level_progress}%` }} />
          </div>
          <p>
            {100 - data.level_progress} XP to level {data.level + 1}.
          </p>
        </div>
      </div>
      {dashboard.error && (
        <p role="alert">Daily goal status unavailable: {dashboard.error}</p>
      )}
      {!compact && (
        <p>
          Questions, videos, notes, planning, helping others — it all builds one
          shared level.
        </p>
      )}
      <Link to="/progress">See rewards & activity →</Link>
    </section>
  );
}
