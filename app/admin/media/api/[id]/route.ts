import { z } from "zod";
import { MEDIA_BUCKET } from "@/lib/cms/media-formats";
import { loadMediaAsset } from "@/lib/content/media";
import { createMediaWriter } from "@/lib/supabase/media-writer";
import { mediaAdmin, mediaJson, readMediaBody, sameOrigin } from "../http";

type Context = { params: Promise<{ id: string }> };
const idSchema = z.uuid();
const details = z
  .object({
    displayName: z.string().trim().min(1).max(160),
    alt: z.string().trim().max(500),
    caption: z.string().trim().max(2000),
  })
  .strict();

export async function GET(_request: Request, context: Context) {
  const admin = await mediaAdmin();
  if (admin.response) return admin.response;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return mediaJson({ error: "Media not found." }, 404);
  try {
    const result = await loadMediaAsset(admin.session.supabase, id.data);
    return result
      ? mediaJson(result)
      : mediaJson({ error: "Media not found or unavailable." }, 404);
  } catch {
    return mediaJson(
      { error: "The preview is unavailable. Try loading it again." },
      503,
    );
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request))
    return mediaJson({ error: "Invalid request origin." }, 403);
  const admin = await mediaAdmin();
  if (admin.response) return admin.response;
  const id = idSchema.safeParse((await context.params).id);
  let raw: unknown;
  try {
    const content = await readMediaBody(request, 16 * 1024);
    raw = content ? JSON.parse(content.toString("utf8")) : null;
  } catch {
    raw = null;
  }
  const input = details.safeParse(raw);
  if (!id.success || !input.success)
    return mediaJson({ error: "Check the name, alt text and caption." }, 400);
  const writer = createMediaWriter();
  if (!writer)
    return mediaJson({ error: "Media writes are unavailable." }, 503);
  const { data, error } = await writer
    .from("media_assets")
    .update({
      display_name: input.data.displayName,
      alt_text: input.data.alt,
      caption: input.data.caption,
    })
    .eq("id", id.data)
    .eq("storage_bucket", MEDIA_BUCKET)
    .eq("state", "ready")
    .select("id")
    .maybeSingle();
  if (error)
    return mediaJson({ error: "Changes could not be saved. Try again." }, 503);
  return data
    ? mediaJson({ id: data.id })
    : mediaJson({ error: "Media not found or unavailable." }, 404);
}

export async function DELETE(request: Request, context: Context) {
  if (!sameOrigin(request))
    return mediaJson({ error: "Invalid request origin." }, 403);
  const admin = await mediaAdmin();
  if (admin.response) return admin.response;
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return mediaJson({ error: "Media not found." }, 404);
  const writer = createMediaWriter();
  if (!writer)
    return mediaJson({ error: "Media writes are unavailable." }, 503);

  const begin = await writer.rpc("cms_media_begin_delete", { asset: id.data });
  if (begin.error) {
    const error =
      begin.error.code === "PT409"
        ? begin.error.message === "Upload still active"
          ? "Wait for the upload to finish before removing it."
          : "This asset is referenced by a project revision and cannot be deleted."
        : "Could not verify asset references. Try again.";
    return mediaJson({ error }, begin.error.code === "PT409" ? 409 : 503);
  }
  if (!begin.data) return mediaJson({ id: id.data });
  const { data, error } = await writer
    .from("media_assets")
    .select("storage_path,thumbnail_path")
    .eq("id", id.data)
    .eq("storage_bucket", MEDIA_BUCKET)
    .eq("state", "deleting")
    .maybeSingle();
  if (error)
    return mediaJson(
      {
        error: "Could not load the pending deletion. Retry to finish cleanup.",
      },
      503,
    );
  if (data) {
    const paths = data.thumbnail_path
      ? [data.storage_path, data.thumbnail_path]
      : [data.storage_path];
    const storage = await writer.storage.from(MEDIA_BUCKET).remove(paths);
    if (storage.error)
      return mediaJson(
        { error: "Storage deletion failed. Retry to finish cleanup." },
        502,
      );
    const removed = await writer
      .from("media_assets")
      .delete()
      .eq("id", id.data)
      .eq("state", "deleting");
    if (removed.error)
      return mediaJson(
        { error: "The file was removed. Retry to finish metadata cleanup." },
        503,
      );
  }
  return mediaJson({ id: id.data });
}
