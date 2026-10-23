# Release verification

This record describes the October 2026 source release. OpenPlex is a beta. These are controlled tests and a source-informed review, not an independent penetration test or a guarantee that all vulnerabilities have been found.

## Automated checks

| Check | Local result | What it establishes |
| --- | --- | --- |
| TypeScript / Vite production build | Passed | Current source compiles and bundles |
| Oxlint | Passed | Configured static rules |
| Builder, profiles, storage and communication | 58 tests passed | Protocol validation, configuration merging, isolation, routing and retention |
| Office world, layout and animation | 70 passed; 1 archived-artwork checksum test skipped | Layout and simulation regressions; not every visual pose |
| Native streamed runtime | Passed | Codex, Claude and OpenCode fixtures, UTF-8, resume ownership, cancellation and status isolation |
| Interactive terminal | Passed | PTY byte I/O, resize, replay, independent identity, stale-event rejection, authorization and close/reopen |
| Employee workspace files | Passed | Managed paths, permissions, instruction/skill/MCP intake, repeat setup and symlink rejection |
| Local HTTP boundary | Passed | Host/origin, traversal, malformed headers/methods, symlinks, HEAD and CSP |
| npm dependency audit | No advisories reported | Point-in-time registry advisory result |
| macOS package | Built; ad-hoc signature verified | Local Apple Silicon package; not Developer ID signed or notarized |

Test implementations are committed under `scripts/`, `src/builder/*.test.mjs` and `native/OpenPlex/Tests/`. Raw local evidence, private paths and CLI logs are intentionally excluded from GitHub. CI repeats the web checks and native suites; consult its actual result for the published commit.

## UI and real-harness evidence

Browser QA covers employee selection, fresh chats preserving employee configuration, independent panel input, expansion, paging, spaces, room replies, escaped message HTML, and office-scoped employee lists. The native UI pass also verified the team workspace folder picker and persisted authorization; folder changes are disabled while an office has live work/session connections. The screenshot campus contains all 12 room types; the character catalog contains 40 available characters in an empty office.

Controlled live status requests succeeded with installed Codex and Claude Code. The release screenshot pass connected six independent native Codex PTYs and received six configured-name/role introduction replies without file or tool actions; Chat and Terminal screenshots show those actual sessions. All six demo sessions were ended after capture. A startup-menu transcript regression was fixed and tested; returning from Terminal now scrolls Chat to its newest message. A fresh source-tree install, production build and builder/world suites also passed. PTY startup and adapter tests do not establish authenticated inference for every advertised CLI. Other harnesses need their own installed, authenticated setup. An MCP or plugin reference is not proof that the integration runs correctly; test each configuration before trusting its status.

REA statically identified the final local app executable as an Apple Silicon Mach-O. Static artifact inspection is not runtime security certification.

## Privacy and security boundaries

The review addressed loopback request validation, restricted native bridge origins, bundled resource CSP, managed file traversal and symlinks, MCP first-use approval, transcript isolation and obsolete managed reference cleanup. Dependency, source and history pattern scans supplement that review. They cannot prove the absence of secrets or vulnerabilities.

Local storage is not app-encrypted. Cloud harnesses receive supplied prompts and context; MCPs, plugins and provider telemetry have their own behavior. The app’s web CSP does not constrain a child CLI’s network traffic. Read [privacy.md](privacy.md) and [SECURITY.md](../SECURITY.md).

## Remaining release gates

- Apple Developer ID signing and notarization before distributing a trusted Mac installer.
- Clean-machine and Intel validation, including install, upgrade, recovery and uninstall.
- Broader authenticated success/failure, permission and reconnect testing across every provider.
- Independent security testing and a comprehensive child-process network review.
- Per-configuration MCP/plugin verification; no blanket green compatibility claim.

The GitHub release is source-first. It should not be described as a fully certified or universally tested production binary.
