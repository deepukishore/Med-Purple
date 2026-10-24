const path = require("node:path");
const fs = require("node:fs");
const { buildDataset } = require("./vendor-atlas/bp3d.js");
const root = path.resolve(__dirname, "..");
const source = path.join(root,"artifacts/bodyparts3d-source");
const out = path.join(root,"artifacts/bodyparts3d-build");
(async()=>{
  if(!fs.existsSync(out)) await buildDataset({sources:[path.join(source,"partof.zip")],listDirs:[source],outDir:out,mirror:{categories:[]},onProgress:progress=>{if(["orient","done","write"].includes(progress.phase)) console.log(progress.message);}});
  const index=JSON.parse(fs.readFileSync(path.join(out,"index.json"),"utf8"));
  const binary=fs.readFileSync(path.join(out,"meshes.bin"));
  const positions=new Float32Array(binary.buffer,binary.byteOffset+index.buffers.positions[0],index.buffers.positions[1]/4);
  const allIndices=new Uint32Array(binary.buffer,binary.byteOffset+index.buffers.indices[0],index.buffers.indices[1]/4);
  for(const system of ["nervous","organ","skin","fascia"]){
    let offset=0;const parts=[],buffers=[];
    for(const element of index.elements.filter(item=>item.t===system)){
      const indices=allIndices.subarray(element.o,element.o+element.n);
      let min=Infinity,max=-Infinity;for(const vertex of indices){min=Math.min(min,vertex);max=Math.max(max,vertex);}
      const vertices=positions.slice(min*3,(max+1)*3);
      const localIndices=Uint32Array.from(indices,vertex=>vertex-min);
      const vertexBuffer=Buffer.from(vertices.buffer),indexBuffer=Buffer.from(localIndices.buffer);
      parts.push({name:index.concepts[element.c].name,sourceId:element.k,box:element.b,positions:[offset,vertexBuffer.length],indices:[offset+vertexBuffer.length,indexBuffer.length]});
      buffers.push(vertexBuffer,indexBuffer);offset+=vertexBuffer.length+indexBuffer.length;
    }
    if(!parts.length)continue;
    const dest=path.join(root,"web/public/atlas");
    fs.writeFileSync(path.join(dest,`bp-${system}.json`),JSON.stringify({source:"BodyParts3D 4.0",attribution:index.attribution,license:index.license,parts}));
    fs.writeFileSync(path.join(dest,`bp-${system}.bin`),Buffer.concat(buffers));
    console.log(system,parts.length,"structures",offset,"bytes");
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
