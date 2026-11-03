import Foundation
import CryptoKit
import SQLite3
import CoreFoundation
import Darwin

/// Local v2 state. The main-frame bridge authorizes the folder before calling this
/// service; a model-supplied employee name never grants access to a project.
final class CoordinationStore {
    /// Only trusted host UI creates envelopes. Model output cannot invoke this
    /// bridge. Validate the saved task/run binding again on the native side.
    @discardableResult func claimRun(_ body:[String:Any],allowedDirectories:Set<String>) throws -> Double {
        guard let key=body["key"] as? String,let projectId=body["projectId"] as? String,let runId=body["runId"] as? String,UUID(uuidString:runId) != nil,key=="v2:\(projectId):\(runId)",let taskId=body["taskId"] as? String,let owner=body["ownerKey"] as? String,owner.hasPrefix(projectId+":"),body["profile"]==nil,body["threadId"]==nil,body["allowEdits"] as? Bool == false,body["mcp"] as? String=="{}",["codex","claude"].contains(body["harness"] as? String ?? "") else {throw NSError(domain:"OpenPlex.V2",code:1,userInfo:[NSLocalizedDescriptionKey:"Invalid v2 task envelope. No work was started."])}
        let result=try handle(["operation":"claim-run","directory":body["directory"] as? String ?? "","projectId":projectId,"requestId":UUID().uuidString,"runId":runId,"taskId":taskId,"ownerKey":owner],allowedDirectories:allowedDirectories)
        return result["leaseUntil"] as? Double ?? 0
    }
    private let lock = NSLock()
    private let fileManager = FileManager.default
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    private let maximumDocumentBytes = 8_000_000

    private func failure(_ message: String, code: Int = 1) -> NSError {
        NSError(domain: "OpenPlex.Coordination", code: code, userInfo: [NSLocalizedDescriptionKey: message])
    }
    private func identifier(_ raw: Any?, limit: Int = 400) -> String? {
        guard let value = raw as? String, !value.isEmpty, value.utf8.count <= limit,
              !value.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
              !["__proto__", "prototype", "constructor"].contains(value) else { return nil }
        return value
    }
    private func integer(_ raw: Any?) -> Int? {
        guard let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
              number.doubleValue.isFinite, number.doubleValue.rounded() == number.doubleValue,
              number.doubleValue >= 0, number.doubleValue <= 9_007_199_254_740_991 else { return nil }
        return number.intValue
    }
    private func text(_ raw: Any?, maximum: Int, allowEmpty: Bool = false) -> String? {
        guard let value = raw as? String, value.utf8.count <= maximum, !value.contains("\0"),
              allowEmpty || !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return value
    }

    /// Only paths inside the already-authorized base are managed. Check each
    /// existing component and SQLite sidecar, not merely the final database file.
    private func safe(_ target: URL, below base: URL) throws {
        guard target.path == base.path || target.path.hasPrefix(base.path + "/") else {
            throw failure("Coordination data must stay inside the selected project folder.")
        }
        var current = target
        while true {
            if let attributes = try? fileManager.attributesOfItem(atPath: current.path),
               attributes[.type] as? FileAttributeType == .typeSymbolicLink {
                throw failure("Coordination data paths must not be symbolic links.")
            }
            if current.path == base.path { break }
            current.deleteLastPathComponent()
        }
    }
    private func databaseURL(directory: String, projectId: String, allowed: Set<String>) throws -> (URL, URL) {
        guard allowed.contains(directory), directory.hasPrefix("/"), !directory.contains("\0") else {
            throw failure("Choose an authorized local project folder before using v2 coordination.")
        }
        let selected = URL(fileURLWithPath: directory).standardizedFileURL
        guard selected.path == directory else { throw failure("The project folder must use its authorized absolute path.") }
        var isDirectory: ObjCBool = false
        guard fileManager.fileExists(atPath: selected.path, isDirectory: &isDirectory), isDirectory.boolValue else {
            throw failure("The selected project folder is unavailable.")
        }
        try safe(selected, below: selected)
        // macOS deliberately aliases /var to /private/var. Resolve already
        // authorized ancestors before NOFOLLOW opens, then reject symlinks in
        // every managed descendant. Foundation's URL resolver retains /var.
        guard let canonical = realpath(directory, nil) else { throw failure("The project folder could not be resolved.") }
        let base = URL(fileURLWithPath: String(cString: canonical)); free(canonical)
        let volume = try base.resourceValues(forKeys: [.volumeIsLocalKey])
        guard volume.volumeIsLocal == true else {
            throw failure("Live coordination databases require a local disk, not a network folder.")
        }
        let digest = SHA256.hash(data: Data(projectId.utf8)).map { String(format: "%02x", $0) }.joined()
        let root = base.appendingPathComponent(".openplex/v2/\(digest)", isDirectory: true)
        try safe(root, below: base)
        try fileManager.createDirectory(at: root, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        try safe(root, below: base)
        let database = root.appendingPathComponent("state.sqlite")
        for suffix in ["", "-wal", "-shm", "-journal"] { try safe(URL(fileURLWithPath: database.path + suffix), below: base) }
        return (database, base)
    }
    private func open(_ url: URL, initialize: Bool = true) throws -> OpaquePointer {
        var connection: OpaquePointer?
        let flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX | SQLITE_OPEN_NOFOLLOW
        let openCode = sqlite3_open_v2(url.path, &connection, flags, nil)
        guard openCode == SQLITE_OK, let database = connection else {
            if let connection { sqlite3_close(connection) }
            throw failure("The local coordination database could not be opened (SQLite \(openCode)).")
        }
        do {
            sqlite3_busy_timeout(database, 3000)
            try fileManager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
            if initialize {
                try execute(database, "PRAGMA journal_mode=WAL")
                try execute(database, "PRAGMA synchronous=FULL")
                try execute(database, "PRAGMA foreign_keys=ON")
                let version = try scalarInteger(database, "PRAGMA user_version")
                guard version == 0 || version == 1 else { throw failure("This coordination database was created by a newer app version.") }
                try execute(database, "CREATE TABLE IF NOT EXISTS coordination_document (id INTEGER PRIMARY KEY CHECK(id=1), project_id TEXT NOT NULL, revision INTEGER NOT NULL, document TEXT NOT NULL)")
                try execute(database, "CREATE VIRTUAL TABLE IF NOT EXISTS memory_search USING fts5(memory_id UNINDEXED, title, content, tokenize='unicode61')")
                try execute(database, "CREATE TABLE IF NOT EXISTS execution_receipts (run_id TEXT PRIMARY KEY, task_id TEXT NOT NULL, employee_id TEXT NOT NULL)")
                try execute(database, "PRAGMA user_version=1")
            }
            return database
        } catch { sqlite3_close(database); throw error }
    }
    private func prepare(_ database: OpaquePointer, _ sql: String, values: [String] = []) throws -> OpaquePointer {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw failure("The coordination database query could not be prepared.")
        }
        for (offset, value) in values.enumerated() {
            if sqlite3_bind_text(statement, Int32(offset + 1), value, -1, transient) != SQLITE_OK {
                sqlite3_finalize(statement); throw failure("The coordination database query could not be bound.")
            }
        }
        return statement
    }
    private func execute(_ database: OpaquePointer, _ sql: String, values: [String] = []) throws {
        let statement = try prepare(database, sql, values: values); defer { sqlite3_finalize(statement) }
        var result = sqlite3_step(statement)
        while result == SQLITE_ROW { result = sqlite3_step(statement) }
        guard result == SQLITE_DONE else { throw failure("The coordination database transaction failed.") }
    }
    private func scalarInteger(_ database: OpaquePointer, _ sql: String) throws -> Int {
        let statement = try prepare(database, sql); defer { sqlite3_finalize(statement) }
        guard sqlite3_step(statement) == SQLITE_ROW else { throw failure("The coordination database metadata could not be read.") }
        return Int(sqlite3_column_int64(statement, 0))
    }
    private func empty(_ projectId: String) -> [String: Any] {
        ["schemaVersion": 1, "projectId": projectId, "members": [], "tasks": [], "memories": [], "messages": [], "events": []]
    }
    private func read(_ database: OpaquePointer, projectId: String) throws -> (Int, [String: Any]) {
        let statement = try prepare(database, "SELECT project_id, revision, document FROM coordination_document WHERE id=1")
        defer { sqlite3_finalize(statement) }
        let result = sqlite3_step(statement)
        if result == SQLITE_DONE { return (0, empty(projectId)) }
        guard result == SQLITE_ROW,
              let identity = sqlite3_column_text(statement, 0), String(cString: identity) == projectId,
              let document = sqlite3_column_text(statement, 2),
              let bytes = String(cString: document).data(using: .utf8), bytes.count <= maximumDocumentBytes,
              let state = (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any] else {
            throw failure("The local coordination document has an invalid project identity or format.")
        }
        _ = try validate(state, projectId: projectId)
        let revision = sqlite3_column_int64(statement, 1)
        guard revision > 0 else { throw failure("The coordination revision is invalid.") }
        return (Int(revision), state)
    }
    private func records(_ state: [String: Any], _ name: String, maximum: Int) throws -> [[String: Any]] {
        guard let list = state[name] as? [[String: Any]], list.count <= maximum else {
            throw failure("The coordination \(name) list is invalid or exceeds its limit.")
        }
        var ids = Set<String>()
        for item in list {
            guard let id = identifier(item["id"]), ids.insert(id).inserted else {
                throw failure("Coordination \(name) require unique, valid identifiers.")
            }
        }
        return list
    }
    private func validate(_ state: [String: Any], projectId: String) throws -> (Data, [[String: Any]]) {
        guard integer(state["schemaVersion"]) == 1, state["projectId"] as? String == projectId,
              JSONSerialization.isValidJSONObject(state) else { throw failure("The coordination document has an invalid schema or project identity.") }
        let data = try JSONSerialization.data(withJSONObject: state, options: [.sortedKeys])
        guard data.count <= maximumDocumentBytes else { throw failure("Coordination data exceeds the 8 MB limit. Archive older records before saving.") }
        let members = try records(state, "members", maximum: 200)
        let tasks = try records(state, "tasks", maximum: 1000)
        let memories = try records(state, "memories", maximum: 2000)
        _ = try records(state, "messages", maximum: 4000)
        _ = try records(state, "events", maximum: 10000)
        let employeeIds = Set(members.compactMap { $0["id"] as? String })
        let departmentIds = Set(members.compactMap { identifier($0["departmentId"]) })
        let taskIds = Set(tasks.compactMap { $0["id"] as? String })
        for member in members {
            guard identifier(member["departmentId"]) != nil else { throw failure("Each employee needs a department identity.") }
        }
        for task in tasks {
            guard let owner = identifier(task["assigneeId"]), employeeIds.contains(owner),
                  let participants = task["participants"] as? [String], participants.count <= 200,
                  participants.allSatisfy({ employeeIds.contains($0) }) else { throw failure("Task ownership and participants must refer to this project's employees.") }
        }
        for note in memories {
            guard let id = note["id"] as? String, identifier(id) != nil,
                  let scope = note["scope"] as? String, let scopeId = identifier(note["scopeId"]),
                  let author = identifier(note["authorId"]), (author == "user" || employeeIds.contains(author)),
                  text(note["title"], maximum: 500) != nil, text(note["content"], maximum: 100000) != nil,
                  let revision = integer(note["revision"]), revision > 0,
                  let created = integer(note["createdAt"]), created > 0,
                  note["source"] is String || note["source"] is [String: Any] else { throw failure("Shared notes need a valid scope, author, revision, text, and source citation.") }
            let validScope = scope == "project" && scopeId == projectId || scope == "department" && departmentIds.contains(scopeId) || scope == "task" && taskIds.contains(scopeId) || scope == "employee" && employeeIds.contains(scopeId)
            guard validScope else { throw failure("A shared note refers to an unknown or unauthorized scope.") }
            for field in ["expiresAt", "deletedAt"] where note[field] != nil {
                guard let value = integer(note[field]), value > 0 else { throw failure("Shared-note timestamps must be valid epoch milliseconds.") }
            }
            if let superseded = note["supersededBy"] { guard identifier(superseded) != nil else { throw failure("A correction must refer to a valid note identifier.") } }
        }
        return (data, memories)
    }
    private func active(_ note: [String: Any], now: Int) -> Bool {
        note["deletedAt"] == nil && note["supersededBy"] == nil && (integer(note["expiresAt"]) ?? Int.max) > now
    }
    private func canRead(_ note: [String: Any], actor: [String: Any], projectId: String, tasks: [[String: Any]]) -> Bool {
        guard let id = actor["id"] as? String, let scopeId = note["scopeId"] as? String else { return false }
        switch note["scope"] as? String {
        case "project": return scopeId == projectId
        case "employee": return scopeId == id
        case "department": return scopeId == actor["departmentId"] as? String
        case "task":
            guard let task = tasks.first(where: { $0["id"] as? String == scopeId }) else { return false }
            return task["assigneeId"] as? String == id || (task["participants"] as? [String] ?? []).contains(id)
        default: return false
        }
    }

    /// Returns a snapshot or a search/backup result. Callers add their bridge event
    /// name; request and project IDs always echo the validated request.
    func handle(_ body: [String: Any], allowedDirectories: Set<String>) throws -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        guard let directory = body["directory"] as? String,
              let projectId = identifier(body["projectId"], limit: 200),
              let requestId = body["requestId"] as? String, UUID(uuidString: requestId) != nil,
              let operation = body["operation"] as? String, ["load", "save", "search", "backup", "claim-run"].contains(operation) else {
            throw failure("The coordination request is invalid.")
        }
        let (url, base) = try databaseURL(directory: directory, projectId: projectId, allowed: allowedDirectories)
        let database = try open(url); defer { sqlite3_close(database) }
        let envelope: [String: Any] = ["requestId": requestId, "projectId": projectId]
        func response(_ values: [String: Any]) -> [String: Any] { envelope.merging(values, uniquingKeysWith: { _, new in new }) }
        switch operation {
        case "claim-run":
            guard let runId=body["runId"] as? String,UUID(uuidString:runId) != nil,let taskId=identifier(body["taskId"]),let employeeId=identifier(body["ownerKey"]),employeeId.hasPrefix(projectId+":") else {throw failure("Invalid task execution identity.")}
            try execute(database,"BEGIN IMMEDIATE")
            do {
                let (_,state)=try read(database,projectId:projectId)
                guard let tasks=state["tasks"] as? [[String:Any]],tasks.filter({$0["status"] as? String=="running"}).count<=2,let claim=tasks.first(where:{$0["id"] as? String==taskId && $0["assigneeId"] as? String==employeeId && $0["runId"] as? String==runId && $0["status"] as? String=="running" && (integer($0["leaseUntil"]) ?? 0)>Int(Date().timeIntervalSince1970*1000)}) else {throw failure("The durable task claim is missing, expired, cancelled or owned by another employee.")}
                // Commit a unique dispatch receipt before spawning. An ambiguous
                // crash or duplicate bridge message can never repeat this run.
                try execute(database,"INSERT INTO execution_receipts(run_id,task_id,employee_id) VALUES(?,?,?)",values:[runId,taskId,employeeId])
                try execute(database,"COMMIT")
                return response(["claimed":true,"leaseUntil":claim["leaseUntil"]!])
            } catch {try? execute(database,"ROLLBACK");throw error}
        case "load":
            let (revision, state) = try read(database, projectId: projectId)
            return response(["revision": revision, "state": state])
        case "save":
            guard let state = body["state"] as? [String: Any], let expected = integer(body["expectedRevision"]) else {
                throw failure("Save requires a document and the revision that was loaded.")
            }
            let (data, memories) = try validate(state, projectId: projectId)
            try execute(database, "BEGIN IMMEDIATE")
            do {
                let (revision, _) = try read(database, projectId: projectId)
                guard expected == revision else { throw failure("Coordination changed in another window. Reload before saving.", code: 409) }
                try execute(database, "INSERT INTO coordination_document(id,project_id,revision,document) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document", values: [projectId, String(revision + 1), String(decoding: data, as: UTF8.self)])
                try execute(database, "DELETE FROM memory_search")
                for note in memories where active(note, now: Int(Date().timeIntervalSince1970 * 1000)) {
                    try execute(database, "INSERT INTO memory_search(memory_id,title,content) VALUES(?,?,?)", values: [note["id"] as! String, note["title"] as! String, note["content"] as! String])
                }
                try execute(database, "COMMIT")
                return response(["revision": revision + 1, "state": state])
            } catch { try? execute(database, "ROLLBACK"); throw error }
        case "search":
            guard let query = text(body["query"], maximum: 500) else { throw failure("Enter a search query of up to 500 bytes.") }
            let tokens = query.components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }.prefix(16)
            guard !tokens.isEmpty else { return response(["items": [], "total": 0]) }
            let match = tokens.map { "\"\($0)\"" }.joined(separator: " AND ")
            // Read the document and FTS rows from the same SQLite snapshot.
            try execute(database, "BEGIN")
            defer { try? execute(database, "ROLLBACK") }
            let (revision, state) = try read(database, projectId: projectId)
            let members = state["members"] as? [[String: Any]] ?? [], tasks = state["tasks"] as? [[String: Any]] ?? []
            var actor: [String: Any]?
            if let raw = body["actorId"] {
                guard let actorId = identifier(raw), let member = members.first(where: { $0["id"] as? String == actorId }) else {
                    throw failure("Search requires an employee from this project.")
                }
                actor = member
            }
            let now = Int(Date().timeIntervalSince1970 * 1000)
            let permitted = (state["memories"] as? [[String: Any]] ?? []).filter { note in
                active(note, now: now) && (actor == nil || canRead(note, actor: actor!, projectId: projectId, tasks: tasks))
            }
            guard !permitted.isEmpty else { return response(["revision": revision, "items": [], "total": 0]) }
            // Scope filtering is inside the MATCH query before ranking or LIMIT.
            let allowedIds = permitted.compactMap { $0["id"] as? String }
            let placeholders = Array(repeating: "?", count: allowedIds.count).joined(separator: ",")
            let statement = try prepare(database, "SELECT memory_id FROM memory_search WHERE memory_search MATCH ? AND memory_id IN (\(placeholders)) ORDER BY bm25(memory_search) LIMIT 50", values: [match] + allowedIds)
            defer { sqlite3_finalize(statement) }
            let lookup = Dictionary(uniqueKeysWithValues: permitted.map { ($0["id"] as! String, $0) })
            var result = [[String: Any]]()
            var code = sqlite3_step(statement)
            while code == SQLITE_ROW {
                if let value = sqlite3_column_text(statement, 0), let note = lookup[String(cString: value)] { result.append(note) }
                code = sqlite3_step(statement)
            }
            guard code == SQLITE_DONE else { throw failure("The local knowledge search failed.") }
            return response(["revision": revision, "items": result, "total": result.count])
        case "backup":
            let destination = url.deletingLastPathComponent().appendingPathComponent("backups", isDirectory: true)
            try safe(destination, below: base)
            try fileManager.createDirectory(at: destination, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
            try safe(destination, below: base)
            let target = destination.appendingPathComponent("v2-\(UUID().uuidString.lowercased()).sqlite")
            try safe(target, below: base)
            let backupDatabase = try open(target, initialize: false)
            defer { sqlite3_close(backupDatabase) }
            guard let backup = sqlite3_backup_init(backupDatabase, "main", database, "main") else { throw failure("The coordination backup could not start.") }
            let step = sqlite3_backup_step(backup, -1), finish = sqlite3_backup_finish(backup)
            guard step == SQLITE_DONE && finish == SQLITE_OK else { throw failure("The coordination backup did not complete.") }
            // A portable snapshot must not depend on a WAL beside the backup.
            try execute(backupDatabase, "PRAGMA journal_mode=DELETE")
            return response(["path": target.path, "revision": try read(database, projectId: projectId).0])
        default: throw failure("Unsupported coordination operation.")
        }
    }
}
