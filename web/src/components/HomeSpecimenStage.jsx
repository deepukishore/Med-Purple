import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowsOutSimple, Eye, Pause, Play, ShareNetwork } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { emitStudyEvent } from "../utils/studyEvents";
import s from "./HomeSpecimenStage.module.css";

const SpecimenCanvas = lazy(() => import("./SpecimenCanvas"));

export default function HomeSpecimenStage({ className = "" }) {
  const stage = useRef(null);
  const controls = useRef(null);
  const flashTimer = useRef(0);
  const [started, setStarted] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [status, setStatus] = useState("idle");
  const [part, setPart] = useState(null);
  const [sourceReady, setSourceReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [exploded, setExploded] = useState(false);
  const [impactFlash, setImpactFlash] = useState(false);
  const [structureCount, setStructureCount] = useState(0);
  const [collected, setCollected] = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("mp:bone-dex:v1") || "[]"); }
    catch { return []; }
  });
  const collectedRef = useRef(null);
  if (!collectedRef.current) collectedRef.current = new Set(collected);
  const [shareStatus, setShareStatus] = useState("");

  const identifyPart = useCallback((nextPart) => {
    setPart(nextPart);
    if (!nextPart?.rawName) return;
    if (collectedRef.current.has(nextPart.rawName)) return;
    collectedRef.current.add(nextPart.rawName);
    const next = [...collectedRef.current];
    setCollected(next);
    try { localStorage.setItem("mp:bone-dex:v1", JSON.stringify(next)); }
    catch { /* Collection remains available for this session. */ }
    emitStudyEvent("bone-found", { name: nextPart.name, count: next.length });
  }, []);

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

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

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
  const skullSelected = /maxilla|mandible|nasal bone/i.test(part?.rawName || "");
  const toggleExplode = () => {
    const next = !exploded;
    controls.current?.setExploded?.(next);
    if (next) {
      emitStudyEvent("explode");
      setImpactFlash(true);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setImpactFlash(false), 220);
    }
  };
  const shareCollection = async () => {
    const count = Math.min(collected.length, structureCount || collected.length);
    const title = "My Med Purple Bone-dex";
    const text = `I identified ${count} named skeletal ${count === 1 ? "part" : "parts"} in Med Purple.`;
    try {
      const card = document.createElement("canvas");
      card.width = 1000;
      card.height = 560;
      const context = card.getContext("2d");
      const gradient = context.createLinearGradient(0, 0, 1000, 560);
      gradient.addColorStop(0, "#29183a");
      gradient.addColorStop(1, "#10141e");
      context.fillStyle = gradient;
      context.fillRect(0, 0, card.width, card.height);
      context.strokeStyle = "#71e9e2";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(810, 280, 152, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "#eae0f3";
      context.font = "700 30px Manrope, sans-serif";
      context.fillText("MED PURPLE / BONE-DEX", 72, 96);
      context.fillStyle = "#ffffff";
      context.font = "700 112px Manrope, sans-serif";
      context.fillText(`${count}`, 72, 292);
      context.fillStyle = "#cdbbdf";
      context.font = "500 34px Manrope, sans-serif";
      context.fillText(`of ${structureCount || "the reference"} named skeletal parts found`, 76, 350);
      context.fillText("Look closer. Know why.", 76, 465);
      const blob = await new Promise((resolve) => card.toBlob(resolve, "image/png"));
      if (blob && navigator.canShare && navigator.share) {
        const file = new File([blob], "med-purple-bone-dex.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text, files: [file] });
          setShareStatus("Bone-dex card shared.");
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title, text });
        setShareStatus("Bone-dex shared.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareStatus("Bone-dex summary copied.");
      } else {
        setShareStatus(text);
      }
    } catch {
      setShareStatus("Sharing was cancelled or unavailable.");
    }
  };

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
      {impactFlash && <span className={s.explodeFlash} aria-hidden="true" />}
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
      {skullSelected && (
        <div className={s.pixelShades} aria-hidden="true">
          <svg viewBox="0 0 96 30" fill="none">
            <path d="M3 4h31l4 5 4-5h31l5 6-3 15H52l-7-8-7 8H9L5 10Z" fill="#17131e" stroke="#fff" strokeWidth="3" />
            <path d="M12 10h22v8H12zM58 10h22v8H58z" fill="#79e4db" />
            <path d="M34 13h28" stroke="#fff" strokeWidth="3" />
          </svg>
          <span>No brain, still passing anatomy.</span>
        </div>
      )}
      {started && (
        <Suspense fallback={null}>
          <SpecimenCanvas
            controlsRef={controls}
            rotating={rotating}
            onStatus={setStatus}
            onScanStatus={setScanStatus}
            onScanChange={setScanning}
            onExplodedChange={setExploded}
            onStructureCount={setStructureCount}
            onReady={setSourceReady}
            onIdentify={identifyPart}
          />
        </Suspense>
      )}
      <div className={s.specimenCaption}>
        <span className={s.captionEyebrow}>{part ? "IDENTIFIED MESH PART" : "SKELETAL SYSTEM / LAYER 01"}</span>
        <strong>{part?.name || "Human skeletal system"}</strong>
          <span className={s.captionCopy}>
          {skullSelected ? "No brain, still passing anatomy." : part ? "Name shown as supplied with this reference model." : "Adult male reference anatomy; named parts may be subdivisions."}
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
          <button
            type="button"
            aria-pressed={scanning}
            aria-label={scanning ? "Stop the anatomy layer scan" : "Show muscle and bone scan"}
            disabled={scanStatus === "loading"}
            title={scanStatus === "loading" ? "Loading the muscle layer" : undefined}
            onClick={() => controls.current?.setScan?.(!scanning)}
          >
            <Eye size={16} />
            {scanStatus === "loading" ? "Loading scan" : scanning ? "Stop scan" : "Scan layers"}
          </button>
          <button
            type="button"
            aria-pressed={exploded}
            aria-label={exploded ? "Rebuild the skeletal reference" : "Explode the skeletal reference"}
            onClick={toggleExplode}
          >
            <ArrowsOutSimple size={16} /> {exploded ? "Rebuild" : "Explode"}
          </button>
        </div>
      )}
      {status === "ready" && (
        <div className={s.boneDex}>
          <span><strong>{Math.min(collected.length, structureCount || collected.length)}</strong> / {structureCount || "…"} parts found</span>
          <button type="button" onClick={shareCollection} aria-label="Share your Bone-dex card" title="Share Bone-dex card">
            <ShareNetwork size={15} /> <span>Share</span>
          </button>
          <span className={s.shareStatus} aria-live="polite">{shareStatus}</span>
        </div>
      )}
      {status !== "unavailable" && (
        <p className={s.gestureHint}>
          {scanning ? "Scroll the page to move the cut through muscle and bone" : "Drag to turn · click, then scroll to zoom"}
        </p>
      )}
      <div className={s.credit}>
        <span>{status === "unavailable" ? "Interactive 3D is unavailable here. Open the atlas for its accessible structure list." : sourceReady ? "BodyParts3D / Z-Anatomy reference" : "Attribution: BodyParts3D / Z-Anatomy"}</span>
        <a href="/atlas/ATTRIBUTION.md" target="_blank" rel="noreferrer">Model source & license</a>
      </div>
      <div className={s.accessibleStatus} role="status" aria-live="polite">
        {status === "loading" ? "Loading the skeletal reference model." : status === "ready" ? "Skeletal reference ready. Drag to rotate; select a part to identify it." : status === "unavailable" ? "3D is unavailable; the anatomy atlas remains available." : "A skeletal reference model will load when this scene is visible."}
        {scanStatus === "loading" ? " Loading the muscular layer for the anatomy scan." : scanStatus === "unavailable" ? " The muscular layer could not be loaded." : scanning ? " Layer scan active. Scroll to move the boundary through muscle and bone." : ""}
      </div>
    </section>
  );
}
