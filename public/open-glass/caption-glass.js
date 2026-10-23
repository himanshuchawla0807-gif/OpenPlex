/** OpenPlex caption adapter for Himanshu Chawla's MIT Open Glass shader.
 * Source: open-glass-recorder/src/shaders.js @ b3f1123171c56c21adc221258cdde1214a0fc58e
 * Changes: rounded card SDF, source-image registration, warm rim and static rendering.
 * This renderer samples the supplied wallpaper; it does not capture live HTML.
 */
import {gaussianWallpaper} from './gaussian-wallpaper.js';
import {vertex,fragment as recorderFragment} from './recorder-shaders.js';
// Reuse Open Glass's registered wallpaper and mask; use a physical clear bevel
// instead of the earlier additive outline and separated RGB channels.
const fragment=recorderFragment
 .replace('uniform vec2 resolution, imageSize, center, pointer;', 'uniform vec2 resolution, imageSize, center, pointer;\nuniform vec2 backdropResolution, backdropOffset, halfSize, photoAnchor;\nuniform float pixelRatio, shadeMode;')
 .replace('vec2 uv = pixel / resolution;', 'vec2 uv = (pixel + backdropOffset) / backdropResolution;')
 .replace('resolution.x / resolution.y', 'backdropResolution.x / backdropResolution.y')
 .replace('(uv - .5) * crop + .5', '(uv - .5) * crop + .5 + vec2(photoAnchor.x-.5,.5-photoAnchor.y)*(1.-crop)')
 .replace('return texture(wallpaper, clamp((uv - .5) * crop + .5 + vec2(photoAnchor.x-.5,.5-photoAnchor.y)*(1.-crop), .001, .999)).rgb;', `vec3 sampled = texture(wallpaper, clamp((uv - .5) * crop + .5 + vec2(photoAnchor.x-.5,.5-photoAnchor.y)*(1.-crop), .001, .999)).rgb;
  if(shadeMode>.5){
    bool warm=shadeMode>1.5;
    vec3 tint=warm?vec3(.220,.153,.224):vec3(.090,.129,.235);
    sampled=mix(sampled,tint,.64*clamp(1.-uv.y/.4,0.,1.));
    float x=uv.x;
    float alpha=x<.27?mix(.91,.79,x/.27):x<.48?mix(.79,.45,(x-.27)/.21):x<.73?mix(.45,.10,(x-.48)/.25):mix(.10,0.,clamp((x-.73)/.17,0.,1.));
    sampled=mix(sampled,tint,alpha);
  }
  return sampled;`)
 .replace('vec2 axis = vec2(clamp(p.x, -extension, extension), 0.);\n  float capsule = length(p - axis) - radius;', 'vec2 q = abs(p) - (halfSize - radius);\n  float capsule = length(max(q,0.)) + min(max(q.x,q.y),0.) - radius;')
 .replace(/void main\(\) \{[\s\S]*$/, `void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 p = pixel - center;
  float d = shape(p);
  float aa = max(fwidth(d), .7);
  float coverage = 1. - smoothstep(-aa, aa, d);
  if (coverage < .001) { color = vec4(0.); return; }
  vec2 nearest = clamp(p, -halfSize+radius, halfSize-radius);
  vec2 outward = normalize(p-nearest+vec2(.0001));
  float bevel = min(radius * .65, 10. * pixelRatio);
  float t = clamp(-d / bevel, .01, 1.);
  float thickness = min(8.5 * pixelRatio, radius * .55);
  float profile = sqrt(max(.0001, t * (2.-t)));
  float slope = thickness * (1.-t) / (bevel * profile);
  vec3 normal = normalize(vec3(outward * slope, 1.));
  float ior = 1.48;
  vec3 ray = refract(vec3(0.,0.,-1.),normal,1./ior);
  vec2 offset = ray.xy * (thickness * profile / max(-ray.z,.15));
  vec3 transmission = scene(pixel + offset);
  // Sample a dense, separable Gaussian wallpaper; avoid sparse duplicate edges.
  transmission = mix(transmission,glassTint,.16);
  float f0 = pow((ior-1.)/(ior+1.),2.);
  float fresnel = f0 + (1.-f0)*pow(1.-normal.z,5.);
  vec3 light = normalize(vec3(-.48,.75,1.1));
  float glint = pow(max(dot(reflect(-light,normal),vec3(0.,0.,1.)),0.),95.);
  float litSide = .5 + .5 * dot(outward,normalize(vec2(-.48,.75)));
  float lip = exp(-pow((d+1.1*pixelRatio)/(1.25*pixelRatio),2.));
  vec3 environment = mix(vec3(.13,.12,.16),vec3(.97,.95,.90),pow(litSide,2.));
  vec3 glass = transmission*(1.-fresnel*.45)+environment*fresnel*.5;
  glass *= 1.-lip*.22*pow(1.-litSide,2.);
  glass += glint*.15 + vec3(.98,.98,.97)*lip*.18*pow(litSide,4.);
  color = vec4(glass,coverage);
}`);

export class CaptionGlass {
 constructor(host,backdrop){
  this.host=host;this.backdrop=backdrop;this.canvas=document.createElement('canvas');this.canvas.className='open-glass-surface';this.canvas.setAttribute('aria-hidden','true');host.prepend(this.canvas);
  this.events=new AbortController();this.pointer=[1e5,1e5];this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.alive=true;this.imageToken=0;
  this.resizeObserver=new ResizeObserver(()=>this.schedule());this.resizeObserver.observe(host);this.resizeObserver.observe(backdrop);
  const signal=this.events.signal;
  host.addEventListener('pointermove',event=>{const r=host.getBoundingClientRect();this.pointer=this.reduced.matches?[1e5,1e5]:[event.clientX-r.left-r.width/2,r.height/2-event.clientY+r.top];this.schedule()},{signal});
  host.addEventListener('pointerleave',()=>{this.pointer=[1e5,1e5];this.schedule()},{signal});
  this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.gl=null;host.dataset.glass='fallback'},{signal});
  this.canvas.addEventListener('webglcontextrestored',()=>{this.setup();if(this.image)this.upload();this.schedule()},{signal});
  document.addEventListener('visibilitychange',()=>this.schedule(),{signal});window.addEventListener('resize',()=>this.schedule(),{signal});
  this.setup();this.setBackdrop(host.dataset.glassSrc);
 }
 setup(){
  try{
   const gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false});if(!gl)throw Error('WebGL2 unavailable');
   this.gl=gl;const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(info)}return s};
   const shaders=[compile(gl.VERTEX_SHADER,vertex),compile(gl.FRAGMENT_SHADER,fragment)];this.program=gl.createProgram();shaders.forEach(s=>gl.attachShader(this.program,s));gl.linkProgram(this.program);shaders.forEach(s=>gl.deleteShader(s));if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
   gl.useProgram(this.program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const p=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(gl.getUniformLocation(this.program,'wallpaper'),0);
   this.uniforms=Object.fromEntries(['resolution','imageSize','center','pointer','radius','extension','time','volume','recording','transparent','skyTop','skyBottom','glassTint','bands[0]','backdropResolution','backdropOffset','halfSize','photoAnchor','pixelRatio','shadeMode'].map(name=>[name,gl.getUniformLocation(this.program,name)]));
  }catch(error){this.host.dataset.glass='fallback';this.host.dataset.glassError=error.message;this.gl=null}
 }
 setBackdropElement(element){if(element===this.backdrop)return;this.resizeObserver.unobserve(this.backdrop);this.backdrop=element;this.resizeObserver.observe(element);this.schedule()}
 async setBackdrop(src){
  if(this.src===src)return;this.src=src;const token=++this.imageToken;
  try{const image=new Image();image.src=src;await image.decode();if(!this.alive||token!==this.imageToken)return;this.image=image;this.loadedSrc=src;this.upload();this.draw();this.schedule()}catch{if(this.alive){this.host.dataset.glass='fallback';this.host.dataset.glassError='Wallpaper unavailable'}}
 }
 upload(){
  const gl=this.gl;if(!gl||!this.image)return;
  try{const box=this.backdrop.getBoundingClientRect();const texture=gaussianWallpaper(gl,this.image,box);gl.deleteTexture(this.texture);this.texture=texture;this.blurSize=`${box.width}:${box.height}`}
  catch(error){this.host.dataset.glass='fallback';this.host.dataset.glassError=error.message;this.gl=null}
 }
 schedule(){if(!this.alive||this.raf)return;this.raf=requestAnimationFrame(()=>{this.raf=0;this.draw()})}
 draw(){
  const gl=this.gl;if(!gl||!this.image)return;
  const box=this.host.getBoundingClientRect(),back=this.backdrop.getBoundingClientRect();if(!box.width||!box.height)return;
  if(this.blurSize!==`${back.width}:${back.height}`)this.upload();if(!this.gl)return;
  const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(box.width*dpr),h=Math.round(box.height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}
  gl.viewport(0,0,w,h);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);const position=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.bindTexture(gl.TEXTURE_2D,this.texture);const u=this.uniforms;
  gl.uniform2f(u.resolution,w,h);gl.uniform2f(u.imageSize,this.image.naturalWidth,this.image.naturalHeight);gl.uniform2f(u.center,w/2,h/2);gl.uniform2f(u.halfSize,w/2-2*dpr,h/2-2*dpr);gl.uniform1f(u.radius,Math.min(26,box.height*.42)*dpr);gl.uniform2f(u.pointer,...this.pointer.map(x=>x*dpr));
  gl.uniform2f(u.backdropResolution,back.width*dpr,back.height*dpr);gl.uniform2f(u.backdropOffset,(box.left-back.left)*dpr,(back.bottom-box.bottom)*dpr);gl.uniform2f(u.photoAnchor,.5,Number(this.host.dataset.glassPositionY??.5));
  gl.uniform1f(u.shadeMode,Number(this.host.dataset.glassShade??0));gl.uniform1f(u.pixelRatio,dpr);gl.uniform1f(u.transparent,1);gl.uniform1f(u.recording,0);gl.uniform1f(u.extension,0);gl.uniform1f(u.time,0);gl.uniform1f(u.volume,0);gl.uniform1fv(u['bands[0]'],new Float32Array(4));gl.uniform3f(u.glassTint,.25,.19,.26);gl.uniform3f(u.skyTop,.97,.94,.87);gl.uniform3f(u.skyBottom,.43,.34,.40);gl.drawArrays(gl.TRIANGLES,0,3);
  this.host.dataset.glass='webgl2';this.host.dataset.glassImage=this.loadedSrc;delete this.host.dataset.glassError;
 }
 destroy(){this.alive=false;this.imageToken++;cancelAnimationFrame(this.raf);this.events.abort();this.resizeObserver.disconnect();if(this.gl){this.gl.deleteTexture(this.texture);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program)}this.canvas.remove();delete this.host.dataset.glass}
}
