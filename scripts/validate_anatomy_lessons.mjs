import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { playableAnatomyLessons } from "../shared/anatomy/animationLessons.js";

const atlas = join(process.cwd(), "web/public/atlas");
const gltfNames = new Map();
const bodyPartIds = new Map();

function readGlbNames(layer) {
  if (gltfNames.has(layer)) return gltfNames.get(layer);
  const bytes = readFileSync(join(atlas, `${layer}.glb`));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
  const names = new Set((gltf.nodes || [])
    .filter((node) => node.mesh !== undefined)
    .map((node) => node.name || gltf.meshes?.[node.mesh]?.name)
    .filter(Boolean));
  gltfNames.set(layer, names);
  return names;
}

function readBodyPartIds(layer) {
  if (bodyPartIds.has(layer)) return bodyPartIds.get(layer);
  const json = JSON.parse(readFileSync(join(atlas, `bp-${layer}.json`), "utf8"));
  const ids = new Set(json.parts.map((part) => String(part.sourceId)));
  bodyPartIds.set(layer, ids);
  return ids;
}

function assertStructureExists(lesson, structureId) {
  if (structureId.startsWith("BodyParts3D:")) {
    const [, layer, sourceId] = structureId.split(":");
    const asset = lesson.assets.find((item) => item.id === layer && item.type === "bodyparts3d");
    assert.ok(asset, `${lesson.id}: missing BodyParts3D asset for ${structureId}`);
    assert.ok(readBodyPartIds(layer).has(sourceId), `${lesson.id}: unknown BodyParts3D source ID ${structureId}`);
    if (asset.sourceIds) assert.ok(asset.sourceIds.includes(sourceId), `${lesson.id}: ${structureId} is not selected by the asset filter`);
    return;
  }
  const separator = structureId.indexOf(":");
  assert.ok(separator > 0, `${lesson.id}: malformed structure ID ${structureId}`);
  const layer = structureId.slice(0, separator);
  const name = structureId.slice(separator + 1);
  const asset = lesson.assets.find((item) => item.id === layer && item.type === "gltf");
  assert.ok(asset, `${lesson.id}: missing glTF asset for ${structureId}`);
  assert.ok(readGlbNames(layer).has(name), `${lesson.id}: unknown glTF mesh name ${structureId}`);
  if (asset.structureNames) assert.ok(asset.structureNames.includes(name), `${lesson.id}: ${structureId} is not selected by the asset filter`);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

assert.ok(playableAnatomyLessons.length >= 2, "at least the initial two anatomy lessons are required");
assert.equal(new Set(playableAnatomyLessons.map((lesson) => lesson.id)).size, playableAnatomyLessons.length, "lesson IDs must be unique");
for (const lesson of playableAnatomyLessons) {
  assert.ok(lesson.version && lesson.duration > 0 && lesson.assets.length, `${lesson.id}: missing version, duration or assets`);
  assert.ok(lesson.knowledgeCheck?.href?.startsWith("/mcqs?"), `${lesson.id}: knowledge-check route is required`);
  assert.ok(lesson.references?.length, `${lesson.id}: authoritative references are required`);
  for (const motion of lesson.motions || []) {
    assert.ok(motion.id && motion.axis?.length === 3 && motion.pivot?.length === 3, `${lesson.id}: incomplete procedural motion definition`);
    for (const id of motion.structureIds) assertStructureExists(lesson, id);
  }
  for (const node of lesson.flowRoute || []) {
    assert.ok(node.label && node.position?.length === 3, `${lesson.id}: invalid flow-route waypoint`);
    if (node.structureId) assertStructureExists(lesson, node.structureId);
  }
  assert.deepEqual(stable(lesson.startState), stable(lesson.chapters[0].from), `${lesson.id}: startState does not match first chapter`);
  assert.deepEqual(stable(lesson.endState), stable(lesson.chapters.at(-1).to), `${lesson.id}: endState does not match final chapter`);
  assert.equal(lesson.chapters[0].start, 0, `${lesson.id}: timeline must begin at zero`);
  assert.equal(lesson.chapters.at(-1).end, lesson.duration, `${lesson.id}: timeline must end at duration`);
  for (let index = 0; index < lesson.chapters.length; index += 1) {
    const chapter = lesson.chapters[index];
    assert.ok(chapter.id && chapter.title && chapter.caption && chapter.subtitle?.text && chapter.narration?.text, `${lesson.id}: chapter content is incomplete`);
    assert.ok(chapter.end > chapter.start, `${lesson.id}/${chapter.id}: invalid time range`);
    if (index > 0) assert.equal(lesson.chapters[index - 1].end, chapter.start, `${lesson.id}: timeline gap before ${chapter.id}`);
    assert.ok(chapter.subtitle.start >= chapter.start && chapter.subtitle.end <= chapter.end && chapter.subtitle.end > chapter.subtitle.start, `${lesson.id}/${chapter.id}: invalid subtitle timing`);
    assert.ok(chapter.narration.start >= chapter.start && chapter.narration.end <= chapter.end && chapter.narration.end > chapter.narration.start, `${lesson.id}/${chapter.id}: invalid narration timing`);
    for (const state of [chapter.from, chapter.to]) {
      for (const opacity of Object.values(state.layers)) assert.ok(opacity >= 0 && opacity <= 1, `${lesson.id}/${chapter.id}: layer opacity outside 0..1`);
      for (const vector of [state.camera.position, state.camera.target]) assert.equal(vector.length, 3, `${lesson.id}/${chapter.id}: camera vector must be 3D`);
      for (const id of state.visibleIds || []) assertStructureExists(lesson, id);
    }
    for (const id of chapter.highlightIds) assertStructureExists(lesson, id);
    for (const annotation of chapter.annotations) assertStructureExists(lesson, annotation.structureId);
    if (chapter.motion) for (const [id, range] of Object.entries(chapter.motion)) {
      assert.ok(lesson.motions?.some((motion) => motion.id === id), `${lesson.id}/${chapter.id}: unknown motion ${id}`);
      assert.ok(range.length === 2 && range.every(Number.isFinite), `${lesson.id}/${chapter.id}: invalid motion range`);
    }
    if (chapter.flowFrom !== undefined || chapter.flowTo !== undefined) {
      assert.ok(Number.isInteger(chapter.flowFrom) && Number.isInteger(chapter.flowTo), `${lesson.id}/${chapter.id}: flow segment needs integer endpoints`);
      assert.ok(lesson.flowRoute?.[chapter.flowFrom] && lesson.flowRoute?.[chapter.flowTo], `${lesson.id}/${chapter.id}: flow segment is outside route`);
    }
  }
  console.log(`${lesson.id}: ${lesson.chapters.length} chapters, ${lesson.assets.length} asset groups, ${lesson.duration}s; structure references verified`);
}
