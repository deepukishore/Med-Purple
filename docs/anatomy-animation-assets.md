# Anatomy animation asset audit

Audit date: 2026-10-30  
Reproduce with `node scripts/audit_anatomy_animation_assets.mjs`.

## Findings

The supplied GLB system files contain named meshes, but **none contains a glTF animation clip or skin/skeletal rig**. They are static anatomical reference meshes. Their node transforms and POSITION accessor bounds use the same metre-scale, Y-up whole-body frame, so the system reveal can layer the supplied systems without translating or inventing geometry. The bounds of the skeletal, muscular and cardiovascular GLBs are closely aligned; the organ layer also uses the matching BodyParts3D frame.

| Asset | Size | Named mesh / part count | Materials | Clips | Skins | Use |
|---|---:|---:|---:|---:|---:|---|
| `skeletal.glb` | 1.86 MB | 277 | 7 | 0 | 0 | Whole-body skeleton reveal |
| `muscular.glb` | 4.50 MB | 669 | 9 | 0 | 0 | Whole-body muscle reveal |
| `joints.glb` | 0.92 MB | 349 | 4 | 0 | 0 | Static joint and ligament reference; no movement rig |
| `cardiovascular.glb` | 5.61 MB | 676 | 7 | 0 | 0 | Whole-body vessels and named cardiac structures |
| `lymphatic.glb` | 0.42 MB | 158 | 3 | 0 | 0 | Available for later layer lessons |
| BodyParts3D `bp-organ` | 8.52 MB | 251 | Generated at load | n/a | n/a | Major organ layer and selected heart cusps/leaflets |
| BodyParts3D `bp-nervous` | 6.49 MB | 107 | Generated at load | n/a | n/a | Available for later lessons |
| BodyParts3D `bp-skin` | 3.77 MB | 2 | Generated at load | n/a | n/a | Available for later lessons |
| BodyParts3D `bp-fascia` | 0.08 MB | 2 | Generated at load | n/a | n/a | Available for later lessons |

The nine shipped layers total **2,491 named mesh parts**. The BodyParts3D datasets are authored from regional mesh buffers and metadata rather than glTF clips. The audit reads GLB headers, node/material/animation/skin tables, and transformed accessor bounds; it does not infer a rig from mesh names.

## Real heart structures used by lesson 2

The cardiovascular GLB has named meshes for pulmonary arteries and all four pulmonary veins in addition to `Right atrium`, `Left atrium`, `Right ventricle`, `Left ventricle`, `Superior vena cava`, both thoracic and abdominal parts of the `Inferior vena cava`, `Pulmonary trunk`, `Bifurcation of pulmonary trunk`, `Ascending aorta`, and `Thoracic aorta`.

It also contains selected leaflets: three pulmonary semilunar leaflets, two right atrioventricular leaflets, and one posterior leaflet of the left atrioventricular valve. BodyParts3D adds three named aortic valve cusps and one anterior mitral leaflet (`FJ2420`, `FJ2426`, `FJ2431`, `FJ2435`). Those exact source identifiers appear in the lesson manifest. The player filters the whole-body cardiovascular GLB to the named heart-region meshes, and loads only those four BodyParts3D parts into the organ group.

These are partial static meshes. Missing valve leaflets and other details remain absent. The heart lesson does not animate valve opening, blood pressure or contraction. The separate circulation lesson uses the supplied named vessels and chambers with a moving route marker; lung and systemic capillary beds are schematic waypoints, and the marker is not simulated flow.

All lesson manifests include timed subtitle and narration-script cues. `narrationTrack` is `null`: no voice recordings are included or played in this release.


## Thoracic regional lesson meshes

The fifth lesson filters these exact supplied structures: `skeletal:Body of sternum`, `skeletal:Manubrium of sternum`, bilateral ribs 1 through 12; cardiovascular right/left atria and ventricles, SVC, thoracic IVC, pulmonary trunk, ascending and thoracic aorta; `muscular:Diaphragm`; and BodyParts3D trachea (`FJ2541`) and esophagus (`FJ2563`). The sequence is an authored layer reveal with a thorax camera, not surgical dissection. Lungs, pleura and intervening tissue are absent and are called out in the player. Anatomical relationships follow the cited OpenStax body-cavity, respiratory and heart references.

## Transform and material notes

The measured whole-body GLB bounds are approximately `x −0.33..0.33 m`, `y 0.00..1.71 m`, and `z −0.17..0.15 m`. The selected heart parts cluster around `y 1.20..1.38 m`; the heart camera presets frame this actual region. The original layer material groups are present, but the atlas viewer currently standardizes display materials for layer readability. The animation scene also uses a restrained per-layer palette; it preserves the source geometry and object transforms.

## Asset provenance

The source and license notices remain in [`web/public/atlas/ATTRIBUTION.md`](../web/public/atlas/ATTRIBUTION.md). The five GLBs are the attributed BodyParts3D/Z-Anatomy exports listed there. The supplemental `bp-*` regional datasets are attributed to BodyParts3D and retain their CC BY 4.0 source identifiers. The original procedural schematic heart in `shared/anatomy/index.js` remains separate from the atlas meshes and is not used to label absent valve anatomy. The elbow demonstration rotates supplied forearm/hand and selected forearm muscle meshes as a rigid group around an approximate hinge; there is no deformation or clinical validation.

## Content references

Lesson content is paraphrased from [OpenStax: Structural Organization of the Human Body](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-2-structural-organization-of-the-human-body), [OpenStax: Heart Anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy), [OpenStax: Cardiac Cycle](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle), and [NCBI Bookshelf: Heart Great Vessels](https://www.ncbi.nlm.nih.gov/books/NBK547680/). Thoracic relationships also draw on [OpenStax: Anatomical Terminology and Cavities](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology) and [OpenStax: Respiratory Structures](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system). The player exposes these references beside each lesson.

## Remaining asset needs

- A rigged elbow model with deforming muscles/tendons would be needed for realistic movement; the current lesson intentionally uses a single rigid hinge.
- Lung and pleural meshes would complete the thorax relationship sequence.
