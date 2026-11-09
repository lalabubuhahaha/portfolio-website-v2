import { test } from "node:test";
import assert from "node:assert/strict";
import { createGravityWorld } from "../.next/gravity-test/gravity-world.js";

test("Gravity Hero uses physical spheres, converges, and responds to the pointer", () => {
  global.window = { innerWidth: 1440, devicePixelRatio: 3 };
  const renderer = {
    setPixelRatio(value) {
      assert.equal(value, 2);
    },
    setSize() {},
    shadowMap: {},
    render() {},
  };
  const world = createGravityWorld(
    { clientWidth: 1440, clientHeight: 599 },
    renderer,
  );
  try {
    assert.equal(world.balls.length, 96);
    assert.equal(world.camera.fov, 38);
    assert.equal(world.camera.position.z, 11);
    assert.equal(world.balls[0].sphere.geometry.parameters.widthSegments, 48);
    for (const ball of world.balls) {
      assert.equal(ball.mass, ball.radius ** 3);
      assert.ok(ball.radius >= 0.27 && ball.radius <= 0.87);
      if (ball.isGlass) {
        assert.equal(ball.material.transmission, 0.95);
        assert.equal(ball.material.ior, 1.485);
      } else assert.equal(ball.material.roughness, 0.44);
    }
    const meanDistance = () =>
      world.balls.reduce((sum, ball) => sum + ball.position.length(), 0) /
      world.balls.length;
    world.start();
    world.scatterFar(true);
    const scattered = meanDistance();
    for (let i = 0; i < 360; i++) world.simulate(i / 60, false);
    assert.ok(meanDistance() < scattered * 0.4);
    assert.ok(
      world.balls.every((ball) => Number.isFinite(ball.position.length())),
    );
    const snapshot = world.balls.map((ball) => ({
      position: ball.position.clone(),
      velocity: ball.velocity.clone(),
    }));
    const restore = () =>
      world.balls.forEach((ball, index) => {
        ball.position.copy(snapshot[index].position);
        ball.velocity.copy(snapshot[index].velocity);
      });
    world.simulate(6, false);
    const baseline = world.balls.map((ball) => ball.velocity.clone());
    restore();
    world.mousePos.active = true;
    world.mousePos.x = 0;
    world.mousePos.y = 0;
    world.simulate(6);
    const impulse = world.balls.reduce(
      (sum, ball, index) => sum + ball.velocity.distanceTo(baseline[index]),
      0,
    );
    assert.ok(impulse > 0.1);
  } finally {
    world.dispose();
  }
  window.innerWidth = 390;
  const mobile = createGravityWorld(
    { clientWidth: 390, clientHeight: 400 },
    renderer,
  );
  try {
    assert.equal(mobile.balls.length, 54);
  } finally {
    mobile.dispose();
    delete global.window;
  }
});

for (const width of [1440, 390]) {
  test(`four-mode physical story and reverse recovery at ${width}px`, () => {
    global.window = { innerWidth: width, devicePixelRatio: 1 };
    const container = { clientWidth: width, clientHeight: 900 };
    const world = createGravityWorld(container, {
      setPixelRatio() {},
      setSize() {},
      shadowMap: {},
      render() {},
    });
    const identities = world.balls.map((ball) => [
      ball,
      ball.material,
      ball.sphere.geometry,
    ]);
    let time = 0;
    const advance = (progress, steps) => {
      world.control.progress = progress;
      for (let i = 0; i < steps; i++) {
        time += 1 / 60;
        world.simulate(time, false);
      }
      assert.ok(
        world.balls.every((ball) => Number.isFinite(ball.position.length())),
      );
    };
    const meanY = () =>
      world.balls.reduce((sum, ball) => sum + ball.position.y, 0) /
      world.balls.length;
    const targetError = () =>
      world.balls.reduce(
        (sum, ball) => sum + ball.position.distanceTo(ball.shapeTarget),
        0,
      ) / world.balls.length;
    try {
      world.start();
      advance(0, 360);
      const heroY = meanY();
      advance(1, 240);
      assert.ok(meanY() < heroY - 1, `drop mean ${meanY()} from ${heroY}`);
      const colorAtDrop = world.balls[0].material.color.clone();
      const beforeHeart = targetError();
      advance(2.2, 360);
      assert.ok(
        targetError() < beforeHeart * 0.2,
        `heart target error ${targetError()}`,
      );
      assert.ok(world.balls.every((ball) => ball.visualScale < ball.radius));
      assert.ok(
        ["r", "g", "b"].reduce(
          (sum, key) =>
            sum + (colorAtDrop[key] - world.balls[0].material.color[key]) ** 2,
          0,
        ) > 0.01,
      );
      // Reconstruct normalized rejection-sampled points and validate the actual implicit silhouette.
      const height = 2 * Math.tan((38 * Math.PI) / 360) * 11;
      const S = Math.min(
        height * (width / container.clientHeight) * 0.3,
        height * 0.27,
      );
      for (const ball of world.balls) {
        const x = ball.shapeTarget.x / S;
        const y = (ball.shapeTarget.y + height * 0.03) / S - 0.12;
        assert.ok((x * x + y * y - 1) ** 3 - x * x * y * y * y <= 1e-9);
      }
      advance(3.45, 360);
      assert.ok(world.balls.every((ball) => ball.material.opacity === 0));
      assert.ok(
        world.balls.every((ball) => ball.position.z > world.camera.position.z),
      );
      advance(3.45, 3600); // A long release remains finite rather than overflowing invisible coordinates.
      const beforeRecovery = targetError();
      advance(2.2, 600);
      assert.ok(
        targetError() < beforeRecovery * 0.1,
        `reverse heart target error ${targetError()}`,
      );
      assert.ok(world.balls.every((ball) => ball.material.opacity === 1));
      advance(1, 240);
      advance(0, 600);
      assert.ok(Math.abs(meanY()) < 1);
      assert.ok(
        world.balls.every((ball) => Math.abs(ball.position.z) <= 2.001),
      );
      const targets = world.balls.map((ball) => ball.shapeTarget.clone());
      container.clientWidth += 50;
      world.resize();
      assert.ok(
        world.balls.some(
          (ball, index) => ball.shapeTarget.distanceTo(targets[index]) > 0.01,
        ),
      );
      world.balls.forEach((ball, index) => {
        assert.equal(ball, identities[index][0]);
        assert.equal(ball.material, identities[index][1]);
        assert.equal(ball.sphere.geometry, identities[index][2]);
      });
    } finally {
      world.dispose();
      delete global.window;
    }
  });
}

test("drop floor rebounds a falling sphere with the specified restitution", () => {
  global.window = { innerWidth: 1440, devicePixelRatio: 1 };
  const world = createGravityWorld(
    { clientWidth: 1440, clientHeight: 900 },
    { setPixelRatio() {}, setSize() {}, shadowMap: {}, render() {} },
  );
  try {
    world.start();
    world.simulate(0, false);
    world.control.progress = 1;
    for (const ball of world.balls) {
      ball.position.set(1000, 1000, 0);
      ball.velocity.set(0, 0, 0);
    }
    const ball = world.balls[0];
    const floor = -(2 * Math.tan((38 * Math.PI) / 360) * 11) / 2 + 0.05;
    ball.position.set(0, floor + ball.radius - 0.01, 0);
    ball.velocity.set(0, -0.2, 0);
    world.simulate(3, false);
    assert.ok(Math.abs(ball.position.y - floor - ball.radius) < 1e-9);
    assert.ok(Math.abs(ball.velocity.y - (0.2 + 0.011) * 0.992 * 0.65) < 1e-9);
  } finally {
    world.dispose();
    delete global.window;
  }
});

test("scroll framing keeps canvas, camera, solver bounds and meshes stable", () => {
  for (const width of [1440, 390]) {
    global.window = { innerWidth: width, devicePixelRatio: 1 };
    const container = {
      clientWidth: width,
      clientHeight: width === 1440 ? 900 : 844,
    };
    let sizeWrites = 0;
    const world = createGravityWorld(container, {
      setPixelRatio() {},
      setSize() {
        sizeWrites++;
      },
      shadowMap: {},
      render() {},
    });
    try {
      world.start();
      let time = 0;
      for (let i = 0; i < 360; i++) {
        time += 1 / 60;
        world.simulate(time, false);
      }
      const aspect = world.camera.aspect;
      const identities = world.balls.map((ball) => ball.sphere);
      const bounds = world.inspect().frustum;
      const targets = world.balls.map((ball) => ball.shapeTarget.clone());
      const initialWrites = sizeWrites;
      for (const progress of [
        0, 0.25, 0.4, 0.55, 0.7, 0.85, 1, 1.25, 1.5, 2, 2.5, 3, 3.45, 2, 1, 0.7,
        0.4, 0,
      ]) {
        world.control.progress = progress;
        for (let i = 0; i < 60; i++) {
          time += 1 / 60;
          world.simulate(time, false);
        }
        world.render();
        assert.equal(world.resize(), false);
        assert.equal(sizeWrites, initialWrites);
        assert.equal(world.camera.aspect, aspect);
        assert.deepEqual(world.inspect().frustum, bounds);
        assert.equal(world.inspect().entranceCount, 1);
        world.balls.forEach((ball, index) => {
          assert.equal(ball.sphere, identities[index]);
          assert.ok(ball.shapeTarget.equals(targets[index]));
        });
        if (progress < 2.7) assert.ok(world.inspect().estimatedVisible > 0);
      }
      assert.equal(world.inspect().opacity.min, 1);
      container.clientHeight += 50;
      assert.equal(world.resize(), true);
      assert.equal(world.resize(), false);
      assert.equal(
        world.camera.aspect,
        container.clientWidth / container.clientHeight,
      );
      assert.equal(world.inspect().entranceCount, 1);
    } finally {
      world.dispose();
      delete global.window;
    }
  }
});
