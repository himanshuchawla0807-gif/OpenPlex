import Foundation
import CryptoKit

/// Materializes employee-owned configuration without touching global CLI settings.
enum EmployeeWorkspace {
    static func prepare(_ body:[String:Any],allowedDirectories:Set<String>) throws -> String {
        func invalid(_ message:String)->NSError {NSError(domain:"OpenPlex.Employee",code:1,userInfo:[NSLocalizedDescriptionKey:message])}
        guard let directory=body["directory"] as? String,allowedDirectories.contains(directory),let key=body["key"] as? String,!key.isEmpty,key.utf8.count<400,let profile=body["profile"] as? [String:Any],let name=profile["name"] as? String,!name.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty,name.count<=80,let prompt=profile["systemPrompt"] as? String,prompt.utf8.count<=100000,let harness=profile["harness"] as? String,harness.range(of:"^[a-z-]{1,40}$",options:.regularExpression) != nil else {throw invalid("Choose an authorized project folder and a valid employee profile.")}
        let fm=FileManager.default,base=URL(fileURLWithPath:directory).standardizedFileURL
        var isDirectory:ObjCBool=false
        guard fm.fileExists(atPath:base.path,isDirectory:&isDirectory),isDirectory.boolValue else {throw invalid("Project folder is unavailable.")}
        let slug=name.lowercased().unicodeScalars.map{CharacterSet.alphanumerics.contains($0) ? String($0):"-"}.joined().prefix(50)
        let digest=SHA256.hash(data:Data(key.utf8)).map{String(format:"%02x",$0)}.joined().prefix(16)
        let root=base.appendingPathComponent(".openplex/employees/\(slug)-\(digest)")
        // Inspect every managed path component before creating/writing anything.
        func safe(_ url:URL) throws {
            guard url.standardizedFileURL.path.hasPrefix(base.path+"/") else {throw invalid("Employee path escapes the project folder.")}
            var current=url
            while current.path != base.path {
                if let attributes=try? fm.attributesOfItem(atPath:current.path),attributes[.type] as? FileAttributeType == .typeSymbolicLink {throw invalid("Employee configuration paths must not be symbolic links.")}
                current.deleteLastPathComponent()
            }
        }
        try safe(root)
        let sections=["instructions","skills","plugins"]
        var managedSkills=[String](),files=[String:Data](),brief="# \(name)\n\nRole: \(profile["role"] as? String ?? "")\n\n\(prompt)\n"
        for section in sections {
            guard let entries=profile[section] as? [[String:Any]],entries.count<=20 else {throw invalid("Employee reference lists are invalid.")}
            for (index,entry) in entries.enumerated() {
                guard let filename=entry["name"] as? String,filename.utf8.count<=400,let content=entry["content"] as? String,content.utf8.count<=400000 else {throw invalid("An employee reference exceeds its size limit.")}
                let clean=filename.unicodeScalars.map{CharacterSet.alphanumerics.contains($0)||"._-".unicodeScalars.contains($0) ? String($0):"_"}.joined()
                let path="\(section)/\(index+1)-\(clean.isEmpty ? "reference.md":String(clean.prefix(60)))"
                files[path]=Data(content.utf8)
                if section=="skills" {
                    let text=content.hasPrefix("---") ? content:"---\nname: employee-skill-\(index+1)\ndescription: Employee-provided skill reference \(index+1).\n---\n\n"+content
                    for parent in [".agents/skills",".claude/skills"] {
                        let skill="\(parent)/employee-skill-\(index+1)/SKILL.md"
                        files[skill]=Data(text.utf8);managedSkills.append(skill)
                    }
                }
                brief += "\n\n## \(section): \(filename)\n\(content)\n"
            }
        }
        guard let mcp=profile["mcp"] as? String,mcp.utf8.count<=400000,let bytes=mcp.data(using:.utf8),let servers=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:Any] else {throw invalid("MCP configuration must be a JSON object.")}
        for (name,value) in servers {guard name.range(of:"^[A-Za-z0-9_-]{1,80}$",options:.regularExpression) != nil,value is [String:Any] else {throw invalid("Invalid MCP server entry.")}}
        guard brief.utf8.count<=1000000 else {throw invalid("Employee references exceed 1 MB.")}
        files["AGENTS.md"]=Data(brief.utf8);files["CLAUDE.md"]=Data(brief.utf8)
        files["mcp.json"]=try JSONSerialization.data(withJSONObject:["mcpServers":servers],options:[.prettyPrinted,.sortedKeys])
        files["employee.json"]=try JSONSerialization.data(withJSONObject:["schemaVersion":1,"key":key,"profile":profile,"managedBy":"OpenPlex","managedSkills":managedSkills,"managedReferences":files.keys.filter{["instructions/","skills/","plugins/"].contains(where:$0.hasPrefix)}.sorted()],options:[.prettyPrinted,.sortedKeys])
        var previousSkills=[String](),previousReferences=[String]()
        // Refuse to adopt an existing unowned folder, even if its name collides.
        if fm.fileExists(atPath:root.path) {
            let manifest=root.appendingPathComponent("employee.json");try safe(manifest)
            if let data=try? Data(contentsOf:manifest),let previous=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any],previous["key"] as? String==key,previous["managedBy"] as? String=="OpenPlex" {
                previousSkills=previous["managedSkills"] as? [String] ?? []
                previousReferences=previous["managedReferences"] as? [String] ?? []
            } else {
                let owner=root.appendingPathComponent(".openplex-owner");try safe(owner)
                guard (try? String(contentsOf:owner,encoding:.utf8))==key else {throw invalid("An unowned folder already exists at the employee path.")}
            }
        }
        for path in previousSkills where !managedSkills.contains(path) {
            guard path.range(of:"^\\.(agents|claude)/skills/employee-skill-[0-9]+/SKILL\\.md$",options:.regularExpression) != nil else {throw invalid("Invalid managed skill path.")}
            try safe(root.appendingPathComponent(path))
        }
        for path in previousReferences where files[path]==nil {
            guard path.range(of:"^(instructions|skills|plugins)/[0-9]+-[^/\\\\]+$",options:.regularExpression) != nil else {throw invalid("Invalid managed reference path.")}
            try safe(root.appendingPathComponent(path))
        }
        files[".openplex-owner"]=Data(key.utf8)
        for path in files.keys {try safe(root.appendingPathComponent(path))}
        for path in previousSkills where !managedSkills.contains(path) {
            let target=root.appendingPathComponent(path)
            if fm.fileExists(atPath:target.path){try fm.removeItem(at:target)}
        }
        for path in previousReferences where files[path]==nil {let target=root.appendingPathComponent(path);if fm.fileExists(atPath:target.path){try fm.removeItem(at:target)}}
        // Publish the ownership manifest after all instruction/skill content.
        let ordered=[".openplex-owner"]+files.keys.filter{$0 != "employee.json" && $0 != ".openplex-owner"}.sorted()+["employee.json"]
        for path in ordered {
            let target=root.appendingPathComponent(path);try fm.createDirectory(at:target.deletingLastPathComponent(),withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
            try files[path]!.write(to:target,options:.atomic);try fm.setAttributes([.posixPermissions:0o600],ofItemAtPath:target.path)
        }
        return root.path
    }
}
