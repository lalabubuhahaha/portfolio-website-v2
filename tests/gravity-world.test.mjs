import { test } from "node:test";
import assert from "node:assert/strict";
import { createGravityWorld } from "../.next/gravity-test/gravity-world.js";
const cameraAspect = camera => (camera.right - camera.left) / (camera.top - camera.bottom);

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
    assert.equal(world.camera.isOrthographicCamera, true);
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
      const aspect = cameraAspect(world.camera);
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
        assert.equal(cameraAspect(world.camera), aspect);
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
      assert.ok(Math.abs(cameraAspect(world.camera) - container.clientWidth / container.clientHeight) < 1e-12);
      assert.equal(world.inspect().entranceCount, 1);
    } finally {
      world.dispose();
      delete global.window;
    }
  }
});

test("palette updates retain meshes, materials, motion, targets, opacity and Stage 2.1 coordinates", () => {
  global.window = { innerWidth: 1440, devicePixelRatio: 1 };
  let writes = 0;
  const world = createGravityWorld(
    { clientWidth: 1440, clientHeight: 900 },
    {
      setPixelRatio() {},
      setSize() {
        writes++;
      },
      shadowMap: {},
      render() {},
    },
  );
  const colors = ["#2F69FF", "#FFC5C2", "#E1FC03", "#96E5FF"];
  const roles = {
    "#2F69FF": {
      pastel: "ecefff",
      light: "a8c1ff",
      medium: "2f69ff",
      deep: "0a33bf",
      glass: "4d80ff",
    },
    "#FFC5C2": {
      pastel: "fff5f4",
      light: "ffeceb",
      medium: "ffa6b3",
      deep: "ff4d6d",
      glass: "ffa6b3",
    },
    "#E1FC03": {
      pastel: "fbffe2",
      light: "effe69",
      medium: "e1fc03",
      deep: "b1e200",
      glass: "dcff32",
    },
    "#96E5FF": {
      pastel: "f0f9ff",
      light: "c9f1ff",
      medium: "96e5ff",
      deep: "2ba5ff",
      glass: "98e4ff",
    },
  };
  const original = world.balls.map((b) => ({
    mesh: b.sphere,
    material: b.material,
    geometry: b.sphere.geometry,
    target: b.shapeTarget.toArray(),
  }));
  const state = () =>
    world.balls.map((b) => ({
      position: b.position.toArray(),
      velocity: b.velocity.toArray(),
      rotation: b.meshGroup.quaternion.toArray(),
      opacity: b.material.opacity,
    }));
  try {
    world.start();
    let time = 0;
    const initialWrites = writes;
    for (const progress of [0, 0.55, 1.1, 2.2, 3.45, 2.2, 0]) {
      world.control.progress = progress;
      for (let n = 0; n < 180; n++) {
        time += 1 / 60;
        world.simulate(time, false);
      }
      world.render(); // Establish the canonical rendered rotation before color-only updates.
      const before = state();
      for (let repeat = 0; repeat < 4; repeat++)
        for (const color of colors) {
          world.setHeroColor(color);
          world.render();
          assert.deepEqual(state(), before);
          assert.equal(writes, initialWrites);
          assert.equal(world.resize(), false);
          assert.equal(world.inspect().entranceCount, 1);
          world.balls.forEach((b, i) => {
            assert.equal(b.sphere, original[i].mesh);
            assert.equal(b.material, original[i].material);
            assert.equal(b.sphere.geometry, original[i].geometry);
            assert.deepEqual(b.shapeTarget.toArray(), original[i].target);
            if (progress === 0)
              assert.equal(
                b.material.color.getHexString(),
                roles[color][b.role],
              );
            if (progress === 1.1)
              assert.equal(
                b.material.color.getHexString(),
                roles["#E1FC03"][b.role],
              );
            if (progress === 2.2 || progress === 3.45)
              assert.equal(
                b.material.color.getHexString(),
                roles["#FFC5C2"][b.role],
              );
            if (b.isGlass) {
              assert.equal(b.material.roughness, 0.08);
              assert.equal(b.material.clearcoat, 1);
              assert.equal(b.material.clearcoatRoughness, 0.03);
              assert.equal(b.material.transmission, 0.95);
              assert.equal(b.material.ior, 1.485);
              assert.equal(b.material.thickness, 2.2);
              assert.equal(b.material.emissiveIntensity, 0.12);
            } else {
              assert.equal(b.material.roughness, 0.44);
              assert.equal(b.material.clearcoat, 0.24);
              assert.equal(b.material.clearcoatRoughness, 0.35);
              assert.equal(b.material.emissiveIntensity, 0.08);
            }
          });
        }
    }
  } finally {
    world.dispose();
    delete global.window;
  }
});

test("pointer-down, flick momentum and speed cap use the original forces", () => {
  global.window = { innerWidth: 1440, devicePixelRatio: 1 };
  const world = createGravityWorld(
    { clientWidth: 1440, clientHeight: 900 },
    { setPixelRatio() {}, setSize() {}, shadowMap: {}, render() {} },
  );
  try {
    world.start();
    world.simulate(0, false);
    const restore = () =>
      world.balls.forEach((b, i) => {
        b.position.set(i === 0 ? 1 : 100 + i * 3, 0, 0);
        b.velocity.set(0, 0, 0);
        b.meshGroup.position.copy(b.position);
      });
    restore();
    world.render();
    const cursorAt = (physicalX) => {
      const frame = world.inspect().presentation;
      const p = world.balls[0].position
        .clone()
        .set(physicalX * frame.scale * frame.horizontalSpread, frame.offsetY, 0)
        .project(world.camera);
      world.mousePos.x = p.x;
      world.mousePos.y = p.y;
    };
    const measure = (oldX, down, active) => {
      restore();
      cursorAt(oldX);
      world.mousePos.active = false;
      world.mousePos.isDown = false;
      world.simulate(0.1, true);
      restore();
      cursorAt(0);
      world.mousePos.active = active;
      world.mousePos.isDown = down;
      world.simulate(0.1, true);
      return world.balls[0].velocity.x;
    };
    const base = measure(0, false, false),
      normal = measure(0, false, true) - base,
      down = measure(0, true, true) - base,
      flick = measure(-4, false, true) - base,
      capped = measure(-100, false, true) - base;
    assert.ok(normal > 0);
    assert.ok(down > normal * 1.7);
    assert.ok(flick > normal * 5);
    assert.ok(Math.abs(capped - flick) < 1e-8);
  } finally {
    world.dispose();
    delete global.window;
  }
});

test("pairwise correction uses mass, reduces overlap, preserves momentum and rotates meshes", () => {
  global.window = { innerWidth: 1440, devicePixelRatio: 1 };
  const world = createGravityWorld(
    { clientWidth: 1440, clientHeight: 900 },
    { setPixelRatio() {}, setSize() {}, shadowMap: {}, render() {} },
  );
  try {
    world.start();
    world.simulate(0, false);
    world.control.progress = 1;
    world.balls.forEach((b, i) => {
      b.position.set(100 + i * 3, 0, 0);
      b.velocity.set(0, 0, 0);
      b.meshGroup.position.copy(b.position);
    });
    const [a, b] = world.balls;
    a.radius = a.visualScale = 0.4;
    a.mass = 0.4 ** 3;
    a.position.set(-0.2, 0, 0);
    a.meshGroup.position.copy(a.position);
    a.velocity.set(0.1, 0, 0);
    b.radius = b.visualScale = 0.8;
    b.mass = 0.8 ** 3;
    b.position.set(0.2, 0, 0);
    b.meshGroup.position.copy(b.position);
    b.velocity.set(-0.1, 0, 0);
    const overlap =
        a.visualScale + b.visualScale - a.position.distanceTo(b.position),
      momentum = a.mass * a.velocity.x + b.mass * b.velocity.x,
      q = a.meshGroup.quaternion.clone();
    world.simulate(3, false);
    assert.ok(
      a.visualScale + b.visualScale - a.position.distanceTo(b.position) <
        overlap,
    );
    assert.ok(b.velocity.x - a.velocity.x > 0);
    assert.ok(
      Math.abs(
        a.mass * a.velocity.x + b.mass * b.velocity.x - momentum * 0.992,
      ) < 1e-10,
    );
    assert.ok(!a.meshGroup.quaternion.equals(q));
  } finally {
    world.dispose();
    delete global.window;
  }
});

test("Hero presentation resizes continuously and maps off-center pointer coordinates back to physics", () => {
  global.window = { innerWidth: 1708, devicePixelRatio: 1 };
  const container = { clientWidth: 1708, clientHeight: 900 };
  let sizeWrites = 0;
  const world = createGravityWorld(container, {
    setPixelRatio() {}, setSize() { sizeWrites++; }, shadowMap: {}, render() {},
  });
  try {
    world.start();
    world.simulate(0, false);
    const identities = world.balls.map(b => b.sphere);
    const reset = () => world.balls.forEach((b, i) => {
      b.position.set(i === 0 ? 1 : 100 + i * 3, 0, 0);
      b.velocity.set(0, 0, 0);
      b.meshGroup.position.copy(b.position);
    });
    const impulse = (physicalX, active) => {
      reset(); world.render();
      const frame = world.inspect().presentation;
      const point = world.balls[0].position.clone()
        .set(physicalX * frame.scale * frame.horizontalSpread, frame.offsetY, 0)
        .project(world.camera);
      // Warm the pointer history at exactly the same point, removing flick momentum.
      world.mousePos.x = point.x; world.mousePos.y = point.y;
      world.mousePos.active = active;
      world.simulate(10);
      reset(); world.simulate(10);
      return world.balls[0].velocity.x;
    };
    const base = impulse(1, false);
    assert.ok(Math.abs(impulse(1, true) - base) < 1e-8);
    const right = impulse(0.7, true) - base;
    const left = impulse(1.3, true) - base;
    assert.ok(right > 0 && left < 0);
    assert.ok(Math.abs(right + left) < 1e-8);
    // Real resizes retain the same meshes; responsive transitions have no step.
    for (const boundary of [640, 768, 1024, 1440]) {
      const frames = [];
      for (const width of [boundary - 1, boundary, boundary + 1]) {
        container.clientWidth = width;
        world.resize(); world.render();
        frames.push(world.inspect().presentation);
        world.balls.forEach((b,i) => assert.equal(b.sphere, identities[i]));
      }
      assert.ok(Math.abs(frames[2].scale - frames[0].scale) < 0.005);
      assert.ok(Math.abs(frames[2].horizontalSpread - frames[0].horizontalSpread) < 0.01);
    }
    const writes = sizeWrites;
    for (const progress of [0.3, 0.31, 0.55, 0.79, 0.8, 1, 2.2, 3.45, 0]) {
      world.control.progress = progress; world.render();
      assert.equal(sizeWrites, writes);
      assert.equal(world.camera.isOrthographicCamera, true);
      assert.equal(world.camera.position.z, 11);
      if (progress >= 0.8) {
        assert.equal(world.inspect().presentation.scale, 1);
        assert.equal(world.inspect().presentation.horizontalSpread, 1);
      }
    }
  } finally { world.dispose(); delete global.window; }
});

test("a scalar sphere still has an oval off-axis perspective contour", async () => {
  const THREE = await import("three");
  const camera = new THREE.PerspectiveCamera(38, 1708 / 900, 0.1, 100);
  camera.updateMatrixWorld(true);
  const center = new THREE.Vector3(5, 2, -10), radius = 0.8;
  const normal = center.clone().normalize();
  const u = normal.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  const v = normal.clone().cross(u).normalize();
  const tangentCenter = center.clone().multiplyScalar(1 - radius ** 2 / center.lengthSq());
  const tangentRadius = radius * Math.sqrt(1 - radius ** 2 / center.lengthSq());
  const radial = new THREE.Vector2(center.x, center.y).normalize();
  const perpendicular = new THREE.Vector2(-radial.y, radial.x);
  const major = [], minor = [];
  for (let i = 0; i < 720; i++) {
    const angle = i * Math.PI / 360;
    const ndc = tangentCenter.clone()
      .addScaledVector(u, Math.cos(angle) * tangentRadius)
      .addScaledVector(v, Math.sin(angle) * tangentRadius).project(camera);
    const point = new THREE.Vector2(ndc.x * 1708 / 2, ndc.y * 900 / 2);
    major.push(point.dot(radial)); minor.push(point.dot(perpendicular));
  }
  const ratio = (Math.max(...major) - Math.min(...major)) /
    (Math.max(...minor) - Math.min(...minor));
  assert.ok(ratio > 1.1, "uniform scale alone cannot correct perspective silhouette distortion");
});

test("every sphere stays uniformly scaled with circular projected contours across all stages and resizes", async () => {
  const THREE = await import("three");
  for (const [width, height] of [[1440,900],[1708,900],[1920,1080],[2560,1440],[390,844]]) {
    global.window = { innerWidth: width, devicePixelRatio: 1 };
    const container = { clientWidth: width, clientHeight: height };
    let writes = 0;
    const world = createGravityWorld(container, {
      setPixelRatio() {}, setSize() { writes++; }, shadowMap: {}, render() {},
    });
    try {
      assert.equal(world.camera.isOrthographicCamera, true);
      world.start(); let time = 0;
      const meshes = world.balls.map(b => b.sphere), initialWrites = writes;
      const check = () => {
        world.render(); const info = world.inspect();
        assert.equal(info.entranceCount, 1);
        for (const [i, ball] of world.balls.entries()) {
          assert.equal(ball.sphere, meshes[i]);
          assert.equal(ball.sphere.geometry.type, "SphereGeometry");
          for (const node of [ball.sphere, ball.meshGroup, ball.displayAnchor, ball.displayAnchor.parent]) {
            assert.equal(node.scale.x, node.scale.y);
            assert.equal(node.scale.y, node.scale.z);
            assert.ok(node.scale.x > 0 && Number.isFinite(node.scale.x));
          }
          const scale = ball.sphere.getWorldScale(new THREE.Vector3());
          assert.ok(Math.abs(scale.x - scale.y) < 1e-10 && Math.abs(scale.y - scale.z) < 1e-10, JSON.stringify({width, progress:world.control.progress,id:ball.id,scale:scale.toArray(),quaternionLength:ball.meshGroup.quaternion.length()}));
          assert.ok(Math.abs(info.sphereIntegrity[i].projectedAxisRatio - 1) < 1e-10);
          if (ball.material.opacity < 0.01) continue;
          // Independently project the world-space sphere's silhouette circle.
          const center = ball.sphere.getWorldPosition(new THREE.Vector3());
          assert.ok(center.z + scale.x < world.camera.position.z - world.camera.near);
          assert.ok(center.z - scale.x > world.camera.position.z - world.camera.far);
          const projectedCenter = center.clone().project(world.camera);
          const distances = [];
          for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
            const p = center.clone().add(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(scale.x)).project(world.camera);
            distances.push(Math.hypot((p.x - projectedCenter.x) * container.clientWidth / 2, (p.y - projectedCenter.y) * container.clientHeight / 2));
          }
          assert.ok(Math.max(...distances) / Math.min(...distances) - 1 < 1e-7);
        }
      };
      for (const progress of [0,0.55,1,2.2,3,3.45,2.2,0]) {
        world.control.progress = progress;
        for (let i = 0; i < 120; i++) { time += 1 / 60; world.simulate(time, false); }
        check(); assert.equal(writes, initialWrites);
      }
      container.clientWidth += 100; container.clientHeight += 40;
      assert.equal(world.resize(), true); check();
      assert.ok(Math.abs(cameraAspect(world.camera) - container.clientWidth / container.clientHeight) < 1e-12);
    } finally { world.dispose(); delete global.window; }
  }
});
