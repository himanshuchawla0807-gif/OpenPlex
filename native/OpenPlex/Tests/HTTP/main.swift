import Foundation
let fm=FileManager.default,root=fm.temporaryDirectory.appendingPathComponent("openplex-http-"+UUID().uuidString)
try fm.createDirectory(at:root,withIntermediateDirectories:true);defer{try? fm.removeItem(at:root)}
try Data("<html><script>window.safe=true</script></html>".utf8).write(to:root.appendingPathComponent("index.html"))
let outside=fm.temporaryDirectory.appendingPathComponent("openplex-outside-"+UUID().uuidString+".json");try Data("private fixture".utf8).write(to:outside);defer{try? fm.removeItem(at:outside)}
try fm.createSymbolicLink(at:root.appendingPathComponent("escape.json"),withDestinationURL:outside)
func request(_ path:String="/",method:String="GET",headers:String="Host: 127.0.0.1:5181\r\n")->WorkspaceHTTP.Response {WorkspaceHTTP.response(root:root,request:Data("\(method) \(path) HTTP/1.1\r\n\(headers)\r\n".utf8))}
let valid=request();assert(valid.status=="200 OK");assert(valid.headers["Content-Security-Policy"]!.contains("'sha256-"));assert(!valid.headers["Content-Security-Policy"]!.contains("unsafe-eval"));assert(valid.headers["Referrer-Policy"]=="no-referrer")
assert(request(method:"HEAD").head)
for path in ["/../"+outside.lastPathComponent,"/%2e%2e/"+outside.lastPathComponent,"/escape.json","/missing.json","/.env"] {assert(request(path).status=="404 Not Found",path)}
for path in ["//evil.test/","/%00","/%zz","/bad\\path"]{assert(request(path).status=="400 Bad Request",path)}
assert(request(method:"POST").status=="405 Method Not Allowed")
assert(request(headers:"Host: evil.test:5181\r\n").status=="403 Forbidden")
assert(request(headers:"Host: 127.0.0.1:5181\r\nOrigin: https://evil.test\r\n").status=="403 Forbidden")
assert(request(headers:"Host: 127.0.0.1:5181\r\nSec-Fetch-Site: cross-site\r\n").status=="403 Forbidden")
assert(request(headers:"Host: 127.0.0.1:5181\r\nHost: evil.test\r\n").status=="400 Bad Request")
assert(WorkspaceHTTP.response(root:root,request:Data(repeating:65,count:65537)).status=="400 Bad Request")
print("PASS: loopback host/origin, cross-site rejection, traversal/encoded traversal, symlink escape, malformed paths, method/header/size rejection, HEAD and strict CSP hashes")
