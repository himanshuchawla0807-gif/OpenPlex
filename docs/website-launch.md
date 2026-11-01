# OpenPlex launch page — 1 November 2026

The public product page is live at **https://oriplex.tech**, with the installation guide at **https://oriplex.tech/docs/** (the user corrected the earlier audiblex.tech spelling). The buildless HTML/CSS/JavaScript source is in `website/`; `npm run build:site` generates `website/dist/`. It includes the visual product tour, forty-character positioning, interactive Chat/Terminal screenshots, a labeled illustrative Office Communicate exchange, setup guide, capability limits, troubleshooting, privacy notes, and contribution links.

The existing `himanshuchawla0807-gif/oriplex-landing` GitHub Pages repository owns the custom domain. A synchronized copy under `openplex-site/` is the publishing source. Its Pages workflow builds that folder without installing a framework. The previous Oriplex source remains in the repository and its Git history. Existing Name.com A/AAAA records, www CNAME, application subdomains, mail, SPF, and verification records require no changes. HTTPS remains enforced by GitHub Pages.

Sites was attempted first. It returned a project ID at creation, then returned `project_not_found` on subsequent credential, access, and lookup calls. No duplicate Site was created and no Sites deployment was claimed. Publishing falls back to the domain's existing Pages setup.

The launch post in `launch-post.md` is a draft. Nothing has been posted to X.

## Validation

- Application production build passed; Vite retains its existing large-chunk warning.
- All 72 builder tests passed. Oxlint and the final release pattern/history scan passed.
- Landing JavaScript syntax check and diff whitespace checks passed.
- Desktop and 390 px mobile browser checks found no broken images or page overflow. Screenshot tab selection updates its accessible state and actual image source.
- Mobile navigation opens and closes with Escape. Documentation anchors resolve. The install-command copy button reports successful copying. The public root and /docs/ return HTTP 200 with HTTPS enforced by Pages.
- The site uses same-origin fonts, images, CSS and JavaScript, with no tracking or model calls. The hosting provider still receives normal page requests.
- REA inspected the static deployment JavaScript/HTML (parent evidence `ev_77a05d20048e863bdeaf1f3c5679a5ec3541493f1e5b4df127cb7be34528cebc`): one JavaScript file parsed with no parse failures. Its static semantic coverage remains partial/unknown; this is not runtime security certification. Subsequent artwork and CSS refinements are covered by browser review, not claimed as that same artifact hash.
- The `_headers` file documents a policy for hosts supporting that format. GitHub Pages does not honor it, so those headers are not claimed on Pages.

The web screenshots depict prepared demonstrations, not customers or measured business outcomes. OpenPlex is free and open source; third-party model usage is separate. macOS installation is from source, without a notarized installer claim. Shared autonomous memory and hierarchy remain v2 work.

## Deployment receipt

Publishing commit: `c2b2da916138bd3fc0621f4db62f70f53e5d97cf` in `oriplex-landing`. GitHub Actions run [41310940447](https://github.com/himanshuchawla0807-gif/oriplex-landing/actions/runs/41310940447) completed successfully. The served HTML identifies OpenPlex and the canonical domain correctly. No Name.com records were changed. Older site source and rollback instructions remain in the deployment repository.
