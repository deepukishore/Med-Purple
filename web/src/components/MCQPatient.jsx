import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
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
    let start = performance.now();

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      start = performance.now();
      draw(start);
    }

    function draw(now) {
      context.clearRect(0, 0, width, height);
      const baseline = height * 0.53;
      const scale = Math.min(height * 0.37, 22);
      const step =
        rhythm === "codeBlue"
          ? 58
          : rhythm === "arrhythmia"
            ? 86
            : 108;
      const offset =
        rhythm === "flatline" || reducedMotion
          ? 0
          : ((now - start) / (rhythm === "codeBlue" ? 8 : 13)) % step;
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
        const startX = -step - offset;
        const endX = width + step;
        for (let x = startX, beat = 0; x <= endX; beat++) {
          const beatStep =
            rhythm === "arrhythmia" ? step * (beat % 2 ? 1.14 : 0.86) : step;
          const variation = rhythm === "arrhythmia" && beat % 2 ? 1.35 : 1;
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

function HeartOrgan({ rhythm }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.22);
    shape.bezierCurveTo(0, 0.22, -0.5, 0.82, -0.82, 0.42);
    shape.bezierCurveTo(-1.25, -0.12, -0.48, -0.74, 0, -1);
    shape.bezierCurveTo(0.48, -0.74, 1.25, -0.12, 0.82, 0.42);
    shape.bezierCurveTo(0.5, 0.82, 0, 0.22, 0, 0.22);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      curveSegments: 12,
    });
  }, []);
  const color =
    rhythm === "flatline" ? "#a99dad" : rhythm === "codeBlue" ? "#f4c77c" : "#e85f8b";

  return (
    <mesh geometry={geometry} scale={0.78}>
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={rhythm === "steady" ? 0.28 : 0.45}
        roughness={0.28}
        metalness={0.08}
        clearcoat={0.85}
      />
    </mesh>
  );
}

export default function MCQPatient({ rhythm = "steady", exam = false }) {
  const status = rhythms[rhythm] || rhythms.steady;
  return (
    <section
      className={`${s.monitor} ${s[rhythm] || ""}`}
      aria-label="Study session rhythm monitor"
    >
      <div className={s.heartStage} aria-hidden="true">
        <Canvas
          className={s.heart}
          camera={{ position: [0, 0, 3.3], fov: 42 }}
          dpr={[1, 1.5]}
          frameloop="demand"
        >
          <ambientLight intensity={1.35} />
          <pointLight position={[-2, 2, 3]} intensity={3} color="#ffe7f1" />
          <pointLight position={[2, -1, 2]} intensity={1.4} color="#b381df" />
          <HeartOrgan rhythm={rhythm} />
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
