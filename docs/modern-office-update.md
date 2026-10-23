# Contemporary office update

The five active backgrounds are `public/assets/rooms/*-contemporary.png`. Original and earlier `*-modern.png` plates remain available. Both the background renderer and furniture occlusion cuts load the contemporary plate, so old surfaces cannot reappear over a character.

## Artwork

Created with the built-in imagegen tool on 18 October 2026, editing each corresponding `*-modern.png` plate separately. Output: 1536 × 1024 PNG for each room. The original room silhouettes, furniture footprints and chair positions were preserved and reviewed against the people in the production Canvas renderer.

Shared production prompt (the room ID changes for each of the five inputs):

> Edit target: the supplied room illustration. precise-object-edit. Produce an updated production game background plate at EXACT 1536x1024. CRITICAL LOCK: retain exact pixel geometry of walls, room silhouette, floor edges, every desk footprint, all chair seat centers, all table corners, monitor positions, doors, perspective, camera, and scale. Do not shift any furniture. No people. Only change surfaces and decorative details to make this a sophisticated contemporary technology-company office instead of a cozy plant-filled vintage space. Remove ALL potted plants, flowers and greenery, replacing them with clean empty surfaces or understated geometric office devices. Windows show a blue-grey modern city skyline without green trees. Refinish orange/yellow wooden desktops to pale cool ash or matte off-white; cabinetry charcoal and cool grey; chairs ergonomic graphite and muted indigo, retaining exact shapes and seat locations. Refinish green patterned rugs as flat cool slate grey rugs with very subtle geometric texture. White and pale-grey walls, dark slim frames, crisp neutral lighting, restrained cyan/blue screen interfaces. Less decorative clutter, practical office equipment. Keep the same detailed hand-illustrated isometric visual style with fine dark outlines, not photorealistic, not vector. Preserve the original background outside the room. Entire image same composition, no added elements outside room, no text labels. This must align exactly over the supplied plate because people and collision paths use its coordinates.

## People, motion and navigation (revised after close-up feedback)

The six-frame pose crossfades were replaced by a jointed 2.5D rig. The source atlas now supplies heads and cloth texture, while shoulders, elbows, wrists, pelvis, knees and feet move independently. Garments, cuffs, folds, trouser seams, hands, fingers and shoes render at the current canvas resolution.

All ten occupied chair contacts were recalibrated from enlarged plate views: several previous anchors were on backrests or armrests. Body scale and floor approaches now match the cushion-to-floor distances. Seated pelvis positions are explicit chair-cushion constraints. Wrist positions stay on authored desk interaction points, with subpixel typing/writing movement during gesture bursts. Foreshortened seated elbows follow the table edge rather than curling a full-length flat arm toward the face. Characters facing their desks use a back/side view and correct arm layering, so a seated forearm cannot draw through the front of the torso. The lounge uses a lap contact rather than a desk contact. Standing/sitting interpolates one opaque rig; it does not fade two bodies together. Most coworkers remain seated while one ordinary task trip per room is allowed.

Walking uses stance/swing phases, planted feet during straight-line stance, opposite arm swing, eased heading changes and acceleration/braking. The collaboration table, active office desks, café tables and foosball-table collision maps now use floor footprints rather than tabletop coordinates; a regression covers the reported table walk-through. A movement-integrator bug discarded travel remaining after each short navigation segment; movement now consumes the complete distance budget across segments. All campus rooms use consistent world-space walking speed. Physics runs at 120 Hz and display frames interpolate the previous/current poses.

The background is cached at the current viewport and camera. Only camera/selection/loading changes rebuild it; moving people and ambient events draw above that cache. Offscreen rooms skip character rendering. The old large in-between sprite caches are removed.

Ordinary wheel/trackpad scroll pans in screen pixels. Trackpad pinches (Ctrl+wheel and WebKit gesture events) zoom around the pointer. Two touch pointers pinch/translate; one pointer click-drags the world. Zoom buttons use 1.24× steps and wheel pinch targets settle smoothly. Native wheel handlers are non-passive so browser page zoom cannot compete with the canvas gesture.

The title, status text, footer, room captions, room toast and all visible exploration/instructional text were removed. Only short numbered room tabs and camera controls remain.

## Verification

`npm test`: 26 passed, one existing optional legacy-art test skipped. New regressions cover full travel through dense waypoints, planted feet and stride continuity, chair/hand constraints, continuous rise/settle, identical trajectories at 30/60/120 display rates, and pan/pinch math with pointer anchoring. Existing long simulations cover furniture/personal-space clearance, finite briefings and returning to seats.

`npm run build` and `npm run lint` pass. The Canvas harness loads all five plates, checks overview bounds/selection, verifies that a still camera does not repaint static artwork, saves seated close-ups and runs a 400-second active shift.

The live browser measured 60 FPS over a rolling 240-frame window, p95 frame spacing 17.6 ms and p95 render cost 1.9 ms, with zero frames above 25 ms in that sample. These are observations on this machine, not a guarantee for all devices. Live scrolling changed camera Y while preserving the exact zoom. Click-drag panning and the faster zoom button were also exercised in the browser. Pinch math and pointer anchoring have automated coverage; physical touch/trackpad pinch gestures were not directly exercised by browser automation.

REA static inspection during this revision: `ev_465798147bcd322e1fe92b438304b59175abc1bd86996b42b9c81b9ba96613b1` (20 files, no parse failures). This is static evidence; frame timing and interaction results above came from the running app.

Characters remain illustrated 2.5D figures within their assigned rooms. This is not a full 3D skeletal asset or cross-room simulation.
