# 3D anatomy animation production pass

Validated 2026-10-30 against the local Vite application and the supplied anatomy atlas. Screenshots and recordings are from the running application, not mockups. Desktop browser size was 1440×1000; mobile browser emulation was 390×844.

## Deliverables

- [Versioned lesson manifests](../shared/anatomy/animationLessons.js): six-chapter whole-body layer reveal and five-chapter heart anatomy lesson. Timeline cues, camera frames, visibility/highlight IDs, captions, subtitle/script timing, start/end state, quiz link and replay state stay separate from the renderer.
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

## Validation results

- `npm run build` — passed. The new library and player are route chunks; Three.js core remains a separate lazy-loaded ~705 kB minified chunk (~182 kB gzip). Vite reports its standard 600 kB advisory for that chunk.
- `npm run check:mobile` — passed; Expo exported Android and iOS bundles (4.9 MB and 4.89 MB JavaScript bundles). This verifies exports, not simulator or physical-device rendering.
- `node scripts/validate_anatomy_lessons.mjs` — passed; all 11 lesson chapters resolve their structure IDs against the supplied GLB/BodyParts3D inventories and their timeline/caption cues validate.
- `node scripts/verify_atlas.cjs` — passed; geometry decoded for all 2,491 named parts in the nine shipped public layers.
- `python -m pytest tests -q` from `backend` — 55 passed; one third-party Starlette deprecation warning.
- Desktop and mobile routes — Home, Anatomy, lesson library, and both lessons opened in live Chrome at the sizes above. The screenshot browser used isolated guest/data fixtures for API requests; it reported no browser exceptions or failed requests. The Home model reached `MODEL READY`; the atlas and lessons rendered their 3D canvases. Backend behavior was checked separately by the backend suite.
- Playback captures — 215 body lesson frames and 212 heart lesson frames encoded at 12 fps. Both MP4s decode fully and show scene changes. Pause held the timeline during capture; resume succeeded.
- Free exploration — on both lessons, a browser pointer drag after switching from Guided to Explore changed the actual camera pose (body camera delta 1.0262; heart 0.4048).
- `git diff --check` — passed; Git only reported expected LF-to-CRLF working-copy notices.

## Content and model scope

The source GLBs are static meshes: the audit found no animation clips or skeletal rigs. Lesson one animates opacity, layer visibility, camera framing, highlights and captions over actual supplied meshes; lesson two frames the actual named chamber, vessel and partial valve meshes. These are atlas-view transitions, not simulated contraction, valve motion or blood flow. The two lessons include timed narration-script/subtitle cues, but `narrationTrack` is `null` and no voice audio is present.

The cardiovascular assets include the four named chambers, selected great vessels and only a subset of valve leaflets/cusps. The lesson identifies supplied parts by their exact mesh/source IDs and describes missing/partial geometry in its model note. See the [asset audit](anatomy-animation-assets.md) for mesh counts, transforms, licenses, anatomical sources and what later lessons still need. The content is paraphrased from [OpenStax structural organization](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-2-structural-organization-of-the-human-body), [OpenStax heart anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy), [OpenStax cardiac cycle](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle) and the [NCBI great-vessel overview](https://www.ncbi.nlm.nih.gov/books/NBK547680/).

## Remaining limitations

- No supplied motion-capable anatomy asset or reviewed rig is available. Physiological motion and musculoskeletal demonstrations remain pending appropriate assets or reviewed simplified motion.
- Blood circulation, skeletal muscle/joint movement and dissection/relationship lessons are explicitly marked in production until their route, rig/pivot or relation data is reviewed.
- Voice narration is not recorded. The player presents synchronized script/subtitle cues as text.
- Mobile checks use Chrome touch/device emulation. No Android/iOS simulator or physical-device run was available for this pass.
- The 3D library is deferred from the initial page load, and Three.js is loaded only with 3D routes. The standalone Three.js production chunk still triggers Vite’s size advisory; it is ~182 kB gzip.

## Visual reference

The composition and scene-led direction were informed by the [A1 Gallery 3D design collection](https://www.a1.gallery/style/3d), without recreating any individual site.
