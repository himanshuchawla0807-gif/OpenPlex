# Procedural modern offices and Clayzo characters

Historical first pass. See [the current detail pass](detail-polish.md) for the delivered appearance, character revision and current performance results.

19 October 2026. This supersedes the image-based active scene described in the earlier artwork and motion notes.

## Delivered behavior

All five active offices are now drawn from JavaScript/TypeScript geometry: main office, collaboration suite, AI research lab, design studio and team lounge. Walls, floors, windows, city skyline, cabinets, desks, chairs, conference table, screens, keyboards, lamps, coffee equipment, sofa and rugs are individually constructed shapes. The browser capture observed no PNG/JPG/WebP room or character asset requests.

The reference's material principles are implemented with original modern-office primitives: clipped halftone dot screens, fine paper flecks, offset outline impressions and three tiny registration variants at three changes per second. This affects ink and texture, without shaking furniture coordinates. People and camera movement remain display-rate animation rather than the reference's intentional 12 FPS artwork cadence. Reduced motion freezes the texture variant, simulation and character timeline.

Art direction: inhabit a modern workplace; isometric furniture and articulated people; chalk/slate/blue/light wood with restrained room accents; furniture-scale human figures; no additional explanatory copy. The user's modern-office direction takes precedence over generic Clayzo poster-style defaults.

## Real Clayzo integration

`@clayzo/animation` and `@clayzo/webgl-player` 0.3.17 are project dependencies. `characters.ts` builds a typed document, validates it with `assertValidAnimationDocument`, and stamps it with `withComputedRevision`. The reviewed document revision is:

`sha256:96c24a0ab1447f0e609ac17194dcc2cee2fe04e65669a790e30a863366fb9692`

It contains only paths, rectangles, ellipses and hierarchical groups, with no image or font assets. Ten named employees have separate palettes. Parent/child joint transforms animate shoulders, elbows, hips, knees, head and breathing. Walking, seated work and idle poses are authored at 60 FPS, with identical first/last joint values over the four-second document. The lounge reader has a vector book.

One authorized, unmodified WebGL player renders the shared live vector stage. Canvas 2D composites each employee at its current workstation or path location. This offscreen rendering is a live vector pipeline, not a downloaded or prerendered character atlas. `checkCoverage` reports supported with no reasons, and the same public `createPlayer`/`seek`/`dispose` contract is used by the review page and the office.

Website playback requires no sign-in. The account remains signed out, so Clayzo CLI frame rendering, review packets and media export were not performed or claimed. The visual review used actual browser playback, including eight sampled ticks on the development-only `/motion-review.html` page.

## Coordinates, seating and travel

Each room owns its `floor`, `wall`, `accent`, furniture dimensions, station anchors and walking destinations in `src/procedural/officeRooms.ts`. A room's wall/floor color can be edited independently of every other room. This is a code-level parameter model, not a new visual office editor.

The shared projection is x = (i − j) × 40, y = (i + j) × 20 − z × 40. Chairs and actors share the same local station anchor. The seated Clayzo hip lands within one pixel of the .85-unit chair cushion; desk surfaces are 1.3 units high. Furniture and people share painter ordering, so desks occlude the appropriate portions of seated bodies.

Travel routes derive from the editable furniture footprint rather than from painted image coordinates. A* avoids furniture and reserves the other occupied stations. Clear straight sections are simplified; corner arcs are accepted only when they remain clear. Departure and arrival use a .65-second speed ramp with zero endpoint velocity. Facing turns ease rather than instantly mirror. Short seat departure/arrival intervals ease the body's height. Shared schedule slots permit only one roaming employee per office at a time, preserving occupied desks. Nine employees roam on staggered breaks; the lounge reader remains seated.

The simulation is evaluated from elapsed time, with equal positions at 30 and 120 display updates per second. Employees remain within assigned rooms. This iteration has no real agent terminal integration, department messaging or shared agent context.

## Rendering and navigation

The overview caches procedural underlays and individual furniture for the three registration variants. At zoom above 1.05, architecture is drawn directly from vectors at display resolution, so the overview cache does not limit close-up geometry. The character stage uses one GPU context for all employees. No React state updates run per animation frame; the player and caches are disposed on unmount.

Existing controls remain: click-drag or ordinary scroll to pan, pinch to zoom, zoom/reset buttons and numbered room focus. The existing touch, WebKit gesture and Ctrl+wheel pinch paths remain in place. No new heading, instruction footer or work-in-progress label was added.

## Validation

- `npm test`: **31 passed, one optional historical-art hash test skipped**, zero failures. This includes five active procedural tests and the preserved historical regression suite.
- Active checks cover Clayzo validation and WebGL coverage, joint loop endpoints, seat height, eased walking endpoints, six-minute schedules without furniture/coworker collisions, at most one roamer per room, 30/120 FPS position equivalence, reduced motion and route corner clearance.
- `npm run build` and `npm run lint` pass. The build reports a large-chunk advisory for the embedded Clayzo runtime; its main JavaScript bundle is approximately 1.46 MB / 460 KB gzip. The runtime is not an image asset download.
- All five rooms were opened through their live navigation tabs and captured. Close-up vector drawing and the new character proportions were visually inspected.
- Final REA Chrome scenario at 1440 × 1000, zoom 1.322336: ready, no renderer/page errors, supported Clayzo coverage; **60 FPS**, p95 frame interval 16.7 ms and p95 office-render CPU time 4.0 ms over 240 steady-state frames, with no intervals above 25 ms. These are local measurements, not a guarantee for every device. An earlier startup sample measured 58 FPS while caches warmed.
- A separate browser scenario with OS reduced motion enabled and no full-motion override remained at simulation time zero, with ten seated employees and one static texture variant.
- The built production bundle was served independently and opened in Chrome: ready, the same reviewed Clayzo revision, and no captured page or renderer errors. The temporary preview server was then stopped; the office and reference remain running on ports 5173 and 5174.
- `npm audit` reports zero vulnerabilities after the compatible `source-map-js` patch update to 1.2.2.

Artifacts are in ignored `output/procedural-review/`: generated motion document, eight-tick contact sheet, all-room live captures, final live/reduced stats, test/build/lint results and exported REA evidence. The final motion document has the same revision in Node and browser playback; track values are quantized to avoid platform-dependent floating-point hash drift.

REA records for the final revision:

- Source parent: `ev_9064569dfdadfc1d3be3330a4882d208151768925621f50d9ebac2f07ce3b0aa`.
- Source summary: `ev_760ed65695887e36ee64837915243496a1d1a8d00580723ecd983519842d284c` — eight files, zero parse failures. Static semantic relationships retain ordinary dynamic unknowns; they do not prove execution.
- Live close-up scenario: `ev_12fa33976a5c209e885a50a1eaed5de4a23cfbe8656989ce436d7f56a750968f`.
- Reduced-motion scenario: `ev_216ed74153d214c4343bd449b708a2a42de111701bb98b1e7225a3bd7db256b2`.
- Production bundle scenario: `ev_0b4c41b06a42c238ac07da4b2a6ad798e628d484fd50cc7b569e0b559b95ab2b`.

The separately preserved 25-room reference remains at port 5174. Its capture and approved floor-color edit are unchanged. The modern implementation does not embed that site's script. Clayzo's SDK retains its proprietary license; see `THIRD_PARTY_NOTICES.md`.
