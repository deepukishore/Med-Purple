import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Pause, Play } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import s from "./HomeSpecimenStage.module.css";

const SpecimenCanvas = lazy(() => import("./SpecimenCanvas"));

export default function HomeSpecimenStage({ className = "" }) {
  const stage = useRef(null);
  const controls = useRef(null);
  const [started, setStarted] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [status, setStatus] = useState("idle");
  const [part, setPart] = useState(null);
  const [sourceReady, setSourceReady] = useState(false);

  useEffect(() => {
    const node = stage.current;
    if (!node) return undefined;
    if (!("IntersectionObserver" in window)) {
      setStarted(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      setStarted(true);
      observer.disconnect();
    }, { threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRotating(!prefersReduced && document.documentElement.dataset.calm !== "true");
  }, []);

  const toggleRotation = () => {
    setRotating((value) => !value);
  };
  const target = part
    ? `/anatomy?layer=skeletal&structure=${encodeURIComponent(part.rawName)}`
    : "/anatomy";

  return (
    <section ref={stage} className={`${s.stage} ${className}`} aria-label={status === "unavailable" ? "Static skeletal reference illustration" : "Interactive skeletal reference model"}>
      <div className={s.instrument} aria-hidden="true">
        <span className={s.instrumentRing} />
        <span className={s.instrumentRingInner} />
        <span className={s.instrumentAxis} />
        <span className={s.instrumentFloor} />
        <svg className={s.registration} viewBox="0 0 600 600" fill="none">
          <circle cx="300" cy="300" r="218" />
          <circle cx="300" cy="300" r="194" />
          <path d="M300 22v38M300 540v38M22 300h38M540 300h38M104 104l27 27M469 469l27 27M496 104l-27 27M131 469l-27 27" />
        </svg>
      </div>
      <div className={s.topline}>
        <span>REFERENCE SPECIMEN / 01</span>
        <span className={s.live}><i /> {status === "ready" ? "MODEL READY" : status === "unavailable" ? "STATIC VIEW" : "ON-DEMAND LOAD"}</span>
      </div>
      <div className={`${s.poster} ${status === "ready" ? s.posterReady : ""}`} aria-hidden="true">
        <svg viewBox="0 0 260 560" fill="none">
          <path d="M130 22c-35 0-54 29-48 63 4 23 16 39 31 46v30c-24 9-49 24-63 48-16 29-13 69-8 104l11 78c2 15 23 14 25 0l8-62 12-52 5 95-5 118c0 18 25 18 27 0l9-109 8 109c2 18 27 18 27 0l-5-118 5-95 12 52 8 62c2 14 23 15 25 0l11-78c5-35 8-75-8-104-14-24-39-39-63-48v-30c15-7 27-23 31-46 6-34-13-63-48-63Z" stroke="currentColor" strokeWidth="2" />
          <path d="M82 166h96M69 215l61 24 61-24M77 246l53 18 53-18M75 278l55 17 55-17M79 309l51 14 51-14M91 344l39 7 39-7M130 161v192M76 185l-33 85 17 70M184 185l33 85-17 70M91 354l-17 87 12 89M169 354l17 87-12 89M130 46v91M96 72h68" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="130" cy="78" r="24" stroke="currentColor" strokeWidth="1.5" />
          <path d="M113 76h34M130 54v46" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span>PREPARING THE SKELETAL REFERENCE</span>
      </div>
      {started && (
        <Suspense fallback={null}>
          <SpecimenCanvas
            controlsRef={controls}
            rotating={rotating}
            onStatus={setStatus}
            onReady={setSourceReady}
            onIdentify={setPart}
          />
        </Suspense>
      )}
      <div className={s.specimenCaption}>
        <span className={s.captionEyebrow}>{part ? "IDENTIFIED MESH PART" : "SKELETAL SYSTEM / LAYER 01"}</span>
        <strong>{part?.name || "Human skeletal system"}</strong>
        <span className={s.captionCopy}>
          {part ? "Name shown as supplied with this reference model." : "Adult male reference anatomy; named parts may be subdivisions."}
        </span>
      </div>
      {part && (
        <Link className={s.partLink} to={target}>
          Explore this part in the atlas <span aria-hidden="true">↗</span>
        </Link>
      )}
      {status !== "unavailable" && (
        <div className={s.controls}>
          <button type="button" aria-pressed={rotating} onClick={toggleRotation}>
            {rotating ? <Pause size={15} /> : <Play size={15} />}
            {rotating ? "Pause rotation" : "Rotate model"}
          </button>
          <button type="button" onClick={() => controls.current?.reset?.()} aria-label="Reset skeletal model view">
            <ArrowCounterClockwise size={16} /> Reset
          </button>
        </div>
      )}
      <div className={s.credit}>
        <span>{status === "unavailable" ? "Interactive 3D is unavailable here. Open the atlas for its accessible structure list." : sourceReady ? "BodyParts3D / Z-Anatomy reference" : "Attribution: BodyParts3D / Z-Anatomy"}</span>
        <a href="/atlas/ATTRIBUTION.md" target="_blank" rel="noreferrer">Model source & license</a>
      </div>
      <div className={s.accessibleStatus} role="status" aria-live="polite">
        {status === "loading" ? "Loading the skeletal reference model." : status === "ready" ? "Skeletal reference ready. Drag to rotate; select a part to identify it." : status === "unavailable" ? "3D is unavailable; the anatomy atlas remains available." : "A skeletal reference model will load when this scene is visible."}
      </div>
    </section>
  );
}
