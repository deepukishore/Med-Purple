# 3D anatomy animation production pass

Validated 2026-10-30 against the local Vite application and the supplied anatomy atlas. Screenshots and recordings are from the running application, not mockups. Desktop browser size was 1440×1000; mobile browser emulation was 390×844.

## Deliverables

- [Versioned lesson manifests](../shared/anatomy/animationLessons.js): whole-body layer reveal, heart anatomy, blood circulation, simplified elbow movement, and thoracic relationships. Timeline cues, camera frames, visibility/highlight IDs, captions, subtitles, start/end state, quiz links and replay states stay separate from the renderer.
- [Playback implementation](../web/src/pages/AnatomyAnimationPlayer.jsx) and [3D anatomy library](../web/src/pages/AnatomyAnimationLibrary.jsx): guided playback and free orbit, named-structure selection, annotations, chapter/timeline scrubbing, camera presets, pause/resume/replay and lesson progress.
- [Asset inventory and provenance notes](anatomy-animation-assets.md), plus the [machine-readable asset audit](../visual-audit/anatomy-animation/asset-audit.json).
- Screen recordings: [body systems MP4](../visual-audit/anatomy-animation/body-systems-playback.mp4) and [heart anatomy MP4](../visual-audit/anatomy-animation/heart-anatomy-playback.mp4).

## Running-app screenshots

### Main application routes

| Route | Desktop | Mobile |
|---|---|---|
| Home | [Full page](../visual-audit/anatomy-animation/home-desktop-page.png) · [3D stage](../visual-audit/anatomy-animation/home-desktop-stage.png) | [Full page](../visual-audit/anatomy-animation/home-mobile-page.png) · [First viewport](../visual-audit/anatomy-animation/home-mobile-viewport.png) · [Touch scene](../visual-audit/anatomy-animation/home-mobile-scene-viewport.png) |
| Anatomy atlas | [Full page](../visual-audit/anatomy-animation/anatomy-desktop-page.png) · [3D atlas](../visual-audit/anatomy-animation/anatomy-desktop-stage.png) | [Full page](../visual-audit/anatomy-animation/anatomy-mobile-page.png) · [Touch scene and layers](../visual-audit/anatomy-animation/anatomy-mobile-scene-viewport.png) |
| 3D lesson library | [Full page](../visual-audit/anatomy-animation/library-desktop-page.png) | [Full page](../visual-audit/anatomy-animation/library-mobile-page.png) · [Lesson cards](../visual-audit/anatomy-animation/library-mobile-lessons-viewport.png) |

### Lesson player

| Lesson | Desktop | Mobile |
|---|---|---|
| Body systems | [Full page](../visual-audit/anatomy-animation/body-systems-desktop-page.png) · [Default stage](../visual-audit/anatomy-animation/body-systems-desktop-stage.png) · [Combined systems chapter](../visual-audit/anatomy-animation/body-systems-desktop-chapter.png) | [Full page](../visual-audit/anatomy-animation/body-systems-mobile-page.png) · [Model stage](../visual-audit/anatomy-animation/body-systems-mobile-stage.png) |
| Heart anatomy | [Full page](../visual-audit/anatomy-animation/heart-anatomy-desktop-page.png) · [Four chambers](../visual-audit/anatomy-animation/heart-anatomy-desktop-chapter.png) | [Full page](../visual-audit/anatomy-animation/heart-anatomy-mobile-page.png) · [Model stage](../visual-audit/anatomy-animation/heart-anatomy-mobile-stage.png) |
| Blood circulation | [Full page](../visual-audit/anatomy-animation/blood-circulation-desktop-page.png) / [Route stage](../visual-audit/anatomy-animation/blood-circulation-desktop-stage.png) / [Pulmonary return](../visual-audit/anatomy-animation/blood-circulation-desktop-chapter.png) | [Full page](../visual-audit/anatomy-animation/blood-circulation-mobile-page.png) / [Route stage](../visual-audit/anatomy-animation/blood-circulation-mobile-stage.png) / [Pulmonary return](../visual-audit/anatomy-animation/blood-circulation-mobile-chapter.png) |
| Elbow flexion | [Full page](../visual-audit/anatomy-animation/muscle-joints-desktop-page.png) / [Model stage](../visual-audit/anatomy-animation/muscle-joints-desktop-stage.png) | [Full page](../visual-audit/anatomy-animation/muscle-joints-mobile-page.png) / [Model stage](../visual-audit/anatomy-animation/muscle-joints-mobile-stage.png) |
| Thoracic relationships | [Full page](../visual-audit/anatomy-animation/thoracic-relationships-desktop-page.png) / [Layer stage](../visual-audit/anatomy-animation/thoracic-relationships-desktop-stage.png) / [Context chapter](../visual-audit/anatomy-animation/thoracic-relationships-desktop-chapter.png) | [Full page](../visual-audit/anatomy-animation/thoracic-relationships-mobile-page.png) / [Layer stage](../visual-audit/anatomy-animation/thoracic-relationships-mobile-stage.png) / [Context chapter](../visual-audit/anatomy-animation/thoracic-relationships-mobile-chapter.png) |

## Validation results

- `npm run build` — passed. The new library and player are route chunks; Three.js core remains a separate lazy-loaded ~705 kB minified chunk (~182 kB gzip). Vite reports its standard 600 kB advisory for that chunk.
- Latest `npm run check:mobile`: passed; Expo exported Android (4.93 MB) and iOS (4.92 MB) JavaScript bundles. This verifies bundling, not simulator or device rendering.
- `node scripts/validate_anatomy_lessons.mjs`: passed for all five playable lessons (29 chapters); structure IDs resolve against supplied GLB/BodyParts3D inventories and timeline cues validate.
- `node scripts/verify_atlas.cjs` — passed; geometry decoded for all 2,491 named parts in the nine shipped public layers.
- `python -m pytest tests -q` from `backend` — 55 passed; one third-party Starlette deprecation warning.
- Latest lesson capture: circulation, elbow and thoracic relationship routes opened at 1440x1000 and 390x844. Each rendered a Three.js canvas; the capture runner reported no browser exceptions or failed requests. Screenshots were inspected and stage camera framing was adjusted.
- Playback captures — 215 body lesson frames and 212 heart lesson frames encoded at 12 fps. Both MP4s decode fully and show scene changes. Pause held the timeline during capture; resume succeeded.
- Free exploration — on both lessons, a browser pointer drag after switching from Guided to Explore changed the actual camera pose (body camera delta 1.0262; heart 0.4048).
- `git diff --check` — passed; Git only reported expected LF-to-CRLF working-copy notices.

## Content and model scope

The source GLBs are static meshes with no animation clips or skeletal rigs. The elbow lesson uses a simplified rigid-group hinge. The circulation lesson uses a chapter-specific schematic marker on supplied vessels/chambers. The thorax lesson reveals supplied regional meshes; this is not surgical dissection. The lessons include timed narration-script/subtitle cues, but no recorded voice audio.

The cardiovascular assets include the four named chambers, selected great vessels, pulmonary arteries and veins, and only a subset of valve leaflets/cusps. The thorax lesson is a selected layer reveal, not surgical dissection: it uses actual rib cage/sternum, heart/vessel, diaphragm, trachea and esophagus meshes, while omitting lungs, pleura and intervening tissues. See the [asset audit](anatomy-animation-assets.md) for mesh counts, transforms, licenses and anatomical sources. Content is paraphrased from [OpenStax heart anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy) and [OpenStax respiratory structures](https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system).

## Remaining limitations

- No supplied motion-capable anatomy asset or reviewed rig is available. There are no source rigs or clips. The elbow hinge is an explicitly simplified demonstration, not a rig or clinically measured range of motion.
- The circulation lesson uses an OpenStax-grounded route marker and labels unavailable capillary beds as schematic. The thorax lesson is a named-mesh layer reveal, not surgical dissection; lungs, pleura and intervening tissues are absent.
- Voice narration is not recorded. The player presents synchronized script/subtitle cues as text.
- Mobile checks use Chrome touch/device emulation. No Android/iOS simulator or physical-device run was available for this pass.
- The 3D library is deferred from the initial page load, and Three.js is loaded only with 3D routes. The standalone Three.js production chunk still triggers Vite’s size advisory; it is ~182 kB gzip.

## Visual reference

The composition and scene-led direction were informed by the [A1 Gallery 3D design collection](https://www.a1.gallery/style/3d), without recreating any individual site.
