import Foundation
import CryptoKit
import SQLite3

let fm = FileManager.default
let base = fm.temporaryDirectory.resolvingSymlinksInPath().appendingPathComponent("openplex-v2-store-\(UUID().uuidString)", isDirectory: true)
try fm.createDirectory(at: base, withIntermediateDirectories: false)
defer { try? fm.removeItem(at: base) }
let allowed: Set<String> = [base.path]
let store = CoordinationStore()
var checks = 0
func check(_ value: Bool, _ message: String) {
    guard value else { fatalError(message) }; checks += 1
}
func rejects(_ message: String, _ action: () throws -> Void) {
    do { try action(); fatalError("Expected rejection: \(message)") }
    catch { checks += 1 }
}
func request(_ op: String, project: String = "project-a", values: [String: Any] = [:]) -> [String: Any] {
    ["action": "coordination", "operation": op, "directory": base.path, "projectId": project, "requestId": UUID().uuidString].merging(values, uniquingKeysWith: { _, new in new })
}
func save(_ state: [String: Any], revision: Int, with service: CoordinationStore = store) throws -> [String: Any] {
    try service.handle(request("save", project: state["projectId"] as! String, values: ["state": state, "expectedRevision": revision]), allowedDirectories: allowed)
}
func query(_ text: String = "launch", actor: String? = nil) throws -> [String] {
    var values: [String: Any] = ["query": text]
    if let actor { values["actorId"] = actor }
    let result = try store.handle(request("search", values: values), allowedDirectories: allowed)
    return (result["items"] as! [[String: Any]]).map { $0["id"] as! String }.sorted()
}
let now = Int(Date().timeIntervalSince1970 * 1000)
let members: [[String: Any]] = [
    ["id": "ceo", "departmentId": "executive", "role": "ceo"],
    ["id": "alice", "departmentId": "engineering", "role": "employee"],
    ["id": "bob", "departmentId": "marketing", "role": "employee"]
]
func note(_ id: String, scope: String, scopeId: String, additions: [String: Any] = [:]) -> [String: Any] {
    ["id": id, "scope": scope, "scopeId": scopeId, "authorId": "alice", "title": "Launch evidence", "content": "Launch checklist verified with reproducible tests.", "source": ["kind": "task", "id": "task-1"], "revision": 1, "createdAt": now].merging(additions, uniquingKeysWith: { _, new in new })
}
var state: [String: Any] = [
    "schemaVersion": 1, "projectId": "project-a", "members": members,
    "tasks": [["id": "task-1", "assigneeId": "alice", "participants": ["alice", "bob"], "status": "queued"]],
    "memories": [
        note("private", scope: "employee", scopeId: "alice"),
        note("team", scope: "task", scopeId: "task-1"),
        note("department", scope: "department", scopeId: "engineering"),
        note("public", scope: "project", scopeId: "project-a"),
        note("expired", scope: "project", scopeId: "project-a", additions: ["expiresAt": now - 1]),
        note("deleted", scope: "project", scopeId: "project-a", additions: ["deletedAt": now]),
        note("old", scope: "project", scopeId: "project-a", additions: ["supersededBy": "public"])
    ], "messages": [], "events": []
]
let empty = try store.handle(request("load"), allowedDirectories: allowed)
check(empty["revision"] as? Int == 0, "New project starts at revision zero")
check(try store.handle(request("save", values: ["state": state, "expectedRevision": 0]), allowedDirectories: allowed)["revision"] as? Int == 1, "Initial save revision")
let reopened = try CoordinationStore().handle(request("load"), allowedDirectories: allowed)
check(reopened["revision"] as? Int == 1 && (reopened["state"] as? [String: Any])?["projectId"] as? String == "project-a", "Reopen retains durable state")
check(try query(actor: "alice") == ["department", "private", "public", "team"], "Worker reads private/task/department/project scopes")
check(try query(actor: "bob") == ["public", "team"], "Other department sees only task and project")
check(try query(actor: "ceo") == ["public"], "CEO cannot read all private conversations")
check(try query() == ["department", "private", "public", "team"], "User reads all active notes")
rejects("Unknown actor") { _ = try query(actor: "attacker") }
check(try query("launch OR private*", actor: "bob").isEmpty, "FTS operators are treated as ordinary tokens")
rejects("Stale CAS revision") { _ = try save(state, revision: 0, with: CoordinationStore()) }
let other = try store.handle(request("load", project: "project-b"), allowedDirectories: allowed)
check(other["revision"] as? Int == 0, "Another project has an independent database")
var invalid = state; invalid["projectId"] = "project-b"
rejects("Project spoof") { _ = try store.handle(request("save", values: ["expectedRevision": 1, "state": invalid]), allowedDirectories: allowed) }
rejects("Unauthorized folder") { _ = try store.handle(request("load"), allowedDirectories: []) }
var duplicate = state; duplicate["members"] = members + [members[0]]
rejects("Duplicate members") { _ = try save(duplicate, revision: 1) }
var wrongScope = state; wrongScope["memories"] = [note("wrong", scope: "project", scopeId: "project-b")]
rejects("Cross-project scope") { _ = try save(wrongScope, revision: 1) }
var wrongTeam = state; wrongTeam["tasks"] = [["id": "task-1", "assigneeId": "alice", "participants": ["intruder"]]]
rejects("Task membership spoof") { _ = try save(wrongTeam, revision: 1) }

let digest = SHA256.hash(data: Data("project-a".utf8)).map { String(format: "%02x", $0) }.joined()
let db = base.appendingPathComponent(".openplex/v2/\(digest)/state.sqlite")
func sql(_ command: String, at path: URL = db) throws {
    var connection: OpaquePointer?
    guard sqlite3_open(path.path, &connection) == SQLITE_OK, let connection else { fatalError("Test SQL open failed") }
    defer { sqlite3_close(connection) }
    guard sqlite3_exec(connection, command, nil, nil, nil) == SQLITE_OK else { fatalError("Test SQL failed: \(String(cString: sqlite3_errmsg(connection)))") }
}
// Fail after the document UPDATE but during FTS insertion: both must roll back.
try sql("ALTER TABLE memory_search RENAME TO retained_memory_search; CREATE TABLE memory_search(memory_id TEXT,title TEXT,content TEXT,CHECK(memory_id != 'replacement')); INSERT INTO memory_search SELECT memory_id,title,content FROM retained_memory_search")
var changed = state; changed["memories"] = [note("replacement", scope: "project", scopeId: "project-a")]
rejects("Index insertion failure rolls back document") { _ = try save(changed, revision: 1) }
let afterFailure = try store.handle(request("load"), allowedDirectories: allowed)
check(afterFailure["revision"] as? Int == 1, "Failed index save preserves revision")
try sql("DROP TABLE memory_search; ALTER TABLE retained_memory_search RENAME TO memory_search")
check(try query(actor: "bob") == ["public", "team"], "Failed transaction preserves previous search rows")
state["memories"] = [note("replacement", scope: "project", scopeId: "project-a")]
check(try save(state, revision: 1)["revision"] as? Int == 2, "Correction save succeeds")
check(try query(actor: "bob") == ["replacement"], "Removed notes are deleted from FTS")

let backup = try store.handle(request("backup"), allowedDirectories: allowed)
let backupPath = URL(fileURLWithPath: backup["path"] as! String)
check(fm.fileExists(atPath: backupPath.path), "SQLite backup exists")
var backupDatabase: OpaquePointer?
check(sqlite3_open_v2(backupPath.path, &backupDatabase, SQLITE_OPEN_READONLY, nil) == SQLITE_OK, "Backup opens")
var statement: OpaquePointer?
let prepared = sqlite3_prepare_v2(backupDatabase, "SELECT revision FROM coordination_document WHERE id=1", -1, &statement, nil)
let stepped = sqlite3_step(statement)
check(prepared == SQLITE_OK && stepped == SQLITE_ROW && sqlite3_column_int(statement, 0) == 2, "Backup has a consistent committed document")
sqlite3_finalize(statement); sqlite3_close(backupDatabase)
let mode = try fm.attributesOfItem(atPath: db.path)[.posixPermissions] as! NSNumber
check(mode.intValue & 0o777 == 0o600, "Database mode is private")

let outside = base.appendingPathComponent("outside.txt")
try Data("untouched".utf8).write(to: outside)
let wal = URL(fileURLWithPath: db.path + "-wal")
if fm.fileExists(atPath: wal.path) { try fm.removeItem(at: wal) }
try fm.createSymbolicLink(at: wal, withDestinationURL: outside)
rejects("WAL symbolic link") { _ = try store.handle(request("load"), allowedDirectories: allowed) }
check(try String(contentsOf: outside, encoding: .utf8) == "untouched", "Symlink target remains untouched")
try fm.removeItem(at: wal)
let backupDirectory = backupPath.deletingLastPathComponent()
try fm.removeItem(at: backupDirectory)
try fm.createSymbolicLink(at: backupDirectory, withDestinationURL: base)
rejects("Backup-directory symbolic link") { _ = try store.handle(request("backup"), allowedDirectories: allowed) }
try fm.removeItem(at: backupDirectory)
let projectC = "project-c", digestC = SHA256.hash(data: Data(projectC.utf8)).map { String(format: "%02x", $0) }.joined()
let symlink = base.appendingPathComponent(".openplex/v2/\(digestC)")
try fm.createSymbolicLink(at: symlink, withDestinationURL: base)
rejects("Managed ancestor symbolic link") { _ = try store.handle(request("load", project: projectC), allowedDirectories: allowed) }
try fm.removeItem(at: symlink)
// Dispatch receipts survive a service restart and reject run/owner spoofing.
let claimProject="claim-project",claimOwner="claim-project:alice",runId=UUID().uuidString
let claimState:[String:Any]=["schemaVersion":1,"projectId":claimProject,"members":[["id":claimOwner,"departmentId":"tech"]],"tasks":[["id":"work","assigneeId":claimOwner,"participants":[claimOwner],"status":"running","runId":runId,"leaseUntil":now+600000]],"memories":[],"messages":[],"events":[]]
_=try store.handle(request("save",project:claimProject,values:["state":claimState,"expectedRevision":0]),allowedDirectories:allowed)
let run:[String:Any]=["key":"v2:\(claimProject):\(runId)","projectId":claimProject,"directory":base.path,"ownerKey":claimOwner,"runId":runId,"taskId":"work","harness":"codex","mcp":"{}","allowEdits":false]
try store.claimRun(run,allowedDirectories:allowed);checks+=1
rejects("Duplicate native dispatch after restart") {try CoordinationStore().claimRun(run,allowedDirectories:allowed)}
for override:[String:Any] in [["ownerKey":"claim-project:other"],["allowEdits":true],["mcp":"{\"s\":{}}"],["threadId":UUID().uuidString],["harness":"opencode"],["key":"foreign-run"]] {
    rejects("Invalid v2 execution envelope") {try store.claimRun(run.merging(override,uniquingKeysWith:{$1}),allowedDirectories:allowed)}
}
// Corrupt-but-readable JSON must be rejected, never force-cast into a crash.
try sql("UPDATE coordination_document SET document='{\"schemaVersion\":1,\"projectId\":\"project-a\"}'")
rejects("Malformed persisted state") { _ = try store.handle(request("load"), allowedDirectories: allowed) }
print("Coordination store: \(checks) checks passed (durability, isolation, permissions, CAS, FTS rollback, backup, symlinks).")
