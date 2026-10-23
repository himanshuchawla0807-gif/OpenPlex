import Foundation
let folder=CommandLine.arguments[1],harness=CommandLine.arguments[2],key="status:smoke:"+UUID().uuidString
let runtime=AgentRuntime();var done=false,answer=false,exit = -1,diagnostics=[String]()
runtime.emit={event in
 let kind=event["kind"] as? String ?? ""
 if kind=="answer" {answer=true}
 if kind=="finished" {exit=event["exitCode"] as? Int ?? -1;done=true}
 if ["output","error"].contains(kind),let text=event["text"] as? String {diagnostics.append(String(text.prefix(3000)))}
 if kind=="error" && !runtime.hasRunningTask(key){done=true}
}
runtime.run(["key":key,"harness":harness,"directory":folder,"mcp":"{}","brief":"Synthetic employee. Role: QA.","systemPrompt":"Summarize only supplied synthetic facts. Do not run tools. No percentage is known.","prompt":"Synthetic integration test: fixture review complete; fixture tests remaining. Give one status sentence."],allowedDirectories:[folder])
let deadline=Date().addingTimeInterval(60)
while !done && Date()<deadline {RunLoop.main.run(until:Date().addingTimeInterval(0.05))};runtime.stopAll()
var result:[String:Any]=["harness":harness,"syntheticOnly":true,"answerReceived":answer,"exitCode":exit,"timedOut":!done]
if !answer {result["diagnostics"]=Array(diagnostics.suffix(6))}
print(String(decoding:try JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]),as:UTF8.self))
