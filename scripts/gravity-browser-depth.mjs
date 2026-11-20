import { createRequire } from "node:module";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/opt/codex/cua_node/lib/node_modules/playwright",
);
const [phase, widthArg = "1440", seedArg = "560"] = process.argv.slice(2);
const width = Number(widthArg);
const height = new Map([
  [390, 844],
  [1440, 900],
  [1920, 1080],
]).get(width);
assert(
  ["before", "after"].includes(phase) && height && /^\d+$/.test(seedArg),
  "Usage: node scripts/gravity-browser-depth.mjs before|after 390|1440|1920 seed",
);
const dest = path.resolve(
  process.env.GRAVITY_DEPTH_OUTPUT ||
    "/workspace/artifacts/gravity-heart-depth",
);
const origin = process.env.GRAVITY_ORIGIN || "http://127.0.0.1:3000";
fs.mkdirSync(dest, { recursive: true });
const label = [phase, width, seedArg].join("-");
function summarizeHold(hold) {
  const switches = new Map();
  for (let frame = 1; frame < hold.frames.length; frame++) {
    const earlier = hold.frames[frame - 1];
    const current = hold.frames[frame];
    const previousRank = new Map(
      earlier.drawOrder.map((id, rank) => [id, rank]),
    );
    const rank = new Map(current.drawOrder.map((id, index) => [id, index]));
    for (const [index, first] of current.balls.entries()) {
      for (const second of current.balls.slice(index + 1)) {
        const a = first.id;
        const b = second.id;
        if (![a, b].every((id) => rank.has(id) && previousRank.has(id)))
          continue;
        if (
          rank.get(a) < rank.get(b) ===
          previousRank.get(a) < previousRank.get(b)
        )
          continue;

        const projectedDistance = Math.hypot(
          first.world[0] - second.world[0],
          first.world[1] - second.world[1],
        );
        if (projectedDistance > 0.9 * (first.radius + second.radius)) continue;
        if (
          Math.max(
            Math.abs(first.depth - second.depth),
            Math.abs(earlier.balls[a].depth - earlier.balls[b].depth),
          ) >= 0.035
        )
          continue;
        const pair = a + ":" + b;
        switches.set(pair, (switches.get(pair) ?? 0) + 1);
      }
    }
  }
  return {
    ms: hold.ms,
    frames: hold.frames.length,
    nearSwitches: [...switches.values()].reduce((sum, count) => sum + count, 0),
    repeatedPairs: [...switches]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]),
  };
}
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 0.5,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((seed) => {
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    }, +seedArg);
    await page.goto(origin + "/?gravity-debug=1");
    await page.waitForSelector(".gravity-canvas[data-status=ready]", {
      timeout: 60000,
    });
    const openStudio = async () => {
      const trigger = page.locator(".studio-trigger");
      // This control is hidden at the mobile breakpoint. Invoke the same setting
      // only in the test so headless GPU throughput cannot trigger auto-static.
      if (await trigger.isVisible()) await trigger.click();
      else await trigger.evaluate((button) => button.click());
    };
    await openStudio();
    await page
      .locator("[data-motion=full]")
      .evaluate((button) => button.click());
    await page.keyboard.press("Escape");
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
      const canvas = document.querySelector(".gravity-canvas canvas");
      window.snapshot = () => {
        let result;
        canvas.dispatchEvent(
          new CustomEvent("gravity:inspect", {
            detail: (v) => {
              result = v;
            },
          }),
        );
        return result;
      };
      window.lost = 0;
      canvas.addEventListener("webglcontextlost", () => window.lost++);
    });
    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      frames.push({ data, t: metadata.timestamp });
      void cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 85,
      maxWidth: 960,
      maxHeight: 720,
    });
    const wait = (ms) => page.waitForTimeout(ms);
    const scroll = async (p, delay = 500) => {
      await page.evaluate(
        (v) => scrollTo({ top: v * innerHeight, behavior: "instant" }),
        p,
      );
      await page.waitForFunction(
        (v) =>
          Math.abs(
            Number(
              document.querySelector(".gravity-canvas")?.dataset.progress,
            ) - v,
          ) < 0.005,
        p,
      );
      await wait(delay);
      return Number(
        await page.locator(".gravity-canvas").getAttribute("data-progress"),
      );
    };
    await wait(4000);
    const original = await page.evaluate(() => snapshot());
    const drop = await scroll(1, 3500);
    const heart = await scroll(2.2, 800);
    const holds = [];
    const hold = async (ms) => {
      await page.evaluate(() => {
        window.traceStart = performance.now();
        window.trace = [];
        document.querySelector(".gravity-canvas canvas").dispatchEvent(
          new CustomEvent("gravity:depth", {
            detail: (f) =>
              window.trace.push({
                t: performance.now() - window.traceStart,
                ...f,
              }),
          }),
        );
      });
      await wait(ms);
      holds.push(
        await page.evaluate(() => {
          document
            .querySelector(".gravity-canvas canvas")
            .dispatchEvent(new CustomEvent("gravity:depth"));
          return {
            ms: performance.now() - window.traceStart,
            frames: window.trace,
          };
        }),
      );
    };
    await hold(10500);
    const slow = [];
    for (const p of [2.23, 2.26, 2.29, 2.26, 2.23, 2.2])
      slow.push(await scroll(p, 250));
    const release = await scroll(3.45, 1800);
    const reverseHeart = await scroll(2.2, 1200);
    const reverseHero = await scroll(0, 2500);
    await openStudio();
    await page
      .locator("[data-palette=arcticBlue]")
      .evaluate((button) => button.click());
    await page.keyboard.press("Escape");
    const palette = await page.evaluate(() => snapshot().heroColor);
    await page.mouse.move(0, 0);
    await scroll(1, 1800);
    await scroll(2.2, 1000);
    await hold(10500);
    const beforePointer = await page.evaluate(() => snapshot());
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.down();
    await page.mouse.move(width / 2 + width * 0.1, height / 2 + 15, {
      steps: 5,
    });
    await page.mouse.up();
    await wait(350);
    const afterPointer = await page.evaluate(() => snapshot());
    const travel = beforePointer.positions.reduce(
      (sum, p, i) =>
        sum + Math.hypot(...p.map((v, k) => v - afterPointer.positions[i][k])),
      0,
    );
    await cdp.send("Page.stopScreencast");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        document.querySelector(".gravity-canvas")?.dataset.motionMode ===
        "static-reduced",
    );
    const reducedMotion = await page.evaluate(() => snapshot().meshIds.join());
    const summary = holds.map(summarizeHold);
    const result = {
      summary,
      phase,
      width,
      height,
      seed: +seedArg,
      drop,
      heart,
      slow,
      release,
      reverseHeart,
      reverseHero,
      palette,
      travel,
      holds,
      errors,
      lost: await page.evaluate(() => window.lost),
      continuous: original.meshIds.join() === afterPointer.meshIds.join(),
      sphereAxis: Math.max(
        ...afterPointer.sphereIntegrity.map((s) => s.projectedAxisRatio),
      ),
      total: afterPointer.total,
      videoFrames: frames.length,
    };
    fs.writeFileSync(dest + "/" + label + ".json", JSON.stringify(result));
    if (frames.length > 1) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "heart-video-"));
      const concat = [];
      frames.forEach(({ data, t }, i) => {
        const file = dir + "/" + i + ".jpg";
        fs.writeFileSync(file, Buffer.from(data, "base64"));
        concat.push("file " + file);
        if (i + 1 < frames.length)
          concat.push("duration " + Math.max(0.01, frames[i + 1].t - t));
      });
      concat.push("file " + dir + "/" + (frames.length - 1) + ".jpg");
      fs.writeFileSync(dir + "/list", concat.join("\n"));
      const ff = spawnSync(
        "ffmpeg",
        [
          "-loglevel",
          "error",
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          dir + "/list",
          "-vf",
          "scale=trunc(iw/2)*2:trunc(ih/2)*2",
          "-c:v",
          "libx264",
          "-threads",
          "2",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          dest + "/" + label + ".mp4",
        ],
        { encoding: "utf8" },
      );
      fs.rmSync(dir, { recursive: true });
      if (ff.error || ff.status !== 0) throw ff.error ?? Error(ff.stderr);
    }
    assert.equal(result.lost, 0);
    assert.equal(errors.length, 0, errors.join("\n"));
    assert(
      result.continuous &&
        reducedMotion === original.meshIds.join() &&
        travel > 0.05,
    );
    assert.equal(result.total, width === 390 ? 38 : 66);
    assert(
      result.sphereAxis < 1.0000001 &&
        palette === "#96E5FF" &&
        frames.length >= 10,
    );
    assert(
      holds.every(
        (h) =>
          h.ms >= 10000 &&
          h.frames.length >= 10 &&
          h.frames.every((f) => Math.abs(f.progress - heart) < 0.01),
      ),
    );
    for (const hold of holds) {
      const last = hold.frames.at(-1);
      assert(last.drawOrder.length >= result.total * 0.75);
      assert(last.balls.some((ball) => ball.glass));
      assert(
        last.balls.every(
          (ball) =>
            ball.transparent &&
            ball.depthTest &&
            !ball.depthWrite &&
            ball.opacity === 1,
        ),
      );
      if (phase === "after") {
        const ranks = last.drawOrder.map((id) => last.balls[id].renderOrder);
        assert(ranks.every((rank, index) => rank > (ranks[index - 1] ?? 0)));
      }
    }
    if (phase === "after")
      assert(
        summary.every((hold) => hold.nearSwitches === 0),
        JSON.stringify(summary),
      );
    console.log(JSON.stringify({ ...result, holds: undefined }));
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
