# Per-employee interactive harness terminals

OpenPlex now hosts a controlling Darwin PTY for each open employee terminal.
Codex and Claude Code launch as their installed interactive CLIs, using their
existing login and configuration. OpenPlex does not read or copy auth files.
Opening a terminal does not submit a task: the user types into the CLI, including
its trust, permission and setup prompts. The original streamed task console is
separate.

The bridge accepts `terminal-open`, `terminal-input`, `terminal-resize` and
`terminal-close`. Open requires an employee key, `provider` (`codex` or `claude`),
an authorized project directory, profile context and MCP JSON. Every running
terminal has a new UUID `sessionId`; input, resize and close require that exact
identity so stale panels cannot control a later terminal. Reopening the same
employee/provider/folder reattaches to its live process and replays up to 2 MB of
in-memory terminal output. Profile changes take effect on the next new terminal.
Changing provider or folder requires closing the current process first.

`openplex-terminal` events have `key`, `kind`, `sessionId` and `provider`.
`opened` includes `reused` and base64 `replay`; `data` includes base64 raw terminal
bytes. `exit` includes `exitCode` and `closed`. Error events use plain `message`
(and plain `data` for compatibility); errors before allocation have no session ID.
Input `data` is also base64. Raw bytes preserve ANSI controls and UTF-8 boundaries
for the terminal emulator. Terminal replay is memory-only and cleared on process
exit. Closing a panel does not implicitly kill the process; explicit close does.
App shutdown sends hangup/termination to owned terminal process groups.

Codex receives invocation-scoped `developer_instructions`, MCP TOML overrides,
read-only/workspace-write sandbox selection, and on-request approvals. Claude
receives `--append-system-prompt`, `--mcp-config` and `--permission-mode plan`
when edits are off, or `manual` when edits are enabled. Claude plan mode is a
provider permission mode, **not** an operating-system read-only sandbox. Existing
CLI settings/plugins retain their own behavior. Referenced skill/plugin text is
context; this implementation does not install packages or enable bypass flags.

Provider commands use argument vectors and a fixed provider executable allowlist,
with no shell command interpolation. Native bootstrap and terminal sizes are
bounded; there are at most 12 simultaneous terminals. Live terminal handles are
not restored across app launches. The CLI's own conversation history remains
available through its interactive commands.

Validation: `sh scripts/test-terminal.sh` runs a deterministic local executable,
without submitting provider tasks. It checks stdin/stdout/stderr TTYs, controlling
`/dev/tty`, separate session leaders, two concurrent providers, ANSI and UTF-8
bytes, isolated input, resize/SIGWINCH, reattach/replay, exit/reopen identity,
stale input/resize/close rejection, explicit close, folder/provider validation,
and scoped argument construction. `swift build --package-path native/OpenPlex`
also compiled the integrated native bridge. Real provider interactive rendering
and account permission flows are not asserted by these fixtures.

CLI flags were checked against locally installed `codex --help` and
`claude --help`, alongside the [official Codex command reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
and [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference).
