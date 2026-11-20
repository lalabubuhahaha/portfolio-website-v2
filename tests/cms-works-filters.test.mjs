import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WORKS_PAGE_SIZE,
  parseWorksFilters,
  selectWorksPage,
} from "../lib/cms/works-filters.ts";

const base = {
  title: "Editorial systems",
  slug: "editorial",
  summary: "Typography and grid",
  updatedAt: "2026-11-20T09:00:00+08:00",
  category: "Client",
  published: true,
  archived: false,
  displayOrder: 5,
};

test("Works combines title, slug or summary search with category and publication filters", () => {
  const projects = [
    { ...base, id: "published", unpublishedChanges: true },
    { ...base, id: "archived", archived: true },
    { ...base, id: "draft", published: false },
    { ...base, id: "independent", category: "Independent" },
  ];
  const page = (query) =>
    selectWorksPage(
      projects,
      parseWorksFilters(new URLSearchParams(query)),
    ).projects.map((project) => project.id);
  assert.deepEqual(page("q=typography&category=client&status=published"), [
    "published",
  ]);
  assert.deepEqual(page("q=Editorial&category=client&status=draft"), ["draft"]);
  assert.deepEqual(page("q=editorial&status=archived"), ["archived"]);
});

test("Works order uses the full filtered list before bounded pagination", () => {
  const projects = Array.from({ length: 30 }, (_, index) => ({
    ...base,
    id: String(index),
    displayOrder: 30 - index,
  }));
  const page = selectWorksPage(
    projects,
    parseWorksFilters(new URLSearchParams("sort=display&page=2")),
  );
  assert.equal(page.pages, 2);
  assert.equal(page.total, 30);
  assert.equal(page.projects.length, 30 - WORKS_PAGE_SIZE);
  assert.equal(page.projects[0].id, "5");
  assert.equal(
    parseWorksFilters(new URLSearchParams("page=-1&category=unknown")).page,
    1,
  );
});
