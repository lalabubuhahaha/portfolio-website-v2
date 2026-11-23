import assert from "node:assert/strict";
import { test } from "node:test";
import {
  consentKey, disableUserRecovery, listSnapshots, RECOVERY_LIMIT, RECOVERY_TTL,
  snapshotPrefix, writeSnapshot,
} from "../lib/cms/draft-recovery-storage.ts";

class BrowserStorage {
  data = new Map();
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}

test("browser snapshots require opt-in, isolate account/project/tab and expire", () => {
  const store = new BrowserStorage();
  const a = snapshotPrefix("a", "one");
  assert.equal(writeSnapshot(store, "a", a + "first", "", 100), false);
  for (const user of ["a", "b"]) store.setItem(consentKey(user), "enabled");
  writeSnapshot(store, "a", a + "first", "old", 100);
  writeSnapshot(store, "a", a + "second", "new", 101);
  writeSnapshot(store, "a", snapshotPrefix("a", "other") + "first", "other project", 102);
  writeSnapshot(store, "b", snapshotPrefix("b", "one") + "first", "other user", 102);

  assert.deepEqual(listSnapshots(store, "a", "one", 103).map(({ raw }) => raw), ["new", "old"]);
  assert.deepEqual(listSnapshots(store, "b", "one", 103).map(({ raw }) => raw), ["other user"]);
  assert.deepEqual(listSnapshots(store, "a", "one", 100 + RECOVERY_TTL).map(({ raw }) => raw), ["new"]);
  assert.equal(store.getItem(a + "first"), null);
  disableUserRecovery(store, "a");
  assert.equal(writeSnapshot(store, "a", a + "late", "late tab", 105), false);
  assert.deepEqual(listSnapshots(store, "a", "other", 105), []);
  assert.equal(listSnapshots(store, "b", "one", 105).length, 1);
});

test("capacity errors preserve existing snapshots and bound UTF-8 data", () => {
  const store = new BrowserStorage();
  const prefix = snapshotPrefix("a", "work");
  store.setItem(consentKey("a"), "enabled");
  assert.throws(() => writeSnapshot(store, "a", prefix + "oversize", "測".repeat(RECOVERY_LIMIT / 2), 100), /large/);
  for (let index = 0; index < 12; index++) writeSnapshot(store, "a", prefix + index, String(index), 100);
  assert.throws(() => writeSnapshot(store, "a", prefix + "overflow", "overflow", 100), /limit/);
  assert.equal(store.getItem(prefix + "overflow"), null);
  assert.equal(listSnapshots(store, "a", "work", 100).length, 12);
  assert.equal(writeSnapshot(store, "a", prefix + "0", "updated", 101), true);
});
