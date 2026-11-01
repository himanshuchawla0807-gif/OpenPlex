# Downloadable Mac beta

The first downloadable build is **OpenPlex 0.1.0-beta.1**, for **Apple Silicon (arm64), macOS 13 or newer**. Intel Macs are not supported by this binary. The app is prebuilt, so Node.js and Swift are not needed to open it; separately installed coding harnesses can require their own runtimes.

Download the DMG and SHA256SUMS.txt from the [GitHub release](https://github.com/himanshuchawla0807-gif/OpenPlex/releases/tag/v0.1.0-beta.1). Open the image, drag OpenPlex.app to Applications, eject the image, and launch the app from Applications. Choose a workspace folder and connect an installed, authenticated harness.

## Signing status

This is an **ad-hoc signed, unnotarized beta**. No Developer ID signing identity was available on the build Mac. A valid ad-hoc signature checks bundle integrity; it does not identify an Apple-recognized publisher or provide notarization. macOS may block launch. Keep Gatekeeper enabled and consult [Apple's official trusted-app guidance](https://support.apple.com/en-us/102445). The source-build path remains available for people who do not want to approve an unnotarized binary.

Developer ID signing and Apple notarization remain necessary for a smoother public installation flow. Do not advertise this package as notarized, independently security-certified, or tested on Intel.

## Reproduce the package

```sh
npm ci
npm run app:build
npm run app:dmg -- 0.1.0-beta.1
```

The packaging script validates the app signature, scans the bundle for credential patterns, copies only the app and public release documents into a temporary staging folder, adds the standard Applications shortcut, creates a compressed read-only DMG, verifies it, and writes a SHA-256 checksum. It refuses to overwrite an existing version. The source commit is recorded inside BUILD-INFO.txt.

No harness, provider authentication, app storage, project folder, or conversation is included. Pattern scanning is not proof that no vulnerability exists. Package verification and native fixture tests are separate from clean-machine, authenticated-provider, and Gatekeeper first-launch testing.
