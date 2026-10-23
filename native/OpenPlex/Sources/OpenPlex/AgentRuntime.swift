import Foundation
import CoreFoundation
import Darwin


/// Owns only sessions launched explicitly from an employee's task panel.
final class AgentRuntime {
    struct Job { let process: Process; let input: Pipe; let output: Pipe; let errors: Pipe; let harness:String; var pending = Data(); var pendingErrors = Data(); var outputDone=false; var errorsDone=false; var exitCode:Int? }
    private let queue = DispatchQueue(label:"OpenPlex.agent-runtime")
    private let executableOverride:URL?
    private var ownedSessions=UserDefaults.standard.dictionary(forKey:"OpenPlex.ownedSessions") as? [String:String] ?? [:]
    private var sessionDirectories=UserDefaults.standard.dictionary(forKey:"OpenPlex.sessionDirectories") as? [String:String] ?? [:]
    private var sessionProviders=UserDefaults.standard.dictionary(forKey:"OpenPlex.sessionProviders") as? [String:String] ?? [:]
    init(executable:URL?=nil) { executableOverride=executable }
    private var jobs: [String:Job] = [:]
    private var owners: [String:String] = [:]
    private var failedTasks=Set<String>()
    private var lastAnswers=[String:String]()
    var emit: (([String:Any])->Void)?
    func hasRunningTask(_ key:String)->Bool {queue.sync {jobs[key] != nil || owners.values.contains(key)}}
    func ownedThread(key:String,directory:String,harness:String)->String? {
        queue.sync {
            guard sessionDirectories[key]==directory,(sessionProviders[key] ?? "codex")==harness else{return nil}
            return ownedSessions[key]
        }
    }
    private func send(_ event:[String:Any]) { DispatchQueue.main.async { [weak self] in self?.emit?(event) } }
    func stop(_ key:String) { queue.async { if let job=self.jobs[key] {
        job.process.interrupt()
        self.queue.asyncAfter(deadline:.now()+5) { if let current=self.jobs[key],current.process===job.process,current.process.isRunning { current.process.terminate() } }
    } } }
    func stopAll() { queue.sync { for job in jobs.values where job.process.isRunning { job.process.terminate() } } }
    func run(_ body:[String:Any], allowedDirectories:Set<String>) {
        queue.async { [self] in
            guard let key=body["key"] as? String, key.count<400 else { return }
            func fail(_ message:String) { send(["key":key,"kind":"error","text":message]) }
            let reporting=key.hasPrefix("status:")
            let reports=jobs.keys.filter{$0.hasPrefix("status:")}.count
            guard reporting ? reports<2 : jobs.count-reports<12 else {fail(reporting ? "Two status reports are already running. Wait for a reply before asking again.":"Twelve employee tasks are already running. Finish or stop one before starting another.");return}
            let owner=key.hasPrefix("room:") ? (body["ownerKey"] as? String ?? key):key
            guard owner.count<400 else {fail("Invalid employee identity.");return}
            guard jobs[key]==nil,jobs[owner]==nil,!owners.values.contains(owner) else { fail("This employee already has a running task.");return }
            let harness=body["harness"] as? String ?? "codex"
            guard ["codex","claude","opencode"].contains(harness),harness != "opencode" || key.hasPrefix("builder:") else {fail("Choose Codex or Claude Code for this employee.");return}
            var isDirectory:ObjCBool=false
            guard let directory=body["directory"] as? String, allowedDirectories.contains(directory), FileManager.default.fileExists(atPath:directory,isDirectory:&isDirectory), isDirectory.boolValue, let prompt=body["prompt"] as? String, !prompt.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty, prompt.utf8.count<=100000, let brief=body["brief"] as? String, brief.utf8.count<=1000000 else { fail("Choose a valid project folder and a task before starting.");return }
            let home=FileManager.default.homeDirectoryForCurrentUser.path
            let providerName=harness=="codex" ? "Codex":harness=="opencode" ? "OpenCode":"Claude Code"
            let paths=["\(home)/.local/bin/\(harness)","/opt/homebrew/bin/\(harness)","/usr/local/bin/\(harness)"]
            guard let executable=executableOverride?.path ?? paths.first(where:{FileManager.default.isExecutableFile(atPath:$0)}) else { fail("\(providerName) CLI was not found. Install and sign in using its CLI, then reopen this workspace.");return }
            if reporting,body["threadId"] != nil {fail("Status reports must start a separate conversation.");return}
            if reporting,body["mcp"] as? String != "{}" {fail("Status reports cannot add MCP servers.");return}
            let edits = !reporting && (body["allowEdits"] as? Bool)==true
            var arguments=harness=="codex" ? ["exec","--json","--skip-git-repo-check","-c","sandbox_mode=\"\(edits ? "workspace-write":"read-only")\""]:["--print","--output-format","stream-json","--verbose","--permission-mode",edits ? "manual":"plan"]
            if reporting {
                if harness=="codex" {
                    arguments += ["--disable","shell_tool","--disable","unified_exec","--disable","multi_agent","--disable","multi_agent_v2","--disable","apps","--disable","plugins","--disable","hooks","-c","memories.use_memories=false","-c","memories.generate_memories=false","-c","project_doc_max_bytes=0","-c","web_search=\"disabled\"","-c","agents.enabled=false"]
                    if executableOverride==nil {do {arguments += try Self.statusMCPOverrides(executable:executable,directory:directory)}catch{fail("Could not isolate status reporting from configured MCP servers. Your working session was left unchanged.");return}}
                }
                if harness=="claude" {arguments += ["--safe-mode","--tools","","--strict-mcp-config","--mcp-config","{\"mcpServers\":{}}"]}
            }
            if key.hasPrefix("builder:"),body["allowResearch"] as? Bool==true {
                if harness=="codex" {arguments.insert("--search",at:0)}
                if harness=="claude" {arguments += ["--allowedTools","WebSearch"]}
            }
            if harness=="opencode" {arguments=["run","--standalone","--format","json","--agent","openplex-builder"]}
            if let rawPrompt=body["systemPrompt"] {
                guard let systemPrompt=rawPrompt as? String,systemPrompt.utf8.count<=100000,let instructions=try? Self.toml(systemPrompt) else { fail("The employee system prompt must be text no larger than 100 KB.");return }
                if harness != "opencode" {arguments += harness=="codex" ? ["-c","developer_instructions=\(instructions)"]:["--append-system-prompt",systemPrompt]}
            }
            // Profile-specific servers are scoped to this invocation; global CLI configuration is untouched.
            if let mcp=body["mcp"] as? String, let data=mcp.data(using:.utf8), let servers=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] {
                for name in servers.keys.sorted() {
                    guard name.range(of:"^[A-Za-z0-9_-]{1,80}$",options:.regularExpression) != nil, let server=servers[name] as? [String:Any], let value=try? Self.toml(server) else { fail("MCP servers must use simple names and valid configuration objects.");return }
                    if harness=="codex" {arguments += ["-c","mcp_servers.\(name)=\(value)"]}
                }
                if harness=="claude",!servers.isEmpty,let json=try? JSONSerialization.data(withJSONObject:["mcpServers":servers],options:[.sortedKeys,.withoutEscapingSlashes]) {arguments += ["--mcp-config",String(decoding:json,as:UTF8.self)]}
            } else { fail("MCP servers must be a JSON object.");return }
            if let thread=body["threadId"] as? String {
                guard (harness=="opencode" ? thread.range(of:"^ses_[A-Za-z0-9]{1,120}$",options:.regularExpression) != nil:UUID(uuidString:thread) != nil),ownedSessions[key]==thread,sessionDirectories[key]==directory,(sessionProviders[key] ?? "codex")==harness else { fail("This session belongs to another employee, provider or project folder. Start a new session to continue here.");return }
                arguments += harness=="codex" ? ["resume",thread,"-"]:harness=="opencode" ? ["--session",thread]:["--resume",thread]
            } else if harness=="codex" {arguments += ["-"]}
            guard arguments.reduce(0,{$0+$1.utf8.count})<160000 else { fail("This employee’s configuration is too large for a CLI invocation. Shorten the system prompt or MCP settings.");return }
            let process=Process(),input=Pipe(),output=Pipe(),errors=Pipe()
            process.executableURL=URL(fileURLWithPath:executable);process.arguments=arguments;process.currentDirectoryURL=URL(fileURLWithPath:directory)
            var env=ProcessInfo.processInfo.environment;env["PATH"]="\(home)/.local/bin:/opt/homebrew/bin:/usr/local/bin:\(env["PATH"] ?? "/usr/bin:/bin")"
            if harness=="opencode" {
                let config:[String:Any]=["permission":["*":"deny"],"agent":["openplex-builder":["mode":"primary","prompt":body["systemPrompt"] as? String ?? "Return a reviewable employee profile JSON.","permission":["*":"deny"]]]]
                guard let bytes=try? JSONSerialization.data(withJSONObject:config) else {fail("Builder configuration could not be prepared.");return}
                env["OPENCODE_CONFIG_CONTENT"]=String(decoding:bytes,as:UTF8.self)
            }
            process.environment=env
            process.standardInput=input;process.standardOutput=output;process.standardError=errors
            owners[key]=owner
            jobs[key]=Job(process:process,input:input,output:output,errors:errors,harness:harness)
            process.terminationHandler={ [weak self] process in self?.queue.async {
                guard let self=self,var job=self.jobs[key] else{return};job.exitCode=Int(process.terminationStatus);self.jobs[key]=job;self.finish(key)
            } }
            do {
                try process.run()
                read(output.fileHandleForReading,key:key,errors:false);read(errors.fileHandleForReading,key:key,errors:true)
                _ = fcntl(input.fileHandleForWriting.fileDescriptor,F_SETNOSIGPIPE,1)
                send(["key":key,"kind":"started","text":"\(providerName) started in \(directory)."])
                let context=body["context"] as? String ?? ""
                let payload="Employee configuration:\n\(brief)\(context.isEmpty ? "":"\n\nShared context for this room only:\n\(String(context.prefix(100000)))")\n\nUser task:\n\(prompt)"
                DispatchQueue.global(qos:.userInitiated).async { try? input.fileHandleForWriting.write(contentsOf:Data(payload.utf8));try? input.fileHandleForWriting.close() }
            } catch { owners.removeValue(forKey:key);jobs.removeValue(forKey:key);fail("Could not start \(providerName): \(error.localizedDescription)") }
        }
    }
    private func read(_ handle:FileHandle,key:String,errors:Bool) {
        DispatchQueue.global(qos:.userInitiated).async { [weak self] in
            while let data=try? handle.read(upToCount:65536),!data.isEmpty {
                self?.queue.async { [weak self] in
                    guard let self=self else{return}
                    if errors { self.consumeErrors(key,data:data) }
                    else { self.consume(key,data:data) }
                }
            }
            self?.queue.async { [weak self] in
                guard let self=self,var job=self.jobs[key] else{return};if errors{job.errorsDone=true}else{job.outputDone=true};self.jobs[key]=job;self.finish(key)
            }
        }
    }
    private func finish(_ key:String) {
        guard let job=jobs[key],job.outputDone,job.errorsDone,let exit=job.exitCode else{return}
        consumeLines(key,data:job.pending,flush:true)
        if !job.pendingErrors.isEmpty { send(["key":key,"kind":"output","text":String(decoding:job.pendingErrors,as:UTF8.self)]) }
        let failed=failedTasks.remove(key) != nil
        lastAnswers.removeValue(forKey:key)
        jobs.removeValue(forKey:key)
        owners.removeValue(forKey:key)
        // A CLI can report a failed turn in JSON while exiting successfully.
        // Keep that failure visible instead of overwriting attention with complete.
        let result=exit==0 && failed ? 1:exit
        send(["key":key,"kind":"finished","exitCode":result,"text":result==0 ? "Task finished.":failed && exit==0 ? "The provider reported a failed turn. Check the task output.":"Task stopped or needs attention (exit \(exit))."])
    }
    private func consumeErrors(_ key:String,data:Data) {
        guard var job=jobs[key] else{return}
        job.pendingErrors.append(data)
        while let newline=job.pendingErrors.firstIndex(of:10) {
            let line=Data(job.pendingErrors[...newline]);job.pendingErrors.removeSubrange(...newline)
            send(["key":key,"kind":"output","text":String(decoding:line,as:UTF8.self)])
        }
        // Bound unterminated diagnostic lines while retaining incomplete UTF-8
        // bytes for the next read instead of replacing a split code point.
        if job.pendingErrors.count>65536 {
            var boundary=job.pendingErrors.count
            while boundary>job.pendingErrors.count-4 && boundary>0 && (job.pendingErrors[job.pendingErrors.startIndex+boundary-1]&0xC0)==0x80 { boundary-=1 }
            if boundary<job.pendingErrors.count { boundary=max(0,boundary-1) }
            else if let last=job.pendingErrors.last,last>=0xC0 { boundary-=1 }
            send(["key":key,"kind":"output","text":String(decoding:job.pendingErrors.prefix(boundary),as:UTF8.self)])
            job.pendingErrors=Data(job.pendingErrors.dropFirst(boundary))
        }
        jobs[key]=job
    }
    private func consume(_ key:String,data:Data) {
        guard var job=jobs[key],!data.isEmpty else{return}
        job.pending.append(data)
        while let newline=job.pending.firstIndex(of:10) { let line=Data(job.pending[..<newline]);job.pending.removeSubrange(...newline);consumeLines(key,data:line,flush:true) }
        if job.pending.count>1000000 { job.pending.removeAll();send(["key":key,"kind":"output","text":"A large terminal event was truncated."]) }
        jobs[key]=job
    }
    private func consumeLines(_ key:String,data:Data,flush:Bool) {
        for line in data.split(separator:10) {
            guard let object=(try? JSONSerialization.jsonObject(with:Data(line))) as? [String:Any], let type=object["type"] as? String else { continue }
            if jobs[key]?.harness=="opencode" {
                if let thread=object["sessionID"] as? String,thread.range(of:"^ses_[A-Za-z0-9]{1,120}$",options:.regularExpression) != nil {
                    ownedSessions[key]=thread;sessionDirectories[key]=jobs[key]?.process.currentDirectoryURL?.path;sessionProviders[key]="opencode";persistSessions();send(["key":key,"kind":"session","threadId":thread])
                }
                if type=="text",let part=object["part"] as? [String:Any],let text=part["text"] as? String {send(["key":key,"kind":"answer","text":text])}
                if type=="error" {failedTasks.insert(key);send(["key":key,"kind":"error","text":"OpenCode could not complete this turn. Check its selected model, sign-in and allowance in its CLI."])}
                continue
            }
            if jobs[key]?.harness=="claude" {consumeClaude(key,object:object,type:type);continue}
            if !key.hasPrefix("status:"),type=="thread.started",let thread=object["thread_id"] as? String, UUID(uuidString:thread) != nil {
                ownedSessions[key]=thread
                if let directory=jobs[key]?.process.currentDirectoryURL?.path { sessionDirectories[key]=directory }
                sessionProviders[key]="codex"
                persistSessions()
                send(["key":key,"kind":"session","threadId":thread]) }
            if type=="item.completed",let item=object["item"] as? [String:Any] {
                if item["type"] as? String=="agent_message",let text=item["text"] as? String { send(["key":key,"kind":"answer","text":text]) }
                else if let command=item["command"] as? String { send(["key":key,"kind":"output","text":"$ \(command)\n\(item["aggregated_output"] as? String ?? "")"]) }
            }
            if type=="error" || type=="turn.failed" { failedTasks.insert(key);let nested=object["error"] as? [String:Any];send(["key":key,"kind":"error","text":object["message"] as? String ?? nested?["message"] as? String ?? "Codex needs attention. Check your CLI sign-in and configuration."]) }
        }
    }
    private func persistSessions() {
        if executableOverride == nil {
            UserDefaults.standard.set(ownedSessions,forKey:"OpenPlex.ownedSessions")
            UserDefaults.standard.set(sessionDirectories,forKey:"OpenPlex.sessionDirectories")
            UserDefaults.standard.set(sessionProviders,forKey:"OpenPlex.sessionProviders")
        }
    }
    private func consumeClaude(_ key:String,object:[String:Any],type:String) {
        if !key.hasPrefix("status:"),let thread=object["session_id"] as? String,UUID(uuidString:thread) != nil,ownedSessions[key] != thread {
            ownedSessions[key]=thread;sessionProviders[key]="claude"
            if let directory=jobs[key]?.process.currentDirectoryURL?.path {sessionDirectories[key]=directory}
            persistSessions();send(["key":key,"kind":"session","threadId":thread])
        }
        if type=="assistant",let message=object["message"] as? [String:Any],let content=message["content"] as? [[String:Any]] {
            let text=content.filter{$0["type"] as? String=="text"}.compactMap{$0["text"] as? String}.joined(separator:"\n")
            if !text.isEmpty {lastAnswers[key]=text;send(["key":key,"kind":"answer","text":text])}
        }
        if type=="result" {
            let result=object["result"] as? String ?? (object["errors"] as? [String])?.joined(separator:"\n") ?? ""
            if object["is_error"] as? Bool==true || (object["subtype"] as? String)?.hasPrefix("error")==true {
                failedTasks.insert(key);send(["key":key,"kind":"error","text":result.isEmpty ? "Claude Code needs attention. Check its sign-in and permission output.":result])
            } else if !result.isEmpty,result != lastAnswers[key] {lastAnswers[key]=result;send(["key":key,"kind":"answer","text":result])}
        }
        if type=="error" {failedTasks.insert(key);send(["key":key,"kind":"error","text":object["message"] as? String ?? "Claude Code needs attention."])}
    }
    /// List configuration only (no server connection); never expose credentials from the inventory.
    static func statusMCPOverrides(executable:String,directory:String) throws -> [String] {
        let probe=Process(),pipe=Pipe();probe.executableURL=URL(fileURLWithPath:executable);probe.arguments=["mcp","list","--json"];probe.currentDirectoryURL=URL(fileURLWithPath:directory);probe.standardOutput=pipe;probe.standardError=FileHandle.nullDevice
        try probe.run()
        DispatchQueue.global().asyncAfter(deadline:.now()+3){if probe.isRunning{probe.terminate()}}
        var bytes=Data()
        while let chunk=try pipe.fileHandleForReading.read(upToCount:65536),!chunk.isEmpty {bytes.append(chunk);if bytes.count>2000000{probe.terminate();throw NSError(domain:"OpenPlex.Status",code:1)}}
        probe.waitUntilExit();guard probe.terminationStatus==0 else{throw NSError(domain:"OpenPlex.Status",code:2)}
        return try statusMCPOverrides(json:bytes)
    }
    static func statusMCPOverrides(json:Data) throws -> [String] {
        guard let servers=try JSONSerialization.jsonObject(with:json) as? [[String:Any]],servers.count<=500 else{throw NSError(domain:"OpenPlex.Status",code:3)}
        return try servers.flatMap{server -> [String] in guard let name=server["name"] as? String,name.range(of:"^[A-Za-z0-9_-]{1,160}$",options:.regularExpression) != nil else{throw NSError(domain:"OpenPlex.Status",code:4)};return ["-c","mcp_servers.\(name)={command=\"/usr/bin/false\",enabled=false}"]}
    }
    static func toml(_ value:Any) throws -> String {
        if let string=value as? String { let data=try JSONSerialization.data(withJSONObject:[string],options:[.fragmentsAllowed,.withoutEscapingSlashes]);let text=String(decoding:data,as:UTF8.self);return String(text.dropFirst().dropLast()) }
        if let number=value as? NSNumber { if CFGetTypeID(number)==CFBooleanGetTypeID(){return number.boolValue ? "true":"false"};return number.stringValue }
        if let array=value as? [Any] { return "["+(try array.map(toml)).joined(separator:",")+"]" }
        if let dict=value as? [String:Any] { return "{"+(try dict.keys.sorted().map { key in "\(try toml(key)) = \(try toml(dict[key]!))" }).joined(separator:",")+"}" }
        throw NSError(domain:"OpenPlex",code:1)
    }
}
