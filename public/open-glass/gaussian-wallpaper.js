/** Two-pass Gaussian preparation. Only the wallpaper is blurred; type and bevel stay sharp. */
export function gaussianWallpaper(gl,image,backdrop){
 const scale=Math.min(1,1536/Math.max(image.naturalWidth,image.naturalHeight));
 const width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
 const displayedScale=Math.max(backdrop.width/image.naturalWidth,backdrop.height/image.naturalHeight);
 const sigma=5.5*scale/Math.max(displayedScale,.001);
 const resources={textures:[],shaders:[],program:null,framebuffer:null,buffer:null};let result=null;
 try{
  const compile=(type,source)=>{const shader=gl.createShader(type);resources.shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader};
  const vertex=compile(gl.VERTEX_SHADER,`#version 300 es\nin vec2 position;out vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`);
  const fragment=compile(gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;in vec2 uv;out vec4 color;uniform sampler2D source;uniform vec2 direction;void main(){vec4 sum=vec4(0.);float total=0.;for(int i=-12;i<=12;i++){float x=float(i)/4.;float weight=exp(-.5*x*x);sum+=texture(source,clamp(uv+direction*x,vec2(.0001),vec2(.9999)))*weight;total+=weight;}color=sum/total;}`);
  const program=gl.createProgram();resources.program=program;gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const texture=()=>{const t=gl.createTexture();resources.textures.push(t);gl.bindTexture(gl.TEXTURE_2D,t);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);return t};
  const input=texture();gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  const horizontal=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  const vertical=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  const buffer=gl.createBuffer();resources.buffer=buffer;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const framebuffer=gl.createFramebuffer();resources.framebuffer=framebuffer;gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.viewport(0,0,width,height);gl.uniform1i(gl.getUniformLocation(program,'source'),0);const direction=gl.getUniformLocation(program,'direction');
  for(const [from,to,dx,dy] of [[input,horizontal,sigma/width,0],[horizontal,vertical,0,sigma/height]]){
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,to,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Gaussian framebuffer unavailable');gl.bindTexture(gl.TEXTURE_2D,from);gl.uniform2f(direction,dx,dy);gl.drawArrays(gl.TRIANGLES,0,3);
  }
  result=vertical;return result;
 }finally{
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);for(const t of resources.textures)if(t!==result)gl.deleteTexture(t);for(const s of resources.shaders)gl.deleteShader(s);if(resources.program)gl.deleteProgram(resources.program);if(resources.framebuffer)gl.deleteFramebuffer(resources.framebuffer);if(resources.buffer)gl.deleteBuffer(resources.buffer);
 }
}
