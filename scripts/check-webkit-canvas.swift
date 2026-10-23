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
  let script="""
  const {ProceduralRenderer}=await import('/src/procedural/ProceduralRenderer.ts');
  const {officeDefinitions}=await import('/src/procedural/officeRooms.ts');
  const {Camera}=await import('/src/camera/Camera.ts');
  const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=750;
  const ctx=canvas.getContext('2d'),def={...officeDefinitions[0],origin:{x:-officeDefinitions[0].width/2,y:-officeDefinitions[0].depth/2}};
  const renderer=new ProceduralRenderer(ctx,1,[def],{},true),camera=new Camera({x:0,y:30,zoom:.55});
  const frames=[];
  for(let frame=0;frame<120;frame++){
    renderer.people.time=frame/6;camera.reset({x:0,y:30,zoom:frame<40?.25:frame<80?.55:.86});if(frame===60)renderer.resetSurfaces();if(frame===80){canvas.width=1100;canvas.height=750;}renderer.render({width:1100,height:750},camera,false,null,def.id);
    const p=ctx.getImageData(0,0,1100,750).data;let visible=0;for(let i=3;i<p.length;i+=4)if(p[i]>0)visible++;
    if(visible<10000)throw Error('Office vanished on frame '+frame+': '+visible);frames.push(visible);
  }
  camera.reset({x:0,y:30,zoom:.48});renderer.render({width:1100,height:750},camera,true,null,def.id);
  await import('/src/builder/builder.css');const surface=document.createElement('section');surface.className='builder-canvas-section';surface.style.cssText='width:1100px;height:750px';surface.append(canvas);document.body.replaceChildren(surface);document.body.style.margin='0';
  const image=canvas.toDataURL('image/png');const result={frames:frames.length,minVisible:Math.min(...frames),maxVisible:Math.max(...frames),isContextLost:typeof ctx.isContextLost,cacheMB:renderer.cacheBytes/1048576,image};renderer.dispose();return JSON.stringify(result);
  """
  webView.callAsyncJavaScript(script,arguments:[:],in:nil,in:.page){ result in
   switch result {
   case .success(let value):
    if let text=value as? String,let data=text.data(using:.utf8),var object=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] {
     if let image=object.removeValue(forKey:"image") as? String,let bytes=Data(base64Encoded:String(image.split(separator:",")[1])) {try? bytes.write(to:URL(fileURLWithPath:output+"/webkit-office-stable.png"))}
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
