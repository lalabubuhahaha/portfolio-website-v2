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

function withHeartWorld(width, seed, run) {
  const previousWindow = global.window;
  const previousRandom = Math.random;
  global.window = { innerWidth: width, devicePixelRatio: 1 };
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const world = createGravityWorld({
    clientWidth: width,
    clientHeight: width === 390 ? 844 : width === 1920 ? 1080 : 900,
  }, { setPixelRatio() {}, setSize() {}, render() {} });
  try {
    run(world);
  } finally {
    world.dispose();
    Math.random = previousRandom;
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

test("Heart orders complete silhouettes through depth ties and allows clear crossings", () => {
  withHeartWorld(1440, 36, (world) => {
    const [a, b] = world.balls;
    world.control.progress = 2.2;
    for (const ball of world.balls) ball.position.set(0, 0, -1);
    a.position.z = 0.01;
    b.position.z = 0.02;
    world.render();
    const firstOrder = a.sphere.renderOrder < b.sphere.renderOrder;
    assert.equal(firstOrder, true);
    assert.equal(new Set(world.balls.map(ball => ball.sphere.renderOrder)).size, world.balls.length);

    for (const depth of [0.03, 0.01, 0.04, 0.025, 0.01]) {
      a.position.z = depth;
      world.render();
      assert.equal(a.sphere.renderOrder < b.sphere.renderOrder, firstOrder);
    }

    a.position.z = 0.10;
    world.render();
    assert.ok(a.sphere.renderOrder > b.sphere.renderOrder);
    assert.ok(world.balls.some(ball => ball.isGlass));
    assert.ok(world.balls.every(ball =>
      ball.material.transparent && ball.material.depthTest && !ball.material.depthWrite));

    for (const progress of [3.05, 0]) {
      world.control.progress = progress;
      world.render();
      assert.ok(world.balls.every(ball => ball.sphere.renderOrder === 0));
    }
  });
});

for (const [width, pair] of [[390, [3, 33]], [1440, [24, 57]], [1920, [26, 27]]]) {
  test(`Heart contact crossings at ${width}px do not reverse a near-tied draw pair`, () => {
    withHeartWorld(width, 36, (world) => {
      world.start();
      let t = 0;
      const advance = count => {
        for (let i = 0; i < count; i++) world.simulate(t++ / 60, false);
      };
      advance(260);
      world.control.progress = 1;
      advance(200);
      world.control.progress = 2.2;
      advance(50);
      const [a, b] = pair.map(id => world.balls[id]);
      let depthReversals = 0;
      let previous;
      for (let i = 0; i < 600; i++) {
        advance(1);
        world.render();
        const depth = a.position.z - b.position.z;
        const rank = a.sphere.renderOrder - b.sphere.renderOrder;
        assert.notEqual(rank, 0, "each sphere has a distinct draw rank");
        if (previous && Math.max(Math.abs(depth), Math.abs(previous.depth)) <= 0.045) {
          if (depth * previous.depth < 0) depthReversals++;
          assert.equal(Math.sign(rank), Math.sign(previous.rank));
        }
        previous = { depth, rank };
      }
      assert.ok(depthReversals >= 2, "the seeded contact actually crosses in depth");
    });
  });
}
