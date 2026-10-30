# Recording environment verification

Validated locally on macOS on 29 October 2026.

- Builder suite: 70 tests passed, including new conversation-input, dense room-layout and recording-fixture checks.
- Procedural suite: 14 tests passed.
- TypeScript, lint and production build passed. The bundler reports an existing large-chunk advisory.
- Native app rebuilt and its ad-hoc code signature verified. This is not Apple notarization.
- Inspected the 15-room overview and close room view. Low-zoom stipple uses a fine, irregular dot screen to remove coarse interference patterns; inspection zoom retains the illustrated halftone.
- Both local camera modes exercised: reference room move and cinematic CEO-office move, with overview and navigation controls.
- Office Communicate enabled send button computed color: `rgb(255, 248, 241)` on `rgb(96, 75, 97)`.
- Live Codex recording wrapper identified itself as GPT-6-Luna. Oscar returned a live status summary from the seeded fictional work snapshot. Existing native-app sessions were not used.
- Mocked native-bridge streaming check: Chat → Terminal input → partial reply → Chat → completed reply retained one PTY (one attach, zero new opens on switching).
- Live Luna check: typed a prompt in Bennett's terminal, switched to Chat while it was working, then received the completed reply there. A hollow Codex working spinner initially polluted the transcript; the fix and regression test now retain exactly one prompt and one reply across redraws. This was checked again against the live session.

The fixture contains explicitly fictional progress, not evidence of completed business work. Real inference occurs only when a user connects and submits a message or asks for a status update. This check does not certify all provider adapters or replace the broader release security audit.

Local visual evidence is under `output/playwright/recording-*.png`; repeatable interaction scripts are under `output/recording/`. The rebuilt Mac app is `output/next/OpenPlex.app`. The currently running Mac app was not restarted because it has existing user sessions.

## Camera performance — 30 October 2026

Measured in the actual macOS in-app browser, with 15 rooms, 40 animated employees, light appearance and device pixel ratio 2. These are completed-transition RAF measurements, including delayed frames, rather than inferred FPS from JavaScript render cost.

| Camera / transition | Viewport | Average FPS | 95th-percentile frame | Longest frame | Tile rebuilds |
| --- | --- | ---: | ---: | ---: | ---: |
| Reference overview → main office, before | 1101 × 978 | 21.07 | 266.7 ms | 333.4 ms | 1635 |
| Reference overview → main office, after | 1101 × 978 | 60.00 | 18.0 ms | 18.6 ms | 0 |
| Reference main office → CEO office, after | 1101 × 978 | 59.99 | 17.9 ms | 18.6 ms | 0 |
| Reference CEO office → overview, after | 1101 × 978 | 59.99 | 17.6 ms | 18.6 ms | 0 |
| Cinematic overview → main office, after | 1280 × 720 | 60.00 | 18.0 ms | 18.5 ms | 0 |
| Cinematic main office → CEO office, after | 1280 × 720 | 60.00 | 17.1 ms | 18.6 ms | 0 |
| Cinematic CEO office → overview, after | 1280 × 720 | 60.00 | 17.8 ms | 18.7 ms | 0 |

The recording renderer now retains one room-tile density and one fine print scale through the camera path, uses bilinear image sampling, and reports the zoom HUD at 10 Hz. Camera motion and character animation still run every animation frame at Retina resolution. Normal production inspection zoom retains its existing detail levels. Eliminating cache churn alone improved the inward reference move to 40 FPS; changing resampling brought it to 60 FPS.

A cold return to overview, including 238 tile creations following hot reload, measured 59.10 FPS with one 33.4 ms frame. Warm measurements above therefore do not guarantee that initial loading or every screen size and computer will be free of dropped frames. No inference was started for performance verification.

Reproduce with the two recording URLs: choose **Canvas only**, **Overview**, **Main office**, **CEO office**, then **Overview**. After each completed move, read the canvas `data-camera-move` JSON. It contains elapsed time, RAF count, frame and render-cost percentiles, tile rebuilds, viewport and DPR; no transcript or employee content is included. The ordinary rolling diagnostics are separate and should not be used to measure a single transition.

Build, TypeScript, lint and all 72 builder tests passed. The existing large-chunk build advisory remains. Screenshot: `output/recording/zoom-performance-20261030.png` (local, not included in the source distribution).
