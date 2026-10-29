import { useEffect, useState } from "react";
import s from "./ExperienceLoader.module.css";

export default function ExperienceLoader() {
  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    const copyTimer = window.setTimeout(() => setStage(1), 460);
    const fadeTimer = window.setTimeout(() => setPhase("fade"), 1040);
    const exitTimer = window.setTimeout(() => setPhase("done"), 1480);
    return () => {
      window.clearTimeout(copyTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`${s.screen} ${phase === "fade" ? s.fade : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className={s.content}>
        <span className={s.mark}>
          <img src="/favicon.svg" width="48" height="48" alt="Med Purple" />
          <i aria-hidden="true" />
        </span>
        <p>{stage ? "Warming up the anatomy studio…" : "Preparing your study space…"}</p>
      </div>
    </div>
  );
}
