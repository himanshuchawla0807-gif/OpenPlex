# Connected 2D Bruno — 20 October 2026

This supersedes the cutout renderer described in `character-animation-pilot.md`.
The user supplied four screenshots showing broken shoulders, sliced trouser
joints, dangling hands and a front-facing head at the laptop. Those were actual
visual failures despite the earlier numerical bone-length checks passing.

The animation test now draws Bruno as editable 2D vector paths in Canvas. It does
not crop or stretch the PNG atlas. The original illustrated PNG remains available
under Original artwork; its level of painted detail is different from this
purpose-drawn vector study. Other character generation remains paused at eight.

Continuous stroked limb silhouettes share their anatomical anchors. Sleeves end
in rolled cuffs rather than exposed socket patches. The waistcoat has a clipped
plaid pattern, pockets, collar and buttons; hands have individual finger curves.
The standing view has open eyes and blinking. Seated and desk modes use an authored
right-facing profile, mirrored with the whole scene when turning. The nose, eyes
and chin face toward the laptop, with a modest downward head angle.

Seated hip height is 68 units above the ground rather than 94. The chair seat,
keyboard plane and table were repositioned together. Thighs extend approximately
horizontally; shins descend toward floor-supported shoes. Idle seated hands rest
in the lap. Both typing wrists target the keyboard plane at y=-127; fingers extend
horizontally and tap subtly. Arm lengths are explicit for near and far limbs,
preventing unreachable targets from silently clamping and leaving a hand short.

Clayzo still powers deployed campus vector characters. This local animation study
uses direct Canvas paths and the same two-bone IK helper, without a framework
migration. REA static parsing of the new character source completed with one file,
no parse failures: `ev_cc76e263dc134418c5a81642eb187fd64fae351500882d1fbae65c64d4d68424`.
Runtime checks use the browser separately; static evidence is not visual proof.

Validation: production build, lint and four focused motion tests. Tests cover
fixed lengths, finite angles, reachable keyboard targets, gait seam continuity,
and seated thigh/shin direction. Browser screenshots cover standing, walking,
seated, typing and mirrored typing under `output/playwright/bruno-connected-*`
and `bruno-corrected-*`. Final browser checks also cover pause, turn, joint overlay,
speed selection, no clipped head/feet and the loaded image gallery.

Remaining work: this is a mechanics-focused vector study, not the final painted
character. Pose switches are immediate; there is no sit-down transition or speech
animation. The walking test is in place, not integrated into campus navigation.
The remaining seven gallery illustrations have not been rigged or replaced.
