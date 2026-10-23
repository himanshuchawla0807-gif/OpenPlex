# Application icons

The native icon has a rounded background tile: warm ivory in Light mode, and a charcoal-plum gradient in Dark mode. The existing OpenPlex courtyard mark remains the subject. Alpha transparency outside the rounded silhouette lets the tiles sit naturally in the Dock. These assets affect the application icon only; the web logo and welcome artwork remain unchanged.

The running Dock icon follows the app's Light, Dark or System preference using [NSApplication.applicationIconImage](https://developer.apple.com/documentation/appkit/nsapplication/applicationiconimage). The signed bundle is never rewritten during switching. The bundled ICNS uses the light/default tile when the app is not running; this implementation does not promise dynamic Finder or Launchpad variants.

## Artwork provenance

Both variants were edited with the built-in image-generation tool from the existing light and dark marks. The PNG files are normalized to 1024 × 1024; the light PNG supplies the bundled ICNS resolutions.

Light prompt:

> Use case: precise-object-edit. Native macOS application icon, square canvas. Preserve the supplied OpenPlex isometric O/P courtyard mark exactly in shape, colors and perspective. Add an opaque warm ivory rounded-square background tile behind it, with a subtle cream tonal gradient, refined rim and very restrained grounding shadow. Tile occupies 90% of square canvas with generous rounded corners, mark centered and occupying 72% of canvas. Front-facing flat tile, not tilted. Real transparent alpha only outside the tile's rounded silhouette. Keep mark clear and recognizable at Dock size. No lettering, objects, scene or blue. Change only framing and background.

Dark prompt:

> Use case: precise-object-edit. Native macOS application icon, square canvas. Image 1 is the edit target: preserve its OpenPlex isometric O/P courtyard geometry, violet/rosy copper materials and warm doorway lighting. Image 2 is the matching light icon: match its rounded-square tile silhouette, framing, centered logo placement and margins exactly. Add an opaque charcoal-plum rounded-square background tile with a subtle dark plum gradient and restrained violet ambient glow behind the logo. Flat front-facing tile, no tilt. Real transparent alpha only outside rounded tile corners. Crisp clean continuous edges, no particles. No lettering, extra objects, scenery or blue. Dark tile must provide excellent contrast with mark at small Dock size.
