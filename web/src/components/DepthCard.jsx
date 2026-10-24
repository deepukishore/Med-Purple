import { useRef } from "react";
import { motion as tokens } from "@med-purple/design-tokens";
import s from "./DepthCard.module.css";
export default function DepthCard({ children, className = "" }) {
  const frame = useRef(null);
  const reset = () => {
    frame.current?.style.removeProperty("--tilt-x");
    frame.current?.style.removeProperty("--tilt-y");
    frame.current?.style.removeProperty("--hover-scale");
  };
  return (
    <div
      ref={frame}
      className={`${s.frame} ${className}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch")
          e.currentTarget.style.setProperty("--hover-scale", "1.008");
      }}
      onPointerMove={(e) => {
        if (
          document.documentElement.dataset.calm === "true" ||
          e.pointerType === "touch" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const r = e.currentTarget.getBoundingClientRect();
        const pointerX = e.clientX - r.left;
        const pointerY = e.clientY - r.top;
        const tilt = Math.max(tokens.tiltDegrees, 10);
        e.currentTarget.style.setProperty(
          "--tilt-x",
          `${((r.height / 2 - pointerY) / r.height) * tilt}deg`,
        );
        e.currentTarget.style.setProperty(
          "--tilt-y",
          `${((pointerX - r.width / 2) / r.width) * tilt}deg`,
        );
        e.currentTarget.style.setProperty(
          "--glare-x",
          `${(pointerX / r.width) * 100}%`,
        );
        e.currentTarget.style.setProperty(
          "--glare-y",
          `${(pointerY / r.height) * 100}%`,
        );
      }}
      onPointerLeave={reset}
    >
      <div className={s.content}>{children}</div>
      <span className={s.glare} aria-hidden="true" />
    </div>
  );
}
