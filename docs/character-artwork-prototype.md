# Bruno: registered artwork prototype

This supersedes the simplified connected-vector gallery pilot. The office's other employees still use the existing Clayzo renderer.

## Implemented
- SVG composition of transparent PNG artwork, not a pure vector trace.
- Fixed illustrated desk/chair/body plate with feathered registered hand and blink patches; the complete desk scene never changes frames.
- Eight-frame illustrated walk atlas, source bounds measured per frame and normalized to a shared display height and floor baseline.
- Relaxed standing illustration; original standing portrait remains available and opens on tapping Bruno in the office.
- One depth-sorted illustrated Bruno in the main office's clear aisle (i=16, j=11..18), with walking and stationary pauses. Reduced motion keeps him stationary.
- Enlarged preview, timeline scrubbing, pause, direction and speed controls.
- Wide texture strength .13 and medium .37 (previously .035/.24); close-up stays 1.

## Evidence and limits
REA statically inspected downloaded official PixiJS AnimatedSprite and Spine hoverboard source, evidence ev_0476cd30ece0b583d54b2b2acbbd732319c695d57ae104361f4a9ac142f143bb. Two sources parsed, no parse failures; no runtime behavior of those demos was verified. Pixi per-frame anchors and frame timing informed the original registration implementation. No Spine runtime was integrated.

Sources: https://github.com/pixijs/pixijs/blob/dev/src/scene/sprite-animated/AnimatedSprite.ts and https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.3/spine-ts/spine-webgl/demos/hoverboard.js . Research copies are excluded from project lint and build.

Generated art preserves the visual direction, not exact identity pixels across every new pose. Eight authored poses are not 60 unique drawings per second. The browser positions the sprite each animation frame, but feet and silhouette still need refinement; source views are mirrored for return travel, with no rear-facing atlas yet. Furniture contact labels are guide sockets, not a full reusable interaction rig.

## Next requested stages
Separate empty chair and table assets at the actual office projection; seated character without baked furniture; authored stand-up/sit-down transitions, book-reading and coffee sequences. Keep props static and depth-sort chair back, body, tabletop and hands by their contact sockets. Those activities are not implemented by this pilot. Other cast generation remains paused at eight characters.

## Verification
Build and lint pass. Three sprite tests cover atlas bounds, all eight frames, continuous aisle route, and reduced motion. Browser verified actual office placement, tap-to-original-artwork and pause holding time. Screenshots are in output/playwright/bruno-in-office.png, bruno-eight-frame-walk.png and office-wide-texture.png. Existing bundle size warning remains.

## Work / coffee / library routine — 20 October

Bruno now starts at his own occupied workstation. The full routine is defined in `src/characters/brunoRoutine.ts`: typing, standing, walking to a nearby coffee counter, brewing, carrying the mug home, placing it on the desk, working again, borrowing a book, carrying it back, setting it down, reading seated, working with the book on the desk, collecting it and returning it to the shelf. The loop lasts 100 seconds. Props change ownership at authored contact thresholds; coffee and book carry sequences include the prop in the illustrated hand.

The office compositor adds an alpha-clipped halftone layer to Bruno's artwork, at three contrast levels with three print impressions. The desk's typing patch is textured as well. Chair/table anchors remain in place while he is away. The empty workstation is currently drawn from matching vector coordinates; the generated empty-workstation-v1.png is an unused furniture study, not an integrated asset. New integrated artwork: actions-v1.png and carry-v1.png.

These are full-pose illustrations with small registered hand/page details. Transitions between sitting, standing and reaching remain discrete pose changes; they are not a complete skeletal interaction system. The new station's side-view artwork is also not a perfect match for the office's floor projection. Those are the next quality improvements, not completed checks. There is no general crowd avoidance between Bruno and the existing employees yet.

Verification: build and lint pass. Full suite: 48 passed, 1 skipped. The four sprite tests verify atlas bounds, continuous route positions, routine destinations, prop state and reduced motion. Browser screenshots checked typing, brewing, carrying coffee, seated reading and returning the book. `?motion=full&brunoTime=24` freezes Bruno at a review time without changing the normal automatic routine; remove brunoTime for normal playback. Reduced motion keeps him at work.

## Standard workstation, stronger print and collision reservation — 20 October

The occupied desk plate is no longer used in the office. Bruno now uses `bruno-workstation` (the same `desk` primitive, keyboard, desktop monitor, material and dimensions used by the other independent workstations) and `bruno-chair` (the standard chair primitive). The new seated-v2.png contains only the character. His body is depth-sorted behind the worktop; the hand layer is clipped to the actual projected tabletop and repainted above it. Reading uses the same chair anchor. The old desk plate remains only in the isolated gallery artwork study.

His print treatment now applies a paper-colour wash followed by substantially more opaque navy dots over the character's alpha, including the hands. Walk-v3.png supplies four distinct contact/passing key poses with a clearer arm change. The first two cells of carry-v2-study.png supply the coffee carry poses; its inconsistent book row was rejected. Existing book carry frames remain, supplemented with a continuous shared-vertex mesh for the free arm and legs. The holding-arm and upper-torso vertices stay fixed; mesh padding avoids clipping fingers. Artwork is still frame-based, not motion-captured or a complete directional skeletal rig.

Coworker routing treats Bruno's activity aisle as an invisible reserved footprint. Blocked authored route endpoints are snapped to legal floor points instead of reconnecting a path to a blocked raw point. This is a deliberately reserved aisle for the illustrated pilot, not general crowd steering. Six focused tests include a thirty-minute simulated shift checking coworker separation, source frame bounds, mesh anchor stability, prop state, continuous travel, and reduced motion.

Browser review screenshots: bruno-standard-desk.png, bruno-coffee-carry-mesh.png, bruno-walk-v3.png, bruno-book-carry-mesh.png. Build/lint pass. The broad run passed 49 tests, skipped one, and found one obsolete two-desk-count assertion. That assertion was updated to verify the two original desks plus Bruno’s standard workstation separately; the affected shared-desk and route tests all passed on rerun, along with all six focused Bruno tests. The entire expensive suite was not rerun after this test-only adjustment. The sit/stand pose transitions and full eight-direction artwork remain future refinements.

## Joined bench rows and four illustrated colleagues

The main floor now has two four-seat continuous benches at j=3 and j=12. Each top spans two adjacent stations (depth 5.4), with a 3.6-unit aisle between rows. Facing coworkers use opposite sides of the shared top and their own keyboards/screens. All isolated main-floor employee desks and Bruno's added desk were removed. Bruno replaces the near seat at i=4.05,j=16 (simulation index 13); that placeholder remains stationary and is not drawn. Oscar, Cleo and Gus replace indices 0,5,11 using the existing coworker simulation, so they retain its routes and floor collision rules.

Layout reference: Herman Miller Layout Studio, https://www.hermanmiller.com/products/workspaces/workstations/layout-studio/ and https://www.hermanmiller.com/products/workspaces/workstations/layout-studio/specs/ . The design uses joined benching and central screens as reference, not downloaded product assets.

Bruno's source PNGs were not regenerated or recolored. A runtime surface pass raises interior alpha to 255 and modestly increases saturation, removes the pale wash, and retains a lighter alpha-clipped dot print. Hands are redrawn in a narrow band rather than repainting the knees above the tabletop. His book/coffee return route uses the aisle and a separate standing approach at i=3.25,j=16; reach interactions sort in front of the top until he returns to the cushion. The bookshelf/kitchen are the original room fixtures again.

New original-reference-derived sprite sheets live in public/characters/team-motion/oscar.png, cleo.png and gus.png. Each has two typing poses and two walking poses. Those are still small frame studies: some generated walking silhouettes vary only slightly and they are not final multi-direction rigs. They are integrated in the office, have individual character tap targets and gallery typing/walking previews. No new Bruno artwork was generated in this revision.

Verification: build/lint pass; seven focused Bruno tests and four affected layout/path tests pass. The 30-minute simulation excludes the hidden replaced Bruno placeholder and verifies separation from every drawn coworker. The previous walker-count assertion was updated from twenty to nineteen because the twentieth walker now uses Bruno's separately tested routine. Browser reviewed joined-team-benches.png, bruno-book-standing-approach.png and all three new motion previews. Full expensive suite was not repeated in this revision.

## Directional motion and furniture contact pass

Six generated sheets in `public/characters/motion-v3/` add eight forward walk frames each for Oscar and Cleo, four rear walk frames each for Oscar/Cleo/Bruno, four forward and two rear walk frames for Gus, two corrected screen-facing Gus typing poses, and six rise stages for each of the four illustrated colleagues. `motionSheets.ts` registers individual crop rectangles; team-rise crops exclude neighboring-row shoes. Frames retain a common floor contact and use traveled distance for gait phase. Floor-axis velocity selects front/rear views and horizontal mirroring. This is a directional sprite prototype, not a complete eight-direction skeletal character rig. Bruno's carrying animation still uses the earlier authored carry poses and free-limb deformation.

Bruno backs away from his cushion before rising, follows the clear aisle, and places coffee/books beyond the open end of the bench at j=18.3. He then walks around the chair before sitting. Standing reach poses no longer receive the old unconditional +3 painter-depth override. The coffee machine receives a narrow foreground pass while brewing. During a rise/sit transition, only the character's own nearby chair sorts behind their torso; the bench, monitors, other chairs and surrounding furniture keep their normal floor order. Cup/book presence follows the interaction contact point. Frozen review queries `brunoTime` and `worldTime` allow repeatable inspection without changing normal playback.

REA static evidence `ev_fc84e5ee10ebc51aa143e6acc81b55c1291c3d7ff1cdf8f2d44f2003c497b396` inspected three animation research sources (no parse failures), including Pixi's official container sorting mixin. It supported using explicit painter layers; actual office contact and routing were checked in this app. No external animation source assets were copied into the character sheets.

Browser snapshots in `output/playwright/`: motion-v3-coffee-occlusion.png, motion-v3-book-approach.png, motion-v3-oscar-eight-frame.png and motion-v3-arrival-detail.png. The last close review confirms the rising/seated torso is visible in front of its chair while the desk masks the lower body. Generated stages still vary subtly in silhouette; carrying poses do not yet have a full rear-direction atlas.

Validation for this pass: production build and lint pass. The full suite completed with 53 passes, no failures and one existing archive-integrity skip. After adding PNG-boundary validation, the focused sprite suite completed with ten passes. Browser checks used frozen interaction states and a close-up chair-arrival review; no universal 60 FPS claim is made.

## Ten-room illustrated campus — 20 October 2026

The active campus now contains ten departments and forty named colleagues. The roster
uses eight illustrated identities with five clothing palettes each, rather than forty
independently drawn identities. Every live employee uses registered PNG poses; the
older procedural person renderer is no longer used by the active campus. The gallery
shows the actual wardrobe variants and supports name/speciality search and pose preview.

New transparent source sheets in `public/characters/campus-motion/` were generated
with the built-in image tool from the existing cast references: Ziggy, Poppy, Mabel,
Hugo, rear seated/rising views for all eight identities, and core coffee actions.
Original generated PNGs are preserved. `campusSheets.ts` registers their source crops
at one fixed source-pixel scale per sheet/identity. JavaScript applies garment palettes,
opacity restoration and the same clipped print surface as the office. These remain
sprite animations, not a complete skeletal rig or forty unique face designs.

The main room has two continuous rectangular four-person bench runs with a 3.6-unit
cross-aisle and a separate four-person meeting. Department rooms have equipment-specific
work areas: server racks/repair robot, research specimens/observatory model, campaign
materials, design studies, operations parcels, café, people team, learning and strategy.
The shared floor planner schedules reference, coffee and department review trips beside
real furniture and returns each person to their registered chair exit. One generic
traveller per room avoids simultaneous aisle collisions; Bruno retains his separate
reserved route and authored coffee/book contacts.

Validation: build and lint pass. The full test run reports 60 passing tests and one
existing archived-artwork skip, including thirty-minute Bruno/coworker separation,
all forty seat allocations, all generic task routes, source crop bounds and seat return
anchors. Browser captures inspect all ten rooms at time 50 plus main-room transitions
at 20.6, 28, 43, 65, 91 and 110 seconds. Screenshot sampling is not exhaustive visual
proof of every possible frame. `docs/campus-overview.png` is the single campus overview.
REA target evidence `ev_4c56c3e76955781ca9eb618964527d037dc176fa6769d049412760a868941c13`
confirms the local browser target; passive observation
`ev_a3174f6c5a524817ea2d78c29152457d5765940a02b6fc3e698cf53b4231e4b2`
contains lifecycle metadata only. Visual checks use browser screenshots, not that
passive network/lifecycle evidence. No universal 60 FPS guarantee is asserted.

Live browser smoke check after the final build: root URL loads with `ready:true`,
`error:null`, ten rooms and forty actors. At the 1800×1250 full-campus view, the
240-frame sample measured 60 FPS, p95 frame interval 16.7 ms and p95 render cost
1.4 ms. This is one headless Chrome sample on this machine, not all-device coverage.
Gallery open/search/close passed (Oscar search returns one card). The final root
URL was restored to normal live playback after frozen screenshot review.

## Single-sided benches and quiet typing revision
Main-office desks now form two uninterrupted 14.4-unit rows with four colleagues
on one edge of each. Their long axes share the same endpoints; a 3.7-unit aisle
runs between them. The meeting table retains its four seats. Bruno stays at his
existing floor anchor; the book/cup socket test resolves his actual assigned top.
All seated CampusPeople bodies use frame zero, including the rear view, with a
fixed print surface. Only the clipped hand pass moves by at most .45 world pixels
in a smooth typing cycle. Bruno's hand pass likewise uses the same source pose as
his body rather than alternating full illustrations. Walking and chair transitions
remain separate actions. Build/lint pass; 29 affected routing, furniture, sprite
and contact tests pass. `output/playwright/single-sided-rows.png` captures the new
main layout.
