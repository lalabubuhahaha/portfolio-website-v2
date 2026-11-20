import assert from "node:assert/strict";
import { test } from "node:test";
import { contentBlocksSchema, themeSchema } from "../lib/cms/blocks.ts";

const section = {
  id: "d3d39724-fb53-4c2d-aa3f-748eacee73b2",
  type: "columns",
  content: {},
  layout: { columns: 2 },
  styles: { gap: 24 },
  animation: { type: "scroll-reveal" },
  responsive: { mobile: { columns: 1 } },
};

test("validates versioned nested blocks and preserves document order", () => {
  const heading = { id: "e53cd305-b287-4125-8d1e-fe849ba2b9d7", type: "heading", content: { text: "Case study" } };
  const document = { version: 1, blocks: [{ ...section, children: [heading] }, heading] };
  assert.deepEqual(contentBlocksSchema.parse(document), document);
  assert.deepEqual(themeSchema.parse({ version: 1, settings: { accent: "#2548eb" } }), { version: 1, settings: { accent: "#2548eb" } });
});

test("rejects unsupported versions and malformed block settings", () => {
  assert.equal(contentBlocksSchema.safeParse({ version: 2, blocks: [] }).success, false);
  assert.equal(contentBlocksSchema.safeParse({ version: 1, blocks: [{ ...section, children: [{ ...section, id: "invalid" }] }] }).success, false);
  assert.equal(themeSchema.safeParse({ version: 1, settings: [] }).success, false);
});
