# Open Glass integration — 21 October 2026

Himanshu chose the original split warm garden design after reviewing full-image
alternatives, and requested his Open Glass liquid-glass material behind the
onboarding caption. The selected browser preview and native app retain that
split composition. The caption surface is also used for the dashboard's garden
caption. Future OpenPlex liquid-glass additions should reuse this implementation.

Source: `himanshuchawla0807-gif/open-glass-recorder`, commit
`b3f1123171c56c21adc221258cdde1214a0fc58e`. The repo separates its independently
written MIT renderer from recovered reference code. Only the MIT shader is used.
The original shader remains intact; a separate adapter registers its wallpaper
sampling to the visible art panel, uses a rounded rectangle, and warms its tint,
edge lighting and contrast for the cream/plum palette.

REA analysis parent Evidence:
`ev_4740346f1e09887b200f966ce1979f6c4f2f0ed3bc457b7ad4fcba1e849202fc`.
Summary Evidence:
`ev_f9df442a727b4773cdee07e34b3a560394b8f4717d2a7b6d2b11f1a04e663425`.
Module identity page:
`ev_4f7c0a3eeaee72c25f1b53454ccec84d2ab423c9e31d0e05fb4f748e1fa0950c`.
REA parsed eight source files with no parse failures, but semantic relationships
remain partial/unknown. Static evidence does not prove rendering or runtime
behavior; the source shader was separately read, then the adapter was checked in
Chrome and the actual Mac app.

The material samples the supplied wallpaper, not arbitrary live DOM. It has no
recording or microphone controls. Default settings are warm and quiet, with
pointer deformation disabled by reduced motion. Rendering is demand-driven.
The shared CSS retains a readable fallback when WebGL2 is absent or lost.
The auto-mounter handles React insertions/removals and bfcache page restoration.

## Material correction and coastal editorial preview

The repository's default demo uses a different recovered reference renderer;
the independent MIT implementation is not pixel-identical to that demo. REA
reference inspection summary `ev_d5aff56eb7b486c9900a615a08e935487b8329258f3239455851a9f0376b8ffb`
is static, with semantic traversal truncated. Directional reflections and a
physical bevel informed an independently authored adapter correction. No
recovered reference shader was copied into production. RGB fringing and the
constant bright rim were removed. Full-image wallpaper sampling now matches
the whole background, including its navy/plum shading.

The coastal editorial alternative uses installed Athelas (including true italic),
unchanged self-hosted Switzer Regular/Medium, and navy, ivory, shell pink and
flower accents. It is available at theme-preview.html?theme=coast-editorial&fullscreen;
the warm split design remains the app default. Browser checks confirmed both
font faces, image registration, mobile layout, department artwork, context-loss
fallback and restoration. Build and lint passed.

The native art pane is constrained to its SwiftUI geometry to prevent WKWebView
layout expansion. Native probing confirmed the WebGL2 renderer and loaded
wallpaper after activation. Initial demand-driven drawing also runs while the
app is inactive, because WebKit may report a hidden document before activation.
The temporary native probe was removed.

Himanshu subsequently rejected the coastal direction. The comparison UI now
shows only warm options and ignores the old coastal query. The chosen warm
caption hugs its text with bounded max-content sizing, rounded edges and a
weighted nine-tap background blur. Text is separate from the canvas and sharp.

## Final placement decision

Himanshu requested smoother Gaussian blur, then explicitly removed liquid glass
from these captions. Dashboard, browser preview and native welcome now use plain
readable type on the garden. Their pages no longer load the glass renderer. The
unused component retains a cached two-pass Gaussian wallpaper preparation for
future suitable surfaces. No coastal theme is exposed in the product.
