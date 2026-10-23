import Foundation
let fixture=URL(fileURLWithPath:CommandLine.arguments[1])
let runtime=HarnessTerminal(executables:["codex":fixture,"claude":fixture])
let folder=FileManager.default.temporaryDirectory.appendingPathComponent("openplex-pty-"+UUID().uuidString)
try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
defer {runtime.closeAll();try? FileManager.default.removeItem(at:folder)}
var events=[[String:Any]](),sessions=[String:String](),output=[String:Data]()
runtime.emit={event in
    events.append(event)
    let key=event["key"] as? String ?? ""
    if event["kind"] as? String=="opened" {sessions[key]=event["sessionId"] as? String}
    if event["kind"] as? String=="data",let data=event["data"] as? String,let bytes=Data(base64Encoded:data) {output[key,default:Data()].append(bytes)}
}
func text(_ key:String)->String {String(decoding:output[key] ?? Data(),as:UTF8.self)}
func wait(_ description:String,_ condition:()->Bool) {
    let end=Date().addingTimeInterval(8)
    while !condition() && Date()<end {RunLoop.main.run(until:Date().addingTimeInterval(0.01))}
    assert(condition(),"Timed out: \(description). Events: \(events)")
}
func open(_ key:String,_ provider:String="codex") {
    runtime.open(["key":key,"provider":provider,"directory":folder.path,"systemPrompt":"Fixture employee","brief":"Reference instructions","context":"Room-only notes","mcp":"{}","cols":90,"rows":30],allowedDirectories:[folder.path])
}
func send(_ key:String,_ value:String,_ id:String?=nil) {runtime.input(["key":key,"sessionId":id ?? sessions[key]!,"data":Data(value.utf8).base64EncodedString()])}
open("a");open("b","claude")
wait("two controlling terminals") {text("a").contains("READY") && text("b").contains("READY")}
let beforeSnapshotEvents=events.count
assert(runtime.statusSnapshot("a").contains("READY"))
assert(runtime.statusSnapshot("missing").isEmpty)
assert(events.count==beforeSnapshotEvents,"Status snapshot must not subscribe, send input, or emit PTY events")
assert(runtime.hasSession("a"));assert(runtime.hasSession("b"))
assert(sessions["a"] != sessions["b"])
assert(text("a").contains("\u{1b}[32mREADY\u{1b}[0m"))
assert(text("a").contains("SIZE:90x30"))
send("a","employee-a\n");send("b","employee-b\n")
wait("isolated input and unicode") {text("a").contains("ACK:employee-a café 🌱") && text("b").contains("ACK:employee-b café 🌱")}
assert(!text("a").contains("employee-b"));assert(!text("b").contains("employee-a"))
runtime.resize(["key":"a","sessionId":sessions["a"]!,"cols":120,"rows":40])
wait("PTY resize signal") {text("a").contains("SIZE:120x40")}
let attachmentCount=events.filter{$0["kind"] as? String=="opened"}.count
runtime.attach(["key":"absent","provider":"codex"])
runtime.attach(["key":"a","provider":"codex"])
wait("passive attachment") {events.filter{$0["kind"] as? String=="opened"}.count==attachmentCount+1}
assert(!runtime.hasSession("absent"))
assert(events.last?["reused"] as? Bool==true)
let old=sessions["a"]!
open("a")
wait("reattach existing session") {events.contains{$0["key"] as? String=="a" && $0["reused"] as? Bool==true}}
assert(sessions["a"]==old)
assert(events.contains {($0["replay"] as? String).flatMap{Data(base64Encoded:$0)}?.contains(27)==true})
send("a","QUIT\n")
wait("normal exit") {events.contains{$0["key"] as? String=="a" && $0["kind"] as? String=="exit" && $0["exitCode"] as? Int32==0}}
output["a"]=Data();open("a")
wait("replacement terminal") {sessions["a"] != old && text("a").contains("READY")}
send("a","stale-input\n",old)
runtime.close(["key":"a","sessionId":old])
runtime.resize(["key":"a","sessionId":old,"cols":200,"rows":80])
send("a","fresh-input\n")
wait("stale messages rejected") {text("a").contains("ACK:fresh-input")}
assert(!text("a").contains("stale-input"));assert(!text("a").contains("SIZE:200x80"))
for key in ["a","b"] {runtime.close(["key":key,"sessionId":sessions[key]!])}
wait("both terminals closed") {events.filter{$0["kind"] as? String=="exit"}.count==3}
assert(events.filter{$0["closed"] as? Bool==true}.count==2)
assert(!runtime.hasSession("a"));assert(!runtime.hasSession("b"))
runtime.open(["key":"unauthorized","provider":"codex","directory":folder.path,"mcp":"{}"],allowedDirectories:[])
runtime.open(["key":"provider","provider":"sh","directory":folder.path,"mcp":"{}"],allowedDirectories:[folder.path])
wait("authorization rejection") {events.filter{$0["kind"] as? String=="error"}.count==2}
let config:[String:Any]=["systemPrompt":"$(do not shell interpolate)","brief":"skill reference","context":"private room","mcp":"{\"local\":{\"command\":\"fixture\",\"args\":[\"a b\"]}}"]
let codex=try HarnessTerminal.arguments(provider:"codex",body:config)
let claude=try HarnessTerminal.arguments(provider:"claude",body:config)
assert(codex.contains(where:{$0.contains("developer_instructions=") && $0.contains("private room")}))
assert(codex.contains(where:{$0.hasPrefix("mcp_servers.local=")}))
assert(!codex.contains("exec"));assert(!codex.contains("--dangerously-bypass-approvals-and-sandbox"))
assert(claude.contains("--append-system-prompt"));assert(claude.contains("--mcp-config"));assert(!claude.contains("--print"))
assert(claude.contains("plan"));assert(!claude.contains("--dangerously-skip-permissions"))
let thread=UUID().uuidString
var resumeConfig=config;resumeConfig["threadId"]=thread
let codexResume=try HarnessTerminal.arguments(provider:"codex",body:resumeConfig)
let claudeResume=try HarnessTerminal.arguments(provider:"claude",body:resumeConfig)
assert(Array(codexResume.suffix(2))==["resume",thread]);assert(Array(claudeResume.suffix(2))==["--resume",thread])
for provider in HarnessTerminal.programs.keys {
    let flags=try HarnessTerminal.arguments(provider:provider,body:["mcp":"{}","brief":"Employee role and skills."])
    assert(!flags.contains("--dangerously-skip-permissions"));assert(!flags.contains("--auto"))
}
assert(HarnessTerminal.programs.count==11)
print("PASS: controlling PTYs for both providers, ANSI/UTF-8 bytes, input isolation, resize/SIGWINCH, reattach/replay, exit/reopen identity, stale-message rejection, close, authorization, scoped configuration")
let employeeConfig:[String:Any]=["profile":["name":"Oscar","role":"Research lead","harness":"codex","systemPrompt":"Verify sources."],"systemPrompt":"Verify sources.","brief":"Custom skill instructions","mcp":"{}"]
let employeeArgs=try HarnessTerminal.arguments(provider:"codex",body:employeeConfig)
assert(employeeArgs.contains{$0.contains("Oscar") && $0.contains("Research lead") && $0.contains("Verify sources.") && $0.contains("Custom skill instructions")})
var inconsistent=employeeConfig;inconsistent["systemPrompt"]="Another employee's instructions"
do {_=try HarnessTerminal.arguments(provider:"codex",body:inconsistent);assertionFailure("Mismatched employee accepted")}catch{}
