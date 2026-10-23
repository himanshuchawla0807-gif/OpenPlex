# Security

OpenPlex is an early source release, not a security-certified distribution. Please review [the verification record](docs/release-verification.md) and [privacy notes](docs/privacy.md) before using sensitive projects.

## Reporting a vulnerability

Use GitHub’s private vulnerability reporting on this repository when available. Do not put credentials, private transcripts, or an exploitable security issue in a public issue. If private reporting is unavailable, open an issue requesting a private contact without including the vulnerability details.

## What the app protects

The Mac wrapper serves bundled assets on loopback, validates Host and Origin, rejects cross-site requests and path traversal, and restricts the native bridge to its own main frame. A content security policy restricts web resources. Managed employee files reject path escapes and symlinks and use private permissions. An employee MCP configuration requires native first-use approval before execution. UI text is rendered without enabling arbitrary HTML.

Employee sessions have independent identities. Room replies and status reports use separate requests; status checks do not type into an employee’s working terminal. Tests cover malformed requests, stale sessions, cancellation, isolation and managed file boundaries.

## Limits

A coding harness can execute commands and access resources under its own permission model. OpenPlex is not an OS sandbox for arbitrary CLIs, MCP servers or plugins. Approving those tools can run third-party code. Cloud models receive the context needed for a request. Local storage is not encrypted by the app. Same-user malware, operating-system compromise, vendor retention and provider telemetry are outside these boundaries.

No software can promise that every vulnerability has been found. The current build is ad-hoc signed; a Developer ID signed and notarized installer is a separate release gate. Automated tests and source review do not replace independent testing or clean-machine validation.

## Dependencies

Use `npm ci` with the committed lockfile. CI runs dependency advisory checks and the source/history release scan. An audit with no reported advisories is a point-in-time result, not a guarantee. Dependency and artwork terms are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
