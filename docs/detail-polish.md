# Detailed modern office pass — 19 October 2026

This pass supersedes the appearance, character revision and performance measurements in `procedural-office-update.md`. The active office remains on port5173 and the separate captured reference remains on5174. The planned agent-office product in PROJECT-OVERVIEW.md is unchanged.

## Delivered

Each room is approximately18% wider and deeper; campus origins were spread accordingly. Five detailed bookcases add individual spines, shelves, labels and boxes. Desks have additional stationery, drawers and hardware; chairs have fuller upholstery and caster details; cabinets, windows, sofas and work equipment have more small elements. Shared station anchors remain unchanged so the seated hip still lands on the chair cushion. Navigation treats new bookcases as solid obstacles.

The material system uses the captured reference's3.1world-pixel pitch,5×supersampled eight-cell tiles,20density levels and three impressions at3Hz. Opaque dots and knockout holes replace the former faint dot overlay. Outlines receive a small independently phased wobble. Modern neutral ink colors and density selection are adaptations; this is not a pixel-identical recreation of every original material or animation. At thumbnail scale, the screen is averaged or softened to avoid aliasing. Room geometry and character travel retain continuous display-rate motion.

Ten employees now have curved silhouettes and jawlines, fuller trousers, cuffs, pockets, collars, lapels, fabric folds, shoe soles and sneaker laces. Women's styling includes distinct buns, a bob, long hair, ponytail, earrings and tailored shapes. Wardrobe mixes pale/white tops, formal jackets and blouses, relaxed shirts, baggy denim and sneakers; skin tones remain varied. Eye blinks last about117ms and occur at staggered points in the4second loop. Head and breathing movement were reduced to avoid excessive swaying.

All rooms remain individually editable TypeScript geometry. Characters remain authored Clayzo vector geometry with no raster assets. The complete2076node gallery revision reviewed in actual browser playback is:

`sha256:39877a3e3f8154d738a84fe73225702747a5a17df44b231c7814977ac95b156c`

`selectCharacterModes` derives a revision-stamped document containing only ten reachable active poses. New pose sets prepare in a second temporary player, then replace and dispose the prior player. Drawing keeps the previous valid pose until the replacement is ready. This reduces steady drawing from approximately2806 to938draw calls in the measured scene. The full gallery remains available for wardrobe and pose review. The public Clayzo player API is used without SDK modifications. No account login, CLI render review or media export was performed.

## Verification and limits

- `npm test`:32passed,1optional historical-art hash check skipped,0failed. Includes detailed document coverage, pose pruning, loop endpoints, chair height, six-minute collision checks and frame-rate-independent travel.
- TypeScript production build and oxlint pass. The existing large-chunk advisory remains for the embedded Clayzo runtime (~1.47MB /464KB gzip).
- All five live room tabs and ten wardrobe variants were visually reviewed. Eight semantic motion ticks were reviewed through website playback with supported coverage and no renderer errors.
- REA close-up browser run1440×1000, zoom1.322336: ready, no captured page errors, p95office render CPU10ms. The overview/focused run measured p95approximately6ms. These are steady render costs, excluding initial compilation and cache warm-up.
- Measured requestAnimationFrame rate was29–30FPS. An independent control after disposing the scene/player also measured29FPS, p95interval33.4ms. This establishes a host/browser scheduling constraint in this session; it does not establish its cause or verify60FPS. The implementation remains authored at60FPS and within a16.7ms steady rendering budget in this sample. No system or browser power settings were changed.
- Reduced-motion replay holds simulation at0, with all ten employees seated and no captured page errors.

Artifacts in `output/procedural-review/`:detail-final.png,detail-main.png,detail-wardrobe.png,detail-room-0..4.png,detail-final.json,detail-baseline.json,detail-employees.json,detail-test-results.txt anddetail-rea-evidence.json. The canonical evidence bundle also retains intermediate failed performance experiments; final conclusions use only the records below.

## Evidence ledger

- Original static reference reused:ev_83abdca76c21fa2a5b6602f26f412c2880a1f38d0830294dfbdee39f78b46195. Direct source inspection supplies screen constants and cadence; static evidence is not a runtime observation.
- Final active source summary:ev_47f829d37d9278cbb439b5e8d10a1c31007bf66bbe7f9c0d3933d2f568de4ace; parentev_efb8da612a340a55d3a1686d75cefcb09ed04ee6df43cb85e93ff9623ec3c3a6. Eight files, zero parse failures; semantic relationships have2835unknowns and are not claimed complete.
- Final close-up replay:ev_10ccd6a411f583f0ae6a8d5e70d04247f1799a75c6b8c2541fc5e51d90434f72.
- Active pose focused replay:ev_dad3c27ad97a8abfe02d38b581999542e99e4bc8503dd9ba2849aba138662f10.
- No-scene scheduling control and motion samples:ev_c2dafb72aa0c992a165904d1f9f52044878273c8b8086352bf7c2d9507b05182.
- Final reduced-motion replay:ev_717b2c5dd3cbc69cbc241ce499a00e1dafab179c1a2eec57f60e82d705b7434d.
