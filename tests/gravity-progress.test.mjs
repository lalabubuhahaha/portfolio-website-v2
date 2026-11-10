import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  getStoryProgress,
  shouldUseStaticMotion,
} = require("../.next/gravity-test/gravity-story-progress.js");
test("portfolio content clamps the story without changing any of the four-mode thresholds", () => {
  for (const progress of [
    0, 0.3, 0.4, 0.55, 0.7, 0.8, 0.95, 1.25, 1.4, 1.75, 2.05, 2.55, 2.7, 3,
    3.45,
  ]) {
    const result = getStoryProgress(progress * 900, 900);
    assert.ok(Math.abs(result.progress - progress) < 1e-10);
    assert.equal(result.active, true);
  }
  for (const progress of [4, 5, 12])
    assert.deepEqual(getStoryProgress(progress * 844, 844), {
      progress: 3.45,
      active: false,
    });
  assert.deepEqual(getStoryProgress(0, 844), { progress: 0, active: true });
  assert.deepEqual(getStoryProgress(844 * 2, 844), {
    progress: 2,
    active: true,
  });
});
test("automatic static motion needs sustained low frame rate, not one slow frame", () => {
  assert.equal(shouldUseStaticMotion(1, 10000), false);
  assert.equal(shouldUseStaticMotion(30, 4000), false);
  assert.equal(shouldUseStaticMotion(360, 6000), false);
  assert.equal(shouldUseStaticMotion(72, 6000), false);
  assert.equal(shouldUseStaticMotion(24, 6000), true);
});

test("a Work anchor pauses behind the navigation only after Release reaches its final factor", () => {
  assert.equal(getStoryProgress(3.85 * 900, 900, 128).active, false);
  assert.equal(getStoryProgress(3.85 * 900, 900, 129).active, true);
  assert.equal(getStoryProgress(3.44 * 900, 900, 0).active, true);
});
