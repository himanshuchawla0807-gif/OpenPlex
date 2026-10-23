# Office controls on the home screen

Each office card has an Open button, Rename, and Delete office. Deletion requires a named confirmation and moves the office to Recently deleted. Restore office recovers its rooms, staff, employee profiles and project-folder selection. Project folder files and harness histories are not removed. Deleted office snapshots remain in local app storage until restored; there is no automatic expiry or permanent-purge control in this change.

Deletion is disabled until native terminal inventory is available, and while the office has an interactive terminal, streamed task, shared-room task or reported working employee. The action checks again at confirmation. If persistence fails, the office stays visible and an error is shown. Other offices are preserved.

Verified using the disposable UI fixture in `output/playwright/office-home-actions.js`: rename, cancel, delete/reload, restore, folder preservation, sibling preservation, active-session blocking, storage failure. Production build, lint and native packaging passed. No real user office was deleted during verification.
