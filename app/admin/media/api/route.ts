import { z } from "zod";
import {
  cleanFileName,
  MAX_MEDIA_BYTES,
  MEDIA_BUCKET,
  mediaFormat,
  validateMediaInput,
} from "@/lib/cms/media-formats";
import { inspectMedia } from "@/lib/cms/media-validation";
import { loadMedia, parseMediaFilter } from "@/lib/content/media";
import { createMediaWriter } from "@/lib/supabase/media-writer";
import { mediaAdmin, mediaJson, readMediaBody, sameOrigin } from "./http";

export const maxDuration = 60;

export async function GET(request: Request) {
  const admin = await mediaAdmin();
  if (admin.response) return admin.response;
  const params = new URL(request.url).searchParams;
  const result = await loadMedia(
    admin.session.supabase,
    parseMediaFilter(params),
    params.get("picker") === "1",
    params.get("images") === "1",
    params.get("motion") === "1",
  );
  return result
    ? mediaJson(result)
    : mediaJson({ error: "Media could not be loaded." }, 503);
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return mediaJson({ error: "Invalid request origin." }, 403);
  const admin = await mediaAdmin();
  if (admin.response) return admin.response;
  const writer = createMediaWriter();
  if (!writer)
    return mediaJson(
      {
        error:
          "Media writes are unavailable. Set the server Storage credential.",
      },
      503,
    );

  const id = z.uuid().safeParse(request.headers.get("x-upload-id"));
  if (!id.success)
    return mediaJson({ error: "Invalid upload identifier." }, 400);
  const mime = request.headers.get("content-type") ?? "";
  const format = mediaFormat(mime);
  let name: string;
  try {
    name = cleanFileName(
      decodeURIComponent(request.headers.get("x-file-name") ?? ""),
    );
  } catch {
    return mediaJson({ error: "Invalid file name." }, 400);
  }

  const { data: existing, error: lookupError } = await writer
    .from("media_assets")
    .select("state,uploaded_by,file_name,mime_type")
    .eq("id", id.data)
    .maybeSingle();
  if (lookupError)
    return mediaJson({ error: "Media database is unavailable." }, 503);
  if (existing) {
    if (
      existing.state === "ready" &&
      existing.uploaded_by === admin.session.user.id &&
      existing.file_name === name &&
      existing.mime_type === mime
    )
      return mediaJson({ id: id.data });
    return mediaJson(
      {
        error:
          "This upload is already active or awaiting cleanup. Check the library before retrying.",
      },
      409,
    );
  }
  const earlyError = validateMediaInput(
    name,
    mime,
    Number(request.headers.get("content-length") ?? 1),
  );
  if (earlyError || !format)
    return mediaJson({ error: earlyError ?? "Unsupported format." }, 400);

  const { data: allowed, error: rateError } = await writer.rpc(
    "cms_media_take_upload_slot",
    { actor: admin.session.user.id },
  );
  if (rateError)
    return mediaJson({ error: "Could not authorize the upload." }, 503);
  if (!allowed)
    return mediaJson(
      { error: "Upload limit reached. Retry in one minute." },
      429,
    );

  let bytes: Buffer | null;
  try {
    bytes = await readMediaBody(request, MAX_MEDIA_BYTES);
  } catch {
    return mediaJson(
      { error: "Upload was interrupted. Retry when connected." },
      400,
    );
  }
  if (!bytes)
    return mediaJson(
      { error: "Each file must be between 1 byte and 4 MiB." },
      413,
    );
  const inputError = validateMediaInput(name, mime, bytes.length);
  if (inputError) return mediaJson({ error: inputError }, 400);
  let details: Awaited<ReturnType<typeof inspectMedia>>;
  try {
    details = await inspectMedia(bytes, mime);
  } catch {
    return mediaJson(
      {
        error:
          "The file content does not match its format, or the image is unreadable or exceeds 32 megapixels.",
      },
      415,
    );
  }
  if (request.signal.aborted)
    return mediaJson({ error: "Upload canceled." }, 499);

  const prefix = `v1/${admin.session.user.id}/${id.data}`;
  const original = prefix + "/original." + format.ext;
  const thumb = details.thumbnail ? prefix + "/thumbnail.webp" : null;
  const { error: reserveError } = await writer.from("media_assets").insert({
    id: id.data,
    storage_bucket: MEDIA_BUCKET,
    storage_path: original,
    thumbnail_path: thumb,
    uploaded_by: admin.session.user.id,
    file_name: name,
    mime_type: mime,
    file_size: bytes.length,
    width: details.width,
    height: details.height,
    state: "uploading",
  });
  if (reserveError)
    return mediaJson(
      {
        error:
          reserveError.code === "23505"
            ? "Upload already in progress. Retry shortly."
            : "Could not reserve the media record. No file was sent to Storage.",
      },
      reserveError.code === "23505" ? 409 : 503,
    );

  const storage = writer.storage.from(MEDIA_BUCKET);
  const assets = () => writer.from("media_assets");
  async function compensate() {
    const { error } = await storage.remove(
      thumb ? [original, thumb] : [original],
    );
    if (error)
      await assets()
        .update({ state: "failed" })
        .eq("id", id.data)
        .eq("state", "uploading");
    else await assets().delete().eq("id", id.data).eq("state", "uploading");
  }

  const uploaded = await storage.upload(original, bytes, {
    contentType: mime,
    upsert: false,
    cacheControl: "0",
  });
  const derivative =
    !uploaded.error && thumb && details.thumbnail
      ? await storage.upload(thumb, details.thumbnail, {
          contentType: "image/webp",
          upsert: false,
          cacheControl: "0",
        })
      : null;
  if (uploaded.error || derivative?.error) {
    await compensate();
    return mediaJson(
      {
        error:
          "Storage could not save the file. Retry or check the library for an incomplete upload.",
      },
      502,
    );
  }

  const finalized = await writer
    .from("media_assets")
    .update({ state: "ready" })
    .eq("id", id.data)
    .eq("state", "uploading")
    .select("id")
    .maybeSingle();
  if (finalized.error || !finalized.data) {
    const check = await writer
      .from("media_assets")
      .select("state")
      .eq("id", id.data)
      .maybeSingle();
    if (check.data?.state === "ready") return mediaJson({ id: id.data });
    if (!check.error && check.data?.state === "uploading") await compensate();
    return mediaJson(
      {
        error:
          "Could not confirm that the media was saved. Retry or check the library.",
      },
      503,
    );
  }
  return mediaJson({ id: id.data }, 201);
}
