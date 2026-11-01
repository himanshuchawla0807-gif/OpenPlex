#!/bin/bash
# Package only a freshly built, verified bundle. Provider CLIs and user data stay out.
set -euo pipefail
cd "$(dirname "$0")/.."
version="${1:-0.1.0-beta.1}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]] || { echo 'Invalid release version.' >&2; exit 1; }
app="${OPENPLEX_PACKAGE_APP:-$PWD/output/OpenPlex.app}"
[[ -f "$app/Contents/MacOS/OpenPlex" ]] || { echo 'Build the app first.' >&2; exit 1; }
architecture="$(lipo -archs "$app/Contents/MacOS/OpenPlex")"
[[ "$architecture" == arm64 ]] || { echo 'This beta packaging target is Apple Silicon only.' >&2; exit 1; }
codesign --verify --deep --strict "$app"
node scripts/scan-package.mjs "$app"
destination="$PWD/output/releases/$version"
mkdir -p "$destination"
image="$destination/OpenPlex-$version-macOS-arm64.dmg"
[[ ! -e "$image" ]] || { echo 'Release image already exists; choose a new version instead of overwriting it.' >&2; exit 1; }
stage="$(mktemp -d "$destination/.dmg-stage.XXXXXX")"
trap 'rm -rf "$stage"' EXIT
ditto "$app" "$stage/OpenPlex.app"
ln -s /Applications "$stage/Applications"
cp LICENSE "$stage/LICENSE.txt"
cp THIRD_PARTY_NOTICES.md "$stage/THIRD-PARTY-NOTICES.md"
cp docs/privacy.md "$stage/PRIVACY.md"
cat > "$stage/READ-ME-FIRST.txt" <<'TEXT'
OpenPlex beta for Apple Silicon Macs, macOS 13 or newer

Install
1. Open this disk image.
2. Drag OpenPlex.app to Applications.
3. Eject the disk image, then open OpenPlex from Applications.

This beta has an ad-hoc integrity signature. It is NOT signed with an Apple
Developer ID and is NOT notarized. macOS may block its first launch. Keep
Gatekeeper enabled. See Apple's official guidance for opening trusted apps:
https://support.apple.com/en-us/102445
If you do not want to approve an unnotarized beta, build from source instead:
https://github.com/himanshuchawla0807-gif/OpenPlex

No Node.js or Swift compiler is needed to launch this prebuilt app. Install and
sign in to your own supported harness separately, such as Codex or Claude Code.
Harness tools may have their own runtime requirements, billing and quotas.

App state stays on this Mac. Cloud model providers receive the prompts and
context you send. MCP servers and vendor tools have their own network behavior.
No model credits, provider CLI, account credentials or user conversations are
included in this image. Do not remove your project folders to uninstall the app.

Setup guide: https://oriplex.tech/docs/
Source and issues: https://github.com/himanshuchawla0807-gif/OpenPlex
TEXT
printf 'Version: %s\nSource commit: %s\nArchitecture: %s\nSigning: ad-hoc; not notarized\n' "$version" "$(git rev-parse HEAD)" "$architecture" > "$stage/BUILD-INFO.txt"
codesign --verify --deep --strict "$stage/OpenPlex.app"
hdiutil create -volname "OpenPlex $version" -srcfolder "$stage" -format UDZO -ov "$image"
hdiutil verify "$image"
(cd "$destination" && shasum -a 256 "$(basename "$image")" > SHA256SUMS.txt)
echo "Beta DMG: $image"
echo 'Ad-hoc signed, not Apple notarized. Publish only with the beta signing limitation visible.'
