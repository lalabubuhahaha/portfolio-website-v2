import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/cua_node/lib/node_modules/playwright');
const output = process.env.PORTRAIT_OUTPUT || '/workspace/artifacts/portrait';
const origin = process.env.PORTRAIT_ORIGIN || 'http://localhost:3000';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = []; const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: output, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
 await page.goto(`${origin}/about?rec`);
 await page.waitForFunction(() => !!window.__sim, { timeout: 30000 });
 await page.screenshot({ path: `${output}/desktop.png` });
 assert.equal(await page.locator('canvas[data-ready="true"]').count(), 1);
 const loaded = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /faces\/face\d+\.webp/.test(r.name)).length);
 assert.ok(loaded >= 11); results.push({ check: 'all eleven textures preloaded', passed: true });
 const advance = async (frames) => { for (let i=0;i<frames;i++) { await page.evaluate(() => window.__sim.step(1/60)); await page.waitForTimeout(1000/60); } };
 await advance(30);
 for (const [index, end] of [[0,[.92,.59]],[1,[.55,.94]],[2,[.22,.28]]]) {
  await page.evaluate(() => window.__sim.down(.55,.59));
  for(let i=1;i<=24;i++) { await page.evaluate(({end,i})=>{window.__sim.move(.55+(end[0]-.55)*i/24,.59+(end[1]-.59)*i/24);window.__sim.step(1/60);},{end,i});await page.waitForTimeout(1000/60); }
  await advance(12); assert.ok((await page.evaluate(()=>window.__sim.state())).blend>.95);
  await page.screenshot({path:`${output}/stretch-${index}.png`});
  await page.evaluate(()=>window.__sim.up()); await advance(50);
  const state=await page.evaluate(()=>window.__sim.state());assert.equal(state.phase,'IDLE');assert.notEqual(state.mood,0);
  results.push({check:`scripted pull ${index}`,state}); await advance(15);
 }
 // Real browser pointer events, independent of injected simulation input.
 await page.goto(`${origin}/about`); await page.waitForSelector('canvas[data-ready="true"]');
 const box=await page.locator('.about-portrait-canvas').boundingBox();
 for(const [dx,dy] of [[.3,0],[0,-.3],[-.27,.15]]) {
  const x=box.x+box.width*.55,y=box.y+box.height*.41;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+box.width*dx,y+box.height*dy,{steps:18});await page.waitForTimeout(150);
  assert.equal(await page.locator('canvas').getAttribute('data-phase'),'GRIMACE');await page.mouse.up();await page.waitForFunction(()=>document.querySelector('.about-portrait-canvas')?.getAttribute('data-phase')==='IDLE',{timeout:10000});
 }
 results.push({check:'three real pointer drags and releases',passed:true});
 await page.getByRole('button',{name:'Reset portrait'}).click();assert.equal(await page.locator('canvas').getAttribute('data-mood'),'0');
 await page.goto(`${origin}/about?rec`);await page.waitForFunction(()=>!!window.__sim && document.querySelector('.about-portrait-canvas')?.getAttribute('data-ready')==='true');await page.waitForTimeout(200);
 await page.evaluate(()=>window.__sim.loseContext());await page.waitForSelector('canvas[data-ready="false"]');
 await page.waitForTimeout(300);await page.evaluate(()=>window.__sim.restoreContext());await page.waitForSelector('canvas[data-ready="true"]');
 results.push({check:'actual WebGL context loss and recovery',passed:true});
 for(const [width,height] of [[390,844],[768,1024],[1024,768],[1440,900],[1920,1080],[2560,1440]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/layout-${width}.png`});results.push({check:`layout ${width}x${height}`,passed:true});
 }
 const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await reduced.goto(`${origin}/about?rec`);await reduced.waitForFunction(()=>!!window.__sim);
 await reduced.evaluate(()=>{window.__sim.down(.55,.59);window.__sim.move(.95,.59);for(let i=0;i<30;i++)window.__sim.step(1/60);window.__sim.up();});
 for(let i=0;i<60;i++){const state=await reduced.evaluate(()=>{window.__sim.step(1/60);return window.__sim.state()});assert.ok(state.displacement.x>=0);}
 assert.equal(await reduced.evaluate(()=>window.__sim.state().phase),'IDLE');await reduced.close();results.push({check:'reduced motion without overshoot',passed:true});
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});await fallback.goto(`${origin}/about`);await fallback.waitForTimeout(1500);assert.equal(await fallback.locator('canvas').getAttribute('data-ready'),'false');assert.ok(await fallback.getByRole('heading',{name:'About Lala.'}).isVisible());assert.ok(await fallback.locator('.about-portrait-still').evaluate(e=>e.complete&&e.naturalWidth>0));await fallback.close();results.push({check:'no WebGL static fallback',passed:true});
 await page.goto(`${origin}/`);await page.waitForTimeout(1500);assert.equal(await page.locator('.about-portrait-canvas').count(),0);results.push({check:'home has no portrait renderer',passed:true});
 await writeFile(`${output}/browser-results.json`,JSON.stringify({results,errors},null,2));
 console.log(JSON.stringify({results,errors},null,2));
} finally { const video=page.video();await context.close();if(video)await video.saveAs(`${output}/portrait-interaction.webm`);await browser.close(); }
