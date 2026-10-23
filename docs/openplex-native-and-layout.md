# OpenPlex layout and native app — 21 October 2026

## Delivered

- OpenPlex web branding and page metadata; existing storage identity retained.
- A main-office anchor centered at world origin. Opposing department rows and
  columns have a three-unit minimum circulation gap, based on actual footprints.
  Up to twelve departments occupy one shell; larger campuses add outer shells.
  Uneven department counts necessarily differ in occupancy, while the ten-room
  campus has symmetric outer bounds around its main office.
- Saved automatic arrangements recompute at load. Manual placements are retained.
- A buildable, ad-hoc-signed SwiftUI app at `output/OpenPlex.app`, with native
  onboarding and a bundled React/Canvas project dashboard in WKWebView.
- Native Projects, New Project and Fit commands connected to the web workspace.
- Warm garden artwork and an authored, vector-sharp department SVG. The coastal
  image and coordinated sky-blue/marine palette live in `public/theme-preview.html`
  as an alternative, pending the user's choice. Warm garden remains the default.

## Validation

Web production build and lint pass. The existing suite reports 60 passed and one
historical archived-artwork skip. Seven builder tests pass, including all campus
sizes from 1 to 100, a main-office anchor added last, repeated room templates,
non-overlapping circulation gaps, migration, manual-coordinate preservation,
capacity and saved-data validation.

Chrome UI checks pass for furnished and blank projects, room and employee
addition, auto/manual toggling, fit, saving/reloading and command-event handling.
No page exceptions were observed during that flow. Theme switching, SVG loading
and a 390px-wide preview were checked. Screenshots are in `output/playwright/`.

Native release compilation and ad-hoc signature verification pass. The macOS
onboarding, bundled workspace and new department SVG were inspected in the actual
app. The first native rendering uses the system serif and system sans fonts;
browser typography uses its existing Google Fonts stylesheet with local fallbacks.

REA target discovery evidence:
`ev_42f1ae9164495cb53408814e65b7e994b6265b035fd698ebf55351bd08aba281`.
This identifies the local Chrome target only; it is not visual or functional proof.
Visual/functional findings above come from browser and native UI checks.

## Boundaries

The native shell embeds the shared web dashboard; the dashboard itself is not
rewritten in SwiftUI. Agent terminals, prompt/skill/MCP/plugin editors, accounts,
cloud sync and shared agent context remain future work. Native project storage is
separate from browser storage. The build is for this Mac's architecture and has
not been notarized or tested on other macOS versions/devices. Full offline font
availability and universal 60 FPS playback are not claimed.

Final user-directed preview revision: Coastal Light now uses sky-blue paper
(`#edf5fc`), marine-blue ink (`#204f78`), blue secondary text (`#526f8b`), terracotta
progress and a blossom-pink brand accent. It does not change the warm app theme.
A matching coastal SVG variant is used only in that preview. The visible in-app
browser was refreshed and checked after this change. The final native build was
reopened with the warm garden illustration; its New Project toolbar command was
verified opening the web dialog, then the dialog was closed without creating data.
The furnished preset also loaded with `ready:true` and `error:null`.

Full-image coastal preview: a third option covers the complete onboarding window
with the coastal illustration. A marine gradient is strongest behind the left
reading area, fading toward the bright sea. Type is warm white; the button uses
light peach-clay with dark marine text. Original warm and split coastal options
remain available, and the app's selected warm theme is unchanged. Theme switching,
the department step and a 390px mobile layout were checked in Chrome.

User returned to the first warm theme and requested a full-screen study. The new
Full-image Garden preview uses the original garden, warm-white text, a plum
reading gradient and cream-gold button. `theme-preview.html?fullscreen` hides the
comparison frame for an edge-to-edge view; the app's selected split warm theme
is unchanged. The warm full-screen preview is the comparison page's initial
selection. Department-step SVG loading and mobile overflow were checked.

## Latest chosen design and app increment

The user rejected the coastal direction and chose the original split warm garden.
Coastal controls are removed from the preview. The caption glass now hugs its
text, retains rounded edges and softly blurs only the sampled wallpaper. The
actual Mac app was checked after rebuilding, including the inactive first render.

Project and selected-department pencil buttons open rename dialogs. Names are
trimmed, limited to 80 characters, saved locally and reflected in the workspace.
Whitespace-only names cannot be submitted. Escape or Cancel discards edits.
Browser checks covered both rename flows, reload persistence, cancellation and
blank-name rejection; original project data was restored after testing. Mobile
preview overflow and compact caption width were checked. Seven builder tests,
web/native builds and lint passed.
