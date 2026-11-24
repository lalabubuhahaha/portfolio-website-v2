import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    ...Array.from({ length: 15 }, () => makeBlock("columns", { count: "2" }, {
      children: [
        makeBlock("columns", { count: "2" }, {
          layout: { column: 0 },
          children: Array.from({ length: 4 }, (_, index) =>
            makeBlock("heading", { text: "Nested reliability " + index }, { layout: { column: index % 2 } })),
        }),
        makeBlock("heading", { text: "Outer nested reliability" }, { layout: { column: 1 } }),
      ],
    })),
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
  const signInRequired = await Promise.race([
    page.waitForURL(origin + "/admin").then(() => false),
    page.locator("#email").waitFor().then(() => true),
  ]);
  if (!signInRequired) return page;
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
  assert.equal(await pageA.getByText("Saved successfully", { exact: true }).count(), 0);
  const beforeSingle = await readFresh();
  await quoteButton(pageA).first().click();
  await properties(pageA).getByLabel("Quotation", { exact: true }).fill("Single edit before the batch");
  let submissions = 0;
  const countPost = (request) => { if (blocksPosts(request)) submissions++; };
  pageA.on("request", countPost);
  const [singleRequest] = await Promise.all([
    pageA.waitForRequest(blocksPosts),
    button(pageA, "Save Draft").evaluate((control) => { control.click(); control.click(); }),
  ]);
  await pageA.getByText("Saved successfully", { exact: true }).filter({ visible: true }).waitFor();
  const before = await readFresh();
  pageA.off("request", countPost);
  assert.equal(submissions, 1);
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
  const saveStarted = performance.now();
  const delaySave = async (route) => {
    if (blocksPosts(route.request())) await new Promise((resolve) => setTimeout(resolve, 450));
    await route.continue();
  };
  const saveUrl = "**/admin/works/" + project + "*";
  await pageA.route(saveUrl, delaySave);
  const [request] = await Promise.all([
    pageA.waitForRequest(blocksPosts), button(pageA, "Save Draft").click(),
  ]);
  await pageA.getByRole("status").filter({ hasText: "Saving…" }).waitFor();
  assert.equal(await pageA.getByText("Saved successfully", { exact: true }).count(), 0);
  const submitted = await payload(request);
  await pageA.getByText("Saved successfully", { exact: true }).filter({ visible: true }).waitFor();
  await pageA.unroute(saveUrl, delaySave);
  if (process.env.CMS_TEST_ARTIFACT_DIR)
    await pageA.getByRole("status").filter({ hasText: "Saved successfully" }).locator("..")
      .screenshot({ path: join(process.env.CMS_TEST_ARTIFACT_DIR, "save-confirmed.png") });
  const delayedSaveSampleMs = Math.round(performance.now() - saveStarted);
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

  // Start cold in another context and reproduce the observed order exactly:
  // load the existing editor online, switch Chromium offline, click the text.
  const offlineContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const offlinePage = await login(offlineContext);
  await visit(offlinePage);
  const offlineText = canvas(offlinePage).getByText("Nested copy rapid additions 123", { exact: true });
  await offlineText.scrollIntoViewIfNeeded();
  await offlinePage.waitForLoadState("networkidle");
  assert.equal(await offlinePage.locator(".tiptap").count(), 0);
  const offlineRequests = [];
  const offlineNavigations = [];
  const clientErrors = [];
  const traceRequest = (request) => offlineRequests.push([request.method(), request.resourceType()]);
  const traceNavigation = (frame) => { if (frame === offlinePage.mainFrame()) offlineNavigations.push(frame.url()); };
  offlinePage.on("request", traceRequest);
  offlinePage.on("framenavigated", traceNavigation);
  offlinePage.on("pageerror", (error) => clientErrors.push(error.message));
  await offlineContext.setOffline(true);
  await offlinePage.getByText("Offline. You can keep editing", { exact: false }).waitFor();
  await offlineText.click();
  const offlineRich = canvas(offlinePage).locator(".tiptap");
  await offlineRich.waitFor();
  await offlinePage.waitForFunction(() => document.activeElement?.classList.contains("tiptap"));
  await offlinePage.keyboard.type(" typed offline");
  await button(offlinePage, "Save Draft").click();
  await offlinePage.getByRole("alert").filter({ hasText: "Save failed. You’re offline" }).waitFor();
  assert.equal(await offlinePage.getByText("Saved successfully", { exact: true }).count(), 0);
  assert.equal(await offlinePage.locator("time").getAttribute("datetime"), committed.version);
  await offlinePage.getByRole("link", { name: "Back to Works", exact: true }).click();
  assert.equal(new URL(offlinePage.url()).pathname, edit);
  assert.deepEqual(offlineRequests, []);
  assert.deepEqual(offlineNavigations, []);
  assert.deepEqual(clientErrors, []);
  assert.deepEqual(await readFresh(), committed);
  await button(offlinePage, "Draft recovery").click();
  const recoveryPanel = offlinePage.getByRole("region", { name: "Draft recovery", exact: true });
  assert(await recoveryPanel.evaluate((element) => document.activeElement === element));
  await button(recoveryPanel, "Enable local recovery").click();
  await recoveryPanel.getByRole("status").filter({ hasText: "Snapshot saved on this device" }).waitFor();
  assert(await button(recoveryPanel, "Import draft backup").isDisabled());
  const [offlineDownload] = await Promise.all([
    offlinePage.waitForEvent("download"), button(offlinePage, "Download draft backup").click(),
  ]);
  const offlineBackup = JSON.parse(await readFile(await offlineDownload.path(), "utf8"));
  assert.match(JSON.stringify(offlineBackup.content_blocks), /typed offline/);
  if (process.env.CMS_TEST_ARTIFACT_DIR) {
    await offlinePage.screenshot({ path: join(process.env.CMS_TEST_ARTIFACT_DIR, "offline-editor.png") });
    await recoveryPanel.screenshot({ path: join(process.env.CMS_TEST_ARTIFACT_DIR, "snapshot-saved.png") });
  }
  await offlineContext.setOffline(false);
  offlinePage.off("request", traceRequest);
  offlinePage.off("framenavigated", traceNavigation);
  offlinePage.once("dialog", (dialog) => dialog.accept());
  await offlinePage.reload();
  await button(offlinePage, "Review snapshot").click();
  const offlineCompare = offlinePage.getByRole("region", { name: "Backup comparison" });
  await offlineCompare.waitFor();
  await offlineCompare.getByText("Backup blocks", { exact: true }).click();
  await offlineCompare.getByText(/typed offline/).waitFor();
  if (process.env.CMS_TEST_ARTIFACT_DIR)
    await offlineCompare.screenshot({ path: join(process.env.CMS_TEST_ARTIFACT_DIR, "recovery-comparison.png") });
  await button(offlineCompare, "Apply backup to editor").click();
  await canvas(offlinePage).getByText("Nested copy rapid additions 123 typed offline", { exact: true }).waitFor();
  assert.deepEqual(await readFresh(), committed);
  await offlineContext.close();
  console.log("Cold, already-loaded Rich Text clicked under real Chromium Offline: zero requests, errors or navigations; typing, Save failed, snapshot, export and recovery passed.");

  // The earlier tab in the other session still has the old version.
  await quoteButton(pageB).first().click();
  await properties(pageB).getByLabel("Quotation", { exact: true }).fill("Keep stale local edits");
  await button(pageB, "Save Draft").click();
  await pageB.getByRole("alert").filter({ hasText: "This data changed" }).waitFor();
  assert.equal(await properties(pageB).getByLabel("Quotation", { exact: true }).inputValue(), "Keep stale local edits");
  assert.deepEqual(await readFresh(), committed);

  const actionUrl = "**/admin/works/" + project + "*";
  async function reviewUncertain(page) {
    await button(page, "Review latest draft").click();
    await button(page, "Apply changes to latest draft").click();
  }
  const editFirst = async (page, text) => {
    await quoteButton(page).first().click();
    await properties(page).getByLabel("Quotation", { exact: true }).fill(text);
  };
  const assertUnsaved = async (page, text) => {
    await page.getByRole("alert").filter({ hasText: /edits|data changed/i }).waitFor();
    assert.equal(await page.getByText(/Unsaved Changes/).count(), 1);
    assert.equal(await page.getByText("Saved successfully", { exact: true }).count(), 0);
    assert.equal(await properties(page).getByLabel("Quotation", { exact: true }).inputValue(), text);
    assert.equal(new URL(page.url()).pathname, edit);
  };

  const retained = "Unsaved when connection is lost";
  await editFirst(pageA, retained);
  await a.setOffline(true);
  await button(pageA, "Save Draft").click();
  await assertUnsaved(pageA, retained);
  await a.setOffline(false);
  for (const failure of [401, 403, 409, 500, "reset"]) {
    const handler = (route) => !blocksPosts(route.request()) ? route.continue()
      : failure === "reset" ? route.abort("connectionreset")
      : route.fulfill({ status: failure, body: "Isolated failure" });
    await pageA.route(actionUrl, handler);
    try {
      await button(pageA, "Save Draft").click();
      await assertUnsaved(pageA, retained);
      assert.deepEqual(await readFresh(), committed);
    } finally { await pageA.unroute(actionUrl, handler); }
    await reviewUncertain(pageA);
  }

  const [download] = await Promise.all([
    pageA.waitForEvent("download"), button(pageA, "Download draft backup").click(),
  ]);
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(backup.projectId, project);
  assert.equal(backup.content_blocks.blocks[0].content.quote, retained);
  assert.equal(backup.fields.seo_title, "SEO beside content");

  if (process.env.CMS_TEST_FAULT_GATEWAY === "1") {
    if (!await pageA.locator("#summary").isVisible())
      await pageA.getByText("Project details, cover and SEO", { exact: true }).click();
    for (const [marker, timeout] of [["p0-test-rpc-outage", false], ["p0-test-rpc-timeout", true]]) {
      await pageA.locator("#summary").fill(marker);
      const start = performance.now();
      await button(pageA, "Save Draft").click();
      await assertUnsaved(pageA, retained);
      if (timeout) assert(performance.now() - start >= 11_000);
      assert.deepEqual(await readFresh(), committed);
      if (await button(pageA, "Review latest draft").count()) await reviewUncertain(pageA);
    }
    await pageA.locator("#summary").fill(committed.revision.summary);
  }

  // The upstream request commits. Drop the response at the browser boundary.
  const loseResult = async (route) => {
    if (!blocksPosts(route.request())) return route.continue();
    const response = await route.fetch({ maxRetries: 0 });
    assert.equal(response.status(), 200);
    await route.abort("connectionreset");
  };
  await pageA.route(actionUrl, loseResult);
  await button(pageA, "Save Draft").click();
  await assertUnsaved(pageA, retained);
  await pageA.unroute(actionUrl, loseResult);
  let committedWithoutResponse = await readFresh();
  assert.equal(committedWithoutResponse.revision.content_blocks.blocks[0].content.quote, retained);
  await newTab.reload();
  await canvas(newTab).getByText(retained, { exact: true }).waitFor();
  await reviewUncertain(pageA);

  if (process.env.CMS_TEST_FAULT_GATEWAY === "1") {
    if (!await pageA.locator("#summary").isVisible())
      await pageA.getByText("Project details, cover and SEO", { exact: true }).click();
    await pageA.locator("#summary").fill("p0-test-readback-error");
    await button(pageA, "Save Draft").click();
    await pageA.getByRole("alert").filter({ hasText: "latest stored draft" }).waitFor();
    assert.equal(await pageA.getByText("Saved successfully", { exact: true }).count(), 0);
    committedWithoutResponse = await readFresh();
    assert.equal(committedWithoutResponse.revision.summary, "p0-test-readback-error");
    assert.equal(committedWithoutResponse.revision.content_blocks.blocks[0].content.quote, retained);
    await reviewUncertain(pageA);
  }

  // Missing credentials on a still-open editor simulate a session ending.
  await editFirst(pageA, "Session ended with the editor open");
  await a.clearCookies();
  await button(pageA, "Save Draft").click();
  await assertUnsaved(pageA, "Session ended with the editor open");
  await pageA.getByRole("alert").filter({ hasText: "Admin sign-in is required" }).waitFor();
  assert.deepEqual(await readFresh(), committedWithoutResponse);
  await login(a);

  const recovered = "Recover this from the local browser";
  const observedWrites = [];
  await pageA.exposeFunction("recordSnapshotWrite", (duration) => observedWrites.push(duration));
  await pageA.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      const start = performance.now();
      original.call(this, key, value);
      if (key.startsWith("lala-cms-recovery:v1:draft:")) window.recordSnapshotWrite(performance.now() - start);
    };
  });
  await button(pageA, "Enable local recovery").click();
  await quoteButton(pageA).first().click();
  const localField = properties(pageA).getByLabel("Quotation", { exact: true });
  await localField.fill("");
  await localField.pressSequentially(recovered, { delay: 5 });
  const storagePrefix = "lala-cms-recovery:v1:draft:";
  await pageA.waitForFunction(prefix => Object.keys(localStorage).some(key => key.startsWith(prefix)), storagePrefix);
  assert.deepEqual(await readFresh(), committedWithoutResponse);
  const inputBurstWrites = observedWrites.length;
  assert.equal(inputBurstWrites, 1);
  pageA.once("dialog", (dialog) => dialog.accept());
  await pageA.reload();
  await button(pageA, "Review snapshot").waitFor();
  await pageA.close();
  const reopened = await a.newPage();
  await visit(reopened);
  assert.equal(await button(newTab, "Review snapshot").count(), 0);
  await button(reopened, "Review snapshot").click();
  const compare = reopened.getByRole("region", { name: "Backup comparison" });
  await compare.waitFor();
  await compare.getByText("Backup blocks", { exact: true }).click();
  await compare.getByText(new RegExp(recovered)).waitFor();
  if (process.env.CMS_TEST_ARTIFACT_DIR)
    await compare.screenshot({ path: join(process.env.CMS_TEST_ARTIFACT_DIR, "recovery-review.png") });
  assert.deepEqual(await readFresh(), committedWithoutResponse);
  await button(compare, "Apply backup to editor").click();
  await button(reopened, "Save Draft").click();
  await reopened.getByText("Saved successfully", { exact: true }).waitFor();
  const recoveredRow = await readFresh();
  assert.equal(recoveredRow.revision.content_blocks.blocks[0].content.quote, recovered);
  await reopened.getByRole("link", { name: "Back to Works", exact: true }).click();
  await reopened.waitForURL(origin + "/admin/works");
  await visit(reopened);
  await canvas(reopened).getByText(recovered, { exact: true }).waitFor();

  async function importBackup(value) {
    const [chooser] = await Promise.all([
      reopened.waitForEvent("filechooser"), button(reopened, "Import draft backup").click(),
    ]);
    await chooser.setFiles({ name: "draft.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
  }
  await importBackup({ ...backup, projectId: crypto.randomUUID() });
  await reopened.getByRole("alert").filter({ hasText: "Invalid backup or different project" }).waitFor();
  const duplicate = structuredClone(backup);
  duplicate.content_blocks.blocks[1].id = duplicate.content_blocks.blocks[0].id;
  await importBackup(duplicate);
  await reopened.getByRole("alert").filter({ hasText: "Invalid backup" }).waitFor();
  await importBackup({ ...backup, fields: { ...backup.fields, cover_asset_id: crypto.randomUUID() } });
  await reopened.getByRole("alert").filter({ hasText: "incompatible media" }).waitFor();
  const legacy = { ...backup, fields: { ...backup.fields, summary: "Imported legacy backup", cover_asset_id: images[1]?.id ?? "" } };
  delete legacy.version;
  delete legacy.baseVersion;
  await importBackup(legacy);
  await compare.waitFor();
  assert(await button(compare, "Apply backup to editor").isDisabled());
  await compare.getByRole("checkbox").check();
  await button(compare, "Apply backup to editor").click();
  assert.deepEqual(await readFresh(), recoveredRow);
  await button(reopened, "Save Draft").click();
  await reopened.getByText("Saved successfully", { exact: true }).waitFor();
  const imported = await readFresh();
  assert.equal(imported.revision.summary, "Imported legacy backup");
  assert.equal(imported.revision.cover_asset_id, images[1]?.id ?? null);
  await editFirst(reopened, "Keep this edit if another writer commits");

  // A subsequent writer invalidates the token even after an explicit review.
  const intervened = await db.rpc("cms_save_case_study", {
    project, expected: imported.version,
    fields: { ...fields, summary: "Intervening writer" }, document: imported.revision.content_blocks,
  });
  assert.ifError(intervened.error);
  await button(reopened, "Save Draft").click();
  await reopened.getByRole("alert").filter({ hasText: "This data changed" }).waitFor();
  assert.equal((await readFresh()).revision.summary, "Intervening writer");

  reopened.on("dialog", (dialog) => dialog.accept());
  await button(reopened, "Sign out").click();
  await reopened.waitForURL(origin + "/admin/login");
  assert.equal(await reopened.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("lala-cms-recovery:")).length), 0);
  await visit(newTab);
  await editFirst(newTab, "Verified save from the second browser");
  await button(newTab, "Save Draft").click();
  await newTab.getByText("Saved successfully", { exact: true }).waitFor();
  assert.equal((await readFresh()).revision.content_blocks.blocks[0].content.quote,
    "Verified save from the second browser");

  const unsupported = await b.newPage();
  await unsupported.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() { throw new DOMException("Fixture storage denial", "SecurityError"); },
    });
  });
  await visit(unsupported);
  await unsupported.getByRole("alert").filter({ hasText: "Use Download draft backup" }).waitFor();
  assert(await button(unsupported, "Download draft backup").isVisible());
  await unsupported.close();

  const profile = await mkdtemp(join(tmpdir(), "cms-recovery-browser-"));
  const persistentOptions = {
    executablePath: process.env.CMS_TEST_CHROMIUM || undefined,
    args: ["--no-sandbox"], viewport: { width: 1440, height: 900 },
  };
  let persistent;
  try {
    persistent = await chromium.launchPersistentContext(profile, persistentOptions);
    const first = await login(persistent);
    await visit(first);
    await button(first, "Enable local recovery").click();
    await editFirst(first, "Retained after browser process closes");
    await first.waitForFunction(prefix => Object.keys(localStorage).some(key => key.startsWith(prefix)), storagePrefix);
    await persistent.close();
    persistent = await chromium.launchPersistentContext(profile, persistentOptions);
    const second = await login(persistent);
    await visit(second);
    await button(second, "Review snapshot").click();
    await button(second, "Apply backup to editor").click();
    await canvas(second).getByText("Retained after browser process closes", { exact: true }).waitFor();
    assert.equal((await readFresh()).revision.summary, "Intervening writer");
  } finally {
    await persistent?.close();
    await rm(profile, { recursive: true, force: true });
  }
  await visit(newTab);
  const original = await readFresh();
  const autosave = newTab.getByRole("checkbox", { name: "Autosave", exact: true });
  assert.equal(await autosave.isChecked(), false);
  const firstQuote = original.revision.content_blocks.blocks[0].content.quote;
  const secondQuote = original.revision.content_blocks.blocks[1].content.quote;
  const quoteValues = () => canvas(newTab).locator("blockquote").allTextContents();

  await quoteButton(newTab).first().click();
  const panel = properties(newTab);
  await panel.getByText("Visual settings", { exact: true }).click();
  await panel.getByLabel("Block width").selectOption("narrow");
  await panel.getByLabel("Vertical padding").selectOption("roomy");
  await panel.getByLabel("Block background").selectOption("accent");
  await canvas(newTab).locator(".max-w-xl.py-8.bg-cms-selected blockquote").first().waitFor();

  const outline = newTab.getByRole("complementary", { name: "Block Library" });
  await outline.getByText("Content Outline", { exact: true }).click();
  const handles = outline.getByRole("button", { name: "Drag Quote", exact: true });
  await handles.first().focus();
  for (const key of ["Space", "ArrowDown", "Space"]) {
    await newTab.keyboard.press(key);
    await newTab.waitForTimeout(150);
  }
  assert.deepEqual((await quoteValues()).slice(0, 2), [secondQuote, firstQuote]);
  await button(newTab, "Undo blocks").click();
  assert.deepEqual((await quoteValues()).slice(0, 2), [firstQuote, secondQuote]);
  await button(newTab, "Redo blocks").click();
  assert.deepEqual((await quoteValues()).slice(0, 2), [secondQuote, firstQuote]);

  await button(canvas(newTab), "Select Rich Text block").click();
  const historyRich = canvas(newTab).locator(".tiptap");
  await historyRich.waitFor();
  const oldCopy = await historyRich.innerText();
  await newTab.waitForFunction(() => document.activeElement?.classList.contains("tiptap"));
  await newTab.keyboard.insertText(" and history");
  await button(newTab, "Undo blocks").click();
  await historyRich.getByText(oldCopy.trim(), { exact: true }).waitFor();
  await button(newTab, "Redo blocks").click();
  await historyRich.getByText(/and history/).waitFor();
  await button(newTab, "Preview").click();
  const stage75Preview = newTab.getByRole("article", { name: "Case study preview" });
  await stage75Preview.locator(".max-w-xl.py-8.bg-cms-selected blockquote").first().waitFor();
  await button(newTab, "Back to editor").click();
  assert.deepEqual(await readFresh(), original);

  await b.setOffline(true);
  await autosave.check();
  await newTab.waitForTimeout(3300);
  assert.equal(await newTab.getByText("Saved successfully", { exact: true }).count(), 0);
  assert.deepEqual(await readFresh(), original);
  await b.setOffline(false);
  await newTab.getByText("Saved successfully", { exact: true }).waitFor();
  const autosaved = await readFresh();
  assert.notEqual(autosaved.version, original.version);
  assert.equal(autosaved.revision.content_blocks.blocks[0].content.quote, secondQuote);
  assert.equal(autosaved.revision.content_blocks.blocks[1].layout.visualWidth, "narrow");
  assert.match(JSON.stringify(autosaved.revision.content_blocks), /and history/);

  const interferingWrite = await db.rpc("cms_save_case_study", {
    project, expected: autosaved.version, fields: { ...fields, summary: "Newer version during autosave" },
    document: autosaved.revision.content_blocks,
  });
  assert.ifError(interferingWrite.error);
  await editFirst(newTab, "Keep this failed autosave edit");
  await newTab.getByRole("alert").filter({ hasText: "This data changed" }).waitFor();
  assert.equal((await readFresh()).revision.summary, "Newer version during autosave");
  assert.equal(await properties(newTab).getByLabel("Quotation", { exact: true }).inputValue(), "Keep this failed autosave edit");
  await button(newTab, "Review latest draft").click();
  await newTab.getByRole("radio", { name: /Keep my case study/ }).check();
  await button(newTab, "Apply changes to latest draft").click();
  assert.equal(await autosave.isChecked(), false);
  console.log("Stage 7.5 visual presets, keyboard drag, block and Rich Text history, opt-in offline-safe autosave and real autosave conflict passed.");

  console.log(JSON.stringify({ delayedSaveSampleMs, inputBurstWrites, totalObservedSnapshotWrites: observedWrites.length,
    localStorageWriteMs: observedWrites[0] }));
  console.log("Persistence, offline/reset/HTTP failures, committed response loss, session removal, recovery, legacy import, conflict and logout passed.");
} finally {
  await browser.close();
}
