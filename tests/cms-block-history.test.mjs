import assert from "node:assert/strict";
import { test } from "node:test";
import { blockHistory, startBlockHistory } from "../lib/cms/block-history.ts";

const document = (text) => ({ version: 1, blocks: [{ id: "fixed", type: "heading", content: { text } }] });
test("history can undo and redo, and clears redo after a new edit", () => {
  const original = document("original");
  const edited = document("edited");
  let history = blockHistory(startBlockHistory(original), { type: "edit", document: edited });
  history = blockHistory(history, { type: "undo" });
  assert.equal(history.current, original);
  assert.equal(blockHistory(history, { type: "redo" }).current, edited);
  const branched = blockHistory(history, { type: "edit", document: document("branch") });
  assert.equal(branched.after.length, 0);
  assert.equal(blockHistory(branched, { type: "undo" }).current, original);
});
test("history is bounded and recovery resets the previous editing timeline", () => {
  let history = startBlockHistory(document("start"));
  for (let index = 0; index < 100; index++)
    history = blockHistory(history, { type: "edit", document: document(String(index)) });
  assert.equal(history.before.length, 50);
  history = blockHistory(history, { type: "reset", document: document("recovered") });
  assert.equal(history.before.length, 0);
  assert.equal(history.after.length, 0);
  assert.equal(blockHistory(history, { type: "undo" }), history);
});
