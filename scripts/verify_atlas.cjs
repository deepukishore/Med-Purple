const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.join(__dirname, "../web/public/atlas");
const context = { console, setTimeout, clearTimeout, TextDecoder, TextEncoder };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "draco/draco_decoder.js"), "utf8"), context);
(async () => {
  const draco = await context.DracoDecoderModule({});
  let total = 0;
  for (const name of ["skeletal", "muscular", "joints", "cardiovascular", "lymphatic"]) {
    const buffer = fs.readFileSync(path.join(root, name + ".glb"));
    assert.equal(buffer.toString("ascii", 0, 4), "glTF");
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    const jsonLength = buffer.readUInt32LE(12);
    const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
    const count = json.nodes.filter(node => node.mesh !== undefined).length;
    assert(count > 0);
    assert(json.nodes.filter(node => node.mesh !== undefined).every(node => node.name));
    const primitive = json.meshes[0].primitives[0];
    const compression = primitive.extensions.KHR_draco_mesh_compression;
    const view = json.bufferViews[compression.bufferView];
    const start = 20 + jsonLength + 8 + (view.byteOffset || 0);
    const bytes = buffer.subarray(start, start + view.byteLength);
    const decoderBuffer = new draco.DecoderBuffer();
    decoderBuffer.Init(new Int8Array(bytes), bytes.length);
    const decoder = new draco.Decoder();
    const mesh = new draco.Mesh();
    const result = decoder.DecodeBufferToMesh(decoderBuffer, mesh);
    assert(result.ok(), result.error_msg());
    assert(mesh.num_faces() > 0);
    const attribute = decoder.GetAttributeByUniqueId(mesh, compression.attributes.POSITION);
    const positions = new draco.DracoFloat32Array();
    assert(decoder.GetAttributeFloatForAllPoints(mesh, attribute, positions));
    for (let index = 0; index < positions.size(); index++) assert(Number.isFinite(positions.GetValue(index)));
    draco.destroy(positions);draco.destroy(mesh);draco.destroy(decoder);draco.destroy(decoderBuffer);
    total += count;
    console.log(`${name}: ${count} named mesh nodes; sample geometry decoded successfully`);
  }
  assert(!fs.existsSync(path.join(root, "nervous.glb")));
  assert(!fs.existsSync(path.join(root, "visceral.glb")));
  for (const system of ["nervous", "organ", "skin", "fascia"]) {
    const metadata=JSON.parse(fs.readFileSync(path.join(root,`bp-${system}.json`),"utf8"));
    const buffer=fs.readFileSync(path.join(root,`bp-${system}.bin`));
    assert(metadata.parts.length>0);
    for(const part of metadata.parts){
      assert(part.name);
      assert(part.positions[0]+part.positions[1]<=buffer.length);
      assert(part.indices[0]+part.indices[1]<=buffer.length);
      const positions=new Float32Array(buffer.buffer,buffer.byteOffset+part.positions[0],part.positions[1]/4);
      const indices=new Uint32Array(buffer.buffer,buffer.byteOffset+part.indices[0],part.indices[1]/4);
      assert(positions.every(Number.isFinite));
      assert(indices.length%3===0);
      assert(indices.every(index=>index<positions.length/3));
      assert(part.box.every(Number.isFinite));
    }
    total+=metadata.parts.length;
    console.log(`BodyParts3D ${system}: ${metadata.parts.length} named parts; every geometry validated`);
  }
  console.log(`${total} named mesh parts across nine public layers; restricted Z-Anatomy bundles excluded.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
