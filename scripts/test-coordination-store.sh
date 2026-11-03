#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
probe_dir=$(mktemp -d)
trap 'rm -f "$probe_dir/coordination-store-test"; rmdir "$probe_dir"' EXIT
swiftc native/OpenPlex/Sources/OpenPlex/CoordinationStore.swift native/OpenPlex/Tests/Coordination/main.swift -o "$probe_dir/coordination-store-test"
"$probe_dir/coordination-store-test"
