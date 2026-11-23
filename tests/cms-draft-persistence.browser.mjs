import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CMS_TEST_PLAYWRIGHT || "playwright");

function localUrl(value) {
  const url = new URL(value);
  assert.equal(url.protocol, "http:", "Use the isolated HTTP test environment.");
  assert.equal(url.hostname, "127.0.0.1");
  return url.origin;
}
const origin = localUrl(process.env.CMS_TEST_ORIGIN);
const database = localUrl(process.env.CMS_TEST_SUPABASE_URL);
const credentials = { email: "admin@example.test", password: process.env.CMS_TEST_PASSWORD };
assert(credentials.password && process.env.CMS_TEST_ANON_KEY);
const db = createClient(database, process.env.CMS_TEST_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
});
assert.ifError((await db.auth.signInWithPassword(credentials)).error);

const button = (scope, name) => scope.getByRole("button", { name, exact: true });
const quote = { quote: "Initial quote", author: "", source: "", alignment: "left", typography: "editorial" };
const makeBlock = (type, content, extra = {}) => ({ id: crypto.randomUUID(), type, content, ...extra });
const { data: images, error: assetError } = await db.from("media_assets")
  .select("id").eq("state", "ready").eq("mime_type", "image/png").limit(2);
assert.ifError(assetError);
assert(images.length >= 1, "Seed a ready private PNG in the isolated library before running this test.");
const image = { assetId: images[0].id, caption: "Nested image", alt: "Fixture image" };

const fields = {
  title: "CMS persistence browser regression",
  slug: "cms-persistence-" + Date.now(),
  category: "independent",
  summary: "Initial summary",
  seo_title: "Initial SEO",
  cover_asset_id: images[0].id,
};
const seed = {
  version: 1,
  blocks: [
    ...Array.from({ length: 10 }, () => makeBlock("quote", quote)),
    makeBlock("columns", { count: "2", ratio: "equal", stack: true }, {
      children: [
        makeBlock("rich-text", { doc: { type: "doc", content: [{
          type: "paragraph", content: [{ type: "text", text: "Nested copy" }],
        }] } }, { layout: { column: 0 } }),
        makeBlock("gallery", { images: [{ ...image, id: crypto.randomUUID() }],
          columns: "2", gap: "normal", mobileColumns: "1", caption: "Initial gallery" },
        { layout: { column: 1 } }),
      ],
    }),
  ],
};
const seeded = await db.rpc("cms_save_case_study", { project: null, expected: null, fields, document: seed });
assert.ifError(seeded.error);
const project = seeded.data.id;
const edit = "/admin/works/" + project;

async function readFresh() {
  const result = await db.from("projects")
    .select("updated_at,revisions:project_revisions!project_revisions_project_id_fkey(id,revision_number,sealed_at,summary,seo_title,cover_asset_id,content_blocks)")
    .eq("id", project)
    .order("revision_number", { referencedTable: "revisions", ascending: false })
    .limit(1, { referencedTable: "revisions" })
    .single();
  assert.ifError(result.error);
  return { version: result.data.updated_at, revision: result.data.revisions[0] };
}

async function login(context) {
  const page = await context.newPage();
  await page.goto(origin + "/admin/login");
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await button(page, "Sign in").click();
  await page.waitForURL(origin + "/admin");
  return page;
}
async function visit(page, suffix = "") {
  await page.goto(origin + edit + suffix);
  await page.getByRole("article", { name: "Visual editing canvas" }).waitFor();
}
const canvas = (p) => p.getByRole("article", { name: "Visual editing canvas" });
const properties = (p) => p.getByRole("complementary", { name: "Block Properties" });
const quoteButton = (p) => button(canvas(p), "Select Quote block");
const blocksPosts = (request) => request.method() === "POST"
  && new URL(request.url()).pathname === edit && !!request.headers()["next-action"];
async function payload(request) {
  const headers = { "content-type": request.headers()["content-type"] };
  const form = await new Response(request.postDataBuffer(), { headers }).formData();
  const key = [...form.keys()].find((key) => /(?:^|_)content_blocks$/.test(key));
  assert(key, "A complete block snapshot must be sent.");
  return JSON.parse(form.get(key));
}

const browser = await chromium.launch({
  executablePath: process.env.CMS_TEST_CHROMIUM || undefined,
  args: ["--no-sandbox"],
});
try {
  const a = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const b = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await login(a);
  const pageB = await login(b);
  await pageA.goto(origin + "/admin/works/new");
  await pageA.locator("#title").fill("CMS persistence create verification " + Date.now());
  await button(pageA, "Save Draft").click();
  await pageA.waitForURL(/\/admin\/works\/[0-9a-f-]+$/);
  await canvas(pageA).waitFor();
  assert.equal(new URL(pageA.url()).search, "");

  await visit(pageA, "?saved=1");
  await visit(pageB);
  assert.equal(await pageA.getByText("Draft saved.", { exact: true }).count(), 0);
  const beforeSingle = await readFresh();
  await quoteButton(pageA).first().click();
  await properties(pageA).getByLabel("Quotation", { exact: true }).fill("Single edit before the batch");
  const [singleRequest] = await Promise.all([
    pageA.waitForRequest(blocksPosts), button(pageA, "Save Draft").click(),
  ]);
  await pageA.getByText("Draft saved.", { exact: true }).filter({ visible: true }).waitFor();
  const before = await readFresh();
  assert.notEqual(before.version, beforeSingle.version);
  assert.deepEqual(before.revision.content_blocks, await payload(singleRequest));
  await pageA.reload();
  await canvas(pageA).getByText("Single edit before the batch", { exact: true }).waitFor();

  for (let index = 0; index < 10; index++) {
    await quoteButton(pageA).nth(index).click();
    const field = properties(pageA).getByLabel("Quotation", { exact: true });
    await field.fill("Edited quote " + (index + 1));
  }
  await button(canvas(pageA), "Select Image Gallery block").click();
  await properties(pageA).getByText("Gallery options", { exact: true }).click();
  await properties(pageA).getByLabel("Gallery caption", { exact: true }).fill("Committed nested gallery");
  await button(canvas(pageA), "Select Rich Text block").click();
  const rich = canvas(pageA).locator(".tiptap");
  await rich.click();
  await pageA.keyboard.press("End");
  await pageA.keyboard.type(" rapid additions 123");
  await pageA.getByText("Project details, cover and SEO", { exact: true }).click();
  await pageA.locator("#summary").fill("Summary beside content");
  await pageA.locator("#seo_title").fill("SEO beside content");
  const [request] = await Promise.all([
    pageA.waitForRequest(blocksPosts), button(pageA, "Save Draft").click(),
  ]);
  const submitted = await payload(request);
  await pageA.getByText("Draft saved.", { exact: true }).filter({ visible: true }).waitFor();
  const committed = await readFresh();
  assert.deepEqual(committed.revision.content_blocks, submitted);
  assert.notEqual(committed.version, before.version);
  assert.equal(committed.revision.id, before.revision.id);
  assert.equal(committed.revision.sealed_at, null);
  assert.equal(committed.revision.cover_asset_id, fields.cover_asset_id);
  assert.equal(committed.revision.summary, "Summary beside content");
  assert.equal(committed.revision.seo_title, "SEO beside content");
  assert.deepEqual(submitted.blocks.slice(0, 10).map((block) => block.content.quote),
    Array.from({ length: 10 }, (_, index) => "Edited quote " + (index + 1)));
  assert.match(JSON.stringify(submitted), /Nested copy rapid additions 123/);
  assert.match(JSON.stringify(submitted), /Committed nested gallery/);
  assert.equal(await pageA.locator("time").getAttribute("datetime"), committed.version);

  const newTab = await b.newPage();
  await visit(newTab);
  await canvas(newTab).getByText("Nested copy rapid additions 123", { exact: true }).waitFor();
  await canvas(newTab).getByText("Committed nested gallery", { exact: true }).waitFor();
  for (let index = 1; index <= 10; index++)
    await canvas(newTab).getByText("Edited quote " + index, { exact: true }).waitFor();
  assert.equal(await newTab.locator("time").getAttribute("datetime"), committed.version);
  await newTab.reload();
  await canvas(newTab).getByText("Nested copy rapid additions 123", { exact: true }).waitFor();

  // The earlier tab in the other session still has the old version.
  await quoteButton(pageB).first().click();
  await properties(pageB).getByLabel("Quotation", { exact: true }).fill("Keep stale local edits");
  await button(pageB, "Save Draft").click();
  await pageB.getByRole("alert").filter({ hasText: "This data changed" }).waitFor();
  assert.equal(await properties(pageB).getByLabel("Quotation", { exact: true }).inputValue(), "Keep stale local edits");
  assert.deepEqual(await readFresh(), committed);

  // An HTTP 500, followed by a dropped connection, cannot turn a draft clean.
  await quoteButton(pageA).first().click();
  await properties(pageA).getByLabel("Quotation", { exact: true }).fill("Unsaved when connection is lost");
  const actionUrl = "**/admin/works/" + project + "*";
  for (const interrupt of [
    (route) => route.fulfill({ status: 500, body: "Fixture failure" }),
    (route) => route.abort("connectionreset"),
  ]) {
    let interrupted = false;
    const handler = async (route) => {
      if (!blocksPosts(route.request())) return route.continue();
      interrupted = true;
      return interrupt(route);
    };
    await pageA.route(actionUrl, handler);
    try {
      await button(pageA, "Save Draft").click();
      await pageA.getByRole("alert").filter({ hasText: "could not be confirmed" }).waitFor();
      assert(interrupted);
      assert.equal(await pageA.getByText(/Unsaved changes/).count(), 1);
      assert.equal(await pageA.getByText("Draft saved.", { exact: true }).count(), 0);
      assert.equal(await properties(pageA).getByLabel("Quotation", { exact: true }).inputValue(),
        "Unsaved when connection is lost");
    } finally {
      await pageA.unroute(actionUrl, handler);
    }
  }
  assert.deepEqual(await readFresh(), committed);

  const [download] = await Promise.all([
    pageA.waitForEvent("download"), button(pageA, "Download draft backup").click(),
  ]);
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(backup.projectId, project);
  assert.equal(backup.content_blocks.blocks[0].content.quote, "Unsaved when connection is lost");
  assert.equal(backup.fields.seo_title, "SEO beside content");
  assert.deepEqual(await readFresh(), committed);
  // Simulate a metadata-only write acknowledging success while the submitted
  // document differs. The real RPC can commit metadata, but the UI must refuse
  // to claim the draft was saved after the mismatching read-back.
  await pageA.route(actionUrl, async (route) => {
    const req = route.request();
    if (!blocksPosts(req)) return route.continue();
    const headers = req.headers();
    const form = await new Response(req.postDataBuffer(), {
      headers: { "content-type": headers["content-type"] },
    }).formData();
    const mode = [...form.keys()].find((key) => /(?:^|_)content_mode$/.test(key));
    assert.equal(form.get(mode), "replace");
    form.set(mode, "preserve");
    const rewritten = new Request(req.url(), { method: "POST", body: form });
    const buffer = Buffer.from(await rewritten.arrayBuffer());
    delete headers["content-length"];
    await route.continue({
      headers: { ...headers, "content-type": rewritten.headers.get("content-type") },
      postData: buffer,
    });
  });
  await button(pageA, "Save Draft").click();
  await pageA.getByRole("alert").filter({ hasText: "latest stored draft" }).waitFor();
  assert.equal(await pageA.getByText(/Unsaved changes/).count(), 1);
  assert.equal(await pageA.getByText("Draft saved.", { exact: true }).count(), 0);
  assert.deepEqual((await readFresh()).revision.content_blocks, committed.revision.content_blocks);
  console.log("Create and single save/reload, two independent browser sessions, 10 edits and nested content, exact JSON read-back, metadata/cover/SEO, stale save, HTTP 500, network loss, backup and mismatched read-back passed.");
} finally {
  await browser.close();
}
