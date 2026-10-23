import Foundation
import Darwin

/// A live controlling PTY for one employee. No shell command strings or credential reads.
final class HarnessTerminal {
    private final class Session {
        let key:String, id:String, provider:String, directory:String
        let pid:pid_t, fd:Int32
        var source:DispatchSourceRead?
        var replay=Data(), input=Data()
        var exit:Int32?, readDone=false, closing=false
        init(key:String,provider:String,directory:String,pid:pid_t,fd:Int32) {
            self.key=key;self.id=UUID().uuidString;self.provider=provider;self.directory=directory;self.pid=pid;self.fd=fd
        }
    }
    private let queue=DispatchQueue(label:"OpenPlex.harness-terminal")
    private let executableOverrides:[String:URL]
    private var sessions=[String:Session]()
    var emit:(([String:Any])->Void)?
    /// Overrides are test-only constructor inputs, never accepted through the web bridge.
    init(executables:[String:URL]=[:]) { executableOverrides=executables }
    static let programs:[String:[String]]=["codex":["codex"],"claude":["claude"],"antigravity":["agy"],"cursor":["cursor-agent","agent"],"opencode":["opencode"],"muse":["muse"],"mcode":["mcode"],"kilo":["kilo"],"devin":["devin"],"zcode":["zcode"],"hermes":["hermes"]]
    static func providerName(_ id:String)->String { ["codex":"Codex","claude":"Claude Code","antigravity":"Antigravity","cursor":"Cursor","opencode":"OpenCode","muse":"Muse Code","mcode":"M Code","kilo":"Kilo Code","devin":"Devin","zcode":"Z Code","hermes":"Hermes Agent"][id] ?? id }
    static func executable(_ provider:String)->String? {
        let home=FileManager.default.homeDirectoryForCurrentUser.path
        let roots=["\(home)/.local/bin","/opt/homebrew/bin","/usr/local/bin","\(home)/.minimax-code/bin","\(home)/.opencode/bin","\(home)/.kilo/bin"]
        return (programs[provider] ?? []).flatMap{name in roots.map{$0+"/"+name}}.first{FileManager.default.isExecutableFile(atPath:$0)}
    }
    static func inventory()->[[String:Any]] {programs.keys.sorted().map{["id":$0,"installed":executable($0) != nil]}}
    func activeKeys()->[String] {queue.sync {sessions.keys.sorted()}}
    /// Read-only tail for a separate status report; does not subscribe or send input.
    func statusSnapshot(_ key:String)->String {queue.sync {guard let session=sessions[key] else{return ""};return String(decoding:session.replay.suffix(24000),as:UTF8.self)}}
    func hasSession(_ key:String)->Bool {queue.sync {sessions[key] != nil}}
    /// Subscribe to an existing employee PTY without launching or reconfiguring it.
    func attach(_ body:[String:Any]) {queue.async { [self] in
        guard let key=body["key"] as? String,let session=sessions[key],!session.closing else{return}
        guard body["provider"] as? String==session.provider else {fail(key,"The running session uses a different harness. Reopen that employee before changing it.");return}
        send(session,"opened",["reused":true,"replay":session.replay.base64EncodedString()])
    }}
    private func send(_ session:Session,_ kind:String,_ extra:[String:Any]=[:]) {
        var event=extra;event["key"]=session.key;event["sessionId"]=session.id;event["provider"]=session.provider;event["kind"]=kind
        DispatchQueue.main.async { [weak self] in self?.emit?(event) }
    }
    private func fail(_ key:String,_ message:String,sessionId:String?=nil) {
        var event:[String:Any]=["key":key,"kind":"error","message":message,"data":message]
        if let sessionId {event["sessionId"]=sessionId}
        DispatchQueue.main.async { [weak self] in self?.emit?(event) }
    }
    func open(_ body:[String:Any],allowedDirectories:Set<String>) {
        queue.async { [self] in
            guard let key=body["key"] as? String,!key.isEmpty,key.utf8.count<400 else{return}
            guard let provider=body["provider"] as? String,Self.programs[provider] != nil else {fail(key,"Choose an available terminal harness.");return}
            var isDirectory:ObjCBool=false
            guard let directory=body["directory"] as? String,allowedDirectories.contains(directory),FileManager.default.fileExists(atPath:directory,isDirectory:&isDirectory),isDirectory.boolValue else {fail(key,"Choose an authorized project folder before opening a terminal.");return}
            if let existing=sessions[key] {
                guard existing.provider==provider,existing.directory==directory,!existing.closing else {fail(key,"Close this employee's existing terminal before changing provider or folder.",sessionId:existing.id);return}
                send(existing,"opened",["reused":true,"replay":existing.replay.base64EncodedString()]);return
            }
            guard sessions.count<12 else {fail(key,"Twelve employee terminals are already open. Close one before opening another.");return}
            let home=FileManager.default.homeDirectoryForCurrentUser.path
            guard let executable=executableOverrides[provider]?.path ?? Self.executable(provider) else {fail(key,"\(Self.providerName(provider)) CLI was not found. Install it and sign in using its own CLI first.");return}
            do {
                let arguments=try Self.arguments(provider:provider,body:body)
                var env=ProcessInfo.processInfo.environment
                env["PATH"]="\(home)/.local/bin:/opt/homebrew/bin:/usr/local/bin:\(env["PATH"] ?? "/usr/bin:/bin")"
                if provider=="opencode" {
                    var mcp=[String:Any]()
                    if let raw=body["mcp"] as? String,let bytes=raw.data(using:.utf8),let servers=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:[String:Any]] {
                        for (name,server) in servers {
                            if let command=server["command"] as? String {mcp[name]=["type":"local","command":[command]+(server["args"] as? [String] ?? []),"environment":server["env"] as? [String:String] ?? [:],"enabled":true]}
                            else if let url=server["url"] as? String {mcp[name]=["type":"remote","url":url,"headers":server["headers"] as? [String:String] ?? [:],"enabled":true]}
                        }
                    }
                    let config:[String:Any]=["instructions":["AGENTS.md"],"permission":["*":"ask"],"mcp":mcp]
                    env["OPENCODE_CONFIG_CONTENT"]=String(decoding:try JSONSerialization.data(withJSONObject:config),as:UTF8.self)
                }
                env["TERM"]="xterm-256color";env["COLORTERM"]="truecolor"
                env["COLORFGBG"]=body["appearance"] as? String == "dark" ? "15;0":"0;15"
                env["TERM_PROGRAM"]="OpenPlex"
                // Prepare all Swift/Foundation work before fork. Child only uses libc.
                let argv=([executable]+arguments).map{strdup($0)}+[nil]
                let envp=env.keys.sorted().map{strdup("\($0)=\(env[$0]!)")}+[nil]
                let executablePath=strdup(executable)!,directoryPath=strdup(directory)!
                defer {argv.forEach{free($0)};envp.forEach{free($0)};free(executablePath);free(directoryPath)}
                var master:Int32 = -1
                var size=Self.size(body)
                var childSignalMask=sigset_t()
                sigemptyset(&childSignalMask)
                let pid=argv.withUnsafeBufferPointer { args in envp.withUnsafeBufferPointer { environment in
                    let child=forkpty(&master,nil,nil,&size)
                    if child==0 {
                        // Dispatch workers block signals; a terminal child must
                        // receive Ctrl-C and SIGWINCH after exec.
                        sigprocmask(SIG_SETMASK,&childSignalMask,nil)
                        if chdir(directoryPath) != 0 {_exit(126)}
                        execve(executablePath,UnsafeMutablePointer(mutating:args.baseAddress!),UnsafeMutablePointer(mutating:environment.baseAddress!))
                        _exit(127)
                    }
                    return child
                } }
                guard pid>0 else {if master>=0 {Darwin.close(master)};fail(key,"Could not allocate an employee terminal.");return}
                _=fcntl(master,F_SETFL,fcntl(master,F_GETFL)|O_NONBLOCK)
                _=fcntl(master,F_SETFD,FD_CLOEXEC)
                let session=Session(key:key,provider:provider,directory:directory,pid:pid,fd:master)
                sessions[key]=session
                let source=DispatchSource.makeReadSource(fileDescriptor:master,queue:queue)
                session.source=source
                source.setEventHandler { [weak self,weak session] in
                    guard let self,let session else{return};self.read(session)
                }
                source.setCancelHandler {Darwin.close(master)}
                send(session,"opened",["reused":false,"replay":""])
                source.resume()
                DispatchQueue.global(qos:.utility).async { [weak self,weak session] in
                    var status:Int32=0
                    while waitpid(pid,&status,0)<0 && errno==EINTR {}
                    let code=(status&0x7f)==0 ? (status>>8)&0xff:128+(status&0x7f)
                    self?.queue.async { [weak self,weak session] in
                        guard let self,let session else{return};session.exit=code;self.read(session);self.finish(session)
                    }
                }
            } catch {fail(key,error.localizedDescription)}
        }
    }
    static func arguments(provider:String,body:[String:Any]) throws->[String] {
        func invalid(_ message:String)->NSError {NSError(domain:"OpenPlex.Terminal",code:1,userInfo:[NSLocalizedDescriptionKey:message])}
        guard Self.programs[provider] != nil else {throw invalid("Unsupported provider.")}
        var sections=[String]()
        if let profile=body["profile"] as? [String:Any],let name=profile["name"] as? String,let role=profile["role"] as? String {
            guard profile["harness"] as? String==provider,let prompt=profile["systemPrompt"] as? String,body["systemPrompt"] as? String==prompt else {throw invalid("Employee identity and harness instructions do not match. Reopen the employee profile before connecting.")}
            sections.append("You are \(name), an OpenPlex employee.\nYour assigned role: \(role).\nUse this employee's AGENTS.md/CLAUDE.md and configured references. Keep other employees' private conversations separate.")
        }
        for name in ["systemPrompt","brief","context"] {
            if let raw=body[name] {
                guard let text=raw as? String,text.utf8.count<=100000 else {throw invalid("Employee instructions must be text no larger than 100 KB per section.")}
                if !text.isEmpty {sections.append(name=="context" ? "Shared context for this room only:\n\(text)":text)}
            }
        }
        let instructions=sections.joined(separator:"\n\n")
        guard let mcp=body["mcp"] as? String,mcp.utf8.count<=100000,let bytes=mcp.data(using:.utf8),let servers=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:Any] else {throw invalid("MCP servers must be a JSON object no larger than 100 KB.")}
        for (name,value) in servers {guard name.range(of:"^[A-Za-z0-9_-]{1,80}$",options:.regularExpression) != nil,value is [String:Any] else {throw invalid("MCP servers must use simple names and configuration objects.")}}
        let edits=body["allowEdits"] as? Bool == true
        var args:[String]
        if provider=="codex" {
            args=["--no-alt-screen","--sandbox",edits ? "workspace-write":"read-only","--ask-for-approval","on-request"]
            if !instructions.isEmpty {args += ["-c","developer_instructions=\(try AgentRuntime.toml(instructions))"]}
            for name in servers.keys.sorted() {args += ["-c","mcp_servers.\(name)=\(try AgentRuntime.toml(servers[name]!))"]}
        } else if provider=="claude" {
            args=["--permission-mode",edits ? "manual":"plan"]
            if !instructions.isEmpty {args += ["--append-system-prompt",instructions]}
            if !servers.isEmpty {
                let json=try JSONSerialization.data(withJSONObject:["mcpServers":servers],options:[.sortedKeys,.withoutEscapingSlashes])
                args += ["--mcp-config",String(decoding:json,as:UTF8.self)]
            }
        }
        else if provider=="antigravity" {
            guard servers.isEmpty else {throw invalid("Antigravity MCP setup must be completed in its own CLI. Your configuration is saved in mcp.json.")}
            args=["--mode","plan","--sandbox","--prompt-interactive",instructions+"\nRead the employee AGENTS.md and confirm you are ready. Do not begin a task yet."]
        } else if provider=="opencode" {args=["--standalone"]}
        else {
            guard servers.isEmpty else {throw invalid("This provider's scoped MCP adapter is not connected yet. Configuration is saved in the employee folder; no tools have been enabled.")}
            args=[]
        }
        // The Coordinator supplies this only after checking AgentRuntime ownership.
        if let thread=body["threadId"] as? String {
            guard ["codex","claude"].contains(provider),UUID(uuidString:thread) != nil else {throw invalid("Invalid employee conversation identity.")}
            args += provider=="codex" ? ["resume",thread]:["--resume",thread]
        }
        guard args.reduce(0,{$0+$1.utf8.count})<160000 else {throw invalid("Employee configuration is too large for an interactive CLI invocation.")}
        return args
    }
    private static func size(_ body:[String:Any])->winsize {
        winsize(ws_row:UInt16(min(150,max(8,body["rows"] as? Int ?? 24))),ws_col:UInt16(min(300,max(24,body["cols"] as? Int ?? 80))),ws_xpixel:0,ws_ypixel:0)
    }
    func input(_ body:[String:Any]) {
        queue.async { [self] in
            guard let session=owned(body),!session.closing,let encoded=body["data"] as? String,encoded.utf8.count<=90000,let bytes=Data(base64Encoded:encoded),bytes.count<=65536 else{return}
            guard session.input.count+bytes.count<=1048576 else {fail(session.key,"Terminal input is busy; retry after it catches up.",sessionId:session.id);return}
            session.input.append(bytes);drainInput(session)
        }
    }
    private func owned(_ body:[String:Any])->Session? {
        guard let key=body["key"] as? String,let id=body["sessionId"] as? String,let session=sessions[key],session.id==id else{return nil};return session
    }
    private func drainInput(_ session:Session) {
        guard sessions[session.key]===session,!session.closing else{return}
        while !session.input.isEmpty {
            let count=session.input.withUnsafeBytes{Darwin.write(session.fd,$0.baseAddress!,session.input.count)}
            if count>0 {session.input.removeFirst(count)}
            else if errno==EINTR {continue}
            else if errno==EAGAIN {queue.asyncAfter(deadline:.now()+0.01){[weak self,weak session] in if let session {self?.drainInput(session)}};return}
            else {fail(session.key,"Could not write to this terminal.",sessionId:session.id);return}
        }
    }
    func resize(_ body:[String:Any]) {queue.async { [self] in
        guard let session=owned(body),!session.closing else{return}
        var size=Self.size(body)
        let result=withUnsafeMutablePointer(to:&size){ioctl(session.fd,TIOCSWINSZ,$0)}
        if result<0 {fail(session.key,"Could not resize this terminal (\(errno)).",sessionId:session.id)}
    }}
    func close(_ body:[String:Any]) {queue.async { [self] in if let session=owned(body) {terminate(session)}}}
    private func terminate(_ session:Session) {
        guard !session.closing else{return};session.closing=true
        kill(-session.pid,SIGHUP)
        for (delay,signal) in [(1.0,SIGTERM),(3.0,SIGKILL)] {
            queue.asyncAfter(deadline:.now()+delay){[weak self,weak session] in
                guard let self,let session,self.sessions[session.key]===session,session.exit==nil else{return};kill(-session.pid,signal)
            }
        }
    }
    func closeAll() {queue.sync {for session in sessions.values {kill(-session.pid,SIGHUP);kill(-session.pid,SIGTERM)}}}
    private func read(_ session:Session) {
        guard !session.readDone else{return}
        var buffer=[UInt8](repeating:0,count:32768)
        var readBytes=0
        while true {
            let count=Darwin.read(session.fd,&buffer,buffer.count)
            if count>0 {
                let bytes=Data(buffer.prefix(count));session.replay.append(bytes)
                if session.replay.count>2097152 {session.replay=Data(session.replay.suffix(2097152))}
                send(session,"data",["data":bytes.base64EncodedString()])
                readBytes+=count
                if readBytes>=262144 {return}
            } else if count<0 && errno==EINTR {continue}
            else if count<0 && (errno==EAGAIN || errno==EWOULDBLOCK) {
                if session.exit != nil {session.readDone=true;session.source?.cancel();finish(session)}
                return
            }
            else {session.readDone=true;session.source?.cancel();finish(session);return}
        }
    }
    private func finish(_ session:Session) {
        guard session.readDone,let code=session.exit,sessions[session.key]===session else{return}
        sessions.removeValue(forKey:session.key);send(session,"exit",["exitCode":code,"closed":session.closing])
    }
}
