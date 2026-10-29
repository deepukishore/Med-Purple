import * as THREE from "three";
export { referenceModels, createReferenceScene } from "./referenceModels.js";
// Original schematic geometry: no patient data or third-party mesh assets.
// Camera faces the anterior surface; anatomical right is viewer-left.
export function createHeartScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.35, 8.4);
  camera.lookAt(0, 0.35, 0);
  scene.add(new THREE.HemisphereLight(0xf8f4ff, 0x51406f, 2.1));
  const key = new THREE.DirectionalLight(0xfff2e8, 4.1);
  key.position.set(-4, 6, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8bded, 2.2);
  fill.position.set(4, 1, -3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9a82ff, 1.25);
  rim.position.set(1, 4, -5);
  scene.add(rim);
  const heart = new THREE.Group();
  heart.rotation.z = -0.13;
  scene.add(heart);
  const meshes = [];
  const chambers = [];
  const vessels = [];
  function material(color) {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.34,
      metalness: 0.035,
      clearcoat: 0.16,
      clearcoatRoughness: 0.52,
      emissive: 0x000000,
    });
  }
  function chamber(id, color, position, scale, rotation = 0) {
    const geometry = new THREE.SphereGeometry(1, 48, 40);
    const attr = geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      let x = attr.getX(i),
        y = attr.getY(i),
        z = attr.getZ(i);
      const taper = y < 0 ? 1 + 0.24 * y : 1;
      attr.setXYZ(i, x * taper, y, z * taper);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.z = rotation;
    mesh.userData = { id, color, original: position };
    heart.add(mesh);
    meshes.push(mesh);
    chambers.push(mesh);
    return mesh;
  }
  chamber("ra", "#9286C7", [-0.67, 0.66, 0.04], [0.55, 0.55, 0.47], -0.18);
  chamber("la", "#D69097", [0.5, 0.66, -0.27], [0.57, 0.49, 0.46], 0.1);
  chamber("rv", "#7E6AB2", [-0.36, -0.31, 0.24], [0.69, 1.05, 0.56], 0.24);
  chamber("lv", "#BD647B", [0.48, -0.4, 0.0], [0.72, 1.19, 0.65], -0.24);
  function tube(id, color, points, radius) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, radius, 20, false),
      material(color),
    );
    mesh.userData = { id, color };
    heart.add(mesh);
    meshes.push(mesh);
    vessels.push(mesh);
    const end = curve.getPoint(1);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.04, 10, 24),
      material(color),
    );
    ring.position.copy(end);
    ring.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      curve.getTangent(1),
    );
    mesh.add(ring);
  }
  tube(
    "aorta",
    "#C97485",
    [
      [0.27, 0.55, -0.2],
      [0.21, 1.1, -0.17],
      [0.13, 1.63, -0.22],
      [0.67, 1.88, -0.3],
      [1.01, 1.58, -0.5],
      [0.94, 0.3, -0.64],
    ],
    0.22,
  );
  tube(
    "aorta",
    "#C97485",
    [
      [0.38, 1.77, -0.3],
      [0.34, 2.15, -0.29],
    ],
    0.095,
  );
  tube(
    "aorta",
    "#C97485",
    [
      [0.6, 1.83, -0.29],
      [0.62, 2.23, -0.3],
    ],
    0.08,
  );
  tube(
    "aorta",
    "#C97485",
    [
      [0.81, 1.72, -0.35],
      [0.95, 2.08, -0.38],
    ],
    0.085,
  );
  tube(
    "pulmonary",
    "#8B79BA",
    [
      [-0.4, 0.18, 0.6],
      [-0.14, 0.78, 0.7],
      [0.15, 1.15, 0.6],
      [0.81, 1.33, 0.31],
      [1.33, 1.24, 0.08],
    ],
    0.19,
  );
  tube(
    "pulmonary",
    "#8B79BA",
    [
      [0.15, 1.15, 0.6],
      [-0.35, 1.3, 0.23],
      [-1.14, 1.24, -0.1],
    ],
    0.16,
  );
  const targets = { x: 0, y: 0, zoom: 8.4 };
  let selected = null,
    explode = false;
  let rotating = false;
  function select(id) {
    selected = id;
    for (const m of meshes) {
      m.material.color.set(m.userData.color);
      m.material.emissive.set(id === m.userData.id ? 0x3d203e : 0x000000);
      m.material.emissiveIntensity = id === m.userData.id ? 0.3 : 0;
      m.material.transparent = !!id && m.userData.id !== id;
      m.material.opacity = !!id && m.userData.id !== id ? 0.63 : 1;
    }
  }
  function frame(time = 0, reduced = false, delta = 1 / 60) {
    const dt = Math.min(Math.max(delta, 0), 0.05);
    const settle = 1 - Math.exp(-10 * dt);
    if (rotating && !reduced) targets.y += 0.4 * dt;
    heart.rotation.x += (targets.x - heart.rotation.x) * settle;
    heart.rotation.y += (targets.y - heart.rotation.y) * settle;
    camera.position.z +=
      (targets.zoom - camera.position.z) * (1 - Math.exp(-12 * dt));
    for (const m of chambers) {
      const p = m.userData.original;
      const factor = explode ? 1.65 : 1;
      m.position.x += (p[0] * factor - m.position.x) * settle;
      m.position.y += (p[1] * factor - m.position.y) * settle;
    }
    if (!reduced) {
      const s = 1 + Math.sin(time * 0.0017) * 0.012;
      heart.scale.setScalar(s);
    }
    if (selected) {
      const glow = reduced ? 0.32 : 0.28 + Math.sin(time * 0.003) * 0.06;
      for (const mesh of meshes)
        mesh.material.emissiveIntensity =
          mesh.userData.id === selected ? glow : 0;
    }
  }
  function resize(width, height) {
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  function pick(x, y) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    return ray.intersectObjects(meshes, false)[0]?.object.userData.id;
  }
  function dispose() {
    scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const mat of Array.isArray(o.material) ? o.material : [o.material])
          mat.dispose();
      }
    });
  }
  return {
    scene,
    camera,
    heart,
    targets,
    frame,
    resize,
    pick,
    select,
    dispose,
    autoRotate: (value) => {
      rotating = value;
    },
    rotate: (dx, dy) => {
      targets.y += dx;
      targets.x = THREE.MathUtils.clamp(targets.x + dy, -1.1, 1.1);
    },
    pose: (progress) => {
      const t = THREE.MathUtils.clamp(progress, 0, 1);
      targets.y = t * Math.PI * 1.5;
      targets.x = 0.12 + Math.sin(t * Math.PI) * 0.32;
      targets.zoom = 8.4 - t * 1.35;
    },
    zoom: (delta) => {
      targets.zoom = THREE.MathUtils.clamp(targets.zoom + delta, 4.5, 13);
    },
    reset: () => {
      targets.x = 0;
      targets.y = 0;
      targets.zoom = 8.4;
    },
    explode: (value) => {
      explode = value;
    },
    vessels: (visible) => vessels.forEach((m) => (m.visible = visible)),
  };
}
