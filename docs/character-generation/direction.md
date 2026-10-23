# Distinct OpenPlex cast

Replace all 32 wardrobe-only variants with distinct identities, retaining the
original eight and all stable roster IDs/indices. The active high-detail set contains 128 two-figure PNGs, with eight poses
per identity. See HD-CAST.md and hd-inventory.json. Future generation images
may contain up to FOUR figures; completed artwork stays unchanged. No recoloring stands in for identity.

Visual direction: playful mid-century editorial caricatures, plum ink outlines,
subtle printed texture, warm muted colors, expressive varied faces and silhouettes.
Match Oscar/Cleo/Bruno/Gus and the warm cream/plum office. Real transparent alpha.

Atlas layout: 4 rows × 8 columns, one unique identity per row. Columns: full-body
standing 3/4 front facing right; front walk left contact; front walk right contact;
rear walk left contact; rear walk right contact; seated typing front facing right;
seated typing rear facing left; standing holding coffee. No furniture, desks,
chairs, labels, cell borders, background, floor shadows or overlapping sprites.
Register each pose from its alpha bounds inside its own cell; align seated poses
with authored workstation anchors. Preserve character proportions rather than
stretching every sprite to the same height.

Production tool: built-in image_gen, transparent_background=true. Final prompts
and source paths are recorded beside each atlas. Generated artwork is registered
as game sprites without aesthetic recoloring or changing the generated identities.
