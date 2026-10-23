#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
probe_dir=$(mktemp -d /tmp/openplex-status-smoke.XXXXXX)
trap 'rm -f "$probe_dir/probe"; rmdir "$probe_dir"' EXIT
swiftc native/OpenPlex/Sources/OpenPlex/AgentRuntime.swift native/OpenPlex/Tests/StatusSmoke/main.swift -o "$probe_dir/probe"
"$probe_dir/probe" "$probe_dir" "${1:-codex}"
