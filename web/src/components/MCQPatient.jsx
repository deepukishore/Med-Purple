import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { createHeartScene } from "@med-purple/anatomy";
import { emitStudyEvent } from "../utils/studyEvents";
import s from "./MCQPatient.module.css";

const rhythms = {
  steady: { label: "Rhythm steady", color: "#b9ed9e", rate: 72 },
  arrhythmia: { label: "Rhythm interrupted", color: "#ff9b9b", rate: 118 },
  codeBlue: { label: "Code Blue · charging", color: "#f6d78b", rate: 142 },
  flatline: { label: "Time expired", color: "#c5b9d1", rate: 0 },
  revived: { label: "Patient revived", color: "#d8f6a3", rate: 86 },
};

function ECGTrace({ rhythm }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let width = 0;
    let height = 0;
    const start = performance.now();

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (reducedMotion) draw(performance.now());
      else if (!frame) frame = requestAnimationFrame(draw);
    }

    function draw(now) {
      frame = 0;
      context.clearRect(0, 0, width, height);
      const baseline = height * 0.53;
      const scale = Math.min(height * 0.37, 22);
      const step = Math.max(44, Math.min(112, width / 3.5));
      const rate = rhythms[rhythm]?.rate || 0;
      const interval = rate ? 60000 / rate : Infinity;
      const elapsed = reducedMotion ? 0 : Math.max(0, now - start);
      let offset = 0;
      if (rate && rhythm === "arrhythmia") {
        const pairDuration = interval * 2;
        const pair = Math.floor(elapsed / pairDuration);
        const withinPair = elapsed % pairDuration;
        const firstDuration = interval * 0.84;
        const pairOffset = withinPair < firstDuration
          ? (withinPair / firstDuration) * step * 0.84
          : step * 0.84 + ((withinPair - firstDuration) / (interval * 1.16)) * step * 1.16;
        offset = (pair * step * 2 + pairOffset) % (step * 2);
      } else if (rate) {
        offset = ((elapsed / interval) % 1) * step;
      }
      const tint = rhythms[rhythm] || rhythms.steady;

      context.strokeStyle = `${tint.color}35`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, baseline);
      context.lineTo(width, baseline);
      context.stroke();

      context.strokeStyle = tint.color;
      context.lineWidth = 2;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.shadowBlur = rhythm === "flatline" ? 0 : 9;
      context.shadowColor = tint.color;
      context.beginPath();

      if (rhythm === "flatline") {
        context.moveTo(0, baseline);
        context.lineTo(width, baseline);
      } else {
        const arrhythmic = rhythm === "arrhythmia";
        const startX = (arrhythmic ? -step * 2 : -step) - offset;
        const endX = width + step * 2;
        for (let x = startX, beat = 0; x <= endX; beat++) {
          const beatStep = arrhythmic ? step * (beat % 2 ? 1.16 : 0.84) : step;
          const variation = arrhythmic && beat % 2 ? 1.18 : 1;
          context.moveTo(x, baseline);
          context.lineTo(x + beatStep * 0.2, baseline);
          context.lineTo(x + beatStep * 0.26, baseline - scale * 0.12);
          context.lineTo(x + beatStep * 0.31, baseline);
          context.lineTo(x + beatStep * 0.37, baseline + scale * 0.35);
          context.lineTo(x + beatStep * 0.42, baseline - scale * variation);
          context.lineTo(x + beatStep * 0.48, baseline + scale * 0.2);
          context.lineTo(x + beatStep * 0.53, baseline);
          context.lineTo(x + beatStep * 0.78, baseline);
          context.lineTo(x + beatStep * 0.83, baseline - scale * 0.12);
          context.lineTo(x + beatStep * 0.88, baseline);
          context.lineTo(x + beatStep, baseline);
          x += beatStep;
        }
      }
      context.stroke();
      context.shadowBlur = 0;
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [rhythm]);

  return <canvas className={s.trace} ref={canvasRef} aria-hidden="true" />;
}

function HeartOrgan() {
  const heart = useMemo(() => createHeartScene(), []);
  useEffect(() => () => {
    heart.dispose();
    heart.heart.traverse((object) => {
      object.geometry?.dispose();
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          material.dispose();
      }
    });
  }, [heart]);

  return (
    <primitive object={heart.heart} position={[0, -0.55, 0]} scale={0.48} />
  );
}

export default function MCQPatient({ rhythm = "steady", exam = false }) {
  const status = rhythms[rhythm] || rhythms.steady;
  useEffect(() => {
    if (rhythm === "flatline") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return undefined;
    if (rhythm === "codeBlue") emitStudyEvent("defib");
    const timer = window.setInterval(
      () => emitStudyEvent("heartbeat", { rhythm }),
      60000 / (status.rate || rhythms.steady.rate),
    );
    return () => window.clearInterval(timer);
  }, [rhythm, status.rate]);
  return (
    <section
      className={`${s.monitor} ${s[rhythm] || ""}`}
      aria-label="Study session rhythm monitor"
    >
      <div className={s.heartStage} data-heart-stage aria-hidden="true">
        <Canvas
          className={s.heart}
          camera={{ position: [0, 0, 3.3], fov: 42 }}
          dpr={[1, 1.5]}
          frameloop="demand"
        >
          <ambientLight intensity={1.35} />
          <pointLight position={[-2, 2, 3]} intensity={3} color="#ffe7f1" />
          <pointLight position={[2, -1, 2]} intensity={1.4} color="#b381df" />
          <HeartOrgan />
        </Canvas>
        <span className={s.heartHalo} />
      </div>
      <div className={s.monitorContent}>
        <div className={s.monitorHeading}>
          <span>{exam ? "CODE BLUE SIMULATION" : "STUDY SESSION MONITOR"}</span>
          <strong style={{ "--rhythm-color": status.color }}>
            <i />
            {status.label}
          </strong>
        </div>
        <ECGTrace rhythm={rhythm} />
        <div className={s.monitorFoot}>
          <span>LEARNING RHYTHM</span>
          <span>{status.rate ? `${status.rate} BPM` : "— BPM"}</span>
        </div>
      </div>
    </section>
  );
}
