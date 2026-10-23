import AppKit
import WebKit
let app=NSApplication.shared
let root=FileManager.default.currentDirectoryPath
let output=root+"/output/playwright"
try? FileManager.default.createDirectory(atPath:output,withIntermediateDirectories:true)
class Probe:NSObject,WKNavigationDelegate {
 let view:WKWebView
 override init(){let config=WKWebViewConfiguration();config.websiteDataStore = .nonPersistent();view=WKWebView(frame:CGRect(x:0,y:0,width:1100,height:750),configuration:config);super.init();view.navigationDelegate=self;view.load(URLRequest(url:URL(string:"http://127.0.0.1:5180/theme-preview.html")!))}
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){
  let script=try! String(contentsOfFile:root+"/scripts/check-hd-cast.js",encoding:.utf8)
  webView.callAsyncJavaScript(script,arguments:[:],in:nil,in:.page){ result in
   switch result {
   case .success(let value):
    if let text=value as? String,let data=text.data(using:.utf8),var object=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] {
     if let images=object.removeValue(forKey:"images") as? [String:String] {for (name,image) in images {if let bytes=Data(base64Encoded:String(image.split(separator:",")[1])) {try? bytes.write(to:URL(fileURLWithPath:output+"/"+name+".png"))}}}
     print(String(data:try! JSONSerialization.data(withJSONObject:object),encoding:.utf8)!)
    }
   case .failure(let error): print("FAIL: \(error)");exit(1)
   }
   webView.takeSnapshot(with:nil){ image,error in
    if let image=image,let tiff=image.tiffRepresentation,let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) {try? png.write(to:URL(fileURLWithPath:output+"/webkit-office-grid.png"))}
    if let error=error{print(error)};app.terminate(nil)
   }
  }
 }
}
let probe=Probe();app.run()
