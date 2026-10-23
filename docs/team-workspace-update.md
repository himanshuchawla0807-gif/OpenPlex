# Employee workspace — 22 October 2026

Open **Team workspace** in the header or use ⌘2 in the Mac app. It shows the selected office’s hired employees, with an explicit office switcher, with one through eight panels per page, Chat/Terminal views, a focused panel view, search, name/activity sorting and All hired/Working/Connected filters. Page buttons and horizontal gestures navigate larger teams. Plus opens a horizontal multi-select employee catalog for locally saved spaces.

Each card uses the existing employee session key, including project and room identity. Opening this view passively attaches to existing PTYs; it does not start new CLI processes. Connect explicitly starts the employee harness. Live off-page PTYs retain observers, and expanding/switching views preserves their session. Running streamed tasks display their real task output and cannot start a competing interactive terminal. The existing native PTY limit still applies.

Generated transparent face artwork covers all 40 catalog characters in ten four-person atlases. Small generated mathematical and paper elements decorate empty chat panels; portraits also appear in the individual Chat/Terminal workspace. The web header is 46px high and the Mac title bar uses compact styling without a duplicate toolbar.

Validation: builder unit suite; browser fixture checks for six-panel paging, portrait loading, independent input, active filtering, shared Chat/Terminal sessions, focused panels and saved spaces; native controlling-PTY tests including passive attachment without process creation; native streamed-runtime and employee-folder suites. A real installed Mac tile connected to Codex and received “Gus is ready.” A wrapping-related duplicate echo found during that check received a focused regression test and fix. REA statically parsed all 29 builder modules without parse failures; this is syntax evidence, not runtime certification.

Working state uses submitted interactive input and recognized CLI completion markers, or native streamed-task status. Unknown CLI output remains available in Terminal/activity and is not invented as assistant chat. Not every catalog harness supports a structured chat adapter.

## Layout refinement

The panel-count control now supports one through eight employees per page. Partial pages balance only their actual employees across the full canvas (for example four remaining employees become a full two-by-two arrangement). Column dividers work separately per row, and the horizontal divider adjusts both rows. Drag or focus a divider and use arrow keys; double-click restores equal sizing. Panel count and proportions save locally. Page changes slide in their navigation direction and respect reduced-motion settings without remounting live sessions.

Panel headers now show only character portraits and names over a soft fading tint. The office subtitle and hard header rule are removed. The portrait viewport clips atlas-edge spill, including the stray fragment beside Otis. Claude Code uses the original orange Claude mark from Anthropic’s asset host; its source is recorded in public/harnesses/README.md.

Terminal mode removes the chat composer and accepts direct xterm keyboard input. Connect, approval choice, Interrupt and End remain available, and terminal surfaces clip to rounded corners. Chat retains its composer with more vertical conversation space.

Validation adds grid coverage for counts 1–8, balanced partial pages, pointer column resizing, keyboard row resizing, persisted proportions, sliding/reduced-motion behavior and composer-free rounded terminal views. Existing session-isolation and space-persistence browser checks remain passing. Builder suite: 42 tests. REA parsed 30 builder modules with zero parse failures.

## Office scope and compact navigation

The selected office is now the source of truth for the roster. The previous view combined projects, so the same catalog character hired in different projects appeared multiple times and could be mistaken for an incorrect hire. No project or employee data was deleted. Dashboard entry defaults to the first office; entering from an office uses that office. The office switcher changes scope explicitly, including the hire picker and counts.

One compact toolbar replaces the duplicated OpenPlex breadcrumb and Room to Work bars. Back to office, Team workspace, office scope, filters and view/layout controls share the toolbar on wide screens. Diagnostics lives in a per-session overflow overlay. User labels sit above readable chat bubbles. Individual employee chat keeps one transparent portrait on the left; the duplicate hero portrait is removed.

Horizontal trackpad gestures now drag a continuous strip of real employee panels, including when started over a conversation. Adjacent panels move into view while vertical scrolling remains inside chats. Paging and expansion preserve existing native sessions; off-page panels are inert and hidden from accessibility navigation. Reduced-motion preference disables settling animation.

Validation: 43 builder tests; browser checks for exact Oscar/Gus/Felix membership with hires in another office, office switching, a single compact toolbar, inline filters, continuous trackpad translation, overlay diagnostics, one unframed individual portrait, direct terminal input and existing isolation/space persistence.
