import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const origin=process.env.PORTRAIT_ORIGIN||'http://localhost:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await page.goto(`${origin}/about`);await page.waitForSelector('canvas[data-ready="true"]');await page.locator('canvas').scrollIntoViewIfNeeded();
 const r=await page.locator('canvas').boundingBox();const x=r.x+r.width*.55,y=r.y+r.height*.41;
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-r.width*.3*i/12,y}]});await page.waitForTimeout(20);}
 await page.waitForTimeout(150);assert.equal(await page.locator('canvas').getAttribute('data-phase'),'GRIMACE');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('data-phase')==='IDLE');assert.equal(await page.locator('canvas').getAttribute('data-mood'),'0');
 results.push({check:'real touch drag and touch cancel keep original mood',passed:true});
 // Scroll with a touch starting outside the portrait; no global scroll lock.
 await page.evaluate(()=>scrollTo(0,0));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:20,y:350}]});
 for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:20,y:350-i*25}]});await page.waitForTimeout(20);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>scrollY>0));results.push({check:'outside portrait touch scrolling',passed:true});
 await page.setViewportSize({width:1440,height:900});await page.locator('canvas').focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('data-phase')==='IDLE');assert.notEqual(await page.locator('canvas').getAttribute('data-mood'),'0');results.push({check:'keyboard pull and release',passed:true});
 const perf=await browser.newPage({viewport:{width:1440,height:900}});await perf.goto(`${origin}/about`);await perf.waitForSelector('canvas[data-ready="true"]');
 const b=await perf.locator('canvas').boundingBox();await perf.mouse.move(b.x+b.width*.55,b.y+b.height*.41);await perf.mouse.down();await perf.mouse.move(b.x+b.width*.85,b.y+b.height*.41,{steps:12});
 const timing=await perf.evaluate(()=>new Promise(resolve=>{const values=[];let last=performance.now();const frame=now=>{values.push(now-last);last=now;if(values.length===60){values.shift();values.sort((a,b)=>a-b);resolve({frames:values.length,meanMs:values.reduce((a,b)=>a+b,0)/values.length,p95Ms:values[Math.floor(values.length*.95)],userAgent:navigator.userAgent});}else requestAnimationFrame(frame);};requestAnimationFrame(frame);}));
 await perf.mouse.up();results.push({check:'active drag rAF timing, software WebGL',...timing});await perf.close();
 await page.goto(`${origin}/work`);await page.waitForTimeout(200);assert.equal(await page.locator('.about-portrait-canvas').count(),0);results.push({check:'route exit removes portrait canvas',passed:true});
 await page.route('**/images/about/faces/face03.webp',route=>route.abort());await page.goto(`${origin}/about`);await page.waitForTimeout(1000);assert.equal(await page.locator('canvas').getAttribute('data-ready'),'false');assert.ok(await page.locator('.about-portrait-still').evaluate(e=>e.complete&&e.naturalWidth>0));results.push({check:'failed texture load preserves static fallback',passed:true});
 await writeFile('/workspace/artifacts/portrait/interaction-checks.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
