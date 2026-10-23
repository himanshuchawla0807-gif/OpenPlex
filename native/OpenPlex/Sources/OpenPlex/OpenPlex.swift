import SwiftUI
import WebKit
import Network
import AppKit

private typealias LocalState<Value> = SwiftUI.State<Value>

private let cream = Color(nsColor:NSColor(name:nil){ $0.bestMatch(from:[.darkAqua,.aqua]) == .darkAqua ? NSColor(red:0.125,green:0.118,blue:0.145,alpha:1) : NSColor(red:0.965,green:0.945,blue:0.895,alpha:1) })
private let plum = Color(nsColor:NSColor(name:nil){ $0.bestMatch(from:[.darkAqua,.aqua]) == .darkAqua ? NSColor(red:0.90,green:0.85,blue:0.90,alpha:1) : NSColor(red:0.31,green:0.23,blue:0.31,alpha:1) })
private let muted = Color(nsColor:NSColor(name:nil){ $0.bestMatch(from:[.darkAqua,.aqua]) == .darkAqua ? NSColor(red:0.73,green:0.68,blue:0.72,alpha:1) : NSColor(red:0.52,green:0.48,blue:0.45,alpha:1) })
private let commandNotification = Notification.Name("OpenPlexCommand")

// Serves only the app's bundled Web directory, bound to loopback, without a dev server.
final class WorkspaceServer {
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "OpenPlex.LocalWorkspace")
    private let root: URL
    init(root: URL) { self.root = root.standardizedFileURL }
    func start(_ completion: @escaping (Result<URL, Error>) -> Void) {
        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: 5181)
            let listener = try NWListener(using: parameters)
            self.listener = listener
            listener.stateUpdateHandler = { state in
                switch state {
                case .ready: completion(.success(URL(string: "http://127.0.0.1:5181/?builder&native=1")!))
                case .failed(let error): completion(.failure(error))
                default: break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                connection.start(queue: self?.queue ?? .global())
                self?.queue.asyncAfter(deadline:.now()+10) {connection.cancel()}
                self?.receive(connection,buffer:Data())
            }
            listener.start(queue: queue)
        } catch { completion(.failure(error)) }
    }
    private func receive(_ connection:NWConnection,buffer:Data) {
        connection.receive(minimumIncompleteLength:1,maximumLength:max(1,65537-buffer.count)) { [weak self] data,_,complete,error in
            guard let self else{connection.cancel();return};var collected=buffer;if let data{collected.append(data)}
            if collected.count>65536||collected.range(of:Data("\r\n\r\n".utf8)) != nil||complete||error != nil {self.respond(connection,response:WorkspaceHTTP.response(root:self.root,request:collected))}
            else{self.receive(connection,buffer:collected)}
        }
    }
    private func respond(_ connection:NWConnection,response:WorkspaceHTTP.Response) {
        let headers=response.headers.keys.sorted().map{"\($0): \(response.headers[$0]!)"}.joined(separator:"\r\n")
        var result=Data("HTTP/1.1 \(response.status)\r\nContent-Type: \(response.mime)\r\nContent-Length: \(response.body.count)\r\n\(headers)\r\nConnection: close\r\n\r\n".utf8)
        if !response.head {result.append(response.body)}
        connection.send(content:result,completion:.contentProcessed{_ in connection.cancel()})
    }
    deinit { listener?.cancel() }
}

@MainActor final class WorkspaceModel: ObservableObject {
    static let shared = WorkspaceModel()
    @Published var url: URL?
    @Published var error: String?
    private var server: WorkspaceServer?
    func start() {
        guard server == nil else { return }
        guard let resources = Bundle.main.resourceURL, FileManager.default.fileExists(atPath: resources.appendingPathComponent("Web/index.html").path) else { error = "The bundled workspace is missing. Rebuild OpenPlex using native/OpenPlex/build.sh."; return }
        let server = WorkspaceServer(root: resources.appendingPathComponent("Web"))
        self.server = server
        server.start { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let url): self?.url = url
                case .failure(let error): self?.error = "The local workspace could not start on port 5181. Close any other OpenPlex instance and reopen the app. \(error.localizedDescription)"
                }
            }
        }
    }
}

struct WorkspaceView: NSViewRepresentable {
    let url: URL
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.add(context.coordinator,name:"openplex")
        let appearance=UserDefaults.standard.string(forKey:"openplex.appearance") ?? "system"
        let encoded=String(data:try! JSONSerialization.data(withJSONObject:appearance,options:.fragmentsAllowed),encoding:.utf8)!
        config.userContentController.addUserScript(WKUserScript(source:"window.__OPENPLEX_APPEARANCE__=\(encoded)",injectionTime:.atDocumentStart,forMainFrameOnly:true))
        let view = WKWebView(frame: .zero, configuration: config)
        view.underPageBackgroundColor = NSColor.windowBackgroundColor
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        context.coordinator.webView = view
        view.load(URLRequest(url: url))
        return view
    }
    func updateNSView(_ view: WKWebView, context: Context) {}
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private var observer: NSObjectProtocol?
        private var quitObserver: NSObjectProtocol?
        private let runtime=AgentRuntime()
        private let terminals=HarnessTerminal()
        private var toolApprovalPending=false
        private var attachmentPanel:NSOpenPanel?
        private var allowedDirectories=Set(UserDefaults.standard.stringArray(forKey:"OpenPlex.authorizedDirectories") ?? [])
        // macOS WebKit cancels input[type=file] unless this delegate is supplied.
        // Selected files do not authorize their containing folder for agent work.
        func webView(_ webView:WKWebView,runOpenPanelWith parameters:WKOpenPanelParameters,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping ([URL]?)->Void) {
            guard frame.isMainFrame,frame.securityOrigin.host=="127.0.0.1",frame.securityOrigin.port==5181,frame.securityOrigin.protocol=="http",let window=webView.window,attachmentPanel==nil else {completionHandler(nil);return}
            let panel=NSOpenPanel();panel.canChooseFiles=true;panel.canChooseDirectories=false;panel.allowsMultipleSelection=parameters.allowsMultipleSelection;panel.prompt="Attach files";panel.message="Choose instructions, skills, JSON, PDFs or other text files. They are sent only with your message."
            attachmentPanel=panel
            panel.beginSheetModal(for:window) { [weak self] response in
                self?.attachmentPanel=nil
                completionHandler(response == .OK ? panel.urls:nil)
            }
        }
        func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage) {
            guard message.frameInfo.isMainFrame,message.frameInfo.securityOrigin.host=="127.0.0.1",message.frameInfo.securityOrigin.port==5181,message.frameInfo.securityOrigin.protocol=="http",var body=message.body as? [String:Any],let action=body["action"] as? String else { return }
            if ["run","terminal-open"].contains(action) {
                if let profile=body["profile"] as? [String:Any] {body["mcp"]=profile["mcp"];body["systemPrompt"]=profile["systemPrompt"]}
                if let identity=ToolTrust.identity(body),!ToolTrust.approved(identity) {
                    guard !toolApprovalPending else{dispatch(action=="run" ? "openplex-agent":"openplex-terminal",["key":body["key"] as? String ?? "","kind":"error","text":"Review the pending MCP approval, then retry this employee.","message":"Review the pending MCP approval, then retry this employee."]);return};toolApprovalPending=true
                    ToolTrust.ask(identity,window:webView?.window) { [weak self] approved in
                        guard let self else{return};self.toolApprovalPending=false
                        if approved {self.handle(body)}else{let key=body["key"] as? String ?? "";self.dispatch(action=="run" ? "openplex-agent":"openplex-terminal",["key":key,"kind":"error","text":"MCP configuration was not approved.","message":"MCP configuration was not approved."])}
                    };return
                }
            }
            handle(body)
        }
        private func handle(_ value:[String:Any]) {
            var body=value
            guard let action=body["action"] as? String else{return}
            if action=="set-appearance",let value=body["appearance"] as? String,["system","light","dark"].contains(value) {UserDefaults.standard.set(value,forKey:"openplex.appearance");return}
            if ["prepare-employee","run","terminal-open"].contains(action),body["profile"] != nil {
                do {
                    var preparationBody=body
                    if (body["key"] as? String)?.hasPrefix("room:")==true,let owner=body["ownerKey"] as? String {preparationBody["key"]=owner}
                    let folder=try EmployeeWorkspace.prepare(preparationBody,allowedDirectories:allowedDirectories)
                    allowedDirectories.insert(folder)
                    if let key=body["key"] as? String {dispatch("openplex-employee",["key":key,"kind":"prepared","directory":folder,"text":"Employee configuration is ready. Connect the harness to start working."])}
                    body["directory"]=folder
                } catch {
                    let key=body["key"] as? String ?? ""
                    dispatch("openplex-employee",["key":key,"kind":"error","text":error.localizedDescription])
                    if action=="run" {dispatch("openplex-agent",["key":key,"kind":"error","text":error.localizedDescription])}
                    if action=="terminal-open" {dispatch("openplex-terminal",["key":key,"kind":"error","message":error.localizedDescription])}
                    return
                }
            }
            if action=="status-snapshot",let key=body["key"] as? String,key.count<400,let requestId=body["requestId"] as? String,UUID(uuidString:requestId) != nil {dispatch("openplex-status-snapshot",["key":key,"requestId":requestId,"text":terminals.statusSnapshot(key),"capturedAt":Date().timeIntervalSince1970*1000]);return}
            if action=="harness-inventory" {dispatch("openplex-harnesses",["items":HarnessTerminal.inventory()]);dispatch("openplex-terminal",["kind":"inventory","keys":terminals.activeKeys()]);return}
            if action=="run" {
                if let key=body["key"] as? String,terminals.hasSession(body["ownerKey"] as? String ?? key) {dispatch("openplex-agent",["key":key,"kind":"error","text":"Close this employee's interactive terminal before running a streamed task."])}
                else {runtime.run(body,allowedDirectories:allowedDirectories)}
            }
            if action=="stop",let key=body["key"] as? String { runtime.stop(key) }
            if action=="terminal-open",let key=body["key"] as? String {
                if runtime.hasRunningTask(key) {dispatch("openplex-terminal",["key":key,"kind":"error","message":"Finish or stop this employee's streamed task before opening its terminal."])}
                else {
                    var terminalBody=body;terminalBody.removeValue(forKey:"threadId")
                    if let requested=body["threadId"] as? String,!terminals.hasSession(key) {
                        guard let directory=body["directory"] as? String,let provider=body["provider"] as? String,runtime.ownedThread(key:key,directory:directory,harness:provider)==requested else {
                            dispatch("openplex-terminal",["key":key,"kind":"error","message":"This conversation belongs to another employee, provider or folder. Open a new terminal instead."]);return
                        }
                        terminalBody["threadId"]=requested
                    }
                    terminals.open(terminalBody,allowedDirectories:allowedDirectories)
                }
            }
            if action=="terminal-input" {terminals.input(body)}
            if action=="terminal-attach" {terminals.attach(body)}
            if action=="terminal-resize" {terminals.resize(body)}
            if action=="terminal-close" {terminals.close(body)}
            if action=="choose-directory",let projectId=body["projectId"] as? String {
                let panel=NSOpenPanel();panel.canChooseDirectories=true;panel.canChooseFiles=false;panel.allowsMultipleSelection=false;panel.prompt="Use project folder"
                panel.begin { [weak self] response in
                    guard response == .OK,let self=self,let path=panel.url?.standardizedFileURL.path else { return }
                    self.allowedDirectories.insert(path);UserDefaults.standard.set(Array(self.allowedDirectories),forKey:"OpenPlex.authorizedDirectories")
                    self.dispatch("openplex-directory",["projectId":projectId,"path":path])
                }
            }
        }
        private func dispatch(_ name:String,_ detail:[String:Any]) {
            guard let data=try? JSONSerialization.data(withJSONObject:detail),let json=String(data:data,encoding:.utf8) else { return }
            webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('\(name)',{detail:\(json)}))",completionHandler:nil)
        }
        override init() {
            super.init()
            runtime.emit={ [weak self] event in self?.dispatch("openplex-agent",event) }
            terminals.emit={ [weak self] event in self?.dispatch("openplex-terminal",event) }
            quitObserver=NotificationCenter.default.addObserver(forName:NSApplication.willTerminateNotification,object:nil,queue:.main) { [weak self] _ in self?.runtime.stopAll();self?.terminals.closeAll() }
            observer = NotificationCenter.default.addObserver(forName: commandNotification, object: nil, queue: .main) { [weak self] notification in
                guard let action = notification.object as? String, ["new-project", "dashboard", "fit"].contains(action) else { return }
                self?.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('openplex-command', {detail: {action: '\(action)'}}))", completionHandler: nil)
            }
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if url.scheme == "http" && url.host == "127.0.0.1" && url.port == 5181 { decisionHandler(.allow) }
            else { if ["https", "http"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }; decisionHandler(.cancel) }
        }
        deinit { runtime.stopAll();terminals.closeAll();if let observer { NotificationCenter.default.removeObserver(observer) };if let quitObserver { NotificationCenter.default.removeObserver(quitObserver) } }
    }
}

struct WelcomeView: View {
    @Binding var finished: Bool
    @AppStorage("openplex.appearance") private var appearance = "system"
    @LocalState private var step = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let titles = ["A place for your\nnext big thing.", "Your office.\nYour arrangement.", "A little character.\nA lot of possibility."]
    private let descriptions = ["Welcome to OpenPlex. Build a living office around the projects and people that matter to you.", "Start with a blank canvas. Add departments around your main office, keep an even layout, or move everything into place yourself.", "Choose your team, fill the seats, and watch the workday unfold. Your projects stay on this Mac, ready when you are."]
    var body: some View {
        HStack(spacing:0) {
            VStack(alignment:.leading,spacing:24) {
                HStack(spacing:10) { Image(nsImage:NSImage(contentsOf:Bundle.main.resourceURL!.appendingPathComponent("AppIcon.png")) ?? NSImage()).resizable().scaledToFit().frame(width:34,height:34); Text("OpenPlex").font(.system(size:23,weight:.semibold,design:.serif)) }.foregroundColor(plum)
                Picker("Appearance",selection:$appearance) { Text("System").tag("system");Text("Light").tag("light");Text("Dark").tag("dark") }.pickerStyle(.segmented).frame(maxWidth:260)
                Spacer()
                Text(String(format:"0%d / 03",step+1)).font(.system(size:12,design:.monospaced)).foregroundColor(muted)
                Text(titles[step]).font(.system(size:43,weight:.regular,design:.serif)).tracking(-1.4).lineSpacing(2).foregroundColor(plum).fixedSize(horizontal:false,vertical:true)
                Text(descriptions[step]).font(.system(size:16)).lineSpacing(6).foregroundColor(muted).frame(maxWidth:370,alignment:.leading)
                HStack(spacing:6) { ForEach(0..<3) { i in Capsule().fill(i == step ? plum : plum.opacity(0.15)).frame(width:i == step ? 28 : 7,height:5) } }.padding(.top,8)
                Spacer()
                HStack {
                    if step > 0 { Button("Back") { withAnimation(reduceMotion ? nil : .easeInOut(duration:0.22)) { step -= 1 } }.buttonStyle(.plain).foregroundColor(muted) }
                    Spacer()
                    Button { if step == 2 { finished = true } else { withAnimation(reduceMotion ? nil : .easeInOut(duration:0.22)) { step += 1 } } } label: {
                        HStack(spacing:20) { Text(step == 2 ? "Enter your workspace" : "Continue"); Image(systemName:"arrow.right") }.font(.system(size:14,weight:.medium)).padding(.horizontal,22).padding(.vertical,15).background(plum,in:RoundedRectangle(cornerRadius:10)).foregroundColor(cream)
                    }.buttonStyle(.plain).keyboardShortcut(.defaultAction)
                }
            }.padding(48).frame(maxWidth:.infinity)
            GardenPanel(step:step).frame(maxWidth:.infinity,maxHeight:.infinity)
        }.background(cream)
    }
}

/// Shared Open Glass shader and registered garden backdrop in a small WebKit art pane.
struct GardenPanel: View {
    let step: Int
    @ObservedObject private var workspace = WorkspaceModel.shared
    var body: some View {
        GeometryReader { geometry in
            Group {
                if let baseURL = workspace.url { GlassArtPanel(baseURL:baseURL,step:step) }
                else { ProgressView().frame(maxWidth:.infinity,maxHeight:.infinity).background(cream) }
            }.frame(width:geometry.size.width,height:geometry.size.height).clipped()
        }
    }
}

struct GlassArtPanel: NSViewRepresentable {
    let baseURL: URL
    let step: Int
    func makeNSView(context: Context) -> WKWebView {
        let view = WKWebView(frame:.zero)
        view.underPageBackgroundColor = NSColor(red:0.965,green:0.945,blue:0.895,alpha:1)
        load(view)
        return view
    }
    func updateNSView(_ view:WKWebView,context:Context) { load(view) }
    private func load(_ view:WKWebView) {
        guard var parts = URLComponents(url:baseURL,resolvingAgainstBaseURL:false) else { return }
        parts.path = "/welcome-art.html"
        parts.queryItems = [URLQueryItem(name:"step",value:String(step))]
        if let url = parts.url, view.url != url { view.load(URLRequest(url:url)) }
    }
}

struct RootView: View {
    @AppStorage("openplex.appearance") private var appearance = "system"
    // The welcome sequence is part of every launch, including recording sessions.
    @LocalState private var finished = false
    @StateObject private var workspace = WorkspaceModel.shared
    var body: some View {
        Group {
            if !finished { WelcomeView(finished:$finished) }
            else if let url = workspace.url { WorkspaceView(url:url).background(cream) }
            else if let error = workspace.error {
                VStack(spacing:18) { Image(systemName:"exclamationmark.triangle").font(.largeTitle); Text("Workspace unavailable").font(.title); Text(error).frame(maxWidth:480).multilineTextAlignment(.center) }.padding(40).frame(maxWidth:.infinity,maxHeight:.infinity).background(cream).foregroundColor(plum)
            } else { ProgressView("Opening your workspace…").frame(maxWidth:.infinity,maxHeight:.infinity).background(cream) }
        }
        .preferredColorScheme(appearance == "system" ? nil : appearance == "dark" ? .dark : .light)
        .frame(minWidth:940,minHeight:650)
        .task { workspace.start() }
        .onReceive(NotificationCenter.default.publisher(for:commandNotification)) { notification in
            if notification.object as? String == "welcome" { finished = false }
        }
    }
    private func send(_ action:String) { NotificationCenter.default.post(name:commandNotification,object:action) }
}

@main struct OpenPlexApp: App {
    var body: some Scene {
        WindowGroup("OpenPlex") { RootView() }.defaultSize(width:1280,height:820).windowToolbarStyle(.unifiedCompact(showsTitle:false))
            .commands {
                CommandGroup(replacing:.newItem) { Button("New Project") { send("new-project") }.keyboardShortcut("n") }
                CommandMenu("Workspace") {
                    Button("Projects") { send("dashboard") }.keyboardShortcut("1")
                    Button("Team Workspace") { send("team-workspace") }.keyboardShortcut("2")
                    Button("Fit Offices") { send("fit") }.keyboardShortcut("0")
                    Divider()
                    Button("Show Welcome") { send("welcome") }
                }
            }
    }
    private func send(_ action:String) { NotificationCenter.default.post(name:commandNotification,object:action) }
}
