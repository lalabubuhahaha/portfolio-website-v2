import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createGravityWorld } from "../.next/gravity-test/gravity-world.js";

// IDs selected from the unmodified solver's worst 180-step traces.
const referenceIds = {
  1440: { hero: 21, drop: 18, heart: 32 },
  390: { hero: 7, drop: 27, heart: 16 },
};
export function summarizeFrames(frames) {
  return frames[0].map((ball, id) => {
    let reversals = 0, travel = 0, maxDelta = 0, speed = 0, maxVelocityDelta = 0;
    const min = [...ball.position], max = [...ball.position];
    let previousDelta;
    for (let t = 1; t < frames.length; t++) {
      const delta = frames[t][id].position.map((v, axis) => v - frames[t - 1][id].position[axis]);
      const distance = Math.hypot(...delta);
      frames[t][id].position.forEach((value, axis) => { min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); });
      maxVelocityDelta = Math.max(maxVelocityDelta, Math.hypot(...frames[t][id].velocity.map((v, axis) => v - frames[t - 1][id].velocity[axis])));
      travel += distance;
      maxDelta = Math.max(maxDelta, distance);
      speed += Math.hypot(...frames[t][id].velocity);
      // Ignore numerical noise; count full 3D direction reversals, not slow turns.
      if (previousDelta && delta.reduce((sum, v, axis) => sum + v * previousDelta[axis], 0) < -1e-10) reversals++;
      previousDelta = delta;
    }
    return {
      id, reversals, travel, maxDelta, extent: Math.hypot(...max.map((v, axis) => v - min[axis])), maxVelocityDelta, meanSpeed: speed / (frames.length - 1),
      contacts: frames.reduce((sum, frame) => sum + frame[id].collisions, 0),
      boundarySteps: frames.filter(frame => frame[id].boundary).length,
    };
  }).sort((a, b) => b.reversals - a.reversals);
}
export function measureStability(width, mode, initialSeed = 560) {
  let seed = initialSeed;
  const originalRandom = Math.random;
  const originalWindow = global.window;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  global.window = { innerWidth: width, devicePixelRatio: 1 };
  const world = createGravityWorld({ clientWidth: width, clientHeight: 900 }, {
    setPixelRatio() {}, setSize() {}, shadowMap: {}, render() {},
  });
  try {
    world.start();
    let step = 0;
    const advance = n => { for (let i = 0; i < n; i++) world.simulate(step++ / 60, false); };
    advance(600);
    world.control.progress = mode === "hero" ? 0 : mode === "drop" ? 1 : 2.2;
    advance(1200);
    const frames = [];
    world.observeSteps(samples => frames.push(samples));
    advance(180);
    world.observeSteps();
    const stats = summarizeFrames(frames);
    const beforeInteraction = world.balls.map(b => b.position.clone());
    world.mousePos.active = true;
    world.mousePos.x = 0;
    world.mousePos.y = 0;
    world.mousePos.isDown = true;
    for (let i = 0; i < 30; i++) world.simulate(step++ / 60);
    const pointerTravel = world.balls.reduce((sum, b, id) => sum + b.position.distanceTo(beforeInteraction[id]), 0);
    world.mousePos.active = false;
    world.control.progress = mode === "hero" ? 1 : 0;
    advance(180);
    const transitionTravel = world.balls.reduce((sum, b, id) => sum + b.position.distanceTo(beforeInteraction[id]), 0);
    return {
      width, mode, jitterCount: stats.filter(s => s.reversals > 30).length,
      pointerTravel, transitionTravel, stats,
      trace: frames.map(frame => frame[stats[0].id]),
      referenceTrace: frames.map(frame => frame[referenceIds[width][mode]]),
    };
  } finally {
    world.dispose();
    Math.random = originalRandom;
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = [1440, 390].flatMap(width => ["hero", "drop", "heart"].map(mode => measureStability(width, mode)));
  fs.writeFileSync(process.argv[2], JSON.stringify(result));
  console.log(JSON.stringify(result.map(row => ({ width: row.width, mode: row.mode, jitterCount: row.jitterCount, pointerTravel: row.pointerTravel, transitionTravel: row.transitionTravel, worst: row.stats[0] })), null, 2));
}
