import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { z } from "zod";
import {
  blockSchemas, contentBlocksSchema, figmaLink, MAX_BLOCK_BYTES, safeLink, themeSchema,
} from "../lib/cms/blocks.ts";

const id = (n) => `d3d39724-fb53-4c2d-aa3f-${String(n).padStart(12, "0")}`;
const block = (type, content, n = 1) => ({ id: id(n), type, content });
const doc = (...blocks) => ({ version: 1, blocks });
const palette = { alignment: "left" };
const image = { assetId: id(20), alt: "Detail", caption: "Screenshot" };
const all = {
  heading: { text: "Case study" },
  "rich-text": { doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }] }] } },
  image: { ...image, ...palette, fit: "contain", aspect: "native" },
  gallery: { caption: "", columns: "3", mobileColumns: "1", gap: "normal", images: [{ ...image, id: id(21) }] },
  columns: { count: "3", ratio: "wide-left", stack: true },
  "image-text": { ...image, heading: "Interface", description: "Details", side: "right", ratio: "40:60", stack: true },
  video: { assetId: id(22), posterId: id(20), controls: true, muted: true, loop: false, autoplay: false, caption: "", aspect: "native" },
  quote: { quote: "<script>Text remains inert</script>", author: "", source: "", ...palette, typography: "editorial" },
  metrics: { items: [{ id: id(23), value: "4", prefix: "", suffix: "", label: "Rounds", description: "" }], columns: "1" },
  figma: { url: "https://www.figma.com/proto/Portfolio/Demo?node-id=1-5", aspect: "landscape", caption: "Demo" },
  links: { items: [{ id: id(24), text: "Details", url: "https://example.com", variant: "primary", newTab: true }], ...palette },
  divider: { line: "dashed", width: "short", spacing: "small" },
  spacer: { size: "custom", height: 60, mobileHeight: 28 },
  palette: { swatches: [{ id: id(25), name: "Blue", hex: "#2354c7", role: "Accent" }], columns: "2" },
  typography: { font: "Inter", sample: "Aa", weight: "500", size: 52, lineHeight: 1.1, letterSpacing: -1 },
  comparison: { beforeId: id(20), afterId: id(26), beforeLabel: "Before", afterLabel: "After", mode: "slider", stack: true },
};

test("each of the 16 listed blocks has a bounded schema, including ordered nested lanes", () => {
  assert.equal(Object.keys(all).length, 16);
  const blocks = Object.entries(all).map(([type, content], index) => block(type, content, index + 1));
  blocks[4].children = [{ ...block("heading", { text: "Nested" }, 30), layout: { column: 2 } }];
  assert.deepEqual(contentBlocksSchema.parse(doc(...blocks)), doc(...blocks));
});

test("legacy heading and column metadata can be preserved", () => {
  const legacy = doc({
    ...block("columns", {}),
    layout: { columns: 2 }, styles: { gap: 24 },
    animation: { type: "scroll-reveal" },
    responsive: { mobile: { columns: 1 } },
    children: [block("heading", { text: "Case study" }, 2)],
  });
  assert.deepEqual(contentBlocksSchema.parse(legacy), legacy);
  const theme = { version: 1, settings: { accent: "#2548eb" } };
  assert.deepEqual(themeSchema.parse(theme), theme);
});

test("rejects malformed, duplicate, oversized and over-nested documents", () => {
  const h = block("heading", { text: "Duplicate" });
  let deep = h;
  for (let n = 2; n <= 6; n++) deep = { ...block("columns", {}, n), children: [deep] };
  for (const invalid of [
    { ...doc(), version: 2 },
    doc(block("unknown", {})),
    doc({ ...h, blockVersion: 2 }),
    doc(h, { ...h, id: h.id.toUpperCase() }),
    doc({ ...h, children: [block("heading", { text: "Child" }, 2)] }),
    doc({ ...h, layout: { column: 0 } }),
    doc({ ...h, styles: { pad: "x".repeat(MAX_BLOCK_BYTES) } }),
    doc(deep),
    doc(block("image", { ...all.image, assetId: "not-an-id" })),
    doc(block("quote", { ...all.quote, html: "<img onerror='alert(1)'>" })),
  ]) assert.equal(contentBlocksSchema.safeParse(invalid).success, false);
});

test("restricts external links, Figma embeds, rich markup and colors", () => {
  for (const value of ["javascript:alert(1)", "https://user@example.com/", "//example.com", "https://example.com/\n"]) {
    assert.equal(safeLink.safeParse(value).success, false);
  }
  for (const value of ["https://www.figma.com.evil.test/proto/Test", "https://www.figma.com:444/proto/Test", "https://www.figma.com/design/Test", "https://www.figma.com/proto/../evil"]) {
    assert.equal(figmaLink.safeParse(value).success, false);
  }
  for (const mark of [
    { type: "textStyle", attrs: { color: "url(https://example.com)" } },
    { type: "link", attrs: { href: "javascript:alert(1)" } },
  ]) {
    const rich = { doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Example", marks: [mark] }] }] } };
    assert.equal(contentBlocksSchema.safeParse(doc(block("rich-text", rich))).success, false);
  }
});

test("SQL payload catalog matches the application payload schemas", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261120000500_cms_case_study_blocks.sql", import.meta.url), "utf8");
  const definitions = [...sql.matchAll(/\('([a-z-]+)', \$json\$(.*?)\$json\$\)/g)];
  assert.equal(definitions.length, 16);
  for (const [, kind, encoded] of definitions) {
    const expected = z.toJSONSchema(blockSchemas[kind], { cycles: "ref" });
    delete expected.$schema;
    assert.deepEqual(JSON.parse(encoded), expected, kind);
  }
});
