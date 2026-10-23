#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
project_dir="$(cd "$script_dir/../.." && pwd)"
if [[ "${1:-}" != "--skip-web-build" ]]; then
  (cd "$project_dir" && npm run build)
fi
if [[ ! -f "$project_dir/dist/index.html" ]]; then
  echo "Missing dist/index.html. Run npm run build first." >&2
  exit 1
fi
swift build --package-path "$script_dir" -c release
binary_dir="$(swift build --package-path "$script_dir" -c release --show-bin-path)"
app_dir="${OPENPLEX_APP_DESTINATION:-$project_dir/output/OpenPlex.app}"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources/Web"
cp "$binary_dir/OpenPlex" "$app_dir/Contents/MacOS/OpenPlex"
cp "$script_dir/Resources/OpenPlex.icns" "$app_dir/Contents/Resources/OpenPlex.icns"
cp "$project_dir/public/brand/openplex-logo.png" "$app_dir/Contents/Resources/AppIcon.png"
# Synchronize this generated bundle only; original artwork and project data are untouched.
rsync -a --delete "$project_dir/dist/" "$app_dir/Contents/Resources/Web/"
cat > "$app_dir/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>OpenPlex</string>
<key>CFBundleIdentifier</key><string>studio.openplex.local</string>
<key>CFBundleName</key><string>OpenPlex</string>
<key>CFBundleDisplayName</key><string>OpenPlex</string>
<key>CFBundleIconFile</key><string>OpenPlex.icns</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
# Remove compiler source paths and debug symbols before signing the distributable.
strip -S "$app_dir/Contents/MacOS/OpenPlex"
codesign --force --deep --sign - "$app_dir"
codesign --verify --deep --strict "$app_dir"
echo "Built $app_dir"
echo "Open with: open '$app_dir'"
