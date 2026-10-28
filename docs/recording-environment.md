# Recording OpenPlex

Start `npm run dev:builder` and, in another terminal, `npm run recording`. Open either local page:

- Room-by-room camera: http://127.0.0.1:5180/?builder&recording=reference&motion=full
- Cinematic camera: http://127.0.0.1:5180/?builder&recording=cinematic&motion=full

Choose a room in the floating camera bar. **Overview** returns to the complete campus. **Canvas only** hides office navigation; Escape restores it. Press **H** to hide or restore the camera bar for recording. Dragging or using the wheel cancels a camera move. Both pages retain the full app: Team workspace, people, employee builder and Office Communicate. They share the same sandbox and chats.

The reference camera uses cubic ease-in-out, a 3.4-second room move, and a small distance-dependent pull-back. These mechanisms were observed in the reference site's shipped JavaScript using REA (evidence `ev_4191da50a6d882da8b6eefc2980e2499140038e4ec8ba90552e0164084d58dc1`). OpenPlex implements its own camera code; it does not embed the reference site or artwork. The second page uses shorter 1.5-second moves and a restrained pull-back, inspired by the supplied X video's framing; it is not an exact reconstruction of that video's editing timeline.

The local bridge listens only on loopback, accepts the exact local Vite origin and an ephemeral request token, and limits commands to this recording sandbox. It creates a dedicated `output/recording/workspace` folder. Stop it with Ctrl+C to close its owned terminals and tasks. It never touches existing native-app sessions. Recording controls and bridge loading are developer-only and are excluded from the production bundle.

The recording sandbox is a separate office named **OpenPlex · recording sandbox**. It contains 15 staffed rooms and all 40 distinct employees. Twelve people sit in the main office, Oscar sits alone in the CEO office, and the remaining people are spread across the departments.

Its conversations describe a fictional OpenPlex launch project. Each employee has a department assignment, supplied milestones and a next step. These messages are seeded locally so you can show the workspace without launching 40 model sessions or paying for background work. No harness starts when this office is created. The seeded messages deliberately identify their progress as fictional.

The helper `seedRecordingProject(localStorage, optionalFolder)` appends this office once. It preserves existing offices, chats, sessions and appearance preferences. Opening it again keeps any edits you made to the sandbox. A malformed store or a conflicting conversation causes the helper to stop before replacing data.

Choose a dedicated empty folder before connecting a real harness. Demo employee instructions prohibit tools, file access, commands and delegation. Those instructions are a prompt, not a security boundary: keep **Allow edits at start** off and review the installed harness’s permission settings. Connect only the employees you need to show, ask a short question, and end each session after capturing it.

The employee profile schema stores the harness, not a model identifier. The local recording bridge requests **GPT-6 Luna** through a separate Codex wrapper without modifying your Codex configuration. If your signed-in provider does not support it, restart the bridge with `OPENPLEX_RECORDING_MODEL=your-supported-model npm run recording`. The fixture itself never starts inference. Sending a message or asking for an Office Communicate update uses your provider allowance.

Office Communicate reads the saved work snapshots. Asking “Oscar, what’s going on?” gives its status reporter the fictional CEO brief and conversation as evidence. A connected model can summarize that scenario; it should not describe the seeded milestones as actual work on your computer. Status reports use the configured provider and may incur usage. Stopping status requests does not end employees’ working sessions.

For a real recording, show the office overview first, zoom into a department, then open Team workspace. Show Terminal and Chat as two views of the same employee session. Use Office Communicate last for a progress recap. Record your chosen screen or browser window with your preferred recorder; no video is published by this environment.
