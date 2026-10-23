import AppKit
import CryptoKit

/// MCP processes start before individual tool approvals, so trust the configuration explicitly.
enum ToolTrust {
    static func identity(_ body:[String:Any])->String? {
        guard let raw=body["mcp"] as? String,let data=raw.data(using:.utf8),let servers=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any],!servers.isEmpty else{return nil}
        let payload:[String:Any]=["key":body["key"] as? String ?? "","harness":body["provider"] as? String ?? body["harness"] as? String ?? "","servers":servers]
        guard let canonical=try? JSONSerialization.data(withJSONObject:payload,options:.sortedKeys) else{return nil}
        return SHA256.hash(data:canonical).map{String(format:"%02x",$0)}.joined()
    }
    static func approved(_ identity:String)->Bool {(UserDefaults.standard.stringArray(forKey:"OpenPlex.trustedMCP") ?? []).contains(identity)}
    static func ask(_ identity:String,window:NSWindow?,completion:@escaping(Bool)->Void) {
        let alert=NSAlert();alert.messageText="Allow this employee’s MCP connections?";alert.informativeText="MCP configuration can start programs on your Mac or connect to external servers. Review the employee’s MCP tab first. Allow only configurations you trust. This approval applies to this employee, harness and exact configuration.";alert.addButton(withTitle:"Allow configuration");alert.addButton(withTitle:"Cancel")
        let finish:(NSApplication.ModalResponse)->Void={response in
            let allowed=response == .alertFirstButtonReturn
            if allowed {var entries=UserDefaults.standard.stringArray(forKey:"OpenPlex.trustedMCP") ?? [];entries.append(identity);UserDefaults.standard.set(Array(entries.suffix(100)),forKey:"OpenPlex.trustedMCP")}
            completion(allowed)
        }
        if let window {alert.beginSheetModal(for:window,completionHandler:finish)}else{finish(alert.runModal())}
    }
}
