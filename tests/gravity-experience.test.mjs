import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  createGravityExperience,
} = require("../.next/gravity-test/gravity-experience.js");

test("scene readiness never starts entrance before loader completion, and finish is idempotent", () => {
  const experience = createGravityExperience();
  let starts = 0;
  let notifications = 0;
  const unsubscribe = experience.subscribe(() => notifications++);
  experience.register(() => starts++);
  experience.report("ready");
  assert.equal(experience.getStatus(), "ready");
  assert.equal(starts, 0);
  experience.finish();
  experience.finish();
  assert.equal(starts, 1);
  unsubscribe();
  experience.report("unavailable");
  assert.equal(notifications, 1);
});

test("timeout or reduced-motion completion allows a late scene to start without trapping the page", () => {
  const experience = createGravityExperience();
  let starts = 0;
  experience.finish();
  const staleCleanup = experience.register(() => starts++);
  const activeCleanup = experience.register(() => starts++);
  staleCleanup();
  experience.report("ready");
  experience.finish();
  assert.equal(starts, 2); // Each registered world starts once; stale worlds cannot affect the replacement.
  activeCleanup();
});

test("a disposed scene is not started by a late loader callback", () => {
  const experience = createGravityExperience();
  let starts = 0;
  const unregister = experience.register(() => starts++);
  unregister();
  experience.finish();
  assert.equal(starts, 0);
});

test("a cached route reactivation waits for its new loader instead of reusing completion", () => {
  const experience = createGravityExperience();
  let oldStarts = 0;
  let newStarts = 0;
  experience.register(() => oldStarts++);
  experience.report("ready");
  experience.finish();
  experience.begin();
  assert.equal(experience.getStatus(), "loading");
  experience.register(() => newStarts++);
  experience.report("ready");
  assert.equal(newStarts, 0);
  experience.finish();
  experience.finish();
  assert.equal(oldStarts, 1);
  assert.equal(newStarts, 1);
});
