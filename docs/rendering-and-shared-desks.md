# Rendering and shared workstations — 19 October 2026

The screenshot showed people and selection outlines surviving while room surfaces disappeared. Source inspection found an unbounded, three-impression canvas cache across zoom tiers, per-context duplicates of texture patterns, and large empty rug tiles even though rugs were already in the room base. This is a plausible canvas-memory failure path, not a native-browser crash diagnosis.

Changes:

- Share halftone patterns across drawing contexts, discard obsolete zoom-tier caches, bound tile backing stores to 96 MiB and explicitly release evicted canvas storage. Remove redundant empty rug tiles and tighten object bounds. Lost cached contexts are rebuilt; the main 2D surface handles context loss/restoration.
- Main office mixes one four-seat bench, one two-seat bench and two individual workstations. Research and design also have paired benches. Each shared bench is one physical tabletop with central acoustic divider, paired screens, keyboards, mugs, notebooks and cable outlets.
- Opposing seats use floor anchors on opposite i edges. `Station.reverse` selects a fourth Clayzo pose with raised tabletop wrist targets, rear three-quarter anatomy and reversed chair-back placement. This differs from axis-swapped individual desks.
- Art direction: inhabit; jointed tailored silhouettes; chalk/ink/denim/coral; faces, fabric, seams, shoes and individual accessories carried by existing animated joints. Four authored pose rows: walk, seated, idle and reverse seated. Source gallery remains editable JavaScript/TypeScript vector geometry, with one cached shared document.
- Additional perimeter treatment: acoustic fins, framed geometric reliefs, concealed linear lights, window pelmets, sill details and power outlets. Existing halftone and three-impression ink motion are retained.

REA static inventory: parent Evidence `ev_4478db0483ccd46872b8f8a4f072682a74bf69db8a79b48088d29efae4ba4b65` covers the nine procedural source files before these edits; it does not establish runtime behavior.

Validation: full suite after layout/character changes: 36 passed, one archived-artwork hash test intentionally skipped. Follow-up procedural checks cover cache eviction/backing-store release, paired opposing seat anchors, traversable walking paths, Clayzo coverage and loop closure. Browser screenshots and runtime checks are under `output/playwright/`. Browser playback uses the actual WebGL player; no authenticated Clayzo CLI export is claimed.

Final browser sample (240 frames, warmed main-office view): 60 FPS, p95 frame interval 16.8 ms, p95 render 8.8 ms, zero frames over 25 ms; 73.2 MiB tile storage and zero additional rebuilds over a four-second warm window. Two rounds across all five room controls retained nonblank architecture; dispatched context loss/restoration exercised surface-cache recovery (not an induced native GPU failure). Build and lint pass. A targeted reverse/normal keyboard-contact and cache-release rerun passed.

Final playback optimization packs only visible active poses into a one-row atlas instead of the full 21-by-4 gallery surface. Coverage runs on the actual active document at startup; full-gallery coverage remains in tests. Final closer-view browser sample after reloading the final code: 60 FPS, p95 frame interval 16.7 ms, p95 render 3.8 ms, zero frames over 25 ms, 95.7 MiB tiles, no runtime errors and no unsupported Clayzo constructs. Compact-atlas validation, source-anchor preservation, reverse keyboard contact and cache-release tests pass; build and lint pass.

## Adaptive texture, separated pods and 25-character wardrobe

Overview printing now blends into the actual material colour at 3.5% strength below 40% zoom and 24% below 70%; the original full-strength dots, accent plate and three-impression motion remain at closer zoom. Rug hatching is sparser at overview scale. This reduces subpixel moiré without enlarging dots. LOD changes reuse the existing three cache tiers. Broad perimeter floor inlays and flush lower wall panels add architectural detail without another busy pattern.

The main four-person zone is two independent facing-pair tabletops, with a 1.9-world-unit aisle between rows. Two individual workstations occupy the intermediate band before a separate front pair. No tabletop connects the rows vertically. Routing, exact seated anchors, opposing keyboards and 30-minute collision simulations pass after the layout changes.

The editable Clayzo wardrobe now contains 25 named variants, while the campus still deploys its existing 21 employees. Added garment construction includes waistcoat panels and welts, hoodie pocket and drawstrings, cargo pockets, cable knit, camp collars, pocket squares, denim totes, smaller far eyes, facial planes and differing head proportions. All four poses retain the existing joint mechanics. Open Characters → 25 for the contact sheet and a high-resolution selected standing/walking/seated preview. Thumbnail poses are captured once; only the selected character remains live. The campus pauses while this modal is open. Reduced motion holds the preview; Escape/Close returns to the office.

The closer browser run initially fell to approximately 33 FPS despite low measured JavaScript costs. Removing the expensive Canvas2D high-quality image-resampling mode from cached tile redraws restored a measured 60 FPS, p95 frame interval 16.7 ms, p95 render 6.8 ms, and zero frames over 25 ms across 240 warmed frames at 92% zoom. Bilinear smoothing remains enabled. Tile storage is 91.3 MiB; the warmed cache showed no repeated rebuilding. Close inspection above 105% zoom still uses direct vector room drawing.

Validation: build and lint pass; the full suite before the final metadata check passed 37 checks with one archived-asset hash check skipped. A targeted rerun passes the separated shared-desk and new 25-outfit construction assertions. Local browser playback review samples nine ticks (0–959) across walking, seated, standing and reverse-seated poses; no authenticated Clayzo rendering/export was used. Review page: `wardrobe-review.html`; screenshots: `output/playwright/texture-overview.png`, `office-final-close.png`, `wardrobe-final-row.png`, `wardrobe-motion-sheet.png`.

Updated REA static inventory: parent Evidence `ev_c42cf0fdf8afa2b3007a348675ea1cef7b4a92de42646c28b0ac1dfa8365843d`, summary `ev_cf82dd91b7be75857b63e1eba873b5fb642f93e5ce653f7d66b1b2803efe5d22`, ten source files parsed with zero parse failures. This is a static source snapshot before the final smoothing change, with partial semantic relationships and unresolved dynamic flows; browser checks establish the runtime observations above.

## Worktop occlusion and dashboard integration — 20 October 2026
- Work bodies use lower-body tabletop masks. The mask affects the lower 38 pixels
  relative to the registered foot anchor; faces remain visible when a long desktop
  projects behind them. Work hands render in a separate narrow overlay pass.
- Bruno's keyboard overlay now resolves his assigned furniture ID rather than the
  historical second bench ID. This corrects the leg/hand layer after rearrangement.
- Main rows remain continuous four-seat rectangles; the front row is reversed so
  the rows face each other. White worktops and pale, dark-bezel monitors improve
  contrast against the carpet. Zoomed-out ink strength increased from .13 to .34.
- Preset room origins now follow deliberate three-unit circulation gutters. REA
  inspected the retained reference script at `reference-lab/a-small-light/evidence/scripts`.
  Static source observations: reference CELLW=3.1, PAT_K=5, TONE_LEVELS=20, PITCH=16
  and serpentine grid placement. Evidence summary
  `ev_cd6b44d5e9f5080cba3b6fd140821d3e61da9fffa38e5e56ebd8230d21ff0c16`
  links parent `ev_83abdca76c21fa2a5b6602f26f412c2880a1f38d0830294dfbdee39f78b46195`.
  REA recovered the full source inventory; its semantic graph is partial. These
  values are static observations from the previously retained artifact. A new
  passive live-page inspection was unavailable after its debugging browser closed.
- `DioramaCanvas` accepts custom definitions, seat-index rosters and manual room
  movement. Builder rooms preserve template IDs for department-specific artwork.
  Routes use room-scoped actor IDs so repeating a character in another room does
  not overwrite its planner state. Empty projects contain no simulated actors.

Dashboard browser verification: blank project creation, room additions, café 2/2
capacity lock, save/reload, manual room movement, re-enabling automatic placement,
and hover-add targeting the correct room all passed. Four builder model tests pass;
full campus suite reports 60 passed and one existing archive-artwork skip. Build
and lint pass. A cream fill during canvas resize removes the initial black frame.
At distant zoom, ink pattern pitch is enlarged 1.8× to keep subpixel dots visible
without increasing close-up texture. The normal root preset resumes live playback.
