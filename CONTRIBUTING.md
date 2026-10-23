# Contributing to OpenPlex

Thanks for helping make the office useful. A good contribution solves a concrete problem, explains the change, and includes the checks that support it.

## Run locally

Use Node.js 24 or newer. On macOS, install Xcode Command Line Tools for the native wrapper.

```sh
npm ci
npm run dev:builder
```

The browser preview supports UI work. Native folder selection, real harness sessions and terminal I/O require the Mac app:

```sh
npm run app:build
npm run app:open
```

## Before opening a pull request

Run `npm run lint`, `npm run build`, `npm run test:builder`, and `npm test`. For native changes also run `npm run test:native`, `npm run test:terminal`, `npm run test:employee-workspace`, and `npm run test:http` on macOS. Include the commands and results in your pull request. Explain any skipped or unavailable check.

Use synthetic projects and messages in screenshots. Never commit `.env` files, credentials, user profiles, transcripts, local app storage, build output or vendor CLI data. `npm run check:release` scans publishable files and Git history for configured patterns; it is one check, not a complete secret detector.

Keep changes focused. For behavior fixes, add a regression test at the affected boundary. For UI changes, include light and dark screenshots and check narrow windows and reduced motion. Preserve keyboard navigation and accessible labels.

## Where things live

- `src/builder/`: projects, employee profiles, builder, team workspace and communication.
- `src/procedural/` and the rendering modules: office layout and animation.
- `native/OpenPlex/`: Swift app, local HTTP server, harness adapters and PTYs.
- `scripts/`: tests and release checks.
- `public/`: artwork, fonts and provider marks; see their separate notices.

Autonomous hierarchy and shared long-term agent memory are planned for v2. Discuss architectural work before adding a second orchestration system. Please report security issues privately as described in [SECURITY.md](SECURITY.md).

Contributions are licensed under the project’s MIT licence unless explicitly identified otherwise. Only submit artwork, code and fonts you have permission to redistribute.
