#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
probe_dir=$(mktemp -d)
trap 'rm -f "$probe_dir/workspace-test"; rmdir "$probe_dir"' EXIT
swiftc native/OpenPlex/Sources/OpenPlex/EmployeeWorkspace.swift native/OpenPlex/Tests/EmployeeWorkspace/main.swift -o "$probe_dir/workspace-test"
"$probe_dir/workspace-test"
