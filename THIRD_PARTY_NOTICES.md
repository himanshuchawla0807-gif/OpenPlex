# Third-party notices

The project depends on `@clayzo/animation` and `@clayzo/webgl-player` 0.3.17. These are governed by the proprietary Clayzo SDK License supplied in each package's `LICENSE.md`, not by this project's MIT license. The authorized, unmodified browser playback runtime is embedded in the application. The project-authored animation documents and modern office drawing code are separate from the SDK implementation. Official resources: https://www.clayzo.com/ and https://docs.clayzo.com/.

The earlier raster rooms and atlas remain as historical assets; the active scene does not load them. The preserved third-party reference under `reference-lab/a-small-light` has separate provenance notes and no assumed redistribution license. It is not part of the office production bundle.

Runtime packages React and React DOM are MIT licensed. Vite is MIT licensed;
TypeScript is Apache-2.0 licensed; Oxlint and the remaining development tools
retain the licenses included with their npm packages. See package.json and
package-lock.json for exact versions. node_modules is not vendored in this repository.

The project began with a Vite/React TypeScript starter. The current office uses browser Canvas 2D for procedural geometry and registered raster character poses. Preserved vector experiments use Clayzo WebGL2; Three.js is not a dependency. Manrope and DM Mono are self-hosted from the official Google Fonts repository under the SIL Open Font License. Their licence texts are included alongside the font files; no Google Fonts request is made at runtime.

The optional local review scripts can use @napi-rs/canvas supplied separately by a
developer's environment; it is not a runtime dependency or bundled binary.

Project illustration provenance and reference exclusions are documented in ARTWORK.md.
No external reference screenshot, original reference-site artwork, logo or character
is claimed as this project's open-source property.

## Open Glass caption material

The independent MIT shader from Himanshu Chawla's
[open-glass-recorder](https://github.com/himanshuchawla0807-gif/open-glass-recorder)
(commit `b3f1123171c56c21adc221258cdde1214a0fc58e`, `src/shaders.js`) is preserved
in `public/open-glass/recorder-shaders.js`. Its license is included at
`public/open-glass/LICENSE`. The caption adapter changes the card shape,
wallpaper registration and warm material settings, and omits the audio component.
Recovered third-party renderer files in that repository's `vendor` directory are
not included in the production bundle. The read-only source checkout under
`reference-lab/open-glass-recorder` is retained only for analysis/provenance.

## Typography

Manrope and DM Mono are bundled under `public/fonts/` with their OFL licence texts. Original files come from `google/fonts` (`ofl/manrope` and `ofl/dmmono`). Switzer is not redistributed in this public source release. Athelas resolves only through locally installed fonts; no operating-system font is bundled.

## Interactive terminal

`@xterm/xterm` and `@xterm/addon-fit` are MIT licensed. Their original license
texts remain in the installed npm packages; exact versions are recorded in
package-lock.json. The terminal uses the installed provider CLI and its own sign-in.

## Harness brand icons

Provider icons identify their respective third-party products. Download locations
are recorded in `public/harnesses/sources.json`. Logos remain the trademarks of
their owners; their presence does not imply sponsorship or provider certification.
No provider application is redistributed with OpenPlex.
