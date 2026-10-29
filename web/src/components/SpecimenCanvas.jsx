import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import s from "./SpecimenCanvas.module.css";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const displayName = (name = "") =>
  name.replace(/\.l$/, " · left").replace(/\.r$/, " · right");

export default function SpecimenCanvas({
  onIdentify,
  onStatus,
  onReady,
  controlsRef,
  rotating,
}) {
  const host = useRef(null);
  const identify = useRef(onIdentify);
  const status = useRef(onStatus);
  identify.current = onIdentify;
  status.current = onStatus;

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;

    let renderer;
    let model;
    let selected = null;
    let selectedBase = null;
    let selectedGlow = null;
    let raf = 0;
    let active = true;
    let visible = false;
    let isHidden = document.hidden;
    let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let autoRotate = rotating && !reduced;
    let previousTime = 0;
    let desiredScale = 1;
    let drag = null;
    let scrollProgress = 0;
    const target = { x: 0, y: -0.24 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 80);
    camera.position.set(0, 0.08, 5.9);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xf6efff, 0x241338, 2.15));
    const key = new THREE.DirectionalLight(0xfff4e8, 3.1);
    key.position.set(4, 5, 5);
    scene.add(key);
    const violetRim = new THREE.DirectionalLight(0x9b67ff, 3.7);
    violetRim.position.set(-4, 2, -3);
    scene.add(violetRim);
    const cyanRim = new THREE.PointLight(0x61e7ed, 1.7, 8);
    cyanRim.position.set(3, -1, 1.5);
    scene.add(cyanRim);

    const platform = new THREE.Group();
    for (const [radius, opacity, color] of [
      [1.16, 0.5, 0xb69bea],
      [1.48, 0.23, 0x74dce0],
      [1.78, 0.12, 0x9b7abc],
    ]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.006, 4, 128),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -1.73;
      platform.add(ring);
    }
    const grid = new THREE.GridHelper(5.6, 28, 0x8a69b7, 0x513c70);
    grid.position.y = -1.74;
    for (const material of Array.isArray(grid.material)
      ? grid.material
      : [grid.material]) {
      material.transparent = true;
      material.opacity = 0.13;
      material.depthWrite = false;
    }
    platform.add(grid);
    scene.add(platform);

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      el.appendChild(renderer.domElement);
    } catch {
      status.current?.("unavailable");
      return undefined;
    }

    const render = () => {
      if (!active || !visible || isHidden || !renderer) return;
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const tick = (time) => {
      raf = 0;
      if (!active || !visible || isHidden || !renderer) return;
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;
      let moving = false;
      if (model) {
        if (autoRotate && !reduced) {
          model.rotation.y += delta * 0.1;
          moving = true;
        }
        const nextX = target.x + scrollProgress * 0.035;
        const nextY = target.y + scrollProgress * 0.12;
        if (Math.abs(model.rotation.x - nextX) > 0.001) {
          model.rotation.x += (nextX - model.rotation.x) * 0.09;
          moving = true;
        }
        if (Math.abs(model.rotation.y - nextY) > 0.001 && !autoRotate) {
          model.rotation.y += (nextY - model.rotation.y) * 0.09;
          moving = true;
        }
        const scale = model.scale.x;
        if (Math.abs(scale - desiredScale) > 0.003) {
          model.scale.setScalar(scale + (desiredScale - scale) * 0.075);
          moving = true;
        }
      }
      renderer.render(scene, camera);
      if (moving) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf && active && visible && !isHidden && renderer)
        raf = requestAnimationFrame(tick);
    };
    const resize = () => {
      if (!renderer) return;
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      camera.aspect = Math.max(1, el.clientWidth) / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
      wake();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }, { threshold: 0.04 });
    intersectionObserver.observe(el);
    const onVisibility = () => {
      isHidden = document.hidden;
      if (!isHidden) wake();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionPreference = (event) => {
      reduced = event.matches;
      wake();
    };
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      scrollProgress = clamp(
        (window.innerHeight * 0.82 - rect.top) / Math.max(rect.height, 1),
        0,
        1,
      );
      wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    motionPreference.addEventListener("change", onMotionPreference);
    window.addEventListener("scroll", onScroll, { passive: true });

    const restoreSelection = () => {
      if (!selected) return;
      selected.material = selectedBase;
      if (selectedGlow) {
        for (const material of Array.isArray(selectedGlow)
          ? selectedGlow
          : [selectedGlow]) material.dispose();
      }
      selected = null;
      selectedBase = null;
      selectedGlow = null;
    };
    const selectHit = (hit) => {
      if (!hit?.object?.isMesh) return;
      restoreSelection();
      selected = hit.object;
      selectedBase = hit.object.material;
      const glowMaterial = (material) => {
        const copy = material.clone();
        if (copy.emissive) {
          copy.emissive.set(0x7b4fe0);
          copy.emissiveIntensity = 0.62;
        }
        return copy;
      };
      selectedGlow = Array.isArray(selectedBase)
        ? selectedBase.map(glowMaterial)
        : glowMaterial(selectedBase);
      selected.material = selectedGlow;
      const rawName = selected.userData.atlasName || selected.name || "Named structure";
      identify.current?.({ rawName, name: displayName(rawName) });
      wake();
    };
    const pointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      el.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = (event) => {
      if (drag && event.pointerId === drag.id) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        drag.x = event.clientX;
        drag.y = event.clientY;
        target.y += dx * 0.008;
        target.x = clamp(target.x + dy * 0.006, -0.4, 0.4);
      } else if (event.pointerType === "mouse") {
        const rect = el.getBoundingClientRect();
        target.x = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 0.16, -0.12, 0.12);
        target.y = -0.24 + ((event.clientX - rect.left) / rect.width - 0.5) * 0.24;
      }
      wake();
    };
    const pointerUp = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.moved && model && renderer) {
        const rect = el.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(model, true)[0];
        if (hit) selectHit(hit);
      }
      drag = null;
      wake();
    };
    const pointerLeave = () => {
      if (!drag) {
        target.x = 0;
        target.y = -0.24;
        wake();
      }
    };
    const wheel = (event) => {
      event.preventDefault();
      camera.position.z = clamp(camera.position.z + event.deltaY * 0.003, 4.5, 8.2);
      wake();
    };
    el.addEventListener("pointerdown", pointerDown);
    el.addEventListener("pointermove", pointerMove);
    el.addEventListener("pointerup", pointerUp);
    el.addEventListener("pointercancel", pointerUp);
    el.addEventListener("pointerleave", pointerLeave);
    el.addEventListener("wheel", wheel, { passive: false });

    const draco = new DRACOLoader();
    draco.setDecoderPath("/atlas/draco/");
    draco.setDecoderConfig({ type: "wasm" });
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    status.current?.("loading");
    loader.loadAsync("/atlas/skeletal.glb").then((gltf) => {
      if (!active) {
        gltf.scene.traverse((object) => {
          if (!object.isMesh) return;
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material])
            material.dispose();
        });
        return;
      }
      model = gltf.scene;
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.userData.atlasName = object.name;
        object.castShadow = false;
        object.receiveShadow = false;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (material.roughness !== undefined) material.roughness = 0.52;
        }
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      desiredScale = 3.18 / Math.max(size.y, size.x, size.z);
      model.scale.setScalar(0.001);
      model.position.set(-center.x * desiredScale, -center.y * desiredScale, -center.z * desiredScale);
      model.rotation.y = -0.24;
      scene.add(model);
      status.current?.("ready");
      onReady?.(true);
      wake();
    }).catch(() => {
      if (active) status.current?.("unavailable");
    });

    const setRotation = (value) => {
      autoRotate = Boolean(value) && !reduced;
      wake();
    };
    const reset = () => {
      target.x = 0;
      target.y = -0.24;
      camera.position.set(0, 0.08, 5.9);
      restoreSelection();
      identify.current?.(null);
      wake();
    };
    const rotate = (x, y) => {
      target.x = clamp(target.x + x, -0.4, 0.4);
      target.y += y;
      wake();
    };
    if (controlsRef) controlsRef.current = { reset, rotate, setRotation };
    resize();

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionPreference.removeEventListener("change", onMotionPreference);
      window.removeEventListener("scroll", onScroll);
      for (const [type, handler] of [
        ["pointerdown", pointerDown],
        ["pointermove", pointerMove],
        ["pointerup", pointerUp],
        ["pointercancel", pointerUp],
        ["pointerleave", pointerLeave],
        ["wheel", wheel],
      ]) el.removeEventListener(type, handler);
      restoreSelection();
      if (model) {
        model.traverse((object) => {
          if (!object.isMesh) return;
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material])
            material.dispose();
        });
      }
      platform.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material])
            material.dispose();
        }
      });
      draco.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      if (controlsRef?.current?.reset === reset) controlsRef.current = null;
    };
  }, [controlsRef, onReady]);

  useEffect(() => {
    controlsRef?.current?.setRotation(rotating);
  }, [controlsRef, rotating]);

  return (
    <div
      ref={host}
      className={s.canvas}
      role="application"
      tabIndex={0}
      aria-label="Interactive BodyParts3D and Z-Anatomy skeletal reference. Drag to rotate, scroll to zoom, select a part to identify it, and press R to reset."
      onKeyDown={(event) => {
        const controls = controlsRef?.current;
        const actions = {
          r: () => controls?.reset?.(),
          R: () => controls?.reset?.(),
          ArrowLeft: () => controls?.rotate?.(0, -0.16),
          ArrowRight: () => controls?.rotate?.(0, 0.16),
          ArrowUp: () => controls?.rotate?.(-0.12, 0),
          ArrowDown: () => controls?.rotate?.(0.12, 0),
        };
        if (actions[event.key]) {
          event.preventDefault();
          actions[event.key]();
        }
      }}
    />
  );
}
