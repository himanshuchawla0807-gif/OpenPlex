import Foundation
let base=URL(fileURLWithPath:CommandLine.arguments[1]), wrapper=URL(fileURLWithPath:CommandLine.arguments[2])
let terminal=HarnessTerminal(executables:["codex":wrapper]), runtime=AgentRuntime(executable:wrapper)
var allowed:Set<String>=[base.path]
func emit(_ name:String,_ detail:[String:Any]) {if let data=try? JSONSerialization.data(withJSONObject:["name":name,"detail":detail]),let text=String(data:data,encoding:.utf8) {print(text);fflush(stdout)}}
terminal.emit={emit("openplex-terminal",$0)};runtime.emit={emit("openplex-agent",$0)}
func handle(_ original:[String:Any]) {
 var b=original;let action=b["action"] as? String ?? "",key=b["key"] as? String ?? ""
 if ["terminal-open","run","prepare-employee"].contains(action),b["profile"] != nil {do {let dir=try EmployeeWorkspace.prepare(b,allowedDirectories:allowed);allowed.insert(dir);b["directory"]=dir;emit("openplex-employee",["key":key,"kind":"prepared","directory":dir])}catch {emit("openplex-terminal",["key":key,"kind":"error","message":error.localizedDescription]);return}}
 switch action {
 case "terminal-open":terminal.open(b,allowedDirectories:allowed)
 case "terminal-attach":terminal.attach(b)
 case "terminal-input":terminal.input(b)
 case "terminal-resize":terminal.resize(b)
 case "terminal-close":terminal.close(b)
 case "run":runtime.run(b,allowedDirectories:allowed)
 case "stop":runtime.stop(key)
 case "status-snapshot":emit("openplex-status-snapshot",["key":key,"requestId":b["requestId"] ?? "","text":terminal.statusSnapshot(key)])
 case "harness-inventory":emit("openplex-harnesses",["items":HarnessTerminal.inventory()]);emit("openplex-terminal",["kind":"inventory","keys":terminal.activeKeys()])
 case "shutdown":terminal.closeAll();runtime.stopAll();DispatchQueue.main.asyncAfter(deadline:.now()+1){exit(0)}
 default:break
 }
}
DispatchQueue.global().async {while let line=readLine(){if let bytes=line.data(using:.utf8),let b=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:Any] {DispatchQueue.main.async{handle(b)}}};DispatchQueue.main.async{terminal.closeAll();runtime.stopAll();exit(0)}}
RunLoop.main.run()
