import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createHeartScene, createReferenceScene } from "@med-purple/anatomy";
export default function AnatomyCanvas({
  selected,
  onSelect,
  controlsRef,
  compact = false,
  exploded = false,
  showVessels = true,
  modelId = "heart",
  autoRotate = false,
  resetOnLeave = true,
}) {
  const host = useRef(),
    engine = useRef(),
    selectCallback = useRef(onSelect);
  selectCallback.current = onSelect;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current;
    let renderer, raf;
    setFailed(false);
    const model =
      modelId === "heart" ? createHeartScene() : createReferenceScene(modelId);
    engine.current = model;
    if (controlsRef) controlsRef.current = model;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      model.dispose();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      model.resize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let visible = true;
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    intersection.observe(el);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = (time) => {
      raf = requestAnimationFrame(animate);
      if (!visible || document.hidden) return;
      model.frame(time, reduced);
      renderer.render(model.scene, model.camera);
    };
    raf = requestAnimationFrame(animate);
    const points = new Map();
    let start = null,
      lastDistance = 0;
    const down = (e) => {
      el.setPointerCapture(e.pointerId);
      points.set(e.pointerId, [e.clientX, e.clientY]);
      start = [e.clientX, e.clientY];
      if (points.size === 2) {
        const a = [...points.values()];
        lastDistance = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
      }
    };
    const move = (e) => {
      if (compact) {
        const last = points.get(e.pointerId);
        if (last) {
          points.set(e.pointerId, [e.clientX, e.clientY]);
          model.rotate(
            (e.clientX - last[0]) * 0.009,
            (e.clientY - last[1]) * 0.008,
          );
          return;
        }
        if (e.pointerType === "mouse" && !reduced) {
          const b = el.getBoundingClientRect();
          model.targets.y =
            ((e.clientX - b.left - b.width / 2) / b.width) * 0.4;
          model.targets.x =
            ((e.clientY - b.top - b.height / 2) / b.height) * 0.15;
        }
        return;
      }
      const last = points.get(e.pointerId);
      if (!last) return;
      points.set(e.pointerId, [e.clientX, e.clientY]);
      if (points.size === 2) {
        const a = [...points.values()],
          d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
        model.zoom((lastDistance - d) * 0.02);
        lastDistance = d;
      } else
        model.rotate(
          (e.clientX - last[0]) * 0.009,
          (e.clientY - last[1]) * 0.008,
        );
    };
    const up = (e) => {
      if (
        start &&
        points.size === 1 &&
        Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6
      ) {
        const b = el.getBoundingClientRect();
        const id = model.pick(
          ((e.clientX - b.left) / b.width) * 2 - 1,
          (-(e.clientY - b.top) / b.height) * 2 + 1,
        );
        if (id) selectCallback.current?.(id);
      }
      points.delete(e.pointerId);
      start = null;
    };
    const leave = () => {
      if (compact && resetOnLeave && points.size === 0) model.reset();
    };
    const wheel = (e) => {
      if (compact) return;
      e.preventDefault();
      model.zoom(e.deltaY * 0.005);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      for (const [type, handler] of [
        ["pointerdown", down],
        ["pointermove", move],
        ["pointerup", up],
        ["pointercancel", up],
        ["pointerleave", leave],
        ["wheel", wheel],
      ])
        el.removeEventListener(type, handler);
      renderer.dispose();
      model.dispose();
      renderer.domElement.remove();
      engine.current = null;
    };
  }, [compact, modelId, resetOnLeave]);
  useEffect(() => {
    engine.current?.select(selected);
  }, [selected, modelId]);
  useEffect(() => {
    engine.current?.explode(exploded);
  }, [exploded, modelId]);
  useEffect(() => {
    engine.current?.vessels(showVessels);
  }, [showVessels, modelId]);
  useEffect(() => {
    engine.current?.autoRotate?.(autoRotate);
  }, [autoRotate, modelId]);
  return (
    <div
      ref={host}
      role="application"
      aria-label={
        compact
          ? "Interactive schematic 3D heart preview. Drag or use arrow keys to rotate; click a chamber to highlight it."
          : `Interactive ${modelId} model. Drag to rotate, pinch or scroll to zoom. Arrow keys rotate; plus and minus zoom; R resets.`
      }
      tabIndex={0}
      onKeyDown={(e) => {
        const m = engine.current;
        if (!m) return;
        const actions = {
          ArrowLeft: () => m.rotate(-0.2, 0),
          ArrowRight: () => m.rotate(0.2, 0),
          ArrowUp: () => m.rotate(0, -0.2),
          ArrowDown: () => m.rotate(0, 0.2),
          "+": () => m.zoom(-0.5),
          "-": () => m.zoom(0.5),
          r: () => m.reset(),
        };
        if (actions[e.key]) {
          e.preventDefault();
          actions[e.key]();
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        minHeight: compact ? 160 : 340,
        touchAction: compact ? "pan-y" : "none",
        cursor: "grab",
        position: "relative",
      }}
    >
      {failed && (
        <div
          style={{
            position: "absolute",
            inset: 20,
            display: "grid",
            placeContent: "center",
            textAlign: "center",
          }}
        >
          <strong>3D is unavailable on this device.</strong>
          <p>You can still study every structure using the list.</p>
        </div>
      )}
    </div>
  );
}
