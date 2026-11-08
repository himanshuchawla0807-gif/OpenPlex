# Contributing to OpenPlex

Thanks for helping make the office useful. A good contribution solves a concrete problem, explains the change, and includes the checks that support it.

## Run locally

Use Node.js 24 or newer. The native wrapper requires macOS 13 or newer and Xcode Command Line Tools.

### Browser preview

```sh
npm ci
npm run dev:builder
```

Open [127.0.0.1:5180](http://127.0.0.1:5180/) for UI work. Use the Mac app for native folder selection, real harness sessions and terminal I/O.

### Native app

```sh
npm run app:build
npm run app:open
```

## Before opening a pull request

Run the web checks from the repository root:

```sh
npm run lint
npm run build
npm run test:builder
npm test
```

For native changes, also run these checks on macOS:

```sh
npm run test:native
npm run test:terminal
npm run test:employee-workspace
npm run test:http
npm run app:build
```

For landing-page edits, run `npm run build:site`. The [CI workflow](.github/workflows/ci.yml) shows the full web and Mac checks. Include the commands and results in your pull request and explain any checks you skipped.

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
