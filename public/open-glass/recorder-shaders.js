// Original shader code for this project. No copied application bundle or shader.
export const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }`;

export const fragment = `#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution, imageSize, center, pointer;
uniform sampler2D wallpaper;
uniform vec3 skyTop, skyBottom, glassTint;
uniform float radius, extension, time, volume, recording, transparent;
uniform float bands[4];

vec3 scene(vec2 pixel) {
  vec2 uv = pixel / resolution;
  if (imageSize.x < 2.) {
    vec3 sky = mix(skyBottom, skyTop, uv.y);
    float haze = exp(-length((uv - vec2(.7,.65)) * vec2(1.2,2.)) * 3.);
    vec2 cell = floor(pixel * .65);
    float speck = fract(sin(dot(cell, vec2(127.1,311.7))) * 43758.5453);
    return sky + vec3(.025,.045,.09) * haze + step(.9996,speck) * .16;
  }
  float screenAspect = resolution.x / resolution.y;
  float photoAspect = imageSize.x / imageSize.y;
  vec2 crop = screenAspect > photoAspect ? vec2(1., photoAspect / screenAspect) : vec2(screenAspect / photoAspect, 1.);
  return texture(wallpaper, clamp((uv - .5) * crop + .5, .001, .999)).rgb;
}
float shape(vec2 p) {
  vec2 axis = vec2(clamp(p.x, -extension, extension), 0.);
  float capsule = length(p - axis) - radius;
  vec2 nearPointer = p - pointer;
  float attraction = 5.5 * exp(-dot(nearPointer, nearPointer) / (radius * radius * .45));
  return capsule - attraction;
}
void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 p = pixel - center;
  vec3 background = scene(pixel);
  float distance = shape(p);
  float coverage = 1. - smoothstep(-.8, .8, distance);
  if (coverage < .001) { color = vec4(background * .96, 1. - transparent); return; }
  vec2 nearest = vec2(clamp(p.x, -extension, extension), 0.);
  vec2 radial = normalize(p - nearest + vec2(.0001));
  float edge = 1. - smoothstep(0., radius * .52, -distance);
  float curvature = pow(edge, 1.4);
  vec3 normal = normalize(vec3(radial * curvature * 1.6, 1.));
  vec2 displacement = normal.xy * (15. + 27. * edge);
  vec3 refracted;
  refracted.r = scene(pixel - displacement * 1.15).r;
  refracted.g = scene(pixel - displacement).g;
  refracted.b = scene(pixel - displacement * .86).b;
  // A small multi-tap frost softens the middle while keeping the rim legible.
  vec3 frost = (scene(pixel + vec2(3., 0.)) + scene(pixel - vec2(3., 0.)) + scene(pixel + vec2(0., 3.)) + scene(pixel - vec2(0., 3.))) * .25;
  vec3 glass = mix(refracted, frost, .27 * (1. - edge));
  glass = mix(glass, glassTint, .30);
  vec3 light = normalize(vec3(-.5, .75, .9));
  float shine = pow(max(dot(reflect(-light, normal), vec3(0., 0., 1.)), 0.), 35.);
  float outline = exp(-abs(distance + 1.2) * 1.25);
  float inner = exp(-abs(distance + 9.) * .22);
  float fresnel = pow(1. - normal.z, 2.);
  glass += vec3(.55, .7, 1.) * outline * .9 + vec3(.5, .65, .9) * inner * .15;
  glass += shine * .7 + fresnel * .25;
  for (int i=0; i<4; i++) {
    float x = (float(i) / 3. - .5) * (extension * 1.5 + radius);
    vec2 spot = (p - vec2(x, -radius * .55)) / vec2(radius * .7, radius * .45);
    vec3 tint = .55 + .45 * cos(vec3(0., 2., 4.) + float(i) * 1.7 + time * .3);
    glass += tint * exp(-dot(spot, spot)) * recording * (.15 + bands[i] * .8 + volume * .4);
  }
  color = vec4(mix(background, glass, coverage), mix(1., coverage, transparent));
}`;
