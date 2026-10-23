# OpenPlex v1 release readiness

23 October 2026. Hierarchy, shared/vector memory and cross-office orchestration remain v2 design work. They are not part of the v1 runtime.

## Delivered in this pass

- System, Light and Dark appearance selection on Mac onboarding and in the workspace; saved preference, live OS following and full terminal ANSI palettes. Opaque terminal surfaces report real colors to TUIs instead of a transparent default.
- Generated transparent dark artwork: ivory paper sculpture, sage leaves and a muted seedpod; restrained placement outside working text.
- Headless OpenCode employee-builder option alongside Codex and Claude Code. No OpenCode terminal is shown in the builder. A private invocation denies every tool and returns JSONL text; a validated profile draft is applied for review. Existing OpenCode sign-in and model configuration are used. This does not bundle a model service, provide an API credit pool, or automatically select paid fallback models.
- App builder conversation: 30-day inactivity expiry, clear conversation action and up to 20 profile revisions. This retention is for app-local conversation storage; native harness transcripts follow their own retention. Attachment contents in an approved profile remain until the profile is edited/deleted.
- More accurate missing-provider diagnostics. Employee identity and role continue to be passed by scoped configuration and employee-owned instruction folders.

## Verification and evidence

`output/harness-audit/` contains test logs, baseline binary hashes, official installer manifests and actual terminal startup evidence. Disposable installations are task-owned and removed after the audit. Pre-existing Codex, Claude Code, Antigravity, OpenCode and Muse installations are retained.

A version/help check proves the binary launches. A PTY check proves controlling-terminal startup and output. Neither establishes successful authenticated inference, working MCP tools, or working plugins. Each requires its own test and must not be presented as green merely because the CLI starts.

## Release gates still required

- Authenticated task and permission-dialog tests for every advertised integrated harness, on a clean supported Mac. Unsupported catalog choices must remain setup-only.
- Claude's previously reported black patches need actual interactive verification with both themes, not only ANSI fixture coverage.
- Initialize and review the public source repository; this workspace currently has no Git history, so `check:release` cannot complete its source/history audit. Do not treat that as a passing release scan.
- Signed Developer ID build and notarization; current local build is ad-hoc signed. Clean-machine install/uninstall and Intel support are not established by this Apple Silicon build.
- Asset/license review, portable runtime dependencies, recovery/export and upgrade checks. No public release or payment flow has been enabled.

## Launch recommendation (proposal, not a pricing change)

Start with a free public beta using people's own subscriptions/keys. Publish the local core after license and secret review. Optional $5 founder support is reasonable; a compulsory $5 monthly fee for the current wrapper alone has weak differentiation. Preserve access to existing local projects if pricing changes. Later charge for clear additional value: reliable team administration, hosted coordination, managed backups/sync, or a managed inference service with explicit allowances. Offer those as a separate opt-in plan rather than quietly converting the free local app.

This recommendation is informed by Conductor's free local multi-agent/BYOK offering and its paid cloud/team plans, and Warp's separation between local tooling, BYOK and hosted inference. It is a product judgment, not evidence that one pricing scheme guarantees success.

Sources checked: https://www.conductor.build/pricing ; https://www.warp.dev/pricing ; https://www.warp.dev/blog/bring-your-own-inference-to-warp

## Builder model policy

OpenCode's published free-model roster changes. The current official page does not establish MiniMax M3.1 Flash as a permanent free API entitlement for a third-party app. Use the user's explicitly configured provider/model and show provider errors/limits. Never extract credentials from another product or proxy somebody else's quota. A smaller API-only backend can be added later behind the same validated draft protocol if the user supplies its endpoint/key. Store such keys in the Mac Keychain, not the repository or localStorage.

Sources: https://opencode.ai/v2/docs/console/models/ ; https://opencode.ai/docs/sdk/ ; https://github.com/anomalyco/opencode/blob/dev/packages/cli/src/run/noninteractive.ts

## Compatibility audit result

Actual downloaded Mac arm64 versions: Cursor 2026.10.22-27dcf5f, M Code 0.6.12, Kilo Code 7.8.15 and Devin 3000.11.92. Their version/help commands ran. Each opened a real controlling PTY through `HarnessTerminal` and produced ANSI output without exiting before the bounded probe closed it. Claude Code also opened through that same layer. Cursor presented its login prompt; M Code presented its account/setup screen. These are startup checks, **not authenticated task passes**. The current tests do not certify all providers' chat parsers, MCP adapters or scheduled tasks.

Muse's pre-existing installation reported 1.4.6 with launcher auto-update disabled. Existing Codex, Claude Code, Antigravity, OpenCode and Muse binary hashes matched the baseline after testing. Only the four newly installed runtime trees, their archives, the temporary probe binary and a task-created Cursor compile cache were removed. Logs and evidence remain.

Z Code is now setup-only: the official product page establishes a desktop app, not a verified `zcode` terminal contract. DeepSeek Harness and OpenClaw remain setup-only. Hermes was not installed or certified in this pass. Those entries must not be advertised as fully working integrations.

Dark theme follow-up: brighter material mapping and restrained dark print ink preserve furniture separation; dark-blue side panels and visible character fades replace the overly dim first attempt. Generated orbital/physics cutouts replace leafy chat decoration in both appearances. Source artwork and prompts are recorded in `docs/artwork-prompts.md`.
