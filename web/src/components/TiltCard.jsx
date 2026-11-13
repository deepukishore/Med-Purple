import { useEffect, useRef } from "react";
import { motion as tokens } from "@med-purple/design-tokens";
import s from "./TiltCard.module.css";

export default function TiltCard({ as: Element = "div", className = "", children, style, ...props }) {
  const ref = useRef(null);
  const frame = useRef(0);
  const point = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const node = ref.current;
    const reset = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      node?.style.removeProperty("--tilt-x");
      node?.style.removeProperty("--tilt-y");
    };
    const observer = new MutationObserver(reset);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-calm"] });
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener?.("change", reset);
    return () => {
      observer.disconnect();
      preference.removeEventListener?.("change", reset);
      reset();
    };
  }, []);

  function handleMove(event) {
    if (event.pointerType !== "mouse" || document.documentElement.dataset.calm === "true" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    point.current = { x: event.clientX, y: event.clientY };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const node = ref.current;
      if (!node) return;
      const bounds = node.getBoundingClientRect();
      const x = (point.current.x - bounds.left) / Math.max(bounds.width, 1) - 0.5;
      const y = (point.current.y - bounds.top) / Math.max(bounds.height, 1) - 0.5;
      node.style.setProperty("--tilt-x", `${-y * tokens.tiltDegrees}deg`);
      node.style.setProperty("--tilt-y", `${x * tokens.tiltDegrees}deg`);
    });
  }

  return <Element ref={ref} className={`${s.card} ${className}`} onPointerMove={handleMove} onPointerLeave={() => {
    ref.current?.style.removeProperty("--tilt-x");
    ref.current?.style.removeProperty("--tilt-y");
  }} style={{ ...style, "--tilt-duration": `${tokens.depthTransition}ms` }} {...props}>{children}</Element>;
}
