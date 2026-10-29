import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { isLowEndDevice } from "../utils/graphics";
import s from "./SpecimenCanvas.module.css";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const displayName = (name = "") =>
  name.replace(/\.l$/, " · left").replace(/\.r$/, " · right");

export default function SpecimenCanvas({
  onIdentify,
  onStatus,
  onScanStatus,
  onScanChange,
  onExplodedChange,
  onStructureCount,
  onReady,
  controlsRef,
  rotating,
}) {
  const host = useRef(null);
  const identify = useRef(onIdentify);
  const status = useRef(onStatus);
  const scanStatus = useRef(onScanStatus);
  const scanChange = useRef(onScanChange);
  const explodeChange = useRef(onExplodedChange);
  identify.current = onIdentify;
  status.current = onStatus;
  scanStatus.current = onScanStatus;
  scanChange.current = onScanChange;
  explodeChange.current = onExplodedChange;

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;

    let renderer;
    let environmentTarget;
    let pmremGenerator;
    let model;
    let scanModel;
    let scanning = false;
    let exploded = false;
    let explodeProgress = 0;
    let explosionParts = [];
    let scanTop = 1.59;
    let scanBottom = -1.59;
    let selected = null;
    let selectedBase = null;
    let selectedGlow = null;
    let selectedOutline = null;
    let raf = 0;
    let active = true;
    let visible = false;
    let isHidden = document.hidden;
    let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowEnd = isLowEndDevice();
    let autoRotate = rotating && !reduced;
    let previousTime = 0;
    let desiredScale = 1;
    let drag = null;
    let idleTimer = 0;
    let canvasEngaged = false;
    let rotationRequested = rotating && !reduced;
    let scrollProgress = 0;
    const target = { x: 0, y: -0.24 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const boneClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const muscleClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

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
    const pointerLightTarget = cyanRim.position.clone();

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
    const scanRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.012, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0x71f6ef,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    scanRing.rotation.x = Math.PI / 2;
    scanRing.visible = false;
    scene.add(scanRing);

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowEnd,
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.4));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      if (!lowEnd) {
        try {
          pmremGenerator = new THREE.PMREMGenerator(renderer);
          const room = new RoomEnvironment();
          environmentTarget = pmremGenerator.fromScene(room, 0.04);
          scene.environment = environmentTarget.texture;
          room.dispose();
          pmremGenerator.dispose();
          pmremGenerator = null;
        } catch {
          pmremGenerator?.dispose();
          pmremGenerator = null;
        }
      }
      el.appendChild(renderer.domElement);
    } catch {
      status.current?.("unavailable");
      return undefined;
    }

    const tick = (time) => {
      raf = 0;
      if (!active || !visible || isHidden || !renderer) return;
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;
      let moving = false;
      if (cyanRim.position.distanceToSquared(pointerLightTarget) > 0.0004) {
        cyanRim.position.lerp(pointerLightTarget, 0.16);
        moving = true;
      }
      if (scanning) {
        const scanY = scanTop + (scanBottom - scanTop) * scrollProgress;
        boneClipPlane.constant = scanY;
        muscleClipPlane.constant = -scanY;
        scanRing.position.y = scanY;
      }
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
        if (Math.abs(explodeProgress - (exploded ? 1 : 0)) > 0.001) {
          explodeProgress += ((exploded ? 1 : 0) - explodeProgress) * (1 - Math.exp(-delta * 8));
          for (const part of explosionParts)
            part.mesh.position.copy(part.base).addScaledVector(part.offset, explodeProgress);
          moving = true;
        } else if (explodeProgress > 0) {
          explodeProgress = 1;
          for (const part of explosionParts)
            part.mesh.position.copy(part.base).add(part.offset);
        } else {
          explodeProgress = 0;
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
      if (reduced) {
        autoRotate = false;
        window.clearTimeout(idleTimer);
      } else if (rotationRequested && !drag) {
        autoRotate = true;
      }
      wake();
    };
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      scrollProgress = clamp(
        (window.innerHeight * 0.4 - rect.top) /
          Math.max(rect.height + window.innerHeight * 0.4, 1),
        0,
        1,
      );
      wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    motionPreference.addEventListener("change", onMotionPreference);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const restoreSelection = () => {
      if (!selected) return;
      selected.material = selectedBase;
      if (selectedGlow) {
        for (const material of Array.isArray(selectedGlow)
          ? selectedGlow
          : [selectedGlow]) material.dispose();
      }
      if (selectedOutline) {
        selected.remove(selectedOutline);
        selectedOutline.geometry.dispose();
        selectedOutline.material.dispose();
      }
      selected = null;
      selectedBase = null;
      selectedGlow = null;
      selectedOutline = null;
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
      selectedOutline = new THREE.LineSegments(
        new THREE.EdgesGeometry(selected.geometry, 22),
        new THREE.LineBasicMaterial({
          color: 0x82f1e9,
          transparent: true,
          opacity: 0.82,
          depthTest: true,
          depthWrite: false,
        }),
      );
      selectedOutline.scale.setScalar(1.006);
      selectedOutline.renderOrder = 3;
      selected.add(selectedOutline);
      const rawName = selected.userData.atlasName || selected.name || "Named structure";
      identify.current?.({ rawName, name: displayName(rawName) });
      wake();
    };
    const pointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      canvasEngaged = true;
      autoRotate = false;
      window.clearTimeout(idleTimer);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      el.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = (event) => {
      if (event.pointerType === "mouse") {
        const rect = el.getBoundingClientRect();
        pointerLightTarget.set(
          ((event.clientX - rect.left) / rect.width - 0.5) * 4.4,
          (0.5 - (event.clientY - rect.top) / rect.height) * 4.2,
          2.5,
        );
      }
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
        const hit = raycaster.intersectObject(model, true).find((entry) => entry.object.isMesh);
        if (hit) selectHit(hit);
      }
      drag = null;
      if (rotationRequested && !reduced) {
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
          autoRotate = rotationRequested && !reduced;
          wake();
        }, 2000);
      }
      wake();
    };
    const pointerLeave = () => {
      if (!drag) {
        target.x = 0;
        target.y = -0.24;
        pointerLightTarget.set(3, -1, 1.5);
        wake();
      }
    };
    const wheel = (event) => {
      if (!event.ctrlKey && !event.metaKey && (!canvasEngaged || scanning)) return;
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
    draco.setDecoderConfig({ type: lowEnd ? "js" : "wasm" });
    draco.setWorkerLimit(lowEnd ? 1 : 2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    const setClipping = (root, plane) => {
      if (!root) return;
      root.traverse((object) => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          material.clippingPlanes = plane ? [plane] : [];
          material.clipShadows = Boolean(plane);
          material.needsUpdate = true;
        }
      });
    };
    const applyScan = () => {
      renderer.localClippingEnabled = scanning;
      setClipping(model, scanning ? boneClipPlane : null);
      setClipping(scanModel, scanning ? muscleClipPlane : null);
      if (scanModel) scanModel.visible = scanning;
      scanRing.visible = scanning;
      wake();
    };
    let scanLoad = null;
    const loadMuscles = () => {
      if (!model) {
        scanStatus.current?.("loading");
        return Promise.resolve();
      }
      if (scanModel) {
        applyScan();
        scanStatus.current?.("ready");
        return Promise.resolve();
      }
      if (scanLoad) return scanLoad;
      scanStatus.current?.("loading");
      scanLoad = loader.loadAsync("/atlas/muscular.glb").then((gltf) => {
        if (!active) {
          gltf.scene.traverse((object) => {
            if (!object.isMesh) return;
            object.geometry.dispose();
            for (const material of Array.isArray(object.material)
              ? object.material
              : [object.material]) material.dispose();
          });
          return;
        }
        scanModel = gltf.scene;
        scanModel.traverse((object) => {
          if (!object.isMesh) return;
          const previous = object.material;
          object.material = new THREE.MeshStandardMaterial({
            color: 0xbc6575,
            roughness: 0.56,
            metalness: 0.025,
            side: THREE.DoubleSide,
          });
          for (const material of Array.isArray(previous)
            ? previous
            : [previous]) material.dispose();
        });
        const bounds = new THREE.Box3().setFromObject(scanModel);
        const center = bounds.getCenter(new THREE.Vector3());
        scanModel.scale.setScalar(desiredScale);
        scanModel.position.set(
          -center.x * desiredScale,
          -center.y * desiredScale,
          -center.z * desiredScale,
        );
        scene.add(scanModel);
        scanStatus.current?.("ready");
        applyScan();
      }).catch(() => {
        scanLoad = null;
        if (!active) return;
        scanning = false;
        scanChange.current?.(false);
        scanStatus.current?.("unavailable");
        applyScan();
      });
      return scanLoad;
    };
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
      const namedParts = new Set();
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.userData.atlasName = object.name;
        if (object.name) namedParts.add(object.name);
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
      scanTop = size.y * desiredScale * 0.5;
      scanBottom = -scanTop;
      model.scale.setScalar(desiredScale);
      model.position.set(-center.x * desiredScale, -center.y * desiredScale, -center.z * desiredScale);
      model.rotation.y = -0.24;
      scene.add(model);
      model.updateMatrixWorld(true);
      const modelCenter = new THREE.Vector3(0, 0, 0);
      explosionParts = [];
      model.traverse((object) => {
        if (!object.isMesh || !object.parent) return;
        const base = object.position.clone();
        const worldPosition = object.getWorldPosition(new THREE.Vector3());
        const direction = worldPosition.clone().sub(modelCenter);
        if (direction.lengthSq() < 0.0001) direction.set(0, 1, 0);
        else direction.normalize();
        if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
        const distance = clamp((object.geometry.boundingSphere?.radius || 0.1) * desiredScale * 0.72, 0.14, 0.42);
        const targetWorld = worldPosition.addScaledVector(direction, distance);
        const targetLocal = object.parent.worldToLocal(targetWorld);
        explosionParts.push({ mesh: object, base, offset: targetLocal.sub(base) });
      });
      model.scale.setScalar(0.001);
      onStructureCount?.(namedParts.size);
      status.current?.("ready");
      onReady?.(true);
      if (scanning) loadMuscles();
      wake();
    }).catch(() => {
      if (active) status.current?.("unavailable");
    });

    const setRotation = (value) => {
      rotationRequested = Boolean(value) && !reduced;
      window.clearTimeout(idleTimer);
      autoRotate = rotationRequested && !drag;
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
    const setScan = (value) => {
      scanning = Boolean(value);
      scanChange.current?.(scanning);
      if (scanning) loadMuscles();
      else {
        applyScan();
        scanStatus.current?.("idle");
      }
    };
    const setExploded = (value) => {
      exploded = Boolean(value);
      explodeChange.current?.(exploded);
      wake();
    };
    if (controlsRef) controlsRef.current = { reset, rotate, setRotation, setScan, setExploded };
    resize();

    return () => {
      active = false;
      window.clearTimeout(idleTimer);
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
      scene.environment = null;
      environmentTarget?.dispose();
      pmremGenerator?.dispose();
      scanRing.geometry.dispose();
      scanRing.material.dispose();
      if (model) {
        model.traverse((object) => {
          if (!object.isMesh) return;
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material])
            material.dispose();
        });
      }
      if (scanModel) {
        scanModel.traverse((object) => {
          if (!object.isMesh) return;
          object.geometry.dispose();
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) material.dispose();
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
      aria-label="Interactive BodyParts3D and Z-Anatomy skeletal reference. Drag to rotate, click then scroll or use Control or Command plus scroll to zoom, select a part to identify it, and press R to reset."
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
