# Office Communicate: shared status feed

Open **Office Communicate** from the office header or team-workspace toolbar. It has an all-hands channel, a channel for each room/department, and a people list. Replies are threaded under the message that requested them and link back to each employee’s working chat.

## Audience

- In `# all-hands`, “What’s going on?” requests replies from all hired employees in this office.
- “Clove, what’s going on?” or `@Clove` selects the exact employee name. Multiple exact names can be included.
- “Technical department, what’s going on?” selects the staff in that department. Engineering is an alias for the technical department.
- A generic message inside a department channel selects that channel’s staff.
- Unknown explicit names/departments do not become a broadcast. The recipient list and count are shown before sending.

Routing is deterministic over the actual hired roster, not a speculative head-agent decision. It uses no additional model call. Renamed employees use their saved names; only the selected office participates. Unrelated offices are excluded.

## Independent reports

Every supported recipient gets a new `status:` request through its configured harness. The app does not send input to, resume, close or restart the working chat/terminal. It captures that employee’s recorded task state, recent streamed messages, saved terminal conversation and a bounded read-only live terminal tail. The report has a capture timestamp and an Open working chat link. It summarizes completed evidence, remaining work, blockers and uncertainty. Task counts are not a completion percentage. Missing or stale evidence must be described as such.

The source link opens the app’s working chat. This version does not fetch external provider thread URLs or recover a provider’s entire hidden context. The live tail and recent app-recorded messages are snapshots, not guaranteed full histories.

Two reports run concurrently and the rest queue. Native reporting capacity is separate from the twelve regular work slots. Closing the feed leaves reports running while that office remains mounted. Leaving the office cancels outstanding report requests; returning after a reload marks unfinished messages interrupted. Stop status requests cancels only reporting jobs, not work jobs. Reporting state does not replace personal task history or displace it from the session-history limit.

## Boundaries and limitations

Codex and Claude Code have reporting adapters. Other configured harnesses receive a visible unsupported-adapter entry with a working-chat link, not a fabricated AI reply or silent provider fallback. Authentication, allowance, missing executable and provider errors remain visible per employee.

Status requests reject working-thread resume IDs and profile MCP servers. Codex reporting disables shell/unified execution, agents, apps, plugins, hooks, web search, memory use/generation and project instruction discovery; a bounded local MCP configuration inventory prepares per-server disabled inert-transport overrides and fails closed if it cannot be read or contains ambiguous dotted server names. Claude reporting uses safe mode, no built-in tools and an empty strict MCP configuration. These are invocation-scoped settings: existing working sessions and global configuration are unchanged. Installed CLI compatibility and vendor enforcement remain part of the release gates.

Only the employee’s name/role/department and supplied work evidence are used for this reporting conversation; it does not reapply that employee’s executable plugins or skills. This preserves reporting identity without letting task instructions turn a status request into more task execution.

Common credential patterns are redacted from work evidence before report submission; this is not a guarantee that arbitrary secrets can be detected.

The local feed retains up to 300 messages / 300,000 characters, including employee replies. It has no automatic age-based expiry. Model calls consume the selected harness’s allowance and send the requested work context to that provider. The shared status feed is local to this app instance; it is not multi-user Slack synchronization or autonomous employee-to-employee messaging. Broader delegation and shared/vector memory remain separate v2 work.

## Verification

- Five routing/storage/evidence tests, included in `npm run test:builder` (57 builder tests total).
- Native protocol fixtures cover a status report completing while private work stays alive, no resume, profile MCP rejection, configured MCP inventory validation and reporting restrictions for both adapters.
- PTY test verifies reading a status snapshot emits no terminal events or input and preserves the session.
- Browser bridge-fixture tests cover office-only all-hands, named/department targeting, two-job queueing, no cross-employee context, no PTY mutation, provider failure, cancellation and unknown-recipient rejection. Light and dark screenshots are in `output/playwright/`.
- TypeScript production build, lint and native build pass. Synthetic installed-provider smoke results, when available, are recorded separately in `output/office-communicate-live-smoke.json`; fixture success alone does not establish authenticated inference. A synthetic live smoke check returned actual replies through installed Claude Code and Codex; the initial Codex configuration failure was corrected and its passing retest is in `output/office-communicate-codex-live-retest.json`. This does not verify every third-party harness or real business task.

Relevant configuration was checked against the installed CLI help and the [official Codex configuration schema](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json). This is an application feature test, not an independent security certification.
