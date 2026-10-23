# Native task runtime reliability — 21 October 2026

The local Codex task runner now retains failed-turn status even when the CLI
exits with status zero. Previously an `error` or `turn.failed` JSON event set the
employee to attention, then `finished` with exit code zero changed it to complete.
The runner now emits a nonzero task result in that case, including when the last
JSON event has no trailing newline. Ordinary successful tasks keep exit code zero.

Stderr is assembled before UTF-8 decoding, so a multibyte character split across
pipe reads remains intact. Diagnostic reads no longer discard everything after
their first 16 KB. Long lines are streamed in bounded chunks; an unterminated final
diagnostic is flushed before the finished event.

The runner rejects oversized or non-text system prompts instead of silently
starting an employee without their configured instructions. Authorized folder
paths must also identify directories, rather than merely existing files.

`npm run test:native` passed with a deterministic local executable fixture. The
expanded probes cover failed-turn JSON with process exit zero and no newline,
150 KB diagnostics with fragmented UTF-8 and a final unterminated line, oversized
system prompts, and file-versus-directory validation. Existing tests still cover
two simultaneous employees, duplicate task rejection, owned session resume,
foreign session rejection, fragmented JSON/stdout UTF-8, stop, and TOML values.

No real Codex/provider task was submitted. This remains a task console, without
interactive permission replies, PTY embedding, second-provider support, or
automatic reconnection to historical processes.
