> Historical local-candidate review. For current release claims and results, use [release-verification.md](release-verification.md). Font, Git and publication statements below describe the earlier candidate.

# OpenPlex local release candidate — 23 October 2026

Status: **local test candidate; public release gates remain open**. This is a source-informed security review and controlled adversarial/regression testing, not an independent penetration-test certificate or a guarantee of security.

## Delivered

- Every employee session has **New chat** in its controls, in both standalone and team workspaces. It keeps the employee identity, harness, system prompt, instructions, skills and configuration. It ends the old interactive session and opens a fresh one without resuming its thread. Interrupt active work first. Up to five recent app transcript archives are retained locally; vendor CLI histories have separate retention. There is no history restoration UI yet.
- **Room conversation** is accessible from room details and the team-workspace toolbar. Notes alone make no model call. Selecting employees explicitly requests replies using shared room messages and notes. Each employee’s reply is labelled. Private employee history is excluded, and native ownership locks prevent simultaneous room/private work for the same employee. Codex and Claude Code support room replies; other adapters remain unavailable there. Autonomous delegation and cross-office memory are v2 work.
- Builder profile updates merge files by name and MCP entries by server name. Removing entries requires explicit removal. Recognizable attached Markdown skills/instructions and JSON MCP configurations are retained independently of model omissions. Review counts show saved instructions, skills, MCP configurations and plugin references.
- Three original Remotion **starter instruction files** can be added from the builder: composition, rendering/QA, and captions/audio. These are not an installation of Remotion, the complete official skills pack, or proof of audio processing. No supplied audio recording was available for noise diagnosis.
- Optional builder web search is exposed for Codex and Claude Code. OpenCode’s builder remains tool-denied; it does not silently receive web-search capability or paid fallback models. Search and model calls use the selected provider’s service/allowance.
- Dark office-canvas dots use a light plum tint.

## Findings addressed

| Finding | Boundary / change | Verification |
| --- | --- | --- |
| Loopback web content lacked a strict request policy | Exact loopback Host/origin, cross-site rejection, GET/HEAD only, bounded headers/time, canonical paths, symlink escape rejection, MIME/size allowlist | `npm run test:http`; malformed requests, traversal encodings, foreign origins/hosts, symlinks, methods, duplicate headers, HEAD |
| Browser content could reach unnecessary web destinations | CSP restricts resources/connections to bundled/self resources; bundled inline welcome scripts get content hashes. No remote fonts or image loading is needed | Header tests plus packaged-app startup/resource smoke checks; not a capture of all CLI-provider traffic |
| Native bridge needed matching origin checks | Main-frame, exact scheme/host/port checks for bridge, file picker and navigation | Static inspection; native build and UI smoke check. A same-user compromised process/OS is outside this boundary |
| Starting an MCP server can execute code before individual tool approval | Exact employee/harness/config hash requires first-use native approval; cancellation is visible; concurrent approvals return an actionable retry error | Static review/build; manual approve/cancel dialog lifecycle remains a release checklist item |
| Builder updates could silently discard supplied configuration | Validated merge-by-name and deterministic intake; explicit removals; reserved MCP keys / malformed arguments and URL shapes rejected | 52 builder tests, including 4 additional release safety cases |
| New room and private sessions could overlap an employee | Separate conversation keys with a shared native employee ownership lock | Native owner-reservation/stop test plus UI bridge fixture |
| Remote font stylesheet attempted a third-party request | Removed Google Fonts import; use bundled Switzer and system monospace, with the same restrictive CSP | Packaged-browser request/CSP smoke test |
| Compiler debug data exposed development machine paths | Strip debug symbols/source paths before signing | Candidate binary no longer contains the developer home path; signature re-verified |
| Removed managed references could remain in a prepared employee folder | Track owned reference paths and remove obsolete tracked files; reject unsafe paths, preserve unrelated files | Employee-workspace regression suite; older untracked legacy reference files may remain and require review |

React renders conversation/attachment text as text; raw HTML and remote image embeds are not enabled in chat. The room UI test includes an HTML event-handler payload and confirms it remains text. Attachments are untrusted reference material, not authorization. Model prompt instructions supplement, and do not replace, native authorization and input validation.

## Privacy and storage

OpenPlex’s project layout, profiles and app conversations are stored locally in the app’s WebKit storage. Employee configuration is materialized in `.openplex/employees/` under the selected project directory. Generated files use private Unix permissions. App storage and these files are **not application-encrypted**; other processes with the same user access, backups and a compromised device can access them. Do not paste credentials into profiles; use the harness’s credential mechanisms.

Cloud harnesses receive the task, relevant employee configuration, attached content supplied with that task, and any explicitly shared room context. Providers, MCP servers and plugins can make external requests under their own settings. Their telemetry, transcript retention, authorization and permissions are not controlled completely by OpenPlex. Therefore “everything always stays on the device” would be inaccurate. Local notes with no selected employee make no model call. Room conversation sharing is local to this app instance, not multi-user network chat.

Builder app messages expire after 30 days of inactivity; profile revisions are separately retained (up to 20). Saved profile files remain until changed or deleted. Recent fresh-chat archives retain up to five conversations per employee. Shared room history is bounded to 100 messages / 120,000 characters and does not currently expire automatically. Harness transcripts have vendor-specific retention. A new chat clears current app context, not all provider/OS backups or histories.

The web asset CSP disallows remote resource loads. That is defense in depth, **not evidence that cloud CLI processes never send data**. No analytics service was identified in the reviewed application code. A comprehensive child-process network/telemetry audit has not been completed.

## Test evidence

All raw evidence is local under `output/`; personal machine paths and prior harness evidence must not be published indiscriminately.

| Check | Result / scope | Evidence |
| --- | --- | --- |
| TypeScript + Vite production build | Pass | `security-web-build.log` |
| Oxlint | Pass | `security-lint.log` |
| Builder/data/protocol tests | 52 passed | `security-builder-tests.log` |
| World/animation/layout tests | 70 passed, 1 pre-existing archived-image checksum test skipped | `security-world-tests.log` |
| Native streamed runtime | Pass: Codex/Claude/OpenCode fixtures, error/UTF-8/resume/ownership/cancellation | `security-runtime-tests.log` |
| Interactive PTYs | Pass: byte I/O, isolation, resize, replay, stale sessions, close/reopen, configuration | `security-terminal-tests.log` |
| Employee files | Pass: scoped folders, instruction intake, skills, MCP serialization, permissions, symlink rejection | `security-employee-tests.log` |
| HTTP boundary | Pass controlled adversarial cases | `npm run test:http`; test source under `native/OpenPlex/Tests/HTTP/` |
| Browser UI | Fresh chat keeps profile, drops old context/resume; room notes local; room reply context isolated; HTML escaped | `security-ui-tests.log`, `output/playwright/release-conversations.js` |
| npm dependency advisories | 0 reported at audit time; not proof of no vulnerabilities | `security-dependency-audit.json` |
| Candidate bundle pattern scan | No matching configured credential patterns; no Git/history scan | `security-package-scan.json` |
| REA bundle inventory | Static artifact inventory only, not behavioral security certification | `security-packaged-rea.json` (initial bundle); final package manifest/checksum separately generated |

Existing real-harness startup evidence and cleanup records are in `output/harness-audit/`. Disposable installations from that audit were removed; baseline binaries were preserved. Those checks did **not** verify authenticated inference for every provider. A CLI version check or successful PTY startup must never be displayed as verified MCP/plugin functionality.

## Open release gates

1. Developer ID signature and Apple notarization. This machine reports zero valid signing identities. Current app is ad-hoc signed for local testing. Do not bypass Gatekeeper to distribute it as trusted software.
2. Authenticated successful and failing tasks, approvals, reconnects and actual Claude Code black-patch reproduction on a clean supported Mac, across every adapter advertised as integrated. Unsupported adapters must remain setup-only.
3. Independent security review and broader runtime network/permission testing. MCP/plugin connections require actual per-configuration tests before claiming green; plugin references are not installed integrations.
4. Public source/history secret audit. There is no Git repository here; the existing `check:release` source/history gate cannot pass. The separate bundle scan explicitly covers only its supplied bundle.
5. Third-party asset/license review, Intel build validation, clean-machine install/uninstall and upgrade/backup/recovery checks. The package is for the currently built architecture, not a universal Mac release.
6. Sandboxing limits: selected-folder checks constrain app-managed files, but external harness/MCP capabilities depend on vendor enforcement and the user’s permissions. The app is not an OS isolation boundary for arbitrary external tools.

No public upload, publication, pricing change or v2 autonomous coordination was performed.

Sources: [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution), [Developer ID](https://developer.apple.com/developer-id/), [OWASP prompt injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
