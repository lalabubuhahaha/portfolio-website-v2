import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareDraftEdits,
  emptyDraft,
  projectFieldsSchema,
  slugFromTitle,
} from "../lib/cms/project-fields.ts";

test("project draft normalizes text, tags, year and URL", () => {
  assert.equal(slugFromTitle("  Étude · 2026 "), "etude-2026");
  const result = projectFieldsSchema.parse({
    ...emptyDraft,
    title: " Étude ",
    slug: "etude-2026",
    year: "2026",
    tools: "Figma, Blender, Figma",
    category_tags: " Art direction, , Interaction",
    external_url: "https://example.com",
  });
  assert.deepEqual(result.tools, ["Figma", "Blender"]);
  assert.deepEqual(result.category_tags, ["Art direction", "Interaction"]);
  assert.equal(result.year, 2026);
  assert.equal(result.external_url, "https://example.com/");
});

test("invalid project fields do not reach the mutation", () => {
  const draft = { ...emptyDraft, title: "Example", slug: "example" };
  for (const fields of [
    { slug: "../draft" },
    { slug: "UPPER" },
    { year: "1e3" },
    { external_url: "javascript:alert(1)" },
    { external_url: "https://other@example.com/" },
    { cover_asset_id: "invalid" },
    { tools: Array.from({ length: 21 }, (_, i) => String(i)).join(",") },
  ]) {
    assert.equal(
      projectFieldsSchema.safeParse({ ...draft, ...fields }).success,
      false,
    );
  }
});

test("rebasing a cover edit preserves metadata saved in another tab", () => {
  const original = { ...emptyDraft, title: "Existing draft", cover_asset_id: "original" };
  const latest = { ...original, summary: "Saved in another tab" };
  const local = { ...original, cover_asset_id: "" };
  assert.deepEqual(compareDraftEdits(original, local, latest), {
    merged: { ...latest, cover_asset_id: "" },
    overlapping: [],
  });
  assert.deepEqual(compareDraftEdits(original, { ...original, summary: "My edit" }, {
    ...latest,
    cover_asset_id: "latest",
  }), {
    merged: { ...latest, summary: "My edit", cover_asset_id: "latest" },
    overlapping: ["summary"],
  });
  assert.deepEqual(compareDraftEdits(original, local, {
    ...latest,
    cover_asset_id: "latest",
  }).overlapping, ["cover_asset_id"]);
});
