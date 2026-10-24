import * as THREE from "three";

const source = "https://openstax.org/books/anatomy-and-physiology-2e/pages/";
const part = (id, name, color, description, clinical_note) => ({
  id,
  name,
  color,
  description,
  clinical_note,
});
export const referenceModels = [
  {
    id: "lungs",
    name: "Lungs & airways",
    system: "Respiratory",
    source_url: source + "22-2-the-lungs",
    structures: [
      part(
        "right-lung",
        "Right lung",
        "#bc7eab",
        "The right lung has three lobes: superior, middle, and inferior.",
        "Compare its three-lobe organisation with the two lobes of the left lung.",
      ),
      part(
        "left-lung",
        "Left lung",
        "#927dc4",
        "The left lung has superior and inferior lobes and accommodates the heart at its cardiac notch.",
        "The two lungs are not mirror images; notice the space on the medial side of the left lung.",
      ),
      part(
        "trachea",
        "Trachea",
        "#69a7ab",
        "The trachea carries air toward the main bronchi and is supported by cartilage rings.",
        "Follow the airway downward to its division into the right and left main bronchi.",
      ),
      part(
        "bronchi",
        "Main bronchi",
        "#d5a56d",
        "The main bronchi enter the lungs and branch into progressively smaller airways.",
        "Gas exchange occurs further along the airway tree in the alveoli, which are not shown here.",
      ),
    ],
  },
  {
    id: "brain",
    name: "Brain regions",
    system: "Nervous",
    source_url: source + "13-2-the-central-nervous-system",
    structures: [
      part(
        "cerebrum",
        "Cerebrum",
        "#c68dba",
        "The cerebrum has two hemispheres and supports functions including perception, voluntary movement, and higher cognition.",
        "The central gap represents the longitudinal fissure. Surface folds are stylised rather than a map of individual gyri.",
      ),
      part(
        "cerebellum",
        "Cerebellum",
        "#a08bcc",
        "The cerebellum lies behind the brainstem and contributes to coordination and balance.",
        "Rotate to the posterior view to see its position below the cerebrum.",
      ),
      part(
        "brainstem",
        "Brainstem",
        "#70acb0",
        "The brainstem comprises the midbrain, pons, and medulla and connects the brain with the spinal cord.",
        "These subdivisions are simplified into one coloured group in this model.",
      ),
    ],
  },
  {
    id: "kidney",
    name: "Kidney cutaway",
    system: "Urinary",
    source_url: source + "25-3-gross-anatomy-of-the-kidney",
    structures: [
      part(
        "cortex",
        "Renal cortex",
        "#c28598",
        "The renal cortex forms the outer region of the kidney, beneath its capsule.",
        "The cutaway exposes the relationship between the outer cortex and deeper medullary pyramids.",
      ),
      part(
        "medulla",
        "Renal medulla",
        "#956eb9",
        "The medulla contains renal pyramids whose tips project toward the collecting system.",
        "The pyramids are shown schematically; individual nephrons and renal columns are not represented.",
      ),
      part(
        "pelvis",
        "Renal pelvis",
        "#e0b278",
        "The renal pelvis collects urine from the calyces and continues into the ureter.",
        "Trace the collecting funnel toward the ureter at the kidney's medial side.",
      ),
      part(
        "ureter",
        "Ureter",
        "#77acaa",
        "The ureter carries urine from the renal pelvis toward the urinary bladder.",
        "Only the proximal portion is shown; the bladder is outside this model.",
      ),
    ],
  },
];

export function createReferenceScene(id) {
  const metadata = referenceModels.find((model) => model.id === id);
  if (!metadata) throw new Error("Unknown anatomy model");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 8.4);
  const group = new THREE.Group();
  scene.add(group, new THREE.HemisphereLight(0xffffff, 0x78638c, 2.5));
  for (const [position, intensity] of [
    [[-4, 6, 7], 3.5],
    [[4, 1, -4], 2],
  ]) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  const meshes = [];
  function mesh(partId, geometry, position = [0, 0, 0], scale = [1, 1, 1]) {
    const info = metadata.structures.find((item) => item.id === partId);
    const object = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: info.color, roughness: 0.46 }),
    );
    object.position.set(...position);
    object.scale.set(...scale);
    object.userData.id = partId;
    group.add(object);
    meshes.push(object);
    return object;
  }
  const sphere = (partId, position, scale) =>
    mesh(partId, new THREE.SphereGeometry(1, 40, 32), position, scale);
  function tube(partId, points, radius) {
    return mesh(
      partId,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          points.map((point) => new THREE.Vector3(...point)),
        ),
        32,
        radius,
        16,
        false,
      ),
    );
  }
  if (id === "lungs") {
    // Anatomical right is on the viewer's left in the initial anterior view.
    for (const [partId, x, lobes] of [
      ["right-lung", -0.88, 3],
      ["left-lung", 0.88, 2],
    ]) {
      for (let index = 0; index < lobes; index++) {
        const height = 2.65 / lobes;
        sphere(
          partId,
          [x, 0.94 - index * height, -0.12],
          [0.66, height * 0.57, 0.62],
        );
      }
    }
    tube(
      "trachea",
      [
        [0, 2, 0.2],
        [0, 1.4, 0.2],
        [0, 0.6, 0.2],
      ],
      0.17,
    );
    for (let i = 0; i < 9; i++) {
      const ring = mesh(
        "trachea",
        new THREE.TorusGeometry(0.177, 0.023, 8, 24),
        [0, 0.7 + i * 0.145, 0.2],
      );
      ring.rotation.x = Math.PI / 2;
    }
    for (const sign of [-1, 1]) {
      tube(
        "bronchi",
        [
          [0, 0.6, 0.2],
          [sign * 0.45, 0.25, 0.26],
          [sign * 0.85, -0.35, 0.32],
        ],
        0.12,
      );
      tube(
        "bronchi",
        [
          [sign * 0.45, 0.25, 0.26],
          [sign * 0.8, 0.55, 0.33],
          [sign * 1.1, 0.7, 0.3],
        ],
        0.075,
      );
    }
  } else if (id === "brain") {
    for (const sign of [-1, 1]) {
      sphere("cerebrum", [sign * 0.67, 0.45, 0], [0.65, 1, 1.25]);
      for (let i = 0; i < 12; i++) {
        const z = -0.99 + i * 0.18;
        const curve = new THREE.CatmullRomCurve3(
          Array.from({ length: 13 }, (_, j) => {
            const angle = (j / 12) * Math.PI;
            const radius = Math.sqrt(Math.max(0.1, 1 - (z * z) / 1.6));
            return new THREE.Vector3(
              sign * (0.67 + Math.cos(angle) * 0.59 * radius),
              0.45 + Math.sin(angle) * 0.94 * radius,
              z,
            );
          }),
        );
        mesh("cerebrum", new THREE.TubeGeometry(curve, 24, 0.047, 8, false));
      }
      sphere("cerebellum", [sign * 0.43, -0.65, -0.7], [0.46, 0.43, 0.5]);
    }
    sphere("brainstem", [0, -0.85, -0.2], [0.23, 0.7, 0.25]);
    sphere("brainstem", [0, -0.65, 0.04], [0.32, 0.27, 0.25]);
  } else {
    const outline = new THREE.Shape();
    outline.moveTo(0.55, 1.45);
    outline.bezierCurveTo(-1.8, 2, -1.9, -2, 0.55, -1.45);
    outline.bezierCurveTo(1, -1.15, -0.15, -0.8, -0.12, 0);
    outline.bezierCurveTo(-0.15, 0.8, 1, 1.15, 0.55, 1.45);
    const cortex = mesh(
      "cortex",
      new THREE.ExtrudeGeometry(outline, {
        depth: 0.65,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.12,
        bevelThickness: 0.12,
      }),
      [0.35, 0, -0.55],
    );
    for (let i = 0; i < 5; i++) {
      const angle = -1.25 + i * 0.625;
      const pyramid = mesh("medulla", new THREE.ConeGeometry(0.28, 0.6, 4), [
        -0.2 - Math.cos(angle) * 0.52,
        Math.sin(angle) * 1.05,
        0.25,
      ]);
      pyramid.rotation.z = -Math.PI / 2 - angle;
      tube(
        "pelvis",
        [
          [-0.2 - Math.cos(angle) * 0.25, Math.sin(angle) * 0.78, 0.3],
          [0.15, Math.sin(angle) * 0.3, 0.3],
          [0.42, -0.12, 0.3],
        ],
        0.075,
      );
    }
    sphere("pelvis", [0.4, -0.15, 0.3], [0.24, 0.35, 0.15]);
    tube(
      "ureter",
      [
        [0.43, -0.35, 0.3],
        [0.65, -0.95, 0.2],
        [0.7, -1.9, 0.1],
      ],
      0.1,
    );
  }
  const targets = { x: 0, y: 0, zoom: 8.4 };
  let rotating = false;
  const ray = new THREE.Raycaster();
  return {
    scene,
    camera,
    targets,
    frame: () => {
      if (rotating) targets.y += 0.006;
      group.rotation.x += (targets.x - group.rotation.x) * 0.12;
      group.rotation.y += (targets.y - group.rotation.y) * 0.12;
      camera.position.z += (targets.zoom - camera.position.z) * 0.16;
    },
    resize: (w, h) => {
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    },
    rotate: (dx, dy) => {
      targets.y += dx;
      targets.x = THREE.MathUtils.clamp(
        targets.x + dy,
        -Math.PI / 2,
        Math.PI / 2,
      );
    },
    zoom: (delta) => {
      targets.zoom = THREE.MathUtils.clamp(targets.zoom + delta, 4.5, 13);
    },
    reset: () => {
      targets.x = 0;
      targets.y = 0;
      targets.zoom = 8.4;
    },
    autoRotate: (value) => {
      rotating = value;
    },
    select: (selected) => {
      for (const object of meshes) {
        object.material.emissive.set(
          selected === object.userData.id ? 0x412543 : 0,
        );
        object.material.emissiveIntensity = 0.25;
      }
    },
    pick: (x, y) => {
      scene.updateMatrixWorld(true);
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      return ray.intersectObjects(meshes, false)[0]?.object.userData.id;
    },
    explode: () => {},
    vessels: () => {},
    dispose: () => {
      for (const object of meshes) {
        object.geometry.dispose();
        object.material.dispose();
      }
    },
  };
}
