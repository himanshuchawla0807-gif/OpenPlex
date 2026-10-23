# Workspace folder and chat harness controls

23 October 2026. The user clarified that "IDE" meant "harness". IDE selection, application launching and their native bridge handlers have been removed from the app.

A visible Choose workspace folder button appears above the employee-builder composer and in employee profiles. The selected project folder is shown; choosing it preserves the draft. Folder changes reset builder conversation ownership before the next invocation.

The composer’s Chat harness selector chooses the installed runtime that powers builder replies using its existing sign-in/configured model. Codex, Claude Code and OpenCode have builder adapters. Other catalog entries are explicitly marked as pending for builder chat; no unimplemented adapter is represented as working.

Builder dark surfaces share the same base color. The header uses a vertical plum-to-charcoal fade without a hard bottom rule; the sidebar and conversation no longer introduce mismatched dark bands. Input boundaries remain visible.

Verification: browser bridge test covers missing-folder recovery, draft preservation, selected harness and folder propagation, absence of IDE actions and matching seam colors. Web build, lint and Mac build pass.
