import { test } from "node:test";
import assert from "node:assert/strict";
import { createGravityWorld } from "../.next/gravity-test/gravity-world.js";
import { measureStability } from "../scripts/gravity-stability-metrics.mjs";

for (const width of [1440, 390]) {
  for (const mode of ["hero", "drop", "heart"]) {
    test(`settled ${mode} at ${width}px avoids repeated contact reversals without sleeping`, () => {
      const result = measureStability(width, mode);
      assert.equal(result.trace.length, 180);
      assert.equal(result.jitterCount, 0, JSON.stringify(result.stats.slice(0, 3)));
      if (mode === "hero") {
        assert.ok(result.stats.some(s => s.travel > 0.01), "slow drift must remain");
      }
      if (mode === "heart") {
        assert.ok(result.stats.every(s => s.maxDelta < 0.0001), "heart must settle");
      }
    });
  }
}

test("settled contacts respond immediately to pointer force and mode changes", () => {
  for (const width of [1440, 390]) {
    for (const mode of ["hero", "drop", "heart"]) {
      const result = measureStability(width, mode);
      assert.ok(result.pointerTravel > 0.1, `${width} ${mode} pointer wake: ${result.pointerTravel}`);
      assert.ok(result.transitionTravel > 1, `${width} ${mode} mode transition: ${result.transitionTravel}`);
    }
  }
});

test("repeated presentation renders cannot move physical or projected sphere centers", () => {
  const previousWindow = global.window;
  global.window = { innerWidth: 1440, devicePixelRatio: 1 };
  const world = createGravityWorld({ clientWidth: 1440, clientHeight: 900 }, {
    setPixelRatio() {}, setSize() {}, shadowMap: {}, render() {},
  });
  try {
    world.start();
    for (let i = 0; i < 600; i++) world.simulate(i / 60, false);
    world.render();
    const before = world.inspect();
    for (let i = 0; i < 180; i++) world.render();
    const after = world.inspect();
    assert.deepEqual(after.positions, before.positions);
    assert.deepEqual(after.velocities, before.velocities);
    assert.deepEqual(after.projectedSpheres, before.projectedSpheres);
    assert.deepEqual(after.meshIds, before.meshIds);
    assert.equal(after.entranceCount, 1);
  } finally {
    world.dispose();
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});
