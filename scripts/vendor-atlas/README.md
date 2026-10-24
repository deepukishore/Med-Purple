# Atlas build utilities

Selected data conversion files from https://github.com/CognitionLabSNUC/open-anatomy-atlas, retrieved 14 October 2026. Original MIT licence retained in LICENSE. Files: bp3d.js, zip.js, obj.js, graph.js, classify.js, assemble.js.

Med Purple change to assemble.js: fail instead of deleting an existing output directory. This pipeline is build-time only; it is not bundled as application code. Run `node scripts/build_bodyparts.cjs` from the workspace root after downloading the official BodyParts3D 4.0 regional archive and tables to artifacts/bodyparts3d-source. Processed source is retained in artifacts/bodyparts3d-build; public supplemental layer buffers are written under web/public/atlas.
