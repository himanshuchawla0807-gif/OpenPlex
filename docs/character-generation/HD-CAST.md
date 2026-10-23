# High-detail cast revision

The active roster keeps Oscar, Bruno, Cleo, Gus, Ziggy, Poppy, Mabel and Hugo, and adds 32 independently illustrated identities. Seven rejected designs were replaced while retaining stable character IDs for saved projects. Rejected crowded sheets are archived under `reference-lab/rejected-cast-v2`, outside the shipped public assets.

The built-in image generation tool produced 128 transparent PNGs, two full-body figures per image, covering 256 poses: standing, opposite front strides, opposite rear strides, front seated work, rear seated work and coffee. Every source PNG is preserved unchanged in `public/characters/unique-cast-hd/<id>/`. Exact prompts and source paths are recorded in `hd-inventory.json`. Native output is 1536×1024, with individual figure bounds 687–1024 pixels high. These are substantially larger source figures than the previous roughly 200-pixel sprites; they are not native 4K images and were not upscaled to imply extra detail.

Each image has a shared scale calibrated to a standing counterpart; seated figures retain their lower head position. Alpha-derived shoe anchors register the floor contact. Front desk art faces right; authored rear desk art faces left and is never mirrored back into the front view. Walking direction uses the existing floor-axis projection and separate rear artwork. Independent drawings can still vary slightly between poses; this remains frame-based animation, not a full skeletal rig.

Runtime tiles retain up to 1024 pixels of source height at close zoom. The new drawings keep their painted texture without the added animated dot-print pass. Project-wide hiring and saved-data parsing prevent assigning the same identity to multiple rooms.

Validation: production build, lint, full existing suite, builder tests including cross-room duplicate hiring, and a native WKWebView probe (`swift scripts/check-hd-cast.swift`, local Vite server on 5180 required). The probe draws all 256 poses independently, checks front/rear desk selection, and renders a populated 12-person office for 120 frames including cache reset. It does not establish exhaustive animation quality or performance on every device. Review images are `output/playwright/hd-cast-desk-directions.png` and `hd-cast-office.png`.

REA was considered for artifact inspection; its binary artifact inspector does not support PNG input. Image-alpha registration and native WebKit rendering supplied the actual artwork evidence.

Latest direction: future generation images may contain up to FOUR figures to reduce turnaround. Keep completed two-figure artwork; do not regenerate it merely to change batching.
