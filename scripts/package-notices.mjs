import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
const destination=process.argv[2]
if(!destination)throw Error('Supply the generated app Resources/Notices directory.')
await mkdir(destination,{recursive:true})
const lock=JSON.parse(await readFile('package-lock.json','utf8')),inventory=[]
for(const [location,metadata] of Object.entries(lock.packages??{})){
 if(!location.startsWith('node_modules/')||metadata.dev)continue
 const packageRoot=path.resolve(location)
 if(!packageRoot.startsWith(path.resolve('node_modules')+path.sep))throw Error('Unexpected package path.')
 let files=[];try{files=await readdir(packageRoot)}catch{continue}
 const name=location.split('node_modules/').at(-1),target=path.join(destination,name.replaceAll('/','__'))
 await mkdir(target,{recursive:true})
 const notices=files.filter(name=>/^(licen[sc]e|copying|notice)(\.|$)/i.test(name))
 for(const name of notices)await writeFile(path.join(target,name),await readFile(path.join(packageRoot,name)))
 inventory.push({name,version:metadata.version,license:metadata.license??'See package license',files:notices})
}
await writeFile(path.join(destination,'DEPENDENCIES.json'),JSON.stringify(inventory,null,2)+'\n')
await writeFile(path.join(destination,'OPENPLEX-THIRD-PARTY-NOTICES.md'),await readFile('THIRD_PARTY_NOTICES.md'))
console.log(`Collected runtime license notices for ${inventory.length} installed packages.`)
