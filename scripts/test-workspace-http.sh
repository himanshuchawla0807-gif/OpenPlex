#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
probe_dir=$(mktemp -d)
trap 'rm -f "$probe_dir/http-test"; rmdir "$probe_dir"' EXIT
swiftc native/OpenPlex/Sources/OpenPlex/WorkspaceHTTP.swift native/OpenPlex/Tests/HTTP/main.swift -o "$probe_dir/http-test"
"$probe_dir/http-test"
