#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
probe_dir=$(mktemp -d)
trap 'rm -f "$probe_dir/bridge"; rmdir "$probe_dir"' EXIT
swiftc native/OpenPlex/Sources/OpenPlex/CoordinationStore.swift native/OpenPlex/Sources/OpenPlex/AgentRuntime.swift native/OpenPlex/Tests/CoordinationBridge/main.swift -o "$probe_dir/bridge"
node --experimental-strip-types scripts/v2-e2e.mjs "$probe_dir/bridge" "$PWD/native/OpenPlex/Tests/fake-codex.py"
node --experimental-strip-types scripts/v2-e2e.mjs "$probe_dir/bridge" "$PWD/native/OpenPlex/Tests/fake-claude.py"
