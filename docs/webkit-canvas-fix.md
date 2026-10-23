# WebKit office visibility and grid — 21 October 2026

The Mac app's canvas reused cached architecture by unconditionally calling
`CanvasRenderingContext2D.isContextLost()`. The installed WKWebView reports that
method as undefined. On the first reused tile, rendering threw after clearing
the backdrop, leaving an empty office canvas on subsequent frames.

Cached tiles now feature-detect the method and keep using WebKit's existing
context-loss event recovery. ResizeObserver updates no longer reset unchanged
canvas backing dimensions, and an actual resize repaints synchronously.

The builder requests a transparent scene background. Its paper color and sparse
30px radial-gradient dot grid are CSS beneath the canvas, so dots do not overprint
room surfaces. The preset renderer retains its existing opaque paper background.

`npm run test:webkit` requires macOS and the builder dev server on port 5180.
It uses an ephemeral WKWebView data store and directly imports the same renderer.
The test checks nonempty pixels for 120 frames across 25%, 55% and 86% zoom,
texture phases, cache resets and canvas backing-store resize. It also saves a
native WebKit snapshot with the actual builder stylesheet in output/playwright.
This is a renderer regression test, not a simulated Chrome compatibility claim.
No saved app projects are changed by it.

Native observations: isContextLost is undefined; all 120 frames remain nonempty.
The regression, builder tests, production build, lint and Mac bundle build pass.
