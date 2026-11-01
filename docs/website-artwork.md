# Landing page artwork

Updated 2 November 2026. Generated with the built-in OpenAI image-generation tool. The campus uses image-reference editing mode with the previous `website/src/assets/campus.webp` as its input. The mathematical cutouts use new-image mode.

The campus is editorial illustration, explicitly labeled as AI-generated on the page. Its office arrangement follows the previous campus screenshot with clean architectural surfaces instead of halftone noise. The Chat and Terminal previews remain real product captures. These static additions introduce no external image requests, scripts, accounts, or animation.

## Assets and placement

| Asset | Placement | Output |
| --- | --- | --- |
| Illustrated campus | Landing-page hero | `website/src/assets/campus-illustration.webp`, with `campus-illustration-960.webp` for smaller displays |
| Orbital sculpture | Workspace introduction | `website/src/assets/orbital-sculpture.webp` |
| Möbius sculpture | Local-first section | `website/src/assets/mobius-sculpture.webp` |

The campus was generated with an opaque background. Both sculpture requests used `transparent_background: true`; WebP conversion preserves alpha. The originals remain in the generation tool's local output directory. FFmpeg was used only for resizing, format conversion, and cream-background inspection previews. Decorative images have empty alternative text and are hidden from assistive technology. Responsive images reserve dimensions to avoid layout shifts. The full campus remains visible on mobile without cropping. A landscape concept was also generated before the user clarified the hero subject; it is retained locally and is not published on the website.

## Generation prompts

### Campus

Re-illustrate this exact OpenPlex office-campus composition as a crisp, high-resolution hero illustration. Preserve the overall wide isometric diamond-shaped arrangement of many adjacent cutaway office rooms and their relative placement, including the larger central office, small executive office on the right, desk clusters, library walls, glass partitions, sofas, monitors, and tiny colorful seated characters. Retain the app's charming architectural illustration style and pale warm cream, muted sage, dusty plum, blue-gray and ivory palette. The provided screenshot has distracting halftone grain and muddy tiny details: redraw with clean precise architectural outlines, calm nearly solid materials, delicate painterly shading, sharp identifiable furniture, correctly seated figures at keyboards, consistent perspective, and clear spacing between room tiles. This is a polished editorial rendering of the illustrated campus, NOT a landscape. All rooms must remain fully visible within the canvas, balanced and symmetric, with generous but modest outer cream margins. Background is flat warm cream #f5f0e6, WITHOUT background dots. Remove ALL screenshot UI and the tiny bottom 'Drag to explore' text. No text anywhere, no labels, no captions, no UI frames, no watermark, no borders. Eliminate halftone dots, moire, stippling and noise from every surface. Wide composition matching reference aspect ratio, finely resolved, attractive and immediately clear at website hero size.

### orbital

Generate a single isolated orbital armillary sculpture as a premium transparent-background website decorative cutout. A small intricate scientific curiosity: three elegant intersecting antique brass orbital rings around a warm ivory sphere, one muted plum enamel ring and tiny sage ceramic planets. Sculptural mathematical instrument, physically plausible crafted object, slightly whimsical editorial hand-painted illustration with soft tactile brush texture and fine warm golden highlights. Match warm cream and dusty plum branding, sophisticated book-cover illustration, not glossy 3D render, no blue neon. Three-quarter view, entire object centered with generous transparent margins, square composition. No pedestal, no floor, no rectangle, no background color, no botanical elements, no flowers, no text, no letters, no watermark. Real alpha transparency surrounding the cutout, including openings between the orbital rings. Object should read well at 180px on cream paper.

### mobius

A single beautiful mathematical Möbius ribbon sculpture, isolated cutout on genuinely transparent background. A graceful continuous twisting band of warm ivory paper and muted dusty plum on the reverse, fine aged brass edging, a tiny sage geometric sphere tucked near one turn. Sophisticated painterly editorial illustration matching antique scientific curiosities, tactile soft brush grain and warm sunlight, three-quarter view, natural gentle curvature, precise uncluttered silhouette. Entire sculpture centered in a square frame with transparent margin. Elegant object of curiosity for a warm cream creative software website, reads clearly at 150px. No flowers, no leaves, no botanical decoration, no floor, no pedestal, no backdrop, no colored rectangle, no text, no watermark, no labels, no extra objects. Real alpha transparency outside the sculpture and through the openings. Avoid red outlines or colored edge fringe, avoid neon or glossy plastic.
