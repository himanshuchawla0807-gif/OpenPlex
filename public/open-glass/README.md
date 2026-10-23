# Open Glass caption material

The original shader is copied without modification from Himanshu Chawla's MIT
implementation in [open-glass-recorder](https://github.com/himanshuchawla0807-gif/open-glass-recorder),
commit `b3f1123171c56c21adc221258cdde1214a0fc58e`, `src/shaders.js`.
See LICENSE in this directory. No recovered `vendor/reference-recorder` engine,
recorder controller, microphone code or wallpaper from that repository is bundled.

`caption-glass.js` adapts the original shader into a rounded caption surface:
source-image sampling is registered to the parent image's cover crop, the rim
and tint are warmed, and the shape becomes a rounded rectangle. The revised
material uses Snell refraction, a physical bevel, gentle multi-tap frost, Fresnel
and directional reflections. It removes separated RGB edges and the constant
bright outline. Full-image themes register sampling to the entire background. It renders on image load, resize and pointer changes,
rather than keeping a continuous loop alive. Reduced motion disables pointer
attraction. A CSS fallback is provided for unavailable/lost WebGL contexts.

The renderer samples an explicit same-origin wallpaper, not arbitrary live HTML.
The adapter contains no microphone, audio capture, or permission requests.

A surface uses `.glass-caption`, `data-glass-src`, and `data-glass-backdrop` (an
ancestor selector). `data-glass-position-y` sets the source image's vertical
object position as a fraction from the top. Include caption-glass.css and auto.js.
The public module is shared by the browser preview, React dashboard and the
native app's bundled onboarding artwork view.

Current product decision: no active glass captions. Welcome and dashboard
copy is plain text on the illustration. This reusable material is retained for
future appropriate surfaces only. Its wallpaper now uses a cached two-pass,
25-sample-per-axis Gaussian blur rather than a sparse nine-tap approximation.
The blur recomputes on wallpaper/backdrop-size changes, not every pointer frame.
