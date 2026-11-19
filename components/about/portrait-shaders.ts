export const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D baseTexture, moodTexture, grimaceTexture;
uniform vec2 grab, displacement, velocity;
uniform float blend, radius, blur;
uniform bool fullFrameMood;
uniform vec4 warpBounds;
float edgeWeight(vec2 p){
 vec2 edge=smoothstep(vec2(0.),vec2(.16),p-warpBounds.xy)*
   smoothstep(vec2(0.),vec2(.16),warpBounds.zw-p);
 return edge.x*edge.y;
}
// A smooth stationary velocity field. Its time-one flow defines the forward
// smudge; integrating the negative field gives each pixel's inverse map.
vec2 field(vec2 p){
 vec2 q=(p-grab)/radius;
 float local=exp(-dot(q,q)*1.5);
 return displacement*local*edgeWeight(p);
}
vec2 inverseWarp(vec2 p){
 const float h=1./12.;
 for(int i=0;i<12;i++){vec2 k=field(p);p-=h*field(p-.5*h*k);}
 return clamp(p,vec2(.001),vec2(.999));
}
vec3 portrait(vec2 p){
 vec3 base=texture2D(baseTexture,p).rgb;
 vec2 f=(p-vec2(.548,.584))/vec2(.157,.195);
 float mask=1.-smoothstep(.65,1.15,length(f));
 vec3 mood=texture2D(moodTexture,p).rgb;
 vec3 grimace=texture2D(grimaceTexture,p).rgb;
 // Both sampling paths reach the same covered grimace before the mood switches.
 if (fullFrameMood) return mix(mood,mix(base,grimace,mask),blend);
 return mix(base,mix(mood,grimace,blend),mask);
}
void main(){
 vec2 p=inverseWarp(vUv);
 vec2 streak=velocity*blur;
 vec3 color=portrait(p);
 if(blur>0.) {
  vec3 blurred=color*.5+portrait(clamp(p+streak,.001,.999))*.25+portrait(clamp(p-streak,.001,.999))*.25;
  color=mix(color,blurred,edgeWeight(vUv));
 }
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
