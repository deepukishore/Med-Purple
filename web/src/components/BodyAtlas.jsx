import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import s from "./BodyAtlas.module.css";

const systems = [
  { id: "skeletal", name: "Bones", color: "#e8d9b9" },
  { id: "muscular", name: "Muscles", color: "#bc6575" },
  { id: "joints", name: "Joints & ligaments", color: "#79aeb1" },
  { id: "cardiovascular", name: "Blood vessels", color: "#ca596f" },
  { id: "lymphatic", name: "Lymphatic structures", color: "#82a76e" },
  { id: "nervous", name: "Brain & nerves", color: "#dab363" },
  { id: "organ", name: "Organs & viscera", color: "#bc8ca8" },
  { id: "skin", name: "Skin", color: "#dcc2aa" },
  { id: "fascia", name: "Fascia", color: "#b7b8ce" },
];
function displayName(name) {
  return name
    .replaceAll("_", " ")
    .replace(/\.l$/, " (left)")
    .replace(/\.r$/, " (right)");
}

export default function BodyAtlas() {
  const host = useRef(null),
    engine = useRef(null);
  const [layers, setLayers] = useState({ skeletal: true });
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [isolated, setIsolated] = useState(false);
  const [hidden, setHidden] = useState(new Set());
  const [status, setStatus] = useState({});
  const [failure, setFailure] = useState("");
  const [rotation, setRotation] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [reference, setReference] = useState(null);
  const referenceCache = useRef(new Map());
  const selectRef = useRef(setSelected);
  useEffect(() => {
    const el = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailure(
        "3D rendering is unavailable. Try a browser with WebGL enabled.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6d5a81, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(3, 4, 5);
    scene.add(key);
    const back = new THREE.DirectionalLight(0xb9c3ff, 2);
    back.position.set(-3, 1, -3);
    scene.add(back);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
    camera.position.set(0, 0.9, 3.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;
    controls.minDistance = 0.06;
    controls.maxDistance = 7;
    controls.autoRotateSpeed = 0.8;
    const draco = new DRACOLoader();
    draco.setDecoderPath("/atlas/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    async function loadBodyParts(id) {
      const responses = await Promise.all([
        fetch(`/atlas/bp-${id}.json`),
        fetch(`/atlas/bp-${id}.bin`),
      ]);
      if (responses.some((response) => !response.ok))
        throw new Error("Anatomy layer unavailable");
      const [metadata, buffer] = await Promise.all([
        responses[0].json(),
        responses[1].arrayBuffer(),
      ]);
      const root = new THREE.Group();
      for (const part of metadata.parts) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(
            new Float32Array(buffer, part.positions[0], part.positions[1] / 4),
            3,
          ),
        );
        geometry.setIndex(
          new THREE.BufferAttribute(
            new Uint32Array(buffer, part.indices[0], part.indices[1] / 4),
            1,
          ),
        );
        geometry.computeVertexNormals();
        const object = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial(),
        );
        object.name = part.name;
        object.userData.za_name = part.name;
        object.userData.sourceId = part.sourceId;
        root.add(object);
      }
      return { scene: root };
    }
    const meshes = new Map(),
      roots = new Map(),
      requests = new Map();
    let disposed = false,
      raf;
    const disposeRoot = (root) =>
      root.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            material.dispose();
        }
      });
    const atlas = {
      scene,
      camera,
      controls,
      meshes,
      roots,
      async load(id) {
        if (roots.has(id)) return;
        if (requests.has(id)) return requests.get(id);
        setStatus((previous) => ({ ...previous, [id]: "loading" }));
        const promise = (
          ["nervous", "organ", "skin", "fascia"].includes(id)
            ? loadBodyParts(id)
            : loader.loadAsync(`/atlas/${id}.glb`)
        )
          .then((gltf) => {
            if (disposed) {
              disposeRoot(gltf.scene);
              return;
            }
            const entries = [];
            gltf.scene.traverse((object) => {
              if (!object.isMesh) return;
              const raw = object.userData.za_name || object.name;
              const uid = `${id}:${object.uuid}`;
              object.userData.atlasId = uid;
              object.userData.layer = id;
              const upstream = object.material;
              object.material = new THREE.MeshStandardMaterial({
                color: systems.find((system) => system.id === id).color,
                roughness: 0.65,
                side: THREE.DoubleSide,
              });
              for (const mat of Array.isArray(upstream) ? upstream : [upstream])
                mat.dispose();
              meshes.set(uid, object);
              entries.push({
                id: uid,
                name: displayName(raw),
                raw,
                system: id,
                source: object.userData.sourceId
                  ? "BodyParts3D"
                  : "Z-Anatomy / BodyParts3D",
              });
            });
            roots.set(id, gltf.scene);
            scene.add(gltf.scene);
            setCatalog((previous) =>
              [...previous, ...entries].sort((a, b) =>
                a.name.localeCompare(b.name),
              ),
            );
            setStatus((previous) => ({ ...previous, [id]: "ready" }));
          })
          .catch(() => {
            if (!disposed)
              setStatus((previous) => ({ ...previous, [id]: "error" }));
            requests.delete(id);
          });
        requests.set(id, promise);
        return promise;
      },
      reset() {
        camera.position.set(0, 0.9, 3.6);
        controls.target.set(0, 0.9, 0);
        controls.update();
      },
      focus(id) {
        const object = meshes.get(id);
        if (!object) return;
        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        const direction = camera.position
          .clone()
          .sub(controls.target)
          .normalize();
        controls.target.copy(center);
        camera.position
          .copy(center)
          .addScaledVector(direction, Math.max(size * 2, 0.14));
        controls.update();
      },
      view(angle) {
        const distance = camera.position.distanceTo(controls.target);
        camera.position
          .copy(controls.target)
          .add(
            new THREE.Vector3(
              Math.sin(angle) * distance,
              0,
              Math.cos(angle) * distance,
            ),
          );
        controls.update();
      },
    };
    engine.current = atlas;
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / Math.max(el.clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let start = null;
    const down = (event) => {
      start = [event.clientX, event.clientY];
    };
    const up = (event) => {
      if (
        !start ||
        Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 5
      )
        return;
      start = null;
      const rect = el.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(
        [...meshes.values()].filter(
          (object) =>
            object.visible && roots.get(object.userData.layer)?.visible,
        ),
        false,
      )[0];
      if (hit) selectRef.current(hit.object.userData.atlasId);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    atlas.load("skeletal");
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      draco.dispose();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      roots.forEach(disposeRoot);
      renderer.dispose();
      renderer.domElement.remove();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    for (const system of systems)
      if (layers[system.id]) engine.current?.load(system.id);
  }, [layers]);
  useEffect(() => {
    const atlas = engine.current;
    if (!atlas) return;
    for (const [id, root] of atlas.roots) root.visible = !!layers[id];
    for (const [id, object] of atlas.meshes) {
      object.visible = !hidden.has(id) && (!isolated || id === selected);
      object.material.emissive.set(id === selected ? 0x633b80 : 0);
      object.material.emissiveIntensity = id === selected ? 0.5 : 0;
      object.material.opacity = id === selected ? 1 : opacity;
      object.material.transparent = opacity < 1 && id !== selected;
      object.material.depthWrite = !object.material.transparent;
    }
  }, [layers, selected, isolated, hidden, opacity, catalog]);
  useEffect(() => {
    if (engine.current) engine.current.controls.autoRotate = rotation;
  }, [rotation]);
  const item = catalog.find((entry) => entry.id === selected);
  useEffect(() => {
    setReference(null);
    if (!item) return;
    const term = item.name.replace(/ \((left|right)\)$/, "");
    if (referenceCache.current.has(term)) {
      setReference(referenceCache.current.get(term));
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: term,
      gsrlimit: "1",
      prop: "extracts|info",
      exintro: "1",
      explaintext: "1",
      exsentences: "3",
      inprop: "url",
    });
    setReference({ loading: true });
    fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Reference unavailable");
        return response.json();
      })
      .then((data) => {
        const page = Object.values(data.query?.pages || {})[0];
        const value = page?.extract
          ? { title: page.title, text: page.extract, url: page.fullurl }
          : { unavailable: true };
        referenceCache.current.set(term, value);
        setReference(value);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setReference({ unavailable: true });
      });
    return () => controller.abort();
  }, [item]);
  const filtered = catalog.filter(
    (entry) =>
      layers[entry.system] &&
      entry.name.toLowerCase().includes(search.toLowerCase().trim()),
  );
  return (
    <div className={s.atlas}>
      <header className={s.heading}>
        <div>
          <span>HUMAN BODY ATLAS</span>
          <h1>Explore anatomy, layer by layer.</h1>
          <p>
            Rotate the body, reveal deeper structures, and select a part to
            inspect it.
          </p>
        </div>
        <strong>{catalog.length.toLocaleString()} loaded structures</strong>
      </header>
      <div className={s.layout}>
        <aside className={s.layers}>
          <h2>Body layers</h2>
          {systems.map((system) => (
            <div className={s.layer} key={system.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!!layers[system.id]}
                  onChange={(event) => {
                    setLayers((previous) => ({
                      ...previous,
                      [system.id]: event.target.checked,
                    }));
                    setIsolated(false);
                  }}
                />
                <span style={{ background: system.color }} />
                {system.name}
              </label>
              {status[system.id] === "loading" && (
                <small role="status">Loading detailed model…</small>
              )}
              {status[system.id] === "error" && (
                <button onClick={() => engine.current?.load(system.id)}>
                  Retry loading
                </button>
              )}
            </div>
          ))}
          <label className={s.opacity}>
            Context opacity
            <input
              type="range"
              min="0.15"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </label>
          <p className={s.small}>
            Hide outer layers to see deeper anatomy. Models load only when you
            enable a layer.
          </p>
          <button
            onClick={() => {
              setHidden(new Set());
              setIsolated(false);
              setOpacity(1);
            }}
          >
            Restore hidden structures
          </button>
        </aside>
        <section className={s.stage} aria-label="Whole-body anatomy viewer">
          <div
            ref={host}
            className={s.canvas}
            tabIndex={0}
            role="application"
            aria-label="Human body atlas. Drag to rotate, scroll or pinch to zoom, click a structure to select. Arrow keys rotate; plus and minus zoom."
            onKeyDown={(event) => {
              const controls = engine.current?.controls;
              if (!controls) return;
              const offset = controls.object.position
                .clone()
                .sub(controls.target);
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                offset.applyAxisAngle(
                  new THREE.Vector3(0, 1, 0),
                  event.key === "ArrowLeft" ? -0.15 : 0.15,
                );
              } else if (event.key === "+" || event.key === "-") {
                offset.multiplyScalar(event.key === "+" ? 0.9 : 1.1);
              } else return;
              event.preventDefault();
              controls.object.position.copy(controls.target).add(offset);
              controls.update();
            }}
          />
          {failure && <p role="alert">{failure}</p>}
          {status.skeletal === "loading" && (
            <div className={s.loading} role="status">
              Loading the skeleton…
            </div>
          )}
          <div className={s.toolbar}>
            <button
              aria-pressed={rotation}
              onClick={() => setRotation((value) => !value)}
            >
              {rotation ? "Pause rotation" : "Rotate 360°"}
            </button>
            <button
              onClick={() => {
                setRotation(false);
                engine.current?.reset();
              }}
            >
              Reset view
            </button>
            <button
              onClick={() => {
                setRotation(false);
                engine.current?.view(0);
              }}
            >
              Front
            </button>
            <button
              onClick={() => {
                setRotation(false);
                engine.current?.view(Math.PI);
              }}
            >
              Back
            </button>
            {item && (
              <button onClick={() => engine.current?.focus(selected)}>
                Zoom to selection
              </button>
            )}
          </div>
          <p className={s.hint}>
            Drag to rotate · Scroll / pinch to zoom · Right-drag to pan · Click
            to select
          </p>
        </section>
        <aside className={s.inspector}>
          <h2>Find a structure</h2>
          <input
            className={s.search}
            type="search"
            aria-label="Search anatomy structures"
            placeholder="Try femur, biceps, aorta…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className={s.small}>{filtered.length} matches in enabled layers</p>
          <div className={s.results}>
            {filtered.slice(0, 150).map((entry) => (
              <button
                key={entry.id}
                aria-pressed={selected === entry.id}
                onClick={() => {
                  setSelected(entry.id);
                  setIsolated(false);
                  setHidden((previous) => {
                    const next = new Set(previous);
                    next.delete(entry.id);
                    return next;
                  });
                }}
              >
                {entry.name}
              </button>
            ))}
            {filtered.length > 150 && (
              <p className={s.small}>Search to narrow the list.</p>
            )}
            {!filtered.length && (
              <p className={s.small}>Enable a layer or try another search.</p>
            )}
          </div>
          <div className={s.detail}>
            {item ? (
              <>
                <span>
                  {systems.find((system) => system.id === item.system)?.name}
                </span>
                <h2>{item.name}</h2>
                <p>
                  Named anatomical structure from the {item.source} reference
                  model.
                </p>
                {reference?.loading && (
                  <p role="status">Loading reference details…</p>
                )}
                {reference?.text && (
                  <div className={s.reference}>
                    <h3>Related reference: {reference.title}</h3>
                    <p>{reference.text}</p>
                    <a href={reference.url} target="_blank" rel="noreferrer">
                      Wikipedia contributors · CC BY-SA ↗
                    </a>
                  </div>
                )}
                {reference?.unavailable && (
                  <p>
                    Reference details are unavailable offline. The model and
                    structure list remain available.
                  </p>
                )}
                <div className={s.actions}>
                  <button
                    aria-pressed={isolated}
                    onClick={() => setIsolated((value) => !value)}
                  >
                    {isolated ? "Show context" : "Isolate"}
                  </button>
                  <button
                    onClick={() => {
                      setHidden((previous) => new Set([...previous, selected]));
                      setIsolated(false);
                    }}
                  >
                    Hide
                  </button>
                </div>
                <a
                  href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(item.name.replace(/ \((left|right)\)$/, ""))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Look up this structure ↗
                </a>
              </>
            ) : (
              <>
                <h2>Select a structure</h2>
                <p>
                  Click the body or a name in the list. Use isolate to study a
                  part on its own.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
      <section className={s.scope}>
        <h2>Atlas coverage</h2>
        <p>
          This adult male reference combines detailed body-system layers. It
          does not include female anatomy, microscopic tissue slides, or every
          anatomical variation. The Organ studies tab contains the existing
          simplified organ models; Tissues & histology provides teaching
          diagrams and tissue notes.
        </p>
        <h3>Tissues & histology</h3>
        <p>
          Microscopic tissue study needs dedicated slides and cellular views.
          Explore the four tissue categories in the reference below; they are
          not represented by the whole-body meshes.
        </p>
        <a
          href="https://openstax.org/books/anatomy-and-physiology-2e/pages/4-1-types-of-tissues"
          target="_blank"
          rel="noreferrer"
        >
          Open the tissue reference ↗
        </a>
      </section>
      <footer className={s.credits}>
        <p>
          Additional organ, nervous-system, skin, and fascia layers:
          BodyParts3D, © The Database Center for Life Science licensed under CC
          Attribution 4.0 International. Geometry was simplified upstream,
          reoriented and packed for browser display.
        </p>
        <p>
          BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1
          Japan
          <br />
          Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0
        </p>
        <p>
          Browser model exports:{" "}
          <a
            href="https://github.com/nqwrc/3d-anatomy"
            target="_blank"
            rel="noreferrer"
          >
            nqwrc/3d-anatomy
          </a>
          . Adaptation: layer colours, selection, search and viewer controls.{" "}
          <a href="/atlas/ATTRIBUTION.md" target="_blank">
            Asset credits and scope
          </a>{" "}
          ·{" "}
          <a href="/atlas/License.txt" target="_blank">
            Upstream notice
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
