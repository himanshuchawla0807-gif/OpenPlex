const {CampusPeople}=await import('/src/procedural/CampusPeople.ts');
const {campusCast}=await import('/src/data/campusCast.ts');
const {uniqueCastSheets}=await import('/src/characters/uniqueCastSheets.ts');
const {ProceduralRenderer}=await import('/src/procedural/ProceduralRenderer.ts');
const {officeDefinitions}=await import('/src/procedural/officeRooms.ts');
const {Camera}=await import('/src/camera/Camera.ts');
const team=new CampusPeople(), deadline=Date.now()+60000;
while(!team.ready){if(team.error)throw Error(team.error);if(Date.now()>deadline)throw Error('Artwork loading timed out');await new Promise(r=>setTimeout(r,100));}
const canvas=document.createElement('canvas');canvas.width=220;canvas.height=180;const ctx=canvas.getContext('2d');
const board=document.createElement('canvas');board.width=1600;board.height=1280;const grid=board.getContext('2d');grid.fillStyle='#f4eee2';grid.fillRect(0,0,board.width,board.height);
let poses=0,minPixels=Infinity;
for(const [row,[id,sheet]] of Object.entries(Object.entries(uniqueCastSheets))){
 const index=campusCast.findIndex(c=>c.id===id),c=campusCast[index];
 const reviewed=sheet.walkFront?[sheet.frames[0],...sheet.walkFront,...sheet.walkRear,sheet.frames[5],sheet.frames[6],sheet.frames[7]]:sheet.frames;
 for(let column=0;column<reviewed.length;column++){
  const f=reviewed[column],art={url:f.url,f,scale:f.pixelScale,mirror:1,anchorX:f.anchorX};
  const tile=team.tile(art,index,0,true,2);if(!tile)throw Error('Missing tile '+id+':'+column);
  ctx.clearRect(0,0,220,180);ctx.drawImage(tile,110-f.anchorX*f.pixelScale,155-f.h*f.pixelScale,f.w*f.pixelScale,f.h*f.pixelScale);
  let count=0;const data=ctx.getImageData(0,0,220,180).data;for(let n=3;n<data.length;n+=4)if(data[n]>128)count++;
  if(count<450)throw Error('Invisible pose '+id+':'+column+' pixels='+count);minPixels=Math.min(minPixels,count);poses++;
 }
 const front=team.art(c.baseId,'work',0,0,false,1,1,0,id),rear=team.art(c.baseId,'work',0,0,true,1,-1,0,id);
 if(JSON.stringify(front.f)!==JSON.stringify(sheet.frames[5])||JSON.stringify(rear.f)!==JSON.stringify(sheet.frames[6])||rear.mirror!==1)throw Error('Wrong desk direction '+id);
 const x=(Number(row)%8)*200,y=Math.floor(Number(row)/8)*320;
 grid.fillStyle='#655064';grid.font='18px Georgia';grid.fillText(c.name,x+15,y+24);
 for(const [n,art] of [front,rear].entries()){
  const tile=team.tile(art,index,0,true,2);grid.drawImage(tile,x+55+n*92-art.anchorX*art.scale*1.3,y+260-art.f.h*art.scale*1.3,art.f.w*art.scale*1.3,art.f.h*art.scale*1.3);
 }
}
const def={...officeDefinitions[0],origin:{x:-officeDefinitions[0].width/2,y:-officeDefinitions[0].depth/2}};
const office=document.createElement('canvas');office.width=1500;office.height=1000;const g=office.getContext('2d');
const staff=campusCast.map((c,i)=>uniqueCastSheets[c.id]?i:-1).filter(i=>i>=0).slice(0,12);
const renderer=new ProceduralRenderer(g,1,[def],{[def.id]:staff},true),camera=new Camera({x:0,y:50,zoom:.8});
while(!renderer.ready){if(renderer.error)throw Error(renderer.error);await new Promise(r=>setTimeout(r,100));if(Date.now()>deadline)throw Error('Renderer loading timed out');}
let minVisible=Infinity;for(let frame=0;frame<120;frame++){
 renderer.people.time=frame/5;renderer.people.update(0);if(frame===60)renderer.resetSurfaces();renderer.render({width:1500,height:1000},camera,false,null,def.id);
 const data=g.getImageData(0,0,1500,1000).data;let count=0;for(let n=3;n<data.length;n+=4)if(data[n])count++;if(count<10000)throw Error('Office vanished '+frame);minVisible=Math.min(minVisible,count);
}
renderer.people.time=0;renderer.people.update(0);renderer.render({width:1500,height:1000},camera,true,null,def.id);
const overview=office.toDataURL();const jasper=renderer.people.actors.find(a=>campusCast[a.index].id==='jasper');if(jasper){const {project}=await import('/src/procedural/model.ts');const point=project(def.origin.x+jasper.i,def.origin.y+jasper.j);camera.reset({x:-point.x*2.4,y:-point.y*2.4+140,zoom:2.4});renderer.render({width:1500,height:1000},camera,true,null,def.id);}
const gaitImages={};const gait=document.createElement('canvas');gait.width=900;gait.height=300;const motion=gait.getContext('2d');
for(let frame=0;frame<16;frame++){
 motion.fillStyle='#f3eddf';motion.fillRect(0,0,900,300);
 for(const [n,id] of ['felix','jasper','theo','arthur'].entries()){
  const index=campusCast.findIndex(c=>c.id===id),c=campusCast[index],distance=frame/16*1.05;
  motion.strokeStyle='#c9bdad';motion.beginPath();motion.moveTo(n*225+10,260);motion.lineTo(n*225+215,260);motion.stroke();
  motion.fillStyle='#655064';motion.font='20px Georgia';motion.fillText(c.name,n*225+20,30);
  motion.save();motion.translate(n*225+112,260);motion.scale(1.8,1.8);team.drawPreview(motion,index,'walking',distance/.7,false,2);motion.restore();
 }
 gaitImages['walking-phase-'+String(frame).padStart(2,'0')]=gait.toDataURL();
}
const result={identities:Object.keys(uniqueCastSheets).length,poses,minPixels,officeFrames:120,minVisible,actors:renderer.people.actors.length,images:{...gaitImages,'hd-cast-desk-directions':board.toDataURL(),'hd-cast-office':overview,'chair-foreground-close':office.toDataURL()}};
renderer.dispose();team.dispose();return JSON.stringify(result);
