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
