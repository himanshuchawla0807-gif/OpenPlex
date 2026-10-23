import {CaptionGlass} from './caption-glass.js';
const active=new Map();
function reconcile(){
 for(const [host,renderer] of active)if(!host.isConnected){renderer.destroy();active.delete(host)}
 document.querySelectorAll('.glass-caption[data-glass-src]').forEach(host=>{
  const backdrop=host.closest(host.dataset.glassBackdrop||'.art');if(!backdrop)return;
  if(!active.has(host))active.set(host,new CaptionGlass(host,backdrop));
  else{active.get(host).setBackdropElement(backdrop);active.get(host).setBackdrop(host.dataset.glassSrc);active.get(host).schedule()}
 });
}
let queued=false;
const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;reconcile()})}});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-glass-src','data-glass-backdrop','data-glass-shade']});reconcile();
window.addEventListener('pagehide',()=>{observer.disconnect();for(const r of active.values())r.destroy();active.clear()});
window.addEventListener('pageshow',event=>{if(event.persisted){observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-glass-src','data-glass-backdrop','data-glass-shade']});reconcile()}});
