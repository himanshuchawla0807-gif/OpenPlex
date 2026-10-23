# Employee workspaces — 22 October 2026

For the later shared Chat/Terminal, employee folders and expanded harness catalog,
see [the current workspace update](harness-workspace-update.md).

OpenPlex uses the approved warm garden, cream and plum theme. The Mac app starts
with the three welcome pages on every launch. Projects and profiles remain local.

## People and departments

Hovering a character draws a small silhouette outline. Clicking opens Profile or
Work. Hit testing uses the character artwork’s alpha and the room’s projected
origin; empty sprite margins do not capture clicks. The room-center add control
has been removed. People can also be reached through the room inspector.

The main office has twelve seats; the eleven business departments each have
eight. The furnished preset retains its forty distinct employees and their prior
room allocation. Added capacity stays empty. See [department catalog](business-departments.md).
Department purposes describe intended workflows; they do not themselves enable
CEO delegation, publishing, data services or automated agent training.

## Profiles

Profile, Instructions, Skills, MCP, Plugins and Harness are editable. Codex and
Claude Code are supported. Older profiles default to Codex. Instruction, skill
and plugin references can be authored or imported as local text files, with up to
twenty files per section and 100 KB per file. MCP is a JSON object keyed by server
name. References are employee context; plugin packages are not installed and
skills are not package managed automatically. Global CLI configuration is unchanged.

Shared room notes go only to employees in that room. Previously submitted notes
remain in an existing conversation; start a new session for fresh context.

## Work overview and task console

Work shows the latest submitted task and actual response, process status,
requested/completed task counts, and scheduled tasks. There are no estimated
completion percentages. The streamed task console runs the selected installed
Codex or Claude Code CLI with its existing sign-in. Authentication tokens are not
read by OpenPlex. Choose the working folder with the native folder picker first.

Tasks default to read-only: Codex read-only sandbox or Claude plan mode. The
explicit edits option chooses Codex workspace-write or Claude manual permissions.
No approval-bypass flags are used. Provider permission requests that need
interaction should be handled in the interactive terminal. MCP integrations
retain their own tool capabilities and permission boundaries.

Each employee owns its conversation identity. Resume is checked against employee,
folder and provider. Up to twelve streamed tasks can run concurrently. Stop
interrupts then terminates a remaining process. Exit/protocol errors produce
attention status. Imported running history recovers as attention, without replay.

## Interactive terminal

Open terminal presents a cream-and-plum xterm.js terminal backed by a native
controlling PTY. Connect explicitly starts the employee’s selected CLI. Input,
ANSI output, UTF-8, resizing, interrupt and termination are supported. The input
field sends messages directly to this terminal. Both providers receive scoped
employee references, MCP settings and room context.

One employee can have one terminal. Closing its panel retains the process; open
and Connect reattaches with output replay. End terminal stops it. Streamed tasks
and an interactive terminal cannot run simultaneously for the same employee.
Owned task-console conversation IDs can be resumed in the terminal. Direct
terminal output is live in that terminal; it is not parsed into Work summaries
or counted as completed task-console turns. Interactive-first conversation IDs
are not yet imported back into the task console. Changing provider or folder
requires ending the old terminal and starting a fresh compatible conversation.
Quitting the app terminates its owned processes.

## Schedules

Scheduled tasks persist locally and run only while the Mac workspace is open,
with a valid employee profile, chosen project folder, and no active work for that
employee. Scheduled work uses the current saved profile and read-only defaults.
Claims are saved before launch; a storage failure prevents launch. Interrupted
claims recover as attention and are never automatically replayed. Pending tasks
can be cancelled. This is an app-open queue, not an operating-system scheduler.

## Verification

- Production web build and lint pass.
- 30 builder/session/profile/schedule tests pass.
- 67 office, routing, character, geometry and animation tests pass; one historical
  archived-artwork test remains skipped.
- Native task fixtures verify both providers, owned resume, stream parsing,
  fragmented UTF-8, errors, stop and configuration arguments.
- Native PTY fixtures verify controlling TTYs, isolated input, ANSI/UTF-8, resize
  signals, reconnect/replay, stale messages and termination.
- Browser checks verify projected character selection, alpha hit testing, visible
  outlines, Profile/Work choice, harness selection, queue add/cancel and terminal UI.
- The updated Mac build was opened through all three welcome pages. Existing
  projects loaded with twelve catalog templates, visible rooms and the dotted
  canvas; character selection, Work and the terminal panel were verified in WebKit.
- The installed CLIs’ help confirms the invocation flags. No live provider task
  was submitted during verification. This does not verify account quota or every
  provider feature against a live model.

The Mac app is a local development build, signed ad hoc, without distribution
notarization. Cloud sync, automatic CEO orchestration and plugin installation
remain future implementation work.

The optional Git release scanner could not run in this downloaded workspace
because it has no `.git` repository. No release scan or Git-history audit is
claimed. REA’s static bundle probe parsed the JavaScript but reported partial
semantic coverage after its worker memory limit; it is supporting static
inspection, not runtime verification.
