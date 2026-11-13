import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { motion as tokens } from "@med-purple/design-tokens";
import s from "./HeroStage.module.css";
import ParallaxLayer from "./ParallaxLayer";

const SceneCanvas = lazy(() => import("./HeroSceneCanvas"));

function Poster({ heart = false }) {
  if (heart) return <svg className={s.poster} viewBox="0 0 360 320" aria-hidden="true">
    <defs>
      <linearGradient id="heart-muscle" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d8a8b7"/><stop offset=".55" stopColor="#a76c87"/><stop offset="1" stopColor="#77547d"/></linearGradient>
      <radialGradient id="heart-light" cx=".32" cy=".24" r=".8"><stop stopColor="#f1d8df" stopOpacity=".85"/><stop offset="1" stopColor="#c28ca4" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="184" cy="280" rx="72" ry="16" fill="#4e3b5c" opacity=".13"/>
    <path d="M161 108c-8-30-2-60 15-75 10-9 23-6 26 7l8 33c11-25 30-44 44-38 13 6 7 27-3 47 18-18 39-27 49-16 10 12-6 32-24 48 24-9 45-5 48 9 4 17-20 30-49 36-2 39-13 76-34 105-16 23-38 36-59 37-32-15-62-44-78-79-17-39-19-78-7-108 10-24 40-34 64-6Z" fill="url(#heart-muscle)" stroke="#765471" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M161 108c-8-30-2-60 15-75 10-9 23-6 26 7l8 33c11-25 30-44 44-38 13 6 7 27-3 47 18-18 39-27 49-16 10 12-6 32-24 48" fill="none" stroke="#d9a5b5" strokeWidth="16" strokeLinecap="round"/>
    <path d="M161 108c-8-30-2-60 15-75 10-9 23-6 26 7l8 33c11-25 30-44 44-38 13 6 7 27-3 47" fill="none" stroke="#f0d9df" strokeWidth="4" strokeLinecap="round" opacity=".8"/>
    <path d="M178 107c-29 18-48 47-43 80m68-91c25 13 38 39 37 67m-79 50c17 11 40 13 59 2" fill="none" stroke="#704d72" strokeWidth="5" strokeLinecap="round" opacity=".5"/>
    <path d="M130 163c-20 15-24 48-10 73m128-62c15 18 13 50-2 70" fill="none" stroke="url(#heart-light)" strokeWidth="13" strokeLinecap="round"/>
  </svg>;
  return <svg className={s.poster} viewBox="0 0 360 320" aria-hidden="true">
    <defs><radialGradient id="hero-contact-shadow"><stop stopColor="#30233e" stopOpacity=".15" /><stop offset="1" stopColor="#30233e" stopOpacity="0" /></radialGradient></defs>
    <ellipse cx="181" cy="276" rx="108" ry="23" fill="url(#hero-contact-shadow)" />
    <path d="M183 47c-25-23-62-5-59 27-27 7-33 39-14 55-21 20-8 54 19 56 4 31 39 40 58 17 20 23 55 14 59-17 27-2 40-36 19-56 19-16 13-48-14-55 3-32-34-50-58-27Z" fill="#b9a8d1" stroke="#6b5487" strokeWidth="4" />
    <path d="M178 55c-18-11-40 3-34 22-22 2-25 28-7 36-20 13-10 37 8 38-7 22 13 36 31 21m11-117c18-11 40 3 34 22 22 2 25 28 7 36 20 13 10 37-8 38 7 22-13 36-31 21M180 51v132" fill="none" stroke="#f4edfa" strokeWidth="3" strokeLinecap="round" />
    <path d="M180 190v34m0-11-18 16m18-16 18 16" stroke="#80698f" strokeWidth="7" strokeLinecap="round" />
    <circle cx="265" cy="85" r="11" fill="#d7dda0" /><circle cx="88" cy="191" r="7" fill="#b8868f" />
  </svg>;
}

export default function HeroStage({ className = "", variant = "account" }) {
  const host = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node || !("IntersectionObserver" in window)) { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const sync = () => {
      const enabled = document.documentElement.dataset.calm !== "true" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      setMotionEnabled(enabled);
      if (!enabled) {
        host.current?.style.setProperty("--parallax-x", "0px");
        host.current?.style.setProperty("--parallax-y", "0px");
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-calm"] });
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener?.("change", sync);
    return () => { observer.disconnect(); preference.removeEventListener?.("change", sync); };
  }, []);
  function handlePointerMove(event) {
    if (event.pointerType !== "mouse" || !motionEnabled) return;
    const bounds = host.current?.getBoundingClientRect();
    if (!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      pointer.current = { x: 0, y: 0 };
      host.current?.style.setProperty("--parallax-x", "0px");
      host.current?.style.setProperty("--parallax-y", "0px");
      return;
    }
    pointer.current = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: 1 - (event.clientY - bounds.top) / bounds.height * 2 };
    host.current.style.setProperty("--parallax-x", `${pointer.current.x * tokens.parallaxDistance}px`);
    host.current.style.setProperty("--parallax-y", `${pointer.current.y * tokens.parallaxDistance * 0.78}px`);
  }
  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [motionEnabled]);
  return <div ref={host} aria-hidden="true" className={`login-scene ${s.stage} ${variant === "home" ? s.home : ""} ${className}`}>
    <Poster heart={variant !== "home"} />
    <ParallaxLayer className={`${s.orbit} ${s.orbitBack}`} depth={-0.45} />
    <ParallaxLayer className={`${s.orbit} ${s.orbitFront}`} depth={0.65} />
    {visible && <Suspense fallback={null}><SceneCanvas active={visible} motionEnabled={motionEnabled} pointer={pointer} organ={variant === "home" ? "brain" : "heart"} /></Suspense>}
  </div>;
}
