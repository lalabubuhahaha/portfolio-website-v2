import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PortraitPhysics, resistance, inverseWarp } = require('../.next/portrait-test/portrait-physics.js');
const advance = (p, seconds) => { for (let i = 0; i < seconds * 240; i++) p.step(1 / 240); };
function pull(p) { assert.equal(p.down({ x: .5, y: .6 }), true); p.move({ x: .9, y: .65 }); advance(p, .3); }
test('edge pinning, finite inverse UV and positive Jacobian across extreme drags', () => {
 for (const grab of [{x:.55,y:.57},{x:.1,y:.1},{x:.9,y:.9}]) for (const target of [{x:4,y:2},{x:-4,y:0},{x:0,y:-5}]) {
  const drag = resistance(target);
  for (let x = 0; x <= 1; x += .05) for (let y = 0; y <= 1; y += .05) {
   const p = {x,y}, q = inverseWarp(p,grab,drag); assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y)); assert.ok(q.x >= -1e-8 && q.x <= 1+1e-8 && q.y >= -1e-8 && q.y <= 1+1e-8);
   if (x===0 || y===0) { assert.ok(Math.abs(q.x-x)<1e-8); assert.ok(Math.abs(q.y-y)<1e-8); }
   if(x>.01&&x<.99&&y>.01&&y<.99) { const e=.0001; const a=inverseWarp({x:x+e,y},grab,drag); const b=inverseWarp({x,y:y+e},grab,drag); const jac=((a.x-q.x)*(b.y-q.y)-(a.y-q.y)*(b.x-q.x))/(e*e); assert.ok(jac>0,`fold at ${x},${y}`); }
  }
  for(const p of [{x:1,y:.5},{x:.5,y:1}]) assert.deepEqual(inverseWarp(p,grab,drag),p);
 }
});
test('rubber band is continuous, monotonic and bounded',()=>{let last=0;for(let x=0;x<10;x+=.001){const p=resistance({x,y:0});assert.ok(p.x>=last-1e-12&&p.x<.561);last=p.x;}assert.ok(Math.abs(resistance({x:.40001,y:0}).x-.40001)<1e-6);});
test('grab records actual point, lags pointer, ignores second pointer and small taps keep mood',()=>{const p=new PortraitPhysics();p.down({x:.3,y:.7});assert.equal(p.down({x:0,y:0}),false);p.move({x:.32,y:.7});p.step(1/60);assert.ok(p.displacement.x>0&&p.displacement.x<.02);assert.equal(p.blend,0);p.up();advance(p,1);assert.equal(p.mood,0);assert.equal(p.phase,'IDLE');});
test('grimace covers hidden mood switch and three releases yield distinct moods',()=>{const p=new PortraitPhysics();const seen=new Set();for(let n=0;n<3;n++){pull(p);assert.ok(p.blend>.95);p.up();let old=p.mood;let switched=false;for(let i=0;i<240;i++){p.step(1/240);if(p.mood!==old){assert.equal(p.blend,1);switched=true;old=p.mood;}}assert.ok(switched);assert.equal(p.phase,'IDLE');assert.equal(p.blend,0);seen.add(p.mood);}assert.equal(seen.size,3);p.reset();assert.equal(p.mood,0);pull(p);p.up();advance(p,1);assert.equal(p.mood,10);});
test('spring settles in 0.8s, has only one small overshoot',()=>{const p=new PortraitPhysics();pull(p);p.up();let crossings=0;let sign=1;let min=0;for(let i=0;i<240;i++){p.step(1/240);const x=p.displacement.x;min=Math.min(min,x);if(Math.abs(x)>1e-6&&Math.sign(x)!==sign){crossings++;sign=Math.sign(x);}}assert.ok(min<0&&min>-.025);assert.equal(crossings,1);assert.equal(p.phase,'IDLE');assert.deepEqual(p.displacement,{x:0,y:0});});
test('reduced motion has no overshoot; cancel settles without mood switch',()=>{const p=new PortraitPhysics(true);pull(p);p.up(true);for(let i=0;i<240;i++){p.step(1/240);assert.ok(p.displacement.x>=0);}assert.equal(p.mood,0);assert.equal(p.phase,'IDLE');});
