import Foundation
import CryptoKit

/// Pure request policy, shared by the loopback server and adversarial tests.
enum WorkspaceHTTP {
    struct Response {let status:String;let body:Data;let mime:String;let head:Bool;let headers:[String:String]}
    static func response(root:URL,request:Data)->Response {
        func result(_ status:String,_ body:Data=Data(),_ mime:String="text/plain",_ head:Bool=false)->Response {
            var scripts="'self'"
            if mime.hasPrefix("text/html"),let html=String(data:body,encoding:.utf8),let regex=try? NSRegularExpression(pattern:"<script(?![^>]*\\bsrc\\s*=)[^>]*>([\\s\\S]*?)</script>",options:.caseInsensitive) {
                let source=html as NSString
                for match in regex.matches(in:html,range:NSRange(location:0,length:source.length)) {let bytes=Data(source.substring(with:match.range(at:1)).utf8);scripts += " 'sha256-\(Data(SHA256.hash(data:bytes)).base64EncodedString())'"}
            }
            let csp="default-src 'none'; script-src \(scripts); style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
            return Response(status:status,body:body,mime:mime,head:head,headers:["Content-Security-Policy":csp,"X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY","Cross-Origin-Resource-Policy":"same-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()","Cache-Control":"no-store"])
        }
        guard request.count<=65536,let text=String(data:request,encoding:.utf8),text.contains("\r\n\r\n") else{return result("400 Bad Request")}
        let lines=text.components(separatedBy:"\r\n"),parts=(lines.first ?? "").split(separator:" ")
        guard parts.count==3,parts[2]=="HTTP/1.1" else{return result("400 Bad Request")}
        guard parts[0]=="GET"||parts[0]=="HEAD" else{return result("405 Method Not Allowed")}
        var headers=[String:String]()
        for line in lines.dropFirst() {if line.isEmpty{break};guard let colon=line.firstIndex(of:":") else{return result("400 Bad Request")};let name=line[..<colon].lowercased();guard headers[name]==nil else{return result("400 Bad Request")};headers[name]=line[line.index(after:colon)...].trimmingCharacters(in:.whitespaces)}
        guard headers["host"]=="127.0.0.1:5181",headers["origin"]==nil||headers["origin"]=="http://127.0.0.1:5181",headers["sec-fetch-site"] != "cross-site" else{return result("403 Forbidden")}
        let target=String(parts[1]);guard target.hasPrefix("/"),!target.hasPrefix("//"),let path=target.components(separatedBy:"?")[0].removingPercentEncoding,!path.contains("\0"),!path.contains("\\") else{return result("400 Bad Request")}
        let base=root.resolvingSymlinksInPath().standardizedFileURL
        let file=base.appendingPathComponent(path=="/" ? "index.html":String(path.dropFirst())).standardizedFileURL.resolvingSymlinksInPath()
        let mimeTypes=["html":"text/html; charset=utf-8","js":"text/javascript","mjs":"text/javascript","css":"text/css","json":"application/json","png":"image/png","webp":"image/webp","jpg":"image/jpeg","ico":"image/x-icon","svg":"image/svg+xml","woff2":"font/woff2","woff":"font/woff","ttf":"font/ttf","mp4":"video/mp4","wasm":"application/wasm"]
        guard file.path.hasPrefix(base.path+"/"),let mime=mimeTypes[file.pathExtension],let values=try? file.resourceValues(forKeys:[.isRegularFileKey,.fileSizeKey]),values.isRegularFile==true,(values.fileSize ?? Int.max)<=64*1024*1024,let bytes=try? Data(contentsOf:file) else{return result("404 Not Found")}
        return result("200 OK",bytes,mime,parts[0]=="HEAD")
    }
}
