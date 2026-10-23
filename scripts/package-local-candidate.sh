#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
app="output/OpenPlex.app"
release="output/releases/OpenPlex-0.1.0-local-candidate"
[[ -d "$app" ]] || { echo 'Build the app first.' >&2; exit 1; }
codesign --verify --deep --strict "$app"
node scripts/scan-package.mjs "$app"
mkdir -p "$release"
# Only the generated app and generic release documents enter this staging folder.
rsync -a --delete "$app/" "$release/OpenPlex.app/"
cp docs/security-and-release-review.md "$release/RELEASE-REVIEW.md"
if [[ -f docs/office-communicate.md ]]; then cp docs/office-communicate.md "$release/OFFICE-COMMUNICATE.md"; fi
if [[ -f docs/office-home-actions.md ]]; then cp docs/office-home-actions.md "$release/OFFICE-HOME.md"; fi
cat > "$release/README.txt" <<'TEXT'
OpenPlex 0.1.0 — local test candidate (Apple Silicon)

This package is ad-hoc signed and NOT Apple notarized. Public distribution is blocked pending the release gates in RELEASE-REVIEW.md. Do not bypass security warnings.

App data is stored locally. Cloud harnesses and selected MCP servers receive the prompts/context you send them. Use your own harness installation and sign-in. No model credits are bundled. Starting MCP processes requires first-use approval.

New chat preserves employee configuration and starts a fresh session. Room conversation saves local notes or explicitly asks selected Codex/Claude employees for replies, with shared room context. Private employee transcripts are not included.

Hierarchy, autonomous delegation, vector memory and cross-office orchestration remain v2 work. See the release review for test scope, retention and limitations.
TEXT
node --input-type=module <<'JS'
import {readFileSync,writeFileSync} from 'node:fs'
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));writeFileSync('output/releases/OpenPlex-0.1.0-local-candidate/DEPENDENCIES.json',JSON.stringify({source:'npm lockfile inventory; license review remains required',packages:Object.entries(lock.packages??{}).map(([path,p])=>({path,version:p.version,license:p.license,integrity:p.integrity,dev:p.dev}))},null,2))
JS
ditto -c -k --sequesterRsrc --keepParent "$release" "$release.zip"
shasum -a 256 "$release.zip" > "$release.zip.sha256"
echo "Local candidate: $release.zip"
