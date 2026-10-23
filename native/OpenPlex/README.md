# Native Mac wrapper

From the repository root, run `npm ci`, then `npm run app:build` and `npm run app:open`. Requires macOS 13+, Node.js 24+ and Xcode Command Line Tools. The generated app is under `output/` and is ad-hoc signed for local builds, not Apple notarized.

The Swift app hosts the bundled React interface, validates loopback HTTP and bridge requests, prepares employee files, and manages streamed harness requests and interactive PTYs. Harnesses are installed and authenticated separately by the user. The welcome sequence is presented when the app launches.

Use the root [setup guide](../../docs/getting-started.md), [security policy](../../SECURITY.md) and [verification record](../../docs/release-verification.md) for current instructions and limitations. Run native tests from the root using the `test:native`, `test:terminal`, `test:employee-workspace` and `test:http` npm scripts.
