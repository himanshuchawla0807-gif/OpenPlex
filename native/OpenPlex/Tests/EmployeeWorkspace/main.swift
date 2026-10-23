import Foundation
let fm=FileManager.default,base=fm.temporaryDirectory.appendingPathComponent("openplex-employee-"+UUID().uuidString)
try fm.createDirectory(at:base,withIntermediateDirectories:true)
defer {try? fm.removeItem(at:base)}
let profile:[String:Any]=["name":"Oscar","role":"Research lead","harness":"codex","systemPrompt":"Verify sources.","instructions":[["name":"../AGENTS.md","content":"Ask before publishing."]],"skills":[["name":"research.md","content":"Follow the evidence."]],"plugins":[["name":"plugin.md","content":"Configuration only."]],"mcp":"{\"research\":{\"command\":\"fixture\"}}"]
var body:[String:Any]=["key":"project:room:oscar","directory":base.path,"profile":profile]
let root=try EmployeeWorkspace.prepare(body,allowedDirectories:[base.path])
assert(root.hasPrefix(base.path+"/.openplex/employees/oscar-"))
let agents=try String(contentsOfFile:root+"/AGENTS.md",encoding:.utf8)
assert(agents.contains("Research lead"));assert(agents.contains("Verify sources."));assert(agents.contains("Ask before publishing."));assert(agents.contains("Follow the evidence."))
assert(fm.fileExists(atPath:root+"/skills/1-research.md"));assert(fm.fileExists(atPath:root+"/.agents/skills/employee-skill-1/SKILL.md"));assert(fm.fileExists(atPath:root+"/.claude/skills/employee-skill-1/SKILL.md"));assert(!fm.fileExists(atPath:base.path+"/AGENTS.md"))
let repeated=try EmployeeWorkspace.prepare(body,allowedDirectories:[base.path]);assert(repeated==root)
try Data("Personal note".utf8).write(to:URL(fileURLWithPath:root+"/skills/personal.md"))
var withoutSkill=profile;withoutSkill["skills"]=[[String:Any]]();var updated=body;updated["profile"]=withoutSkill
_ = try EmployeeWorkspace.prepare(updated,allowedDirectories:[base.path])
assert(!fm.fileExists(atPath:root+"/.agents/skills/employee-skill-1/SKILL.md"))
assert(!fm.fileExists(atPath:root+"/skills/1-research.md"),"Removed tracked skill reference remains")
assert(fm.fileExists(atPath:root+"/skills/personal.md"),"Unmanaged user file removed")
_ = try EmployeeWorkspace.prepare(body,allowedDirectories:[base.path])
let permissions=try fm.attributesOfItem(atPath:root+"/mcp.json")[.posixPermissions] as! NSNumber
assert(permissions.intValue==0o600)
func rejected(_ body:[String:Any],_ allowed:Set<String>) {do{_ = try EmployeeWorkspace.prepare(body,allowedDirectories:allowed);fatalError("Unsafe configuration accepted")}catch{}}
rejected(body,[])
var duplicate=body;duplicate["key"]="project:other:oscar"
let otherRoot=try EmployeeWorkspace.prepare(duplicate,allowedDirectories:[base.path]);assert(otherRoot != root)
try fm.removeItem(atPath:root+"/AGENTS.md");let target=base.appendingPathComponent("outside.txt");try Data("untouched".utf8).write(to:target);try fm.createSymbolicLink(atPath:root+"/AGENTS.md",withDestinationPath:target.path)
rejected(body,[base.path]);let original=try String(contentsOf:target,encoding:.utf8);assert(original=="untouched")
let other=base.appendingPathComponent("other");try fm.createDirectory(at:other,withIntermediateDirectories:true);try fm.createSymbolicLink(atPath:other.path+"/.openplex",withDestinationPath:base.path)
body["directory"]=other.path;rejected(body,[other.path])
print("PASS: scoped employee folders, complete instruction intake, references, MCP serialization, repeat setup, independent identity, private permissions, unauthorized folder and symlink rejection")
