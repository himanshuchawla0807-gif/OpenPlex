import Foundation
let runtime=AgentRuntime(executable:URL(fileURLWithPath:CommandLine.arguments[1]))
let folder=FileManager.default.temporaryDirectory.appendingPathComponent("openplex-runtime-"+UUID().uuidString)
try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
var stage=0,finished=Set<String>(),threads=[String:String](),errors=[String](),complete=false
func request(_ key:String,_ prompt:String="fixture",_ thread:String?=nil)->[String:Any]{
 var b:[String:Any]=["key":key,"directory":folder.path,"prompt":prompt,"brief":"Test employee","systemPrompt":"Fixture system","mcp":"{}","allowEdits":false]
 if let thread=thread {b["threadId"]=thread};return b
}
func run(_ key:String,_ prompt:String="fixture",_ thread:String?=nil){runtime.run(request(key,prompt,thread),allowedDirectories:[folder.path])}
runtime.emit={ event in
 let key=event["key"] as? String ?? "",kind=event["kind"] as? String ?? ""
 if kind=="session" {threads[key]=event["threadId"] as? String}
 if kind=="error" {errors.append(event["text"] as? String ?? "error")}
 if kind=="answer" {assert((event["text"] as? String)?.contains("café 🌱")==true,"UTF-8/JSON fragments lost")}
 if stage==0 && kind=="error" {assert(errors.last!.contains("valid project folder"));stage=1;run("a");run("b");run("a");return}
 if stage==1 && kind=="finished" {
  assert(event["exitCode"] as? Int==0);finished.insert(key)
  if finished.count==2 {assert(threads["a"] != threads["b"]);assert(errors.contains(where:{$0.contains("already has")}));stage=2;run("foreign","fixture",threads["a"])}
  return
 }
 if stage==2 && kind=="error" {assert(errors.last!.contains("belongs to another"));stage=3;run("a","fixture",threads["a"]);return}
 if stage==3 && kind=="finished" {assert(event["exitCode"] as? Int==0);stage=4;run("stop","LONG_TASK");return}
 if stage==4 && kind=="started" {runtime.stop(key);return}
 if stage==4 && kind=="finished" {assert(event["exitCode"] as? Int != 0);complete=true}
}
runtime.run(request("unauthorized"),allowedDirectories:[])
let deadline=Date().addingTimeInterval(12)
while !complete && Date()<deadline {RunLoop.main.run(until:Date().addingTimeInterval(0.05))}
runtime.stopAll();assert(complete,"Runtime tests timed out at stage \(stage)")
func collect(_ body:[String:Any],allowed:Set<String>?=nil,runner:AgentRuntime=runtime)->[[String:Any]] {
 var events=[[String:Any]](),done=false
 runner.emit={event in
  events.append(event)
  if event["kind"] as? String=="finished" || (event["kind"] as? String=="error" && !events.contains(where:{$0["kind"] as? String=="started"})) {done=true}
 }
 runner.run(body,allowedDirectories:allowed ?? [folder.path])
 let timeout=Date().addingTimeInterval(8)
 while !done && Date()<timeout {RunLoop.main.run(until:Date().addingTimeInterval(0.02))}
 assert(done,"Additional runtime probe timed out")
 return events
}
let failure=collect(request("failed-turn","FAILED_TURN"))
assert(failure.contains(where:{$0["kind"] as? String=="error" && $0["text"] as? String=="Fixture turn failed"}))
assert(failure.last?["exitCode"] as? Int != 0,"A protocol failure must not become successful completion")
let diagnostics=collect(request("stderr","STDERR_UTF8")).filter{$0["kind"] as? String=="output"}.compactMap{$0["text"] as? String}.joined()
assert(diagnostics==String(repeating:"café 🌱",count:15000)+"\nlast diagnostic 🌱","stderr was truncated or fragmented UTF-8 was corrupted")
var oversized=request("oversized");oversized["systemPrompt"]=String(repeating:"x",count:100001)
assert(collect(oversized).first?["text"] as? String=="The employee system prompt must be text no larger than 100 KB.")
let regularFile=folder.appendingPathComponent("not-a-folder")
try Data().write(to:regularFile)
var invalidFolder=request("regular-file");invalidFolder["directory"]=regularFile.path
assert((collect(invalidFolder,allowed:[regularFile.path]).first?["text"] as? String)?.contains("valid project folder")==true)
var switched=request("a","fixture",threads["a"]);switched["harness"]="claude"
assert((collect(switched).first?["text"] as? String)?.contains("provider")==true,"Resume must belong to the selected provider")
let claudeRuntime=AgentRuntime(executable:URL(fileURLWithPath:CommandLine.arguments[2]))
func claudeRequest(_ key:String,_ prompt:String="fixture",_ thread:String?=nil)->[String:Any] {
 var body=request(key,prompt,thread);body["harness"]="claude";return body
}
let claudeEvents=collect(claudeRequest("claude"),runner:claudeRuntime)
assert(claudeEvents.last?["exitCode"] as? Int==0)
let claudeAnswers=claudeEvents.filter{$0["kind"] as? String=="answer"}
assert(claudeAnswers.count==1,"Do not duplicate the assistant text from the result summary")
assert((claudeAnswers.first?["text"] as? String)?.contains("Claude fixture café 🌱 new")==true)
let claudeThread=claudeEvents.first{$0["kind"] as? String=="session"}?["threadId"] as! String
assert(claudeRuntime.ownedThread(key:"claude",directory:folder.path,harness:"claude")==claudeThread)
assert(claudeRuntime.ownedThread(key:"claude",directory:folder.path,harness:"codex")==nil)
assert(claudeRuntime.ownedThread(key:"claude",directory:folder.appendingPathComponent("other").path,harness:"claude")==nil)
assert(!claudeRuntime.hasRunningTask("claude"))
let resumedClaude=collect(claudeRequest("claude","fixture",claudeThread),runner:claudeRuntime)
assert(resumedClaude.contains{($0["text"] as? String)?.contains("resumed")==true})
assert(resumedClaude.last?["exitCode"] as? Int==0)
let failedClaude=collect(claudeRequest("claude-error","FAILED_TURN"),runner:claudeRuntime)
assert(failedClaude.last?["exitCode"] as? Int != 0)
assert(failedClaude.contains{$0["text"] as? String=="Claude fixture failure"})
claudeRuntime.stopAll()
let toml = try AgentRuntime.toml(["enabled":true,"args":["a b","$(no shell)"],"env":["X":"y"]])
assert(toml.contains("true"))
defer {try? FileManager.default.removeItem(at:folder)}
print("PASS: folder authorization/type, concurrent employees, duplicate prevention, owned/provider resume, foreign resume rejection, fragmented UTF-8 stdout/stderr, long diagnostics, stop, protocol failure status, prompt validation, Codex/Claude streamed protocols and answer deduplication, TOML")

let openCodeFixture=URL(fileURLWithPath:CommandLine.arguments[1]).deletingLastPathComponent().appendingPathComponent("fake-opencode.py")
let openCodeRuntime=AgentRuntime(executable:openCodeFixture)
var builderRequest=request("builder:fixture");builderRequest["harness"]="opencode"
let builderEvents=collect(builderRequest,runner:openCodeRuntime)
assert(builderEvents.last?["exitCode"] as? Int==0)
assert(builderEvents.contains{$0["text"] as? String=="OpenCode fixture café 🌱"})
let builderThread=builderEvents.first{$0["kind"] as? String=="session"}?["threadId"] as! String
builderRequest["threadId"]=builderThread
assert(collect(builderRequest,runner:openCodeRuntime).last?["exitCode"] as? Int==0)
builderRequest["key"]="employee:fixture"
assert(collect(builderRequest,runner:openCodeRuntime).first?["kind"] as? String=="error")
builderRequest["key"]="builder:failure";builderRequest.removeValue(forKey:"threadId");builderRequest["prompt"]="FAILED_TURN"
assert(collect(builderRequest,runner:openCodeRuntime).last?["exitCode"] as? Int != 0)
openCodeRuntime.stopAll()
print("PASS: OpenCode builder JSONL, tool denial, owned session resume, employee isolation and provider error state")
// A room conversation has an independent thread but reserves its employee owner.
var roomRequest=request("room:p:r:1","LONG_TASK");roomRequest["ownerKey"]="p:r:1"
var roomStarted=false,ownerRejected=false,roomStopped=false
runtime.emit={event in
 let kind=event["kind"] as? String,key=event["key"] as? String
 if key=="room:p:r:1",kind=="started" {roomStarted=true;assert(runtime.hasRunningTask("p:r:1"));runtime.run(request("p:r:1"),allowedDirectories:[folder.path])}
 if key=="p:r:1",kind=="error" {ownerRejected=true;runtime.stop("room:p:r:1")}
 if key=="room:p:r:1",kind=="finished" {roomStopped=true}
}
runtime.run(roomRequest,allowedDirectories:[folder.path])
let ownerDeadline=Date().addingTimeInterval(8)
while !roomStopped && Date()<ownerDeadline {RunLoop.main.run(until:Date().addingTimeInterval(0.02))}
assert(roomStarted&&ownerRejected&&roomStopped);assert(!runtime.hasRunningTask("p:r:1"))
print("PASS: room conversation reserves employee owner, blocks overlapping private work, and releases after stop")
// Report while the same employee's real work remains alive; no working-thread resume.
var personalRunning=false,reportFinished=false,personalFinished=false
runtime.emit={event in
 let key=event["key"] as? String,kind=event["kind"] as? String
 if key=="personal-report-owner",kind=="started" {personalRunning=true;runtime.run(request("status:p:batch:1","STATUS_PROBE"),allowedDirectories:[folder.path])}
 if key=="status:p:batch:1",kind=="finished" {assert(event["exitCode"] as? Int==0);assert(runtime.hasRunningTask("personal-report-owner"));reportFinished=true;runtime.stop("personal-report-owner")}
 if key=="personal-report-owner",kind=="finished" {personalFinished=true}
}
runtime.run(request("personal-report-owner","LONG_TASK"),allowedDirectories:[folder.path])
let reportDeadline=Date().addingTimeInterval(8)
while !personalFinished && Date()<reportDeadline {RunLoop.main.run(until:Date().addingTimeInterval(0.02))}
assert(personalRunning&&reportFinished&&personalFinished)
var unsafeReport=request("status:p:resume","STATUS_PROBE",threads["a"])
assert((collect(unsafeReport).first?["text"] as? String)?.contains("separate conversation")==true)
unsafeReport=request("status:p:mcp","STATUS_PROBE");unsafeReport["mcp"]="{\"server\":{\"command\":\"node\"}}"
assert((collect(unsafeReport).first?["text"] as? String)?.contains("cannot add MCP")==true)
assert(collect(claudeRequest("status:p:claude","STATUS_PROBE"),runner:claudeRuntime).last?["exitCode"] as? Int==0)
print("PASS: independent Codex/Claude status reporting while private work continues, no resume, profile MCP rejected and reporting CLI restrictions")
let isolated = try AgentRuntime.statusMCPOverrides(json:Data("[{\"name\":\"docs-server\",\"env\":{\"SECRET\":\"must-not-leak\"}},{\"name\":\"other\"}]".utf8))
assert(isolated.count==4);assert(isolated[1]=="mcp_servers.docs-server={command=\"/usr/bin/false\",enabled=false}");assert(!isolated.joined().contains("must-not-leak"))
do{_ = try AgentRuntime.statusMCPOverrides(json:Data("{}".utf8));fatalError("Malformed MCP inventory accepted")}catch{}
print("PASS: status MCP isolation validates inventory, rejects ambiguous server names and never includes credentials")

do{_ = try AgentRuntime.statusMCPOverrides(json:Data("[{\"name\":\"nested.server\"}]".utf8));fatalError("Ambiguous dotted server name accepted")}catch{}
