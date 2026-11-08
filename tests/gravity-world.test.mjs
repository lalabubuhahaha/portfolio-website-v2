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
