# Character animation pilot — 20 October 2026

Superseded for active animation by [the connected 2D fix](character-animation-fix.md).
The cutout atlas is retained as an earlier experiment, not the active renderer.

Generation is paused at eight characters following the user's direction. The
remaining 17 concepts in `src/data/illustratedCast.ts` are plans only and are
excluded from the gallery. No missing assets are presented as complete.

## Delivered test

Open Characters 8 on the local app. Bruno opens in the animation test; Original
artwork switches back to his intact illustration. The other seven people are
artwork studies. Filters, search, close-up inspection and individual PNG downloads
are available. These are generated illustrations, not an imported SVG collection.

`public/characters/cast-v1/bruno-parts.png` is a nine-region transparent PNG atlas:
head, torso, upper arm, forearm, hand, thigh, shin, shoe and pelvis. The application
samples those painted regions as separate moving pieces. This is not a PSD with
named layers. Left/right limbs currently reuse the same painted part.

`src/characters/brunoRig.ts` defines source rectangles, joint attachment anchors,
fixed-length two-bone IK, stance/return foot paths and subtle body motion. The
Canvas test supports standing, in-place walking, seated and desk poses, both
facings, pause, speed and a joint overlay. `CharacterAnimationLab.tsx` owns one
animation loop and releases it on unmount. Reduced motion holds the pose still.

Clayzo continues to drive the existing procedural campus characters. This pilot
uses Canvas for the PNG cutouts and reuses the existing IK solver; it does not
claim to be an Animo/IceBones integration or a new Clayzo raster document. REA
static component evidence used for source-flow orientation:
`ev_8ab2f134660794565c59ad70e431fe07915b5be4c0ea2297fac70e14ff122b9e`.
That evidence is static, not proof of runtime correctness.

## Verification and limits

Production build and lint pass. Three motion tests check fixed lengths, finite
joint angles, wrist reach at the keyboard and walking seam continuity. Browser
QA measured 60 RAF frames/second over 120 intervals (p95 16.7 ms), verified pause,
pose selection, turn and overlay controls, and found eight loaded gallery images
with no broken image requests. This is a short local pilot measurement, not a
campus-wide performance guarantee. Screenshots are in `output/playwright/`.

This is a first animation pilot, not final production animation. Shoulder caps
and cutout seams still need an illustration cleanup pass; one shared arm/shoe
cannot replace separately painted near/far and front/back views. Pose changes
currently switch immediately, rather than blending through a sit-down action.
The face is painted closed-eyed and does not yet have blink or mouth layers.
Desk work currently moves the wrists, without independently animated fingers.
There is no lip sync. These characters have not replaced the deployed campus
employees. Validate and refine this pilot before generating more people or
applying it to the remaining artwork.

## Artwork provenance

Eight intact character cutouts and Bruno's disassembled parts were generated with
the built-in image-generation tool using the supplied cartoon ensemble as visual
direction. The supplied reference is preserved in
`references/characters/playful-cast-user-reference.png`. Full PNG assets are in
`public/characters/cast-v1/`. The character descriptions in `illustratedCast.ts`
record each intended appearance. Atlas prompt: preserve Bruno's blond hair/beard,
plaid waistcoat, rolled teal sleeves, tan trousers, plum outlines and print grain;
output isolated head/torso/upper arm, forearm/hand/thigh, shin/shoe/pelvis in an
exact 3×3 transparent grid, with hidden joint surfaces and no labels or scenery.
