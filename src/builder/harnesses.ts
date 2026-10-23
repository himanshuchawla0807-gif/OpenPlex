export const harnesses=[
 {id:'codex',name:'Codex',vendor:'OpenAI',command:'codex',mode:'integrated',url:'https://openai.com/codex/',logo:'/harnesses/codex.svg'},
 {id:'claude',name:'Claude Code',vendor:'Anthropic',command:'claude',mode:'integrated',url:'https://code.claude.com/docs/',logo:'/harnesses/claude.svg'},
 {id:'antigravity',name:'Antigravity',vendor:'Google',command:'agy',mode:'terminal',url:'https://antigravity.google/docs/cli/reference/',logo:'/harnesses/antigravity.ico'},
 {id:'cursor',name:'Cursor',vendor:'Cursor',command:'cursor-agent',mode:'terminal',url:'https://cursor.com/docs/cli',logo:'/harnesses/cursor.ico'},
 {id:'opencode',name:'OpenCode',vendor:'OpenCode',command:'opencode',mode:'terminal',url:'https://opencode.ai/docs/cli/',logo:'/harnesses/opencode.png'},
 {id:'muse',name:'Muse Code',vendor:'Meta',command:'muse',mode:'terminal',url:'https://dev.meta.ai/docs/muse-code',logo:'/harnesses/muse.ico'},
 {id:'deepseek',name:'DeepSeek Harness',vendor:'DeepSeek',command:'dsh',mode:'setup',url:'https://github.com/deepseek-ai/deepseek-harness',logo:'/harnesses/deepseek.ico'},
 {id:'zcode',name:'Z Code',vendor:'Z.ai',command:'zcode',mode:'setup',url:'https://zcode.z.ai',logo:'/harnesses/zcode.svg'},
 {id:'mcode',name:'M Code',vendor:'MiniMax',command:'mcode',mode:'terminal',url:'https://github.com/MiniMax-AI/minimax-code',logo:'/harnesses/mcode.ico'},
 {id:'kilo',name:'Kilo Code',vendor:'Kilo',command:'kilo',mode:'terminal',url:'https://kilo.ai/docs/code-with-ai/platforms/cli',logo:'/harnesses/kilo.ico'},
 {id:'openclaw',name:'OpenClaw',vendor:'OpenClaw',command:'openclaw',mode:'setup',url:'https://docs.openclaw.ai/cli/agents',logo:'/harnesses/openclaw.svg'},
 {id:'hermes',name:'Hermes Agent',vendor:'Nous Research',command:'hermes chat',mode:'terminal',url:'https://hermes-agent.nousresearch.com/docs/user-guide/cli/',logo:'/harnesses/hermes.png'},
 {id:'devin',name:'Devin',vendor:'Cognition',command:'devin',mode:'terminal',url:'https://docs.devin.ai/work-with-devin/devin-cli',logo:'/harnesses/devin.svg'},
] as const
export type EmployeeHarness=typeof harnesses[number]['id']
export const harnessInfo=(id:string)=>harnesses.find(h=>h.id===id)??harnesses[0]
export const validHarness=(id:unknown):id is EmployeeHarness=>harnesses.some(h=>h.id===id)
