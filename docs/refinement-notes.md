# Modern workplace and character refinement

Five rooms and world origins/scales remain unchanged. The original five PNGs
and ten-person atlas are preserved. Sibling `*-modern.png` plates are selective
edits made with the built-in image-generation tool, not a new world.

## Saved art prompt set

Use case: precise-object-edit. Edit the existing raster room plate selectively,
not a redesign. Remove approximately 65% of decorative plants/vines in office
rooms, or approximately 50% in the lounge. Keep a few accent plants. Replace
surplus foliage with practical equipment, paper trays, charging docks, storage
bins, acoustic panels and room-appropriate project materials, or clear wall/floor.
Preserve 1536x1024 dimensions, transparent exterior, room silhouette, architecture,
desk/table outlines, chair cushions and bases at the same pixel locations.
Do not move or resize furniture. Preserve fine navy illustrated lines, controlled
halftone, muted palette, camera angle, shadows and handcrafted appearance.
No people, labels, logos or new rooms.

Room-specific instructions: office—workstations, docks and managed cables;
collaboration—conference microphone, notebooks and conferencing equipment;
research—test devices, prototypes and research materials; design—tablets,
interface sketches and product prototypes; lounge—coffee, books, magazines,
comfortable seating and a few plants, without extra workstations.

## Alignment and movement

`src/living/workstations.ts` authors each occupied chair's cushion, floor approach,
interaction point, facing and optional monitor in native artwork pixels. Seated
images attach at the hip on the cushion. Standing/walking frames register at the
foot. Original faces, clothing and six poses are reused.

RISING and SETTLING states keep people stationary before/after travel. Speed is
acceleration limited, brakes by remaining distance and slows at corridor turns.
Steps stay on navigation routes; facing changes use a short visual blend.
Deterministic priority breaks mutual yielding with a navigable sidestep, never
teleportation. Opening the campus joins independently staggered work sessions.

## Verification and limits

Eighteen local tests, lint and production build pass. Tests cover authored
anchors, speed limits, continuous movement, stationary chair transitions,
furniture clearance, independent schedules and small briefings. The production
Canvas harness loaded five modern plates, checked selection/overview bounds
and produced inspected overview/focused views, not browser screenshots.

After a scoped preview-server restart, a fresh browser tab loaded the modern
assets. Live inspection covered overview, all five focused rooms, office close-up
through 190% zoom, drag pan, wheel zoom, reset, independent Canvas selection and
hover. No warning/error console entries were reported. Coworkers were observed
working, walking, conversing and back at their chairs across successive samples.
A senior-led three-person briefing was also observed live while the seven
nonparticipants kept working. Not every rise/settle in-between was captured live.

The atlas has six poses per identity. Rise/settle and facing changes are blended,
not bespoke anatomical in-between frames or full directional animation. Ground
footprint tests cannot prove every hand, chair edge or tiny decorative pixel is
intersection-free. A full hand-authored directional sprite set remains future work.

A generated seated-arm repair candidate was inspected but not used: its changes
were not sufficient to justify replacing the approved identities. Fine wrist-to-
keyboard contact remains approximate. The lounge uses reading/inspection rather
than typing without a keyboard; meeting chairs use document/review activities.
