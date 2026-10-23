# Where your data goes

OpenPlex stores offices, employee profiles and app conversation state locally in WebKit storage. Browser previews use a different storage origin. Employee instruction and configuration files are written under `.openplex/employees/` in the workspace folder you choose. They use private Unix permissions, but the app does not add its own storage encryption. Your OS account, backups and disk-encryption settings still matter.

Sending a task sends its prompt, the relevant employee configuration, supplied attachments and explicitly shared context to the chosen harness. A cloud harness sends that material to its provider. MCP servers and vendor plugins may contact other services under their own configuration. OpenPlex does not completely control vendor telemetry, transcript retention or tool permissions.

Office Communicate sends a selected employee's bounded work snapshot to that employee's reporting provider and puts the reply in the local shared feed. Common credential patterns are redacted, but no pattern filter can find every secret. Check the audience before sending. There is no multi-user network chat or hosted OpenPlex sync service in this release.

Builder messages expire after 30 days of inactivity. Profile revisions, approved profile content, recent-chat archives, room messages and office-feed messages have different retention and size bounds; see their feature documentation. New chat is not secure erasure. Deleted offices can be restored locally, and deleting one does not delete its project folder, vendor histories or backups.

The app UI uses bundled artwork and fonts rather than loading external decorative resources. Its web server binds only to loopback, applies a restrictive content security policy and rejects cross-site requests. Those protections do not turn an external coding harness into an OS-level sandbox or prove that a cloud model is local.
