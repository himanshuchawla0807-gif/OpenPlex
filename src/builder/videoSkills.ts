import type {EmployeeFile} from './employees'
/** Original OpenPlex starter instructions, with official references; no external installer. */
export const videoSkills:EmployeeFile[]=[
 {name:'remotion-composition.md',content:`---
name: remotion-composition
description: Create and edit frame-based React video compositions with Remotion.
---
Use when the employee is asked to create a video or motion graphic. Inspect the existing project and preserve user edits. Define composition width, height, fps and duration explicitly. Use useCurrentFrame() and useVideoConfig() to drive deterministic animation; calculate timing in frames. Keep assets within the project and use staticFile() for public assets. Inspect key frames and the Studio preview before rendering. Avoid CSS animations for exported motion because they are not tied to the render frame. Report missing media rather than inventing it.
Official references: https://www.remotion.dev/docs/composition ; https://www.remotion.dev/docs/use-current-frame ; https://www.remotion.dev/docs/staticfile
This skill is guidance, not an installed Remotion runtime.`},
 {name:'remotion-render-qa.md',content:`---
name: remotion-render-qa
description: Render and verify a Remotion video or still with the CLI.
---
Use when exporting an existing composition. Confirm the package scripts and available compositions, then use npx remotion render with the selected composition and output path. Use npx remotion still for a single-frame inspection. Match codec, size, frame rate and audio requirements to the user's destination. Do not claim success from a preview alone. Verify the actual output exists, inspect its dimensions and duration, view representative frames, and listen to the resulting audio. Keep the original sources and note missing dependencies or failed renders clearly.
Official references: https://www.remotion.dev/docs/cli/render ; https://www.remotion.dev/docs/cli/still
This skill does not install packages or authorize publishing.`},
 {name:'remotion-captions-audio.md',content:`---
name: remotion-captions-audio
description: Align captions and inspect audio in a Remotion video.
---
Use when working with subtitles, narration or music. Preserve a structured caption source using text, startMs and endMs; distinguish milliseconds from composition frames. Check spelling and synchronization against the source audio. Use the installed Remotion audio component and frame-driven volume controls appropriate to that project's version. Listen to narration, music and transitions at representative points and inspect the exported file for clipping, accidental silence and sync errors. Do not claim noise removal or loudness correction unless the audio was actually processed and listened to. Ask for the noisy source file when none is available.
Official references: https://www.remotion.dev/docs/captions ; https://www.remotion.dev/docs/using-audio
These original starter instructions are not a transcription or noise-reduction service.`}
]
