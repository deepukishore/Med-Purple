import { useEffect, useRef, useState } from "react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / 800, 1);
      const eased = 1 - (1 - progress) ** 4;
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return display;
}
export default function ProgressRing({ value, size = 150 }) {
  const reduce = useReducedMotion();
  const progress = useRef(null);
  useEffect(() => {
    const target = 396 * (1 - value / 100);
    if (reduce) {
      progress.current?.style.setProperty("stroke-dashoffset", target);
      return;
    }
    const frame = requestAnimationFrame(() =>
      progress.current?.style.setProperty("stroke-dashoffset", target),
    );
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return (
    <div
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
      role="img"
      aria-label={`${value}% of question bank explored`}
    >
      <svg
        viewBox="0 0 150 150"
        style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
      >
        <circle
          cx="75"
          cy="75"
          r="63"
          fill="none"
          stroke="currentColor"
          opacity=".18"
          strokeWidth="8"
        />
        <circle
          ref={progress}
          cx="75"
          cy="75"
          r="63"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="396"
          strokeDashoffset={396}
          style={{
            transition: reduce
              ? "none"
              : "stroke-dashoffset 1.3s cubic-bezier(.22, 1, .36, 1)",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <strong style={{ fontSize: 32, letterSpacing: "-.04em" }}>
          <CountUp value={value} />%
        </strong>
        <span style={{ fontSize: 12, opacity: 0.85 }}>bank explored</span>
      </div>
    </div>
  );
}
