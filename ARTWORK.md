# Current artwork

The release uses generated raster characters, procedural office geometry and selected decorative artwork. The OpenPlex app mark is documented in [public/brand/README.md](public/brand/README.md). Bundled fonts are Manrope and DM Mono under the SIL Open Font License; proprietary Switzer files are excluded.

The notes below preserve the development history. References to earlier active prototypes describe that point in development, not the current release. See THIRD_PARTY_NOTICES.md for redistribution terms.

# Artwork provenance

Latest: the active Bruno animation test is purpose-drawn 2D vector geometry,
replacing the misaligned cutout pilot. Original PNG illustrations remain in the
gallery. See [the animation fix](docs/character-animation-fix.md).

20 October 2026: the Characters gallery now contains eight generated transparent
PNG illustrations and a nine-part Bruno animation atlas. Generation is paused
while the cutout animation pilot is tested. These gallery assets are separate
from the existing deployed vector campus characters. See
[the pilot notes](docs/character-animation-pilot.md) for provenance and limits.


Current implementation note (19 October 2026): the active office uses original JavaScript geometry and Clayzo vector characters. The image assets described below belong to prior iterations; see [the procedural update](docs/procedural-office-update.md).

The active campus uses five project-generated raster illustrations in public/assets/rooms:
connected-office.png, collaboration-suite.png, research-lab.png, design-studio.png
and team-lounge.png. The transparent character atlas is public/assets/living/office-team.png.
They were generated for this project using OpenAI image-generation tools.

The active refinement uses sibling `*-modern.png` versions of all five plates.
These selectively reduce greenery and emphasize workplace equipment without
replacing the layout. Original files remain available. See the
[refinement prompt set and verification notes](docs/refinement-notes.md).

The four new room prompts requested an original, unoccupied room matching the
approved office's perspective, scale, fine navy ink, printed texture and palette.
The character atlas is separate, so people are animated rather than baked into
the new scene images. No reference screenshots or user attachment files are included.

Older prototype illustrations, character sheets and their notes are preserved locally
but excluded from the public release. Historical simulation code remains for regression
tests; the optional local archive-art hash test is explicitly skipped when those
unpublished assets are absent. No active-campus test depends on archived artwork.

Code and project-generated illustration files are offered under LICENSE to the
extent applicable rights are held by the contributors. Contributed replacements
must include clear provenance and permission to redistribute.

## Registered Bruno artwork pilot (20 October 2026)
The current gallery animation uses generated transparent PNG artwork composed in SVG, replacing the simplified vector pilot. New assets live in `public/characters/bruno-prototype/`: desk-atlas.png, walk-v2.png, idle-v2.png. Generated with the built-in image tool from the existing Bruno artwork. The original PNG remains available unchanged. The main office includes one illustrated walking/standing pilot; other employees remain procedural. See `docs/character-artwork-prototype.md` for source research, implementation and limits.

Bruno's work/coffee/library pilot also uses `actions-v1.png` and `carry-v1.png`, generated from his existing illustrated appearance with the built-in image tool. PNGs retain transparency. The office applies an alpha-clipped print texture in JavaScript; it does not alter these source files. `empty-workstation-v1.png` is an unused generated furniture study; the live empty chair and desk currently use matching vector coordinates.

The office now uses furniture-free `seated-v2.png` on the standard procedural workstation, plus `walk-v3.png`. `carry-v2-study.png` contributes only its coffee row; the book row was rejected because it changes the holding arm. These were generated with the built-in image tool from the original Bruno identity. Continuous in-app mesh deformation adds free-arm/leg movement while carrying without modifying the PNG files. The gallery still retains the earlier desk artwork as a separate study.

Oscar, Cleo and Gus now have generated four-pose motion sheets in `public/characters/team-motion/`, derived from their existing original character references using the built-in image tool. The office and gallery use these for seated typing and walk studies. Bruno's PNGs are unchanged in this revision; opacity and saturation adjustments happen only on runtime Canvas surfaces. Main-office workstation furniture is procedural and shared, with no desk baked into these sprites.

The directional motion pass adds six transparent sheets under `public/characters/motion-v3/`: oscar-walk.png, cleo-walk.png, gus-direction.png, rear-walk.png, bruno-rise.png and team-rise.png. They were generated with the built-in image tool using the existing character references. Original source PNGs remain unchanged; JavaScript registers crops and applies runtime print texture. These are sprite studies with multiple walk/rise stages, not externally licensed character packs or complete skeletal rigs. See the prototype document for the exact frame counts and remaining limits.

## Forty-person illustrated campus (20 October 2026)
The active campus replaces the remaining procedural staff with eight generated
illustrated identities, each represented by five named wardrobe variants. New PNGs
under `public/characters/campus-motion/` provide Ziggy/Poppy/Mabel/Hugo motion,
rear work poses for all eight, and Oscar/Bruno/Cleo/Gus coffee actions. These were
created with the built-in image tool from the existing cast artwork. Source PNGs
are unchanged; runtime Canvas surfaces recolour garments and add the office print
texture. Registration and limitations are documented in `docs/character-artwork-prototype.md`.
Earlier entries describe historical pilots, not the current forty-person renderer.


## Independent high-detail cast — 21 October
The 32 former wardrobe variants now have distinct drawn identities and eight
registered poses each, alongside the original eight colleagues. Source files
are native 1536×1024 transparent PNGs with two figures per image; future batches
may use up to four figures following the latest user direction. Seven rejected
designs were replaced. Details, exact prompts, source provenance and validation:
[HD cast](docs/character-generation/HD-CAST.md). New drawings retain their
painted surface, without an extra animated dot overlay. Cross-room hiring and
saved-data parsing prevent repeating an identity within a project.
Validation: 61 full-suite passes and one existing skip, 11 builder passes, build
and lint pass. Native WKWebView rendered all 256 new poses plus a 12-person
office for 120 frames including cache reset; no missing poses or vanished office.
The Mac app was rebuilt and its ad-hoc signature verified.
