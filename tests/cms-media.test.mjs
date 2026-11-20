import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanFileName,
  formatMediaSize,
  MAX_MEDIA_BYTES,
  mediaFormat,
  validateMediaInput,
} from "../lib/cms/media-formats.ts";

test("allowlists supported MIME and extension pairs across image, GIF and video", () => {
  for (const [name, type] of [
    ["design.JPEG", "image/jpeg"],
    ["design.png", "image/png"],
    ["design.webp", "image/webp"],
    ["design.avif", "image/avif"],
    ["motion.gif", "image/gif"],
    ["motion.mp4", "video/mp4"],
    ["motion.webm", "video/webm"],
  ])
    assert.equal(validateMediaInput(name, type, MAX_MEDIA_BYTES), null);

  assert.ok(validateMediaInput("design.png", "image/jpeg", 10));
  assert.ok(validateMediaInput("unsafe.svg", "image/svg+xml", 10));
  assert.ok(validateMediaInput("application.html", "text/html", 10));
  assert.equal(mediaFormat("toString"), undefined);
});

test("validates file sizes and rejects path-shaped names", () => {
  assert.equal(cleanFileName("  chart\u202e.png\n "), "chart.png");
  for (const name of [
    "../chart.png",
    "sub/chart.png",
    "sub\\chart.png",
    "png",
    ".",
  ]) {
    assert.ok(validateMediaInput(name, "image/png", 10));
  }
  assert.ok(validateMediaInput("exact.png", "image/png", 0));
  assert.ok(
    validateMediaInput("oversize.png", "image/png", MAX_MEDIA_BYTES + 1),
  );
  assert.equal(formatMediaSize(MAX_MEDIA_BYTES), "4.0 MiB");
});
