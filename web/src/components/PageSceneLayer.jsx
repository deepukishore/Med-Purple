import { useEffect, useRef } from "react";
import * as THREE from "three";
import s from "./PageSceneLayer.module.css";

const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

export default function PageSceneLayer({ pageRef, pathname, calm }) {
  const hostRef = useRef(null);
  const layoutRef = useRef(() => {});
  const motionRef = useRef(() => {});
  const calmRef = useRef(calm);
  calmRef.current = calm;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const lowEnd =
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      navigator.connection?.saveData;
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let reducedMotion = motionQuery.matches;
    let renderer;
    let frame = 0;
    let layoutFrame = 0;
    let fallbackObserver;
    let visible = false;
    let scrollProgress = 0;
    const pointer = { x: 0, y: 0 };
    const colors = getComputedStyle(document.documentElement);
    const token = (name) => colors.getPropertyValue(name).trim();

    const syncLayout = () => {
      const page = pageRef.current;
      const pageBounds = page?.getBoundingClientRect();
      const anchor =
        page?.querySelector("h1") || page?.querySelector("header, section") || page;
      if (!anchor) {
        visible = false;
        host.dataset.hidden = "true";
        return;
      }

      const bounds = anchor.getBoundingClientRect();
      const mainBounds = document.querySelector("main")?.getBoundingClientRect();
      const mainLeft = mainBounds?.left ?? 0;
      const mainRight = mainBounds?.right ?? window.innerWidth;
      const size = Math.min(
        window.innerWidth < 761 ? 154 : 226,
        Math.max(104, (mainRight - mainLeft) * 0.32),
      );
      const left = Math.max(mainLeft + 4, mainRight - size - 16);
      scrollProgress = clamp(
        -pageBounds.top / Math.max(pageBounds.height - window.innerHeight, 1),
        0,
        1,
      );
      const maxTop = Math.max(76, window.innerHeight - size - 18);
      const startTop = clamp(
        bounds.top + bounds.height * 0.5 - size * 0.5,
        76,
        maxTop,
      );
      const top = startTop + (maxTop - startTop) * scrollProgress;
      visible =
        pageBounds.bottom > 76 && pageBounds.top < window.innerHeight - 28;
      host.dataset.hidden = String(!visible);
      host.style.left = `${left}px`;
      host.style.top = `${top}px`;
      host.style.width = `${size}px`;
      host.style.height = `${size}px`;
      host.style.opacity = window.innerWidth < 761 ? "0.3" : "0.58";
      if (renderer && visible) {
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
        if (!reducedMotion && !calmRef.current && !frame) startMotion();
      }
    };
    const requestLayout = () => {
      if (layoutFrame) return;
      layoutFrame = requestAnimationFrame(() => {
        layoutFrame = 0;
        syncLayout();
      });
    };
    layoutRef.current = requestLayout;
    const startFallbackTracking = () => {
      const main = document.querySelector("main");
      if ("MutationObserver" in window && main) {
        fallbackObserver = new MutationObserver(requestLayout);
        fallbackObserver.observe(main, { childList: true, subtree: true });
      }
      window.addEventListener("scroll", requestLayout, { passive: true });
      window.addEventListener("resize", requestLayout);
      requestLayout();
    };
    const stopFallbackTracking = () => {
      fallbackObserver?.disconnect();
      window.removeEventListener("scroll", requestLayout);
      window.removeEventListener("resize", requestLayout);
    };

    if (lowEnd) {
      host.dataset.fallback = "true";
      startFallbackTracking();
      return () => {
        if (layoutFrame) cancelAnimationFrame(layoutFrame);
        stopFallbackTracking();
        delete host.dataset.fallback;
        delete host.dataset.hidden;
        layoutRef.current = () => {};
      };
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0, 5.2);
    const group = new THREE.Group();
    scene.add(group);

    const purple100 = new THREE.Color(token("--purple-100"));
    const purple200 = new THREE.Color(token("--purple-200"));
    const purple400 = new THREE.Color(token("--purple-400"));
    const purple500 = new THREE.Color(token("--purple-500"));
    const purple800 = new THREE.Color(token("--purple-800"));
    const accent = new THREE.Color(token("--accent"));
    const surface = new THREE.Color(token("--surface"));

    scene.add(new THREE.HemisphereLight(purple100, purple800, 1.8));
    const keyLight = new THREE.DirectionalLight(surface, 2.2);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(purple400, 1.2, 8);
    fillLight.position.set(3, -1, 2);
    scene.add(fillLight);

    const heartShape = new THREE.Shape();
    const heartScale = 0.044;
    for (let step = 0; step <= 120; step++) {
      const angle = (step / 120) * Math.PI * 2;
      const x = 16 * Math.sin(angle) ** 3 * heartScale;
      const y =
        (13 * Math.cos(angle) -
          5 * Math.cos(angle * 2) -
          2 * Math.cos(angle * 3) -
          Math.cos(angle * 4)) *
        heartScale;
      if (step === 0) heartShape.moveTo(x, y);
      else heartShape.lineTo(x, y);
    }
    heartShape.closePath();
    const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.065,
      curveSegments: 32,
    });
    heartGeometry.center();
    const core = new THREE.Mesh(
      heartGeometry,
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#bd668c"),
        emissive: purple800,
        emissiveIntensity: 0.16,
        specularColor: purple100,
        specularIntensity: 0.52,
        roughness: 0.26,
        metalness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    );
    group.add(core);

    const coronaryMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#f5c2cf"),
      emissive: new THREE.Color("#e07da1"),
      emissiveIntensity: 0.12,
      roughness: 0.3,
      metalness: 0.02,
    });
    const coronaryPaths = [
      [
        [-0.18, 0.2, 0.17],
        [-0.08, 0.08, 0.2],
        [0.02, -0.04, 0.2],
        [0.18, -0.2, 0.17],
      ],
      [
        [-0.08, 0.08, 0.2],
        [-0.18, 0.02, 0.2],
        [-0.25, -0.08, 0.17],
      ],
      [
        [0.02, -0.04, 0.2],
        [0.04, 0.1, 0.2],
        [0.11, 0.2, 0.17],
      ],
    ];
    coronaryPaths.forEach((points) => {
      const curve = new THREE.CatmullRomCurve3(
        points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      );
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 24, 0.012, 7, false),
          coronaryMaterial,
        ),
      );
    });

    const orbitMaterial = new THREE.MeshStandardMaterial({
      color: purple200,
      emissive: purple400,
      emissiveIntensity: 0.16,
      roughness: 0.26,
      metalness: 0.12,
      transparent: true,
      opacity: 0.64,
    });
    const orbitA = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.018, 8, 96),
      orbitMaterial,
    );
    orbitA.rotation.x = 0.92;
    orbitA.rotation.y = 0.24;
    group.add(orbitA);

    const orbitB = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.012, 8, 96),
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.08,
        roughness: 0.32,
        metalness: 0.04,
        transparent: true,
        opacity: 0.72,
      }),
    );
    orbitB.rotation.x = -0.7;
    orbitB.rotation.y = -0.35;
    group.add(orbitB);

    const portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.044, 12, 112),
      new THREE.MeshPhysicalMaterial({
        color: purple400,
        emissive: accent,
        emissiveIntensity: 0.14,
        specularColor: purple100,
        specularIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    );
    portalRing.rotation.x = 0.08;
    portalRing.rotation.y = -0.12;
    group.add(portalRing);

    const aperture = new THREE.Mesh(
      new THREE.TorusGeometry(0.69, 0.012, 8, 112),
      new THREE.MeshStandardMaterial({
        color: purple100,
        emissive: purple400,
        emissiveIntensity: 0.18,
        roughness: 0.24,
        transparent: true,
        opacity: 0.68,
      }),
    );
    aperture.position.z = 0.34;
    group.add(aperture);

    const particleCount = 72;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = i * 2.399963229728653;
      const radius = 1.22 + ((i * 37) % 47) / 100;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
      particlePositions[i * 3 + 2] = ((i * 29) % 41) / 100 - 0.2;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    const particleField = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: purple200,
        size: 0.022,
        transparent: true,
        opacity: 0.54,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    group.add(particleField);

    const satelliteGeometry = new THREE.SphereGeometry(0.065, 20, 16);
    const satelliteMaterial = new THREE.MeshPhysicalMaterial({
      color: surface,
      emissive: accent,
      emissiveIntensity: 0.24,
      specularColor: purple100,
      specularIntensity: 0.42,
      roughness: 0.2,
      metalness: 0.05,
      clearcoat: 0.9,
    });
    const satellites = Array.from({ length: 3 }, (_, index) => {
      const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      satellite.userData = { orbit: 1.03 + index * 0.17, phase: index * 2.1 };
      group.add(satellite);
      return satellite;
    });

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      host.dataset.fallback = "true";
      startFallbackTracking();
      return () => {
        if (layoutFrame) cancelAnimationFrame(layoutFrame);
        stopFallbackTracking();
        delete host.dataset.fallback;
        delete host.dataset.hidden;
        layoutRef.current = () => {};
        scene.traverse((object) => {
          object.geometry?.dispose();
          object.material?.dispose?.();
        });
      };
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(new THREE.Color(token("--canvas")), 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);

    let lastTime = 0;
    let elapsed = 0;
    const animate = (time) => {
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden || !renderer) {
        cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      const delta = Math.min((time - (lastTime || time)) / 1000, 0.05);
      lastTime = time;
      elapsed += delta;
      group.rotation.x +=
        ((pointer.y * 0.4 + scrollProgress * 0.28) - group.rotation.x) * 0.055;
      group.rotation.y +=
        ((pointer.x * 0.52 + scrollProgress * 1.8) - group.rotation.y) * 0.055;
      const targetScale = 1 + Math.sin(scrollProgress * Math.PI) * 0.12;
      group.scale.setScalar(group.scale.x + (targetScale - group.scale.x) * 0.045);
      orbitA.rotation.z += delta * 0.16;
      orbitB.rotation.z -= delta * 0.1;
      portalRing.rotation.z += delta * (0.11 + scrollProgress * 0.12);
      aperture.rotation.z -= delta * (0.16 + scrollProgress * 0.1);
      portalRing.scale.setScalar(1 + Math.sin(elapsed * 1.25) * 0.018);
      particleField.rotation.y = -elapsed * 0.05 + scrollProgress * 0.32;
      satellites.forEach((satellite, index) => {
        const angle =
          elapsed * (0.34 + index * 0.1) + satellite.userData.phase;
        const radius = satellite.userData.orbit;
        satellite.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.76,
          Math.sin(angle * 1.4) * 0.2,
        );
      });
      group.position.y = Math.sin(elapsed * 0.72) * 0.045;
      renderer.render(scene, camera);
    };
    const startMotion = () => {
      if (reducedMotion || calmRef.current || frame) {
        if (renderer) renderer.render(scene, camera);
        return;
      }
      frame = requestAnimationFrame(animate);
    };
    const stopMotion = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (renderer) renderer.render(scene, camera);
    };
    motionRef.current = (enabled) => (enabled ? startMotion() : stopMotion());
    const motionPreferenceChanged = () => {
      reducedMotion = motionQuery.matches;
      if (reducedMotion || calmRef.current) stopMotion();
      else if (visible) startMotion();
    };
    motionQuery.addEventListener("change", motionPreferenceChanged);

    const pointerMove = (event) => {
      if (
        event.pointerType !== "mouse" ||
        reducedMotion ||
        calmRef.current ||
        document.documentElement.dataset.calm === "true"
      )
        return;
      pointer.x = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      pointer.y = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
    };
    const handleScroll = () => requestLayout();
    const resize = () => {
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      requestLayout();
    };
    const pageObserver = new MutationObserver(requestLayout);
    const main = document.querySelector("main");
    if (main) pageObserver.observe(main, { childList: true, subtree: true });
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleScroll);
    requestLayout();
    startMotion();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (layoutFrame) cancelAnimationFrame(layoutFrame);
      pageObserver.disconnect();
      motionQuery.removeEventListener("change", motionPreferenceChanged);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleScroll);
      layoutRef.current = () => {};
      motionRef.current = () => {};
      renderer?.dispose();
      renderer?.domElement.remove();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material)
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.dispose();
      });
      delete host.dataset.hidden;
    };
  }, [pageRef]);

  useEffect(() => {
    layoutRef.current();
    motionRef.current(!calm);
  }, [pathname, calm]);

  return <div ref={hostRef} className={s.layer} aria-hidden="true" />;
}
