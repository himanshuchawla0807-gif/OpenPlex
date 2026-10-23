#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
probe_dir=$(mktemp -d)
trap 'rm -f "$probe_dir/runtime-test"; rmdir "$probe_dir"' EXIT
swiftc native/OpenPlex/Sources/OpenPlex/AgentRuntime.swift native/OpenPlex/Tests/main.swift -o "$probe_dir/runtime-test"
"$probe_dir/runtime-test" "$PWD/native/OpenPlex/Tests/fake-codex.py" "$PWD/native/OpenPlex/Tests/fake-claude.py"
