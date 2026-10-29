import { useEffect, useRef } from "react";
import { motion as tokens } from "@med-purple/design-tokens";
import s from "./DepthCard.module.css";
export default function DepthCard({ children, className = "" }) {
  const frame = useRef(null);
  const pointerFrame = useRef(0);
  const pointerPosition = useRef({ x: 0, y: 0 });
  useEffect(
    () => () => {
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
    },
    [],
  );
  const reset = () => {
    if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    frame.current?.style.removeProperty("--tilt-x");
    frame.current?.style.removeProperty("--tilt-y");
    frame.current?.style.removeProperty("--hover-scale");
  };
  return (
    <div
      ref={frame}
      className={`${s.frame} ${className}`}
      style={{
        "--depth-shadow-color": tokens.depth.shadow,
        "--depth-shadow-soft": tokens.depth.shadowSoft,
      }}
      onPointerEnter={(e) => {
        if (
          e.pointerType === "touch" ||
          document.documentElement.dataset.calm === "true" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        e.currentTarget.style.setProperty("--hover-scale", "1.008");
      }}
      onPointerMove={(e) => {
        if (
          document.documentElement.dataset.calm === "true" ||
          e.pointerType === "touch" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        pointerPosition.current = { x: e.clientX, y: e.clientY };
        if (pointerFrame.current) return;
        pointerFrame.current = requestAnimationFrame(() => {
          pointerFrame.current = 0;
          const card = frame.current;
          if (!card) return;
          const r = card.getBoundingClientRect();
          const width = card.offsetWidth || r.width;
          const height = card.offsetHeight || r.height;
          const pointerX = pointerPosition.current.x - (r.left + r.width / 2);
          const pointerY = pointerPosition.current.y - (r.top + r.height / 2);
          const tilt = Math.min(tokens.tiltDegrees, 6);
          card.style.setProperty("--tilt-x", `${(-pointerY / height) * tilt}deg`);
          card.style.setProperty("--tilt-y", `${(pointerX / width) * tilt}deg`);
          card.style.setProperty("--glare-x", `${(pointerX / width + 0.5) * 100}%`);
          card.style.setProperty("--glare-y", `${(pointerY / height + 0.5) * 100}%`);
        });
      }}
      onPointerLeave={reset}
    >
      <div className={s.content}>{children}</div>
      <span className={s.glare} aria-hidden="true" />
    </div>
  );
}
