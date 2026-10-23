export interface ChatAttachment {name:string;text:string;kind:'auto'|'context'|'instruction'|'skill'|'profile'}
export const attachmentAccept='.txt,.md,.markdown,.json,.yaml,.yml,.csv,.pdf,.ts,.js,.py'
export async function readAttachment(file:File,kind:ChatAttachment['kind']='context'):Promise<ChatAttachment>{
 if(file.size>8*1024*1024)throw Error(`${file.name}: use a file smaller than 8 MB.`)
 let text:string
 if(/\.pdf$/i.test(file.name)){
  const pdfjs=await import('pdfjs-dist'),worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc=worker.default
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true})
  task.onPassword=()=>{void task.destroy()}
  try{
   const pdf=await task.promise;if(pdf.numPages>80)throw Error('Use a PDF with at most 80 pages.')
   const pages:string[]=[];let length=0
   for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent(),part=content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join('');length+=part.length;if(length>100000)throw Error('PDF text is too long. Attach a shorter excerpt.');pages.push(`[Page ${i}]\n${part}`);page.cleanup()}
   text=pages.join('\n\n');if(!pages.some(p=>p.replace(/^\[Page \d+\]\s*/, '').trim()))throw Error('This PDF has no selectable text. Attach a text export; scanned PDFs need OCR.')
  }finally{await task.destroy()}
 }else{
  if(file.size>100000)throw Error(`${file.name}: text files must be smaller than 100 KB.`)
  text=await file.text();if(text.includes('\u0000'))throw Error(`${file.name}: this file is not readable text.`)
 }
 if(text.length>100000)throw Error(`${file.name}: extracted text exceeds 100 KB.`)
 return {name:file.name,text,kind}
}
