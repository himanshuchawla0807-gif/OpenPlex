# OpenPlex landing page

The public OpenPlex introduction and installation guide, intended for **oriplex.tech**. Built with HTML, CSS and a small progressive-enhancement script. No package installation, browser framework, telemetry, cookies, API keys or model calls required.

Build from the repository root:

```sh
npm run build:site
```

Preview with any static server rooted at `website/dist`, for example:

```sh
python3 -m http.server 5190 --bind 127.0.0.1 --directory website/dist
```

Source lives in `src/`; generated `dist/` is ignored. Navigation, screenshot tabs, a mobile menu, native FAQ disclosures and copyable setup commands are real controls. The site respects reduced motion. Fonts, images and scripts are served from the same origin.

The Mac beta is available as a prebuilt Apple Silicon DMG and from source. The download is ad-hoc signed and unnotarized; the limitation is visible beside the CTA and in the setup guide. No notarized installer or model credits are promised. The Office Communicate example is labeled illustrative. Screenshots are demonstrations, not customer evidence. Provider data handling is described separately from local app storage. Current live deployment and DNS state are recorded in `docs/website-launch.md` at the repository root. The existing `oriplex-landing` GitHub Pages repository hosts the built site; the existing Name.com DNS and email records stay intact.

Artwork derives from existing project-generated assets. The local Manrope font is bundled with its OFL notice in `src/assets/OFL.txt`; Georgia uses the visitor’s installed font stack, with a serif fallback. No OS font file is redistributed. Root artwork and third-party notices also apply.
