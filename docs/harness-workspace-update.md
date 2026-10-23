# Employee workspace update — 22 October 2026

The character action menu is a compact card positioned beside the clicked
character. Profile, Work & schedule, and Chat are directly available. It clamps
to the canvas viewport. It is a click menu; hovering only outlines the character.

Chat and Terminal are two views over the same native PTY, with the warm garden
header, cream surfaces and plum accents. Switching views does not launch another
agent. Chat submits bracketed-paste text to the live CLI; responses show the
terminal’s normalized live text, not an independent model or a fabricated answer.
The full terminal retains ANSI rendering and tool approval controls. Drafts and
outgoing messages save locally. Output replay lasts while the native session
remains alive. Interactive-first conversation resume after quitting remains
provider-dependent; this update does not add structured session IDs for every CLI.

## Employee configuration

Saving/hiring with a chosen native project folder prepares:

```
<chosen project>/.openplex/employees/<employee-name>-<identity-hash>/
  employee.json
  AGENTS.md
  CLAUDE.md
  instructions/
  skills/
  plugins/
  mcp.json
  .agents/skills/employee-skill-*/SKILL.md
  .claude/skills/employee-skill-*/SKILL.md
```

Launching Chat/Terminal or a scheduled/task-console invocation refreshes that
configuration and uses the employee directory as its working directory. File
references include their complete saved text. Skill packages are materialized for
Codex/Claude discovery; old managed skill entrypoints are removed when a skill
is removed. Global CLI settings are not rewritten. MCP settings are passed to
Codex/Claude and scoped to OpenCode through its process configuration. Plugin
references are saved/contextual text; downloading or installing plugin packages
is not implemented here. Other terminal adapters reject nonempty MCP settings
until they have a provider-specific configuration adapter, rather than silently
ignoring them.

The directory is bounded to the authorized project root. Managed path components
cannot be symlinks. An existing unowned employee directory is rejected. Files
use private permissions. The UI says configuration is ready after file setup;
it does not claim that model training or a provider login has completed.
Workspace trust prompts in the provider still apply. A renamed employee gets a
new name-based directory and needs a fresh compatible conversation.

## Harness catalog

All thirteen requested harnesses appear with provider icons and documented
commands. Installation is checked without running an installer or reading tokens.

| Harness | Command | Connection level |
| --- | --- | --- |
| Codex | `codex` | Task console, scheduling, scoped MCP, PTY |
| Claude Code | `claude` | Task console, scheduling, scoped MCP, PTY |
| Antigravity | `agy` | PTY; scoped role prompt, plan/sandbox defaults |
| Cursor | `cursor-agent` / `agent` | PTY launch, employee instruction folder |
| OpenCode | `opencode` | PTY; scoped process config for rules/MCP |
| Muse Code | `muse` | PTY launch, employee instruction folder |
| DeepSeek Harness | `dsh` | Catalog; SDK/profile bridge still required |
| Z Code | `zcode` | PTY launch, employee instruction folder |
| M Code | `mcode` | PTY launch, employee instruction folder |
| Kilo Code | `kilo` | PTY launch, employee instruction folder |
| OpenClaw | `openclaw` | Catalog; gateway/per-agent binding still required |
| Hermes Agent | `hermes` / `hermes chat` | PTY launch, employee instruction folder |
| Devin | `devin` | PTY launch, employee instruction folder |

PTY launch is not a claim of live-model certification. Provider workspace-trust,
login, installation, configuration formats and tool approvals still apply.
Scheduling currently runs Codex/Claude tasks while the Mac workspace is open;
other harnesses show this restriction in Work. Scheduled execution refreshes the
saved employee profile in the same folder. A live terminal blocks streamed work
for that employee, and active terminal identities are restored to the UI on load.

## Conversational builder

“Build employee” saves a setup brief and accepts a prepared JSON profile for
review. The builder LLM is explicitly awaiting the user’s provider/key. There are
no fabricated conversational edits. Keys should be connected through the native
credential layer when that provider is chosen, not embedded in frontend code.

## Sources

Brand icon origins are in `public/harnesses/sources.json`. Command references:
[Meta Muse Code](https://dev.meta.ai/docs/muse-code),
[DeepSeek CLI source](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md),
[ZCode distribution](https://github.com/zai-org/ZCode/blob/main/README.en.md),
[MiniMax Code](https://github.com/MiniMax-AI/minimax-code),
[Hermes CLI](https://hermes-agent.nousresearch.com/docs/user-guide/cli/),
[Devin CLI](https://docs.devin.ai/work-with-devin/devin-cli),
[OpenCode CLI](https://opencode.ai/docs/cli/),
[Kilo CLI](https://kilo.ai/docs/code-with-ai/platforms/cli),
[Antigravity CLI](https://antigravity.google/docs/cli/reference/),
[Cursor CLI](https://cursor.com/docs/cli), and
[OpenClaw agent workspaces](https://docs.openclaw.ai/cli/agents).
Installed OpenCode and Antigravity `--help` were also inspected.

## Verification and delivery

Production build and lint pass, along with 31 builder/session/schedule/profile
tests and deterministic native task/PTY/employee-folder fixtures. Browser checks
cover all thirteen icons, compact projected menu placement, setup brief retention,
complete instructions/skills in the launch payload, chat-to-PTY routing, live
output and single-session view switching. No live model task was submitted by the
verification scripts. REA statically parsed sixteen builder modules without parse
failures; dynamic semantics remain unknown and this is not runtime proof.

An existing Codex PTY is active in the user’s running Mac app. The updated build
is staged at `output/next/OpenPlex.app` so that session is not terminated. Close the
existing employee terminal and quit the running app before opening the staged
build. The browser dashboard is available on port 5180 for visual review now.

## Hiring-page and composer refinement

“Build your employee with chat” now appears beside the People hiring controls
and beside Hire employee. It opens a separate builder page instead of a profile
tab. Returning to profile review preserves unsaved employee fields. The setup
brief persists under a project/room/character identity. The builder LLM still
awaits the provider/key previously requested by the user.

The shared-session composer expands with multiline text, accepts bounded text
attachments, and uses a provider label, attachment control and circular send
button. Browser previews explain that native connection requires the Mac app;
Connect remains actionable and reports the reason instead of silently disabling.
An unanswered native launch times out with recovery guidance. An incompatible
stored conversation offers an explicit fresh session. Existing live terminals
reattach without applying stale task-console conversation ownership checks.

The old app was quit and replaced at `output/OpenPlex.app`. Its previous bundle
is preserved in `output/app-backups/OpenPlex-20261022-144243.app`. Existing four
projects loaded after replacement. In the installed Mac app, Otis’s actual Codex
PTY connected successfully in his employee folder and displayed its ready TUI.
No model task was submitted; the terminal was left connected for the user.
Browser checks passed for both builder entry points, a standalone page, unsaved
profile retention, explanatory browser connection errors, native bridge connect,
and text attachments reaching the same PTY. Build, lint, 31 builder tests and
native terminal/employee-folder fixtures passed.
