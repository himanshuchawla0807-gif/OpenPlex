# Your first office

OpenPlex is easiest to understand with one employee and one small task. You can add the rest of the office once that path works.

## Build the Mac app

For a prebuilt Apple Silicon beta, use the [Mac download](macos-download.md). Open the DMG and drag the app to Applications. That package is ad-hoc signed and unnotarized; macOS may block first launch. The source-build path remains below.

The source build requires macOS 13 or newer, Node.js 24 or newer, npm, and Xcode Command Line Tools. Run these commands from a terminal:

```sh
git clone https://github.com/himanshuchawla0807-gif/OpenPlex.git
cd OpenPlex
node --version
xcode-select -p
npm ci
npm run app:build
npm run app:open
```

If `xcode-select -p` reports a missing developer directory, install the tools with `xcode-select --install` and rerun the check. The build bundles the web interface into `output/OpenPlex.app` and signs it ad hoc. Install and sign in to your chosen vendor CLI separately.

The app starts with three welcome pages. Choose Light, Dark or System. System follows your Mac's current appearance; the selection can be changed later.

## Check your harness first

For Codex, use the [official CLI installation and sign-in guide](https://developers.openai.com/codex/cli). The npm installation is `npm install -g @openai/codex`. Run `codex` in a normal terminal, complete sign-in, and check that a small request succeeds. OpenPlex does not bypass account limits or provide its own tokens.

Claude Code uses its own installation and sign-in; follow [Anthropic's setup guide](https://code.claude.com/docs/en/setup). Test it outside OpenPlex before selecting it for an employee. Other catalog entries have adapter-specific limitations; do not treat their presence as a certification.

For Codex and Claude Code, check the executable with `command -v codex` or `command -v claude`. The native app looks in `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`. If your terminal resolves an alias, shell function, or a version-manager path, make the vendor executable available in one of those directories and reopen OpenPlex. The interactive terminal also checks the vendor-specific bin directories under `~/.minimax-code`, `~/.opencode`, and `~/.kilo`.

## Choose a folder and a person

Create a project from the home screen. Add a room, choose a character and edit the employee profile. Choose a workspace folder before connecting or using the conversational builder. The native folder picker grants the app access to the selected folder.

OpenPlex writes employee-owned configuration under `.openplex/employees/` in that folder. A name, role and system prompt form the foundation; instructions and skills add detail. MCP servers can start local programs or connect to services, so their exact configuration requires first-use trust. Plugin links remain references until they are actually installed and verified outside that reference field.

A good first instruction is concrete: “Review the README and list three unclear setup steps. Do not edit files.” Keep edits disabled at the start. Read the response, check its evidence, and grant only the capabilities your next task needs.

## Work in chat or terminal

Connect the employee's selected harness. Chat projects the supported CLI conversation into readable turns; Terminal exposes the real interactive session. Some vendor output cannot be projected perfectly, so diagnostics and Terminal remain available. Do not paste shell commands into a chat expecting OpenPlex to execute them directly; the harness interprets its own input.

New chat clears the current app conversation context while retaining the employee's configuration. Interrupt active work first. The app's local archives and vendor CLI transcripts have separate retention; starting fresh does not erase every provider history or backup.

In Team workspace, choose one to eight panels, filter by activity or connection, search names, and resize the divisions. Use the single Scroll button to change horizontal/vertical scrolling. Use New space to group a few coworkers. A space changes the view, not their identity or permissions.

## Ask for an update

Open Office Communicate. In all-hands, “What's going on?” addresses every hired employee in that office. Use an exact name or a department to narrow the audience. The preview tells you who will receive the request. Reports use independent conversations and bounded snapshots; they do not commandeer live work chats. Unsupported adapters and missing evidence are shown explicitly.

## If something does not connect

- **Choose a folder:** select an existing folder through the Mac app, not just the browser preview.
- **CLI not found:** check the executable location and reopen OpenPlex after installation.
- **Sign-in or allowance:** confirm a request works in the vendor CLI; use that CLI's own login and account controls.
- **Port 5181 busy:** run `lsof -nP -iTCP:5181 -sTCP:LISTEN` to identify the process, then close the duplicate app or free the port and reopen OpenPlex. The native app serves its bundled UI on `127.0.0.1:5181`. The [browser preview](../CONTRIBUTING.md#browser-preview) uses port 5180 and has separate local storage.
- **MCP/configuration error:** review the employee's MCP JSON and test the server independently. Do not approve an unknown command merely to clear an error.
- **Status report cannot isolate configuration:** some installed CLI versions or unusual MCP server names cannot be safely overridden. The app fails visibly and leaves the working session alone.
- **A black patch or missing reply:** note the provider version, theme, view and reproduction steps. Share a redacted screenshot, never tokens or private transcripts.
