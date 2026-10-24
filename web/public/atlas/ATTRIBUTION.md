# Med Purple anatomical assets

This directory includes only the skeletal, muscular, joints, cardiovascular and lymphatic GLB exports from https://github.com/nqwrc/3d-anatomy (retrieved 14 October 2026). No application code or Wikipedia definitions were copied. Med Purple's viewer is independently implemented.

Required model credits:

- BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan
- Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0

Geometry derives from BodyParts3D and Z-Anatomy. These selected anatomical assets and adaptations retain their upstream attribution and share-alike terms. Model changes in Med Purple: display colours, viewer organisation and selection highlighting; original geometry is unchanged. Source export credits belong to nqwrc/3d-anatomy. The original License.txt, LICENSE and NOTICE are retained unmodified for provenance; their bundle-wide discussion also describes components NOT included here.

Excluded: nervous.glb (inner-ear noncommercial assets and brain assets with unclear notices) and visceral.glb (noncommercial kidney asset). These are not shipped in the site's public assets. Commercial suitability and exact upstream rights should be reviewed before public commercial distribution; no broader permission is asserted here.

Additional layers bp-nervous, bp-organ, bp-skin, and bp-fascia come directly from the official BodyParts3D 4.0 regional archive and structure tables at https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/. These assets are separate from the excluded Z-Anatomy nervous and visceral bundles. Current official terms: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (CC BY 4.0).

Required attribution: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

Adaptations: regional OBJ meshes reoriented to Y-up, rescaled from millimetres to metres, recentered, normals recomputed, classified by structure name/hierarchy and repacked to browser buffers. No mirrored supplemental structures were created. Conversion pipeline: CognitionLabSNUC/open-anatomy-atlas, MIT, retained in scripts/vendor-atlas/LICENSE. Local modifications prevent overwriting existing output and export selected supplemental layers. These source layers contain 107 nervous, 251 organ, 2 skin, and 2 fascia mesh elements. Named source parts may be subdivisions of a larger anatomical structure.

Reference descriptions are fetched on selection from English Wikipedia and attributed per article under Wikipedia's CC BY-SA terms; they are not bundled. Search can return a related article rather than an exact named subdivision, so its article title is displayed.

The atlas is an adult male reference, not exhaustive anatomy or clinical guidance. No microscopic tissue slides are bundled. Original tissue teaching schematics and notes are separate from the gross-anatomy data.

Draco decoder: supplied with the installed Three.js package; upstream Google Draco, Apache License 2.0. See https://github.com/google/draco/blob/main/LICENSE.
