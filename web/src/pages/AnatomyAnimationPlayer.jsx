import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ArrowCounterClockwise, ArrowUpRight, BookOpenText, Pause, Play, PlayCircle } from "@phosphor-icons/react";
import { getAnatomyLesson } from "@med-purple/anatomy";
import usePageMeta from "../hooks/usePageMeta";
import { isLowEndDevice } from "../utils/graphics";
import s from "./AnatomyAnimationPlayer.module.css";

const PROGRESS_KEY = "mp:anatomy-video-progress:v1";
const RECENT_KEY = "mp:anatomy-video-recent:v1";
const PALETTE = {
  skeletal: "#e6dbc4",
  muscular: "#bd687d",
  organ: "#ac83a8",
  cardiovascular: "#bb657b",
};
const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

function readProgress(id) {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}")[id] || null;
  } catch {
    return null;
  }
}

function writeProgress(id, entry) {
  try {
    const current = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...current, [id]: entry }));
  } catch {}
}

function markRecent(id) {
  try {
    const current = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const next = [id, ...current.filter((value) => value !== id)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

function chapterAt(lesson, time) {
  return lesson.chapters.find((chapter, index) =>
    time < chapter.end || index === lesson.chapters.length - 1,
  ) || lesson.chapters[0];
}

function smooth(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function materialForLayer(layer) {
  return new THREE.MeshStandardMaterial({
    color: PALETTE[layer] || "#b48fcc",
    roughness: layer === "cardiovascular" ? 0.44 : 0.62,
    metalness: 0.015,
    transparent: false,
    side: THREE.DoubleSide,
  });
}

function namedAncestor(object, root) {
  for (let current = object; current && current !== root; current = current.parent) {
    if (!current.name || /^(?:mesh|object|primitive)[_ -]?\d*$/i.test(current.name)) continue;
    const canonicalName = current.name.replaceAll("_", " ").trim();
    return canonicalName;
  }
  return object.name.replaceAll("_", " ").trim() || "Unnamed mesh";
}

function gltfStructureName(object, gltf) {
  for (let current = object; current && current !== gltf.scene; current = current.parent) {
    const nodeIndex = gltf.parser.associations.get(current)?.nodes;
    const sourceName = Number.isInteger(nodeIndex) ? gltf.parser.json.nodes[nodeIndex]?.name : null;
    if (sourceName) return sourceName;
  }
  return namedAncestor(object, gltf.scene);
}

function AnatomyAnimationPlayerView({ lesson }) {
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const engineRef = useRef(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const exploreRef = useRef(false);
  const reducedRef = useRef(false);
  const selectedRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(() => readProgress(lesson.id)?.time || 0);
  const [playing, setPlayingState] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [explore, setExploreState] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("Preparing the anatomy scene");
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(() =>
    lesson.chapters.findIndex((chapter) => chapter.id === chapterAt(lesson, currentTime)?.id),
  );
  const [annotationPositions, setAnnotationPositions] = useState([]);
  const [fullScreen, setFullScreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.calm === "true",
  );

  const currentChapter = lesson.chapters[chapterIndex] || lesson.chapters[0];
  const selectedObject = useMemo(() => {
    if (!selectedStructure) return null;
    return engineRef.current?.objectsById.get(selectedStructure)?.[0] || null;
  }, [selectedStructure, ready, currentTime]);

  usePageMeta(`${lesson.title} · 3D Anatomy`);

  const setPlaying = useCallback((next) => {
    const value = Boolean(next);
    playingRef.current = value;
    setPlayingState(value);
  }, []);

  const setExplore = useCallback((next) => {
    const value = Boolean(next);
    exploreRef.current = value;
    setExploreState(value);
    if (value) playingRef.current = false;
    setPlayingState((current) => value ? false : current);
    if (engineRef.current?.controls) engineRef.current.controls.enabled = value;
  }, []);

  const moveToTime = useCallback((time, { pause = false, clearSelection = false } = {}) => {
    const next = clamp(Number(time) || 0, 0, lesson.duration);
    timeRef.current = next;
    setCurrentTime(next);
    if (pause) setPlaying(false);
    if (clearSelection) {
      selectedRef.current = null;
      setSelectedStructure(null);
    }
    const active = chapterAt(lesson, next);
    setChapterIndex(lesson.chapters.findIndex((chapter) => chapter.id === active.id));
    if (engineRef.current && !exploreRef.current) engineRef.current.applyTime(next, true);
    return next;
  }, [lesson, setPlaying]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const reduced = preference.matches || document.documentElement.dataset.calm === "true";
      reducedRef.current = reduced;
      setReducedMotion(reduced);
    };
    reducedRef.current = reducedMotion;
    preference.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-calm"] });
    update();
    return () => {
      preference.removeEventListener("change", update);
      observer.disconnect();
    };
  }, [reducedMotion]);

  useEffect(() => {
    markRecent(lesson.id);
    const saved = readProgress(lesson.id);
    const startAt = saved?.completed ? 0 : clamp(saved?.time || 0, 0, lesson.duration);
    timeRef.current = startAt;
    setCurrentTime(startAt);
    const active = chapterAt(lesson, startAt);
    setChapterIndex(lesson.chapters.findIndex((chapter) => chapter.id === active.id));
  }, [lesson]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer;
    let controls;
    let raf = 0;
    let disposed = false;
    let visible = true;
    let last = 0;
    let lastUi = 0;
    let lastSave = 0;
    let pmrem;
    let environment;
    let draco;
    let resizeObserver;
    let intersectionObserver;
    const scene = new THREE.Scene();
    scene.background = null;
    const lowEnd = isLowEndDevice();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.004, 50);
    const layerRoots = new Map();
    const layerMaterials = new Map();
    const highlightMaterials = new Map();
    const objectsById = new Map();
    const anchorsById = new Map();
    const loadedRoots = [];
    const motionObjectBases = new Map();
    let flowMarker = null;
    const flowMaterials = [];
    const flowLines = [];
    const filteredMeshMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let activeHighlightIds = [];
    let cameraTween = null;
    let activeVisibilityFrame;

    const setOpacity = (layerId, opacity) => {
      const value = clamp(opacity, 0, 1);
      const base = layerMaterials.get(layerId);
      if (base) {
        base.opacity = value;
        base.transparent = value < 0.999;
        base.depthWrite = value >= 0.999;
      }
      for (const [key, material] of highlightMaterials) {
        if (material.userData.layer === layerId) {
          material.opacity = value;
          material.transparent = value < 0.999;
          material.depthWrite = value >= 0.999;
        }
      }
      const root = layerRoots.get(layerId);
      if (root) root.visible = value > 0.012;
    };

    const applyMotion = (chapter, ease) => {
      for (const motion of lesson.motions || []) {
        const range = chapter.motion?.[motion.id] || [0, 0];
        const angle = THREE.MathUtils.lerp(range[0], range[1], ease);
        const pivot = new THREE.Vector3(...motion.pivot);
        const rotation = new THREE.Matrix4().makeRotationFromQuaternion(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...motion.axis).normalize(), angle),
        );
        const transform = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z)
          .multiply(rotation)
          .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
        for (const id of motion.structureIds) {
          for (const object of objectsById.get(id) || []) {
            const base = motionObjectBases.get(object);
            if (!base) continue;
            const local = base.parentInverse.clone().multiply(transform.clone().multiply(base.world));
            local.decompose(object.position, object.quaternion, object.scale);
            object.updateMatrix();
          }
        }
      }
    };

    const applyFlow = (chapter, phase) => {
      if (!flowMarker || !lesson.flowRoute || !Number.isInteger(chapter.flowFrom) || !Number.isInteger(chapter.flowTo)) return;
      const from = lesson.flowRoute[chapter.flowFrom];
      const to = lesson.flowRoute[chapter.flowTo];
      if (!from || !to) return;
      flowLines.forEach((line, index) => {
        line.visible = index >= Math.min(chapter.flowFrom, chapter.flowTo)
          && index < Math.max(chapter.flowFrom, chapter.flowTo);
      });
      flowMarker.position.lerpVectors(new THREE.Vector3(...from.position), new THREE.Vector3(...to.position), phase);
      const color = new THREE.Color(from.oxygenation === "high" ? "#ef6a83" : "#58b7e8");
      color.lerp(new THREE.Color(to.oxygenation === "high" ? "#ef6a83" : "#58b7e8"), phase);
      flowMarker.material.color.copy(color);
      flowMarker.material.emissive.copy(color).multiplyScalar(0.32);
    };

    const setHighlights = (ids) => {
      for (const id of activeHighlightIds) {
        for (const object of objectsById.get(id) || [])
          object.material = layerMaterials.get(object.userData.layer);
      }
      activeHighlightIds = [...new Set(ids)];
      for (const id of activeHighlightIds) {
        const objects = objectsById.get(id) || [];
        for (const object of objects) {
          let material = highlightMaterials.get(id);
          if (!material) {
            material = layerMaterials.get(object.userData.layer).clone();
            material.color.lerp(new THREE.Color("#c5a6e8"), 0.58);
            material.emissive.set("#6b42b5");
            material.emissiveIntensity = 0.18;
            material.userData.layer = object.userData.layer;
            highlightMaterials.set(id, material);
          }
          object.material = material;
        }
      }
    };

    const makeMaterial = (layerId) => {
      if (layerMaterials.has(layerId)) return layerMaterials.get(layerId);
      const material = materialForLayer(layerId);
      layerMaterials.set(layerId, material);
      return material;
    };

    const registerMesh = (layerId, object, sourceId = null, structureName = object.name) => {
      const structureId = sourceId
        ? `BodyParts3D:${layerId}:${sourceId}`
        : `${layerId}:${structureName}`;
      object.userData.layer = layerId;
      object.userData.structureId = structureId;
      object.userData.sourceId = sourceId;
      object.material = makeMaterial(layerId);
      object.castShadow = false;
      object.receiveShadow = false;
      if (!objectsById.has(structureId)) objectsById.set(structureId, []);
      objectsById.get(structureId).push(object);
    };

    const loadGltf = async (asset, loader) => {
      const gltf = await loader.loadAsync(asset.src);
      if (disposed) {
        gltf.scene.traverse((object) => {
          if (object.isMesh) {
            object.geometry.dispose();
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
          }
        });
        return;
      }
      const accepted = asset.structureNames ? new Set(asset.structureNames) : null;
      const sourceMaterials = new Set();
      const sourceTextures = new Set();
      gltf.scene.traverse((object) => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!material) continue;
          sourceMaterials.add(material);
          for (const value of Object.values(material))
            if (value?.isTexture) sourceTextures.add(value);
        }
        const ownName = gltfStructureName(object, gltf);
        const structureName = accepted
          ? (accepted.has(ownName) ? ownName : null)
          : ownName;
        if (accepted && !structureName) {
          // Keep parent transforms active so an excluded anatomical mesh does
          // not hide an accepted descendant in the source glTF hierarchy.
          object.material = filteredMeshMaterial;
          return;
        }
        registerMesh(asset.id, object, null, structureName);
      });
      for (const texture of sourceTextures) texture.dispose();
      for (const material of sourceMaterials) material.dispose();
      layerRoots.set(asset.id, gltf.scene);
      loadedRoots.push(gltf.scene);
      scene.add(gltf.scene);
    };

    const loadBodyParts = async (asset) => {
      const [metadataResponse, bufferResponse] = await Promise.all([
        fetch(`${asset.src}.json`),
        fetch(`${asset.src}.bin`),
      ]);
      if (!metadataResponse.ok || !bufferResponse.ok)
        throw new Error(`Could not load ${asset.label}`);
      const [metadata, buffer] = await Promise.all([
        metadataResponse.json(),
        bufferResponse.arrayBuffer(),
      ]);
      const allowed = asset.sourceIds ? new Set(asset.sourceIds) : null;
      const root = new THREE.Group();
      root.name = asset.label;
      for (const part of metadata.parts) {
        if (allowed && !allowed.has(String(part.sourceId))) continue;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(
          new Float32Array(buffer, part.positions[0], part.positions[1] / 4), 3,
        ));
        geometry.setIndex(new THREE.BufferAttribute(
          new Uint32Array(buffer, part.indices[0], part.indices[1] / 4), 1,
        ));
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, makeMaterial(asset.id));
        mesh.name = part.name;
        mesh.userData.sourceId = String(part.sourceId);
        root.add(mesh);
        registerMesh(asset.id, mesh, String(part.sourceId));
      }
      layerRoots.set(asset.id, root);
      loadedRoots.push(root);
      scene.add(root);
    };

    const cameraFor = (from, to, progress, immediate) => {
      const start = from || to;
      const end = to || from;
      const t = reducedRef.current || immediate ? clamp(progress, 0, 1) : smooth(progress);
      return {
        position: new THREE.Vector3(...start.position).lerp(new THREE.Vector3(...end.position), t),
        target: new THREE.Vector3(...start.target).lerp(new THREE.Vector3(...end.target), t),
      };
    };

    const applyTime = (seconds, immediate = false) => {
      const chapter = chapterAt(lesson, seconds);
      const phase = clamp((seconds - chapter.start) / (chapter.end - chapter.start), 0, 1);
      const visibilityFrame = phase < 0.5 ? chapter.from.visibleIds : chapter.to.visibleIds;
      if (visibilityFrame !== activeVisibilityFrame) {
        const visibleIds = visibilityFrame ? new Set(visibilityFrame) : null;
        for (const [id, objects] of objectsById)
          for (const object of objects) object.visible = !visibleIds || visibleIds.has(id);
        activeVisibilityFrame = visibilityFrame;
      }
      const pose = cameraFor(chapter.from.camera, chapter.to.camera, phase, immediate);
      if (!exploreRef.current) {
        camera.position.copy(pose.position);
        controls.target.copy(pose.target);
      }
      const ease = immediate || reducedRef.current ? phase : smooth(phase);
      applyMotion(chapter, ease);
      applyFlow(chapter, phase);
      for (const asset of lesson.assets) {
        const fromValue = chapter.from.layers[asset.id] ?? 0;
        const toValue = chapter.to.layers[asset.id] ?? 0;
        setOpacity(asset.id, THREE.MathUtils.lerp(fromValue, toValue, ease));
      }
      if (!selectedRef.current) setHighlights(chapter.highlightIds);
      controls.update();
    };

    const moveCamera = (position, target) => {
      cameraTween = {
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPosition: new THREE.Vector3(...position),
        toTarget: new THREE.Vector3(...target),
        start: performance.now(),
        duration: reducedRef.current ? 0 : 720,
      };
      if (!cameraTween.duration) {
        camera.position.copy(cameraTween.toPosition);
        controls.target.copy(cameraTween.toTarget);
        cameraTween = null;
      }
      controls.update();
    };

    const annotationLayout = (chapter) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return [];
      const raw = chapter.annotations.map((annotation) => {
        const object = (objectsById.get(annotation.structureId) || []).find((item) =>
          item.visible && layerRoots.get(item.userData.layer)?.visible,
        );
        if (!object) return null;
        const anchor = anchorsById.get(annotation.structureId);
        if (!anchor) return null;
        const point = anchor.clone().project(camera);
        if (point.z < -1 || point.z > 1) return null;
        const x = (point.x + 1) * 0.5 * rect.width;
        const y = (1 - point.y) * 0.5 * rect.height;
        if (x < -10 || x > rect.width + 10 || y < -10 || y > rect.height + 10) return null;
        return { ...annotation, x, y, anchorY: y, labelY: y, side: x < rect.width * 0.5 ? "left" : "right" };
      }).filter(Boolean).sort((a, b) => a.y - b.y);
      const labelHeight = 38;
      const gap = 43;
      const maxY = rect.height - labelHeight - 8;
      const minY = 8;
      for (let i = 1; i < raw.length; i += 1) {
        if (raw[i].side === raw[i - 1].side && raw[i].labelY < raw[i - 1].labelY + gap)
          raw[i].labelY = raw[i - 1].labelY + gap;
      }
      for (let i = raw.length - 1; i >= 0; i -= 1) {
        raw[i].labelY = clamp(raw[i].labelY, minY, maxY);
        if (i < raw.length - 1 && raw[i].side === raw[i + 1].side && raw[i].labelY > raw[i + 1].labelY - gap)
          raw[i].labelY = clamp(raw[i + 1].labelY - gap, minY, maxY);
      }
      return raw.map((item) => {
        const labelOnLeft = item.side === "right";
        const labelX = labelOnLeft ? 8 : rect.width - 152;
        return {
          ...item,
          anchorX: item.x,
          anchorY: item.anchorY,
          labelX,
          lineX: labelOnLeft ? labelX + Math.min(136, rect.width * 0.37) : labelX,
        };
      });
    };

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowEnd,
        alpha: true,
        powerPreference: lowEnd ? "low-power" : "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.14;
      renderer.setSize(host.clientWidth, host.clientHeight);
      host.appendChild(renderer.domElement);
      if (!lowEnd) {
        try {
          pmrem = new THREE.PMREMGenerator(renderer);
          const room = new RoomEnvironment();
          environment = pmrem.fromScene(room, 0.04);
          scene.environment = environment.texture;
          scene.environmentIntensity = 0.34;
          room.dispose();
          pmrem.dispose();
          pmrem = null;
        } catch {
          pmrem?.dispose();
          pmrem = null;
        }
      }
      scene.add(new THREE.HemisphereLight(0xf3edff, 0x382943, 1.7));
      const key = new THREE.DirectionalLight(0xfff1e4, 3.3);
      key.position.set(-3, 3.2, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xb8c2ff, 1.8);
      fill.position.set(3, 1.2, -3);
      scene.add(fill);
      const rim = new THREE.PointLight(0x8e72ff, 15, 5);
      rim.position.set(1.4, 1.8, -0.1);
      scene.add(rim);
      if (lesson.flowRoute?.length > 1) {
        for (let index = 1; index < lesson.flowRoute.length; index += 1) {
          const from = lesson.flowRoute[index - 1];
          const to = lesson.flowRoute[index];
          const oxygenated = from.oxygenation === "high" && to.oxygenation === "high";
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...from.position), new THREE.Vector3(...to.position),
          ]);
          const material = new THREE.LineBasicMaterial({ color: oxygenated ? "#ef6a83" : "#58b7e8", transparent: true, opacity: 0.44, depthWrite: false });
          const line = new THREE.Line(geometry, material);
          line.visible = false;
          scene.add(line);
          flowLines.push(line);
          flowMaterials.push(material);
        }
        flowMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.009, lowEnd ? 10 : 16, lowEnd ? 8 : 12),
          new THREE.MeshStandardMaterial({ color: "#58b7e8", emissive: "#245070", emissiveIntensity: 0.65, roughness: 0.28, metalness: 0.02 }),
        );
        flowMarker.name = "Illustrative blood-flow marker";
        flowMarker.renderOrder = 4;
        scene.add(flowMarker);
      }
      camera.position.set(...lesson.startState.camera.position);
      camera.lookAt(...lesson.startState.camera.target);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(...lesson.startState.camera.target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enablePan = true;
      controls.enabled = exploreRef.current;
      controls.minDistance = lesson.mode === "structure-focus" ? 0.18 : 1.7;
      controls.maxDistance = lesson.mode === "structure-focus" ? 1.65 : 5.8;
      controls.minPolarAngle = 0.18;
      controls.maxPolarAngle = Math.PI - 0.18;
      draco = new DRACOLoader();
      draco.setDecoderPath("/atlas/draco/");
      draco.setDecoderConfig({ type: lowEnd ? "js" : "wasm" });
      draco.setWorkerLimit(lowEnd ? 1 : 2);
      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);
      const resize = () => {
        if (!renderer || disposed) return;
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();
      intersectionObserver = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      }, { threshold: 0.01 });
      intersectionObserver.observe(host);
      const media = matchMedia("(prefers-reduced-motion: reduce)");
      const onMotion = () => {
        reducedRef.current = media.matches || document.documentElement.dataset.calm === "true";
        setReducedMotion(reducedRef.current);
      };
      media.addEventListener("change", onMotion);
      const onContextLost = (event) => {
        event.preventDefault();
        cancelAnimationFrame(raf);
        setLoadError("The 3D context was interrupted. Reload this lesson to restore the scene.");
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
      let pointerDown = null;
      const onPointerDown = (event) => { pointerDown = [event.clientX, event.clientY]; };
      const onPointerUp = (event) => {
        if (!pointerDown || Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) > 6) {
          pointerDown = null;
          return;
        }
        pointerDown = null;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const candidates = [...objectsById.values()].flat().filter((object) => object.visible && layerRoots.get(object.userData.layer)?.visible);
        const hit = raycaster.intersectObjects(candidates, false)[0]?.object;
        if (hit?.userData.structureId) {
          selectedRef.current = hit.userData.structureId;
          setSelectedStructure(hit.userData.structureId);
          setHighlights([hit.userData.structureId]);
        }
      };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointerup", onPointerUp);

      setLoadError("");
      setLoadProgress(0);
      setLoadLabel(`Loading ${lesson.assets.length} lesson asset groups`);
      let loaded = 0;
      const updateProgress = (asset) => {
        loaded += 1;
        setLoadProgress(Math.round((loaded / lesson.assets.length) * 100));
        setLoadLabel(`${asset.label} ready · ${loaded} of ${lesson.assets.length}`);
      };
      const loadAssets = async () => {
        for (const asset of lesson.assets) {
          if (disposed) return;
          if (asset.type === "gltf") await loadGltf(asset, loader);
          else if (asset.type === "bodyparts3d") await loadBodyParts(asset);
          else throw new Error(`Unsupported lesson asset type: ${asset.type}`);
          updateProgress(asset);
        }
        if (disposed) return;
        scene.updateMatrixWorld(true);
        for (const motion of lesson.motions || []) {
          for (const id of motion.structureIds) {
            for (const object of objectsById.get(id) || []) {
              object.updateWorldMatrix(true, false);
              const parent = object.parent;
              parent?.updateWorldMatrix(true, false);
              motionObjectBases.set(object, {
                world: object.matrixWorld.clone(),
                parentInverse: parent ? parent.matrixWorld.clone().invert() : new THREE.Matrix4(),
              });
            }
          }
        }
        for (const [id, objects] of objectsById) {
          const object = objects[0];
          const bounds = new THREE.Box3().setFromObject(object);
          if (!bounds.isEmpty()) anchorsById.set(id, bounds.getCenter(new THREE.Vector3()));
        }
        for (const asset of lesson.assets) setOpacity(asset.id, 0);
        engineRef.current = {
          renderer,
          camera,
          controls,
          scene,
          layerRoots,
          layerMaterials,
          objectsById,
          applyTime,
          moveCamera,
          setHighlights,
          annotationLayout,
        };
        if (import.meta.env.DEV) window.__mpAnatomyDebug = () => {
          renderer.render(scene, camera);
          return {
            camera: camera.position.toArray(),
            layers: Object.fromEntries(lesson.assets.map((asset) => [asset.id, {
              rootVisible: layerRoots.get(asset.id)?.visible,
              opacity: layerMaterials.get(asset.id)?.opacity,
              count: [...objectsById.values()].flat().filter((item) => item.userData.layer === asset.id).length,
              visible: [...objectsById.values()].flat().filter((item) => item.userData.layer === asset.id && item.visible).length,
            }])),
            rendered: true,
          };
        };
        applyTime(timeRef.current, true);
        setReady(true);
        setLoadProgress(100);
        setLoadLabel("Scene ready");
        const animate = (now) => {
          raf = requestAnimationFrame(animate);
          if (disposed || !visible || document.hidden) return;
          const delta = last ? Math.min((now - last) / 1000, 0.12) : 0;
          last = now;
          if (playingRef.current && !exploreRef.current) {
            const next = timeRef.current + delta * speedRef.current;
            if (next >= lesson.duration) {
              timeRef.current = lesson.duration;
              playingRef.current = false;
              setPlayingState(false);
              writeProgress(lesson.id, { time: lesson.duration, completed: true, updatedAt: Date.now() });
            } else timeRef.current = next;
            applyTime(timeRef.current);
          }
          if (cameraTween) {
            const progress = clamp((now - cameraTween.start) / Math.max(1, cameraTween.duration), 0, 1);
            const eased = reducedRef.current ? 1 : smooth(progress);
            camera.position.copy(cameraTween.fromPosition).lerp(cameraTween.toPosition, eased);
            controls.target.copy(cameraTween.fromTarget).lerp(cameraTween.toTarget, eased);
            if (progress >= 1) cameraTween = null;
          }
          controls.update();
          renderer.render(scene, camera);
          if (now - lastUi > 90) {
            lastUi = now;
            setCurrentTime(timeRef.current);
            const active = chapterAt(lesson, timeRef.current);
            const nextIndex = lesson.chapters.findIndex((item) => item.id === active.id);
            setChapterIndex((current) => current === nextIndex ? current : nextIndex);
            if (selectedRef.current && !objectsById.has(selectedRef.current)) {
              selectedRef.current = null;
              setSelectedStructure(null);
            }
            if (!exploreRef.current) setAnnotationPositions(annotationLayout(active));
            if (now - lastSave > 1000) {
              lastSave = now;
              writeProgress(lesson.id, { time: timeRef.current, completed: timeRef.current >= lesson.duration, updatedAt: Date.now() });
            }
          }
        };
        raf = requestAnimationFrame(animate);
        return () => {
          media.removeEventListener("change", onMotion);
          renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
        };
      };
      let removeSceneListeners = () => {};
      loadAssets().then((cleanup) => {
        if (typeof cleanup === "function") removeSceneListeners = cleanup;
      }).catch((error) => {
        if (!disposed) setLoadError(error?.message || "Could not prepare this anatomy scene.");
      });

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        removeSceneListeners();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        renderer?.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer?.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer?.domElement.removeEventListener("pointerup", onPointerUp);
        controls.dispose();
        draco?.dispose();
        for (const root of loadedRoots) {
          const geometries = new Set();
          root.traverse((object) => {
            if (object.isMesh && object.geometry && !geometries.has(object.geometry)) {
              geometries.add(object.geometry);
              object.geometry.dispose();
            }
          });
          scene.remove(root);
        }
        for (const material of layerMaterials.values()) material.dispose();
        for (const material of highlightMaterials.values()) material.dispose();
        filteredMeshMaterial.dispose();
        flowLines.forEach((line) => line.geometry.dispose());
        flowMaterials.forEach((material) => material.dispose());
        flowMarker?.geometry.dispose();
        flowMarker?.material.dispose();
        environment?.dispose();
        pmrem?.dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
        engineRef.current = null;
        setReady(false);
      };
    } catch (error) {
      setLoadError(error?.message || "3D rendering is unavailable in this browser.");
      renderer?.dispose();
      renderer?.domElement.remove();
      return undefined;
    }
  }, [lesson]);

  useEffect(() => {
    if (engineRef.current?.controls) engineRef.current.controls.enabled = explore;
    if (explore) engineRef.current?.setHighlights(selectedStructure ? [selectedStructure] : currentChapter.highlightIds);
  }, [explore, selectedStructure, currentChapter]);

  useEffect(() => {
    const onFullscreen = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const startPlay = () => {
    if (currentTime >= lesson.duration) moveToTime(0, { clearSelection: true });
    setExplore(false);
    setPlaying(true);
  };

  const selectChapter = (chapter) => {
    setExplore(false);
    selectedRef.current = null;
    setSelectedStructure(null);
    moveToTime(chapter.start, { pause: true, clearSelection: true });
  };

  const chooseView = (view) => {
    const definition = lesson.cameraViews?.[view];
    if (!definition) return;
    setExplore(true);
    engineRef.current?.moveCamera(definition.position, definition.target);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await stageRef.current?.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {}
  };

  const onKeyDown = (event) => {
    if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)) return;
    if (event.code === "Space") {
      event.preventDefault();
      setPlaying(!playingRef.current);
    } else if (event.key === "ArrowRight") moveToTime(currentTime + 5);
    else if (event.key === "ArrowLeft") moveToTime(currentTime - 5);
    else if (event.key.toLowerCase() === "r") moveToTime(0, { pause: true, clearSelection: true });
    else if (event.key.toLowerCase() === "f") toggleFullscreen();
  };

  const selectedName = selectedObject?.name || selectedStructure?.split(":").at(-1) || "";
  const selectedSource = selectedStructure?.startsWith("BodyParts3D:") ? "BodyParts3D source mesh" : "Named atlas mesh";
  const selectedAnnotation = currentChapter.annotations.find((item) => item.structureId === selectedStructure);
  const subtitleActive = currentTime >= currentChapter.subtitle.start && currentTime <= currentChapter.subtitle.end;

  return (
    <main className={s.page} onKeyDown={onKeyDown}>
      <div className={s.breadcrumbs}><Link to="/anatomy-videos">3D Anatomy Library</Link><span>/</span><span>{lesson.title}</span></div>
      <header className={s.lessonHead}>
        <div>
          <span className={s.eyebrow}>GUIDED ANATOMY / {lesson.system.toUpperCase()}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.subtitle}</p>
        </div>
        <span className={s.durationPill}>{lesson.duration}s · {lesson.chapters.length} chapters</span>
      </header>
      <section className={`${s.objectives} ${s.objectivesDesktop}`} aria-label="Learning objectives">
        <span>LEARNING OBJECTIVES</span>
        {lesson.learningObjectives.map((objective) => <p key={objective}>{objective}</p>)}
      </section>
      <details className={`${s.objectives} ${s.objectivesMobile}`}>
        <summary>Learning objectives</summary>
        {lesson.learningObjectives.map((objective) => <p key={objective}>{objective}</p>)}
      </details>

      <section className={s.playerFrame} aria-label={`${lesson.title} 3D anatomy player`}>
        <div className={s.playerTop}>
          <div className={s.playerIdentity}><span className={s.statusDot} /><span>ANATOMY STUDIO</span><i>/</i><b>{lesson.system.toUpperCase()} ATLAS</b></div>
          <div className={s.modeSwitch} role="group" aria-label="Viewing mode">
            <button type="button" aria-pressed={!explore} onClick={() => setExplore(false)}>Guided</button>
            <button type="button" aria-pressed={explore} onClick={() => setExplore(true)}>Explore</button>
          </div>
        </div>
        <div className={s.stageAndInfo}>
          <div className={s.stageColumn}>
            <div className={s.stage} ref={stageRef}>
              <div className={s.stageHeader}><span>{lesson.system.toUpperCase()} / {lesson.mode === "layer-reveal" ? "LAYER STUDY" : "SOURCE-MESH VIEW"}</span><span>{ready ? "SCENE READY" : loadError ? "SCENE LIMITED" : "PREPARING SCENE"}</span></div>
              <div className={s.canvasHost} ref={hostRef} role="application" aria-label="Interactive 3D anatomy model. Drag to orbit, use a trackpad or pinch to zoom, and select a named structure." tabIndex={0} />
              <svg className={s.annotationLines} aria-hidden="true" viewBox={`0 0 ${Math.max(1, hostRef.current?.clientWidth || 1)} ${Math.max(1, hostRef.current?.clientHeight || 1)}`} preserveAspectRatio="none">
                {annotationPositions.map((annotation) => <g key={annotation.structureId}><line x1={annotation.anchorX} y1={annotation.anchorY} x2={annotation.lineX} y2={annotation.labelY} /><circle cx={annotation.anchorX} cy={annotation.anchorY} r="3.5" /></g>)}
              </svg>
              <div className={s.annotationLayer} aria-label="Current anatomical labels">
                {annotationPositions.map((annotation) => (
                  <button key={annotation.structureId} type="button" className={s.annotation} style={{ left: annotation.labelX, top: annotation.labelY }} onClick={() => { selectedRef.current = annotation.structureId; setSelectedStructure(annotation.structureId); engineRef.current?.setHighlights([annotation.structureId]); }}>
                    <span className={s.annotationPin} /><span>{annotation.label}</span>
                  </button>
                ))}
              </div>
              {!ready && !loadError && <div className={s.loadingOverlay} role="status"><span className={s.loadingOrb} /><strong>{loadLabel}</strong><div className={s.loadBar}><i style={{ width: `${loadProgress}%` }} /></div><small>{loadProgress}%</small></div>}
              {loadError && <div className={s.fallback} role="status"><strong>3D preview unavailable</strong><p>{loadError}</p><p>Chapter captions and source references remain available below.</p><button type="button" onClick={() => window.location.reload()}>Reload lesson</button></div>}
              {ready && <div className={s.stageFoot}><span>DRAG TO ORBIT · PINCH OR SCROLL TO ZOOM</span><button type="button" onClick={toggleFullscreen}>{fullScreen ? "Exit full screen" : "Full screen"}</button></div>}
            </div>
            <div className={s.viewTools} role="group" aria-label="Camera presets">
              {Object.entries(lesson.cameraViews || {}).map(([key, view]) => <button type="button" key={key} onClick={() => chooseView(key)} aria-label={`Camera view: ${view.label}`}>{view.label}</button>)}
              <button type="button" aria-pressed={!explore} onClick={() => setExplore(false)}>Follow timeline</button>
            </div>
          </div>
          <aside className={s.chapterPanel} aria-label="Current lesson chapter">
            <span className={s.chapterKicker}>CHAPTER {String(chapterIndex + 1).padStart(2, "0")} / {String(lesson.chapters.length).padStart(2, "0")}</span>
            <h2>{currentChapter.title}</h2>
            <p className={s.caption} aria-live="polite">{currentChapter.caption}</p>
            <div className={s.subtitleBlock} aria-live="polite"><span>{formatTime(currentChapter.subtitle.start)}–{formatTime(currentChapter.subtitle.end)} · SCRIPT CUE / NO AUDIO TRACK</span><p>{subtitleActive ? currentChapter.subtitle.text : "No timed line at this moment."}</p></div>
            {selectedStructure ? (
              <div className={s.selectedInfo} aria-live="polite"><span>SELECTED STRUCTURE</span><strong>{selectedAnnotation?.label || selectedName}</strong><small>{selectedSource} · {selectedStructure}</small></div>
            ) : <div className={s.selectedInfo}><span>MODEL NOTE</span><small>{lesson.modelNote}</small></div>}
            <details className={s.referenceDetails}><summary>References & model scope</summary><p>{lesson.modelNote}</p>{lesson.references.map((reference) => <a key={reference.href} href={reference.href} target={reference.href.startsWith("http") ? "_blank" : undefined} rel={reference.href.startsWith("http") ? "noreferrer" : undefined}>{reference.label} <ArrowUpRight size={14} /></a>)}</details>
          </aside>
        </div>

        <div className={s.transport}>
          <div className={s.transportButtons}>
            <button type="button" className={s.primaryControl} disabled={!ready} onClick={() => playing ? setPlaying(false) : startPlay()} aria-label={playing ? "Pause lesson" : currentTime >= lesson.duration ? "Replay lesson" : "Play lesson"}>
              {playing ? <Pause size={19} weight="fill" /> : currentTime >= lesson.duration ? <ArrowCounterClockwise size={19} /> : <Play size={19} weight="fill" />}
              {playing ? "Pause" : currentTime >= lesson.duration ? "Replay" : currentTime > 0 ? "Resume" : "Play"}
            </button>
            <button type="button" disabled={!ready} onClick={() => { setPlaying(false); selectedRef.current = null; setSelectedStructure(null); setExplore(false); moveToTime(0, { clearSelection: true }); }}><ArrowCounterClockwise size={17} /> Restart</button>
            <label className={s.speedControl}>Speed<select value={speed} onChange={(event) => { const value = Number(event.target.value); speedRef.current = value; setSpeedState(value); }} aria-label="Playback speed">{SPEEDS.map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
          </div>
          <div className={s.timeReadout}><span>{formatTime(currentTime)}</span><span>/</span><span>{formatTime(lesson.duration)}</span></div>
        </div>
        <div className={s.timelineBlock}>
          <div className={s.timelineTrack}>
            <div className={s.progressTrack}><i style={{ width: `${(currentTime / lesson.duration) * 100}%` }} /></div>
            {lesson.chapters.slice(1).map((chapter) => <span key={chapter.id} className={s.chapterMarker} style={{ left: `${(chapter.start / lesson.duration) * 100}%` }} aria-hidden="true" />)}
            <input type="range" min="0" max={lesson.duration} step="0.05" value={currentTime} disabled={!ready} onChange={(event) => moveToTime(event.target.value)} aria-label="Seek through anatomy lesson" />
          </div>
          <div className={s.chapterList} aria-label="Lesson chapters">
            {lesson.chapters.map((chapter, index) => (
              <button key={chapter.id} type="button" aria-current={index === chapterIndex ? "step" : undefined} onClick={() => selectChapter(chapter)}>
                <span>{String(index + 1).padStart(2, "0")} · {formatTime(chapter.start)}</span><strong>{chapter.title}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>

      {reducedMotion && <p className={s.motionNote}>Reduced motion is on. The scene starts paused and camera transitions are shortened.</p>}
      <section className={s.lessonFooter}>
        <div><span>KEEP LEARNING</span><h2>Ready to test what you saw?</h2><p>The quiz opens in the existing practice flow. Your 3D lesson progress is saved on this device.</p></div>
        <Link to={lesson.knowledgeCheck.href} className={s.quizLink}>{lesson.knowledgeCheck.label} <ArrowUpRight size={17} /></Link>
      </section>
      <div className={s.lessonBack}><Link to="/anatomy-videos"><BookOpenText size={17} /> Back to 3D Anatomy Library</Link><Link to="/anatomy">Open the full anatomy atlas <ArrowUpRight size={15} /></Link></div>
    </main>
  );
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function AnatomyAnimationPlayer() {
  const { lessonId } = useParams();
  const lesson = getAnatomyLesson(lessonId);
  if (!lesson) return <MissingLesson />;
  return <AnatomyAnimationPlayerView key={lesson.id} lesson={lesson} />;
}

function MissingLesson() {
  return <main className={s.missing}><span className={s.eyebrow}>LESSON NOT FOUND</span><h1>Choose a lesson from the library.</h1><Link to="/anatomy-videos">Open 3D Anatomy Library <ArrowUpRight size={16} /></Link></main>;
}
