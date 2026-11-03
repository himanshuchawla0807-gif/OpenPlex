import Foundation
// Local line-protocol test driver. Compiled by test-v2-e2e.sh only; never bundled.
let directory=CommandLine.arguments[1],fixture=URL(fileURLWithPath:CommandLine.arguments[2])
let store=CoordinationStore(),runtime=AgentRuntime(executable:fixture)
let outputLock=NSLock()
func emit(_ value:[String:Any]) {outputLock.lock();defer{outputLock.unlock()};if let data=try? JSONSerialization.data(withJSONObject:value,options:[.sortedKeys]){FileHandle.standardOutput.write(data);FileHandle.standardOutput.write(Data([10]))}}
runtime.emit={emit(["event":$0])}
DispatchQueue.global().async {
 while let line=readLine(){
  guard let data=line.data(using:.utf8),let body=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] else {continue}
  do {
   if body["action"] as? String=="run" {try store.claimRun(body,allowedDirectories:[directory]);runtime.run(body,allowedDirectories:[directory])}
   else if body["action"] as? String=="stop",let key=body["key"] as? String {runtime.stop(key)}
   else {emit(try store.handle(body,allowedDirectories:[directory]))}
  } catch {emit(["requestId":body["requestId"] as? String ?? "","error":error.localizedDescription,"key":body["key"] as? String ?? ""])}
 }
 runtime.stopAll();exit(0)
}
RunLoop.main.run()
