import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Use the cloud's browser tooling without adding an application dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/opt/codex/cua_node/lib/node_modules/playwright");
const label = process.argv[2] || "after";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 0.5 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      let seed = 560;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
    await page.goto("http://localhost:3000/?gravity-debug=1");
    await page.waitForSelector('.gravity-canvas[data-status="ready"]', { state: "attached", timeout: 60000 });
    await page.locator(".studio-trigger").click();
    await page.locator('[data-motion="full"]').click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(6000);
    for (const [mode, progress] of [["hero", 0], ["drop", 1], ["heart", 2.2], ["reverse", 0], ["pointer", 0]]) {
      await page.evaluate(p => window.scrollTo({ top: p * innerHeight, behavior: "instant" }), progress);
      if (mode === "pointer") {
        await page.mouse.move(width * 0.25, 450);
        await page.mouse.down();
        await page.mouse.move(width * 0.75, 400, { steps: 3 });
        await page.mouse.up();
        await page.mouse.move(width + 10, 0);
      }
      await page.waitForTimeout(4000);
      await page.evaluate(() => {
        const canvas = document.querySelector(".gravity-canvas canvas");
        window.__trace = [];
        window.__lost = 0;
        canvas.addEventListener("webglcontextlost", () => window.__lost++);
        canvas.dispatchEvent(new CustomEvent("gravity:trace", { detail: samples => {
          if (window.__trace.length < 180) window.__trace.push(samples);
        } }));
        window.__inspect = () => {
          let value;
          canvas.dispatchEvent(new CustomEvent("gravity:inspect", { detail: snapshot => { value = snapshot; } }));
          return value;
        };
        window.__before = window.__inspect();
        window.__start = performance.now();
      });
      await page.waitForTimeout(10000);
      await page.waitForFunction(() => window.__trace.length >= 180, {}, { timeout: 90000 });
      const data = await page.evaluate(() => {
        document.querySelector(".gravity-canvas canvas").dispatchEvent(new CustomEvent("gravity:trace"));
        return {
          seconds: (performance.now() - window.__start) / 1000,
          trace: window.__trace, before: window.__before, after: window.__inspect(),
          lost: window.__lost, status: document.querySelector(".gravity-canvas").dataset.status,
          motion: document.querySelector(".gravity-canvas").dataset.motionMode,
        };
      });
      if (data.lost || errors.length || data.status !== "ready" || data.motion !== "full") throw new Error(`WebGL failed: ${JSON.stringify({ width, mode, errors, status: data.status, motion: data.motion })}`);
      if (JSON.stringify(data.before.meshIds) !== JSON.stringify(data.after.meshIds) || data.after.entranceCount !== 1) throw new Error("Scene identity or entrance changed");
      results.push({ width, mode, errors: [...errors], ...data });
      await page.screenshot({ path: `/tmp/gravity-${label}-${width}-${mode}.png` });
      console.log(JSON.stringify({ label, width, mode, seconds: data.seconds, steps: data.trace.length, lost: data.lost, motion: data.motion }));
      fs.writeFileSync(`/tmp/browser-${label}.json`, JSON.stringify(results));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
