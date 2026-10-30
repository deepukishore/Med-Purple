import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";

const atlas = join(process.cwd(), "web/public/atlas");
const glbNames = ["skeletal", "muscular", "joints", "cardiovascular", "lymphatic"];
const keywords = /heart|aorta|pulmonary|atri|ventric|valve|lung|liver|kidney|stomach|spleen|bladder/i;

function parseGlb(name) {
  const path = join(atlas, `${name}.glb`);
  const bytes = readFileSync(path);
  assert.equal(bytes.toString("ascii", 0, 4), "glTF", `${name} GLB header`);
  assert.equal(bytes.readUInt32LE(4), 2, `${name} GLB version`);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, `${name} JSON chunk`);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
  const objects = (gltf.nodes || []).map((node) => {
    const object = new THREE.Object3D();
    object.name = node.name || "";
    if (node.matrix) {
      object.matrix.fromArray(node.matrix);
      object.matrixAutoUpdate = false;
    } else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    return object;
  });
  (gltf.nodes || []).forEach((node, index) =>
    (node.children || []).forEach((child) => objects[index].add(objects[child])),
  );
  const sceneIndex = gltf.scene ?? 0;
  const sceneDef = gltf.scenes?.[sceneIndex];
  const root = new THREE.Group();
  (sceneDef?.nodes || objects.map((_, i) => i).filter((i) =>
    !(gltf.nodes || []).some((node) => (node.children || []).includes(i)),
  )).forEach((index) => root.add(objects[index]));
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  let meshNodes = 0;
  const namedMeshes = [];
  const structureBounds = [];
  for (const [nodeIndex, node] of (gltf.nodes || []).entries()) {
    if (node.mesh === undefined) continue;
    meshNodes += 1;
    const label = node.name || gltf.meshes?.[node.mesh]?.name || `mesh-${node.mesh}`;
    namedMeshes.push(label);
    const object = objects[nodeIndex];
    const nodeBounds = new THREE.Box3();
    for (const primitive of gltf.meshes[node.mesh]?.primitives || []) {
      const accessor = gltf.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (const x of [accessor.min[0], accessor.max[0]])
        for (const y of [accessor.min[1], accessor.max[1]])
          for (const z of [accessor.min[2], accessor.max[2]])
            {
              const point = new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld);
              bounds.expandByPoint(point);
              nodeBounds.expandByPoint(point);
            }
    }
    if (/(atrium|ventricle|valve|pulmonary trunk|ascending aorta|thoracic aorta|mitral|tricuspid|vena cava)/i.test(label) && !nodeBounds.isEmpty())
      structureBounds.push({
        name: label,
        min: nodeBounds.min.toArray().map((n) => Number(n.toFixed(4))),
        max: nodeBounds.max.toArray().map((n) => Number(n.toFixed(4))),
      });
  }
  const distinct = [...new Set(namedMeshes)].sort((a, b) => a.localeCompare(b));
  return {
    file: `${name}.glb`,
    bytes: statSync(path).size,
    meshNodes,
    distinctMeshNames: distinct.length,
    nodeCount: gltf.nodes?.length || 0,
    materialCount: gltf.materials?.length || 0,
    materialGroups: (gltf.materials || []).map((material, index) => ({
      index,
      name: material.name || `material-${index}`,
      alphaMode: material.alphaMode || "OPAQUE",
      baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
    })),
    rootNodes: (sceneDef?.nodes || []).map((index) => ({
      name: gltf.nodes?.[index]?.name || `node-${index}`,
      translation: gltf.nodes?.[index]?.translation || [0, 0, 0],
      scale: gltf.nodes?.[index]?.scale || [1, 1, 1],
    })),
    animationClips: (gltf.animations || []).map((clip) => ({
      name: clip.name || "(unnamed)",
      channels: clip.channels?.length || 0,
      targets: [...new Set((clip.channels || []).map((channel) => {
        const target = channel.target || {};
        return `${gltf.nodes?.[target.node]?.name || `node-${target.node}`}.${target.path}`;
      }))],
    })),
    skins: (gltf.skins || []).map((skin) => ({ name: skin.name || "(unnamed)", joints: skin.joints?.length || 0 })),
    bounds: bounds.isEmpty() ? null : {
      min: bounds.min.toArray().map((n) => Number(n.toFixed(4))),
      max: bounds.max.toArray().map((n) => Number(n.toFixed(4))),
      size: bounds.getSize(new THREE.Vector3()).toArray().map((n) => Number(n.toFixed(4))),
    },
    semanticNameSamples: distinct.filter((item) => keywords.test(item)).slice(0, 30),
    structureBounds,
    sampleMeshNames: distinct.slice(0, 8),
  };
}

const glbs = glbNames.map(parseGlb);
const bodyParts = {};
for (const name of ["nervous", "organ", "skin", "fascia"]) {
  const jsonPath = join(atlas, `bp-${name}.json`);
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  const names = data.parts.map((part) => part.name);
  bodyParts[name] = {
    file: `bp-${name}.json + bp-${name}.bin`,
    parts: data.parts.length,
    bytes: statSync(join(atlas, `bp-${name}.json`)).size + statSync(join(atlas, `bp-${name}.bin`)).size,
    semanticNameSamples: names.filter((item) => keywords.test(item)).slice(0, 30),
    samplePartNames: names.slice(0, 8),
  };
}
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), glbs, bodyParts }, null, 2));
