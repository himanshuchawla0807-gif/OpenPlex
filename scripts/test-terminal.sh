#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
probe_dir=$(mktemp -d)
trap 'rm -f "$probe_dir/terminal-test"; rmdir "$probe_dir"' EXIT
swiftc native/OpenPlex/Sources/OpenPlex/AgentRuntime.swift native/OpenPlex/Sources/OpenPlex/HarnessTerminal.swift native/OpenPlex/Tests/Terminal/main.swift -o "$probe_dir/terminal-test"
"$probe_dir/terminal-test" "$PWD/native/OpenPlex/Tests/Terminal/fake-terminal.py"
