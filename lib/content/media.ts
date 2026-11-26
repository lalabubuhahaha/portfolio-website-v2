import type { ContentBlocks } from "@/lib/cms/blocks";
import type { DraftFields } from "@/lib/cms/project-fields";
import { MEDIA_BUCKET, mediaFormat } from "@/lib/cms/media-formats";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_PAGE_SIZE = 24;
export const MEDIA_URL_TTL = 120;

const assetColumns =
  "id,file_name,display_name,mime_type,file_size,width,height,alt_text,caption,created_at,storage_path,thumbnail_path,state";

export type MediaAsset = {
  id: string;
  fileName: string;
  displayName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  createdAt: string;
  state: "uploading" | "ready" | "failed" | "deleting";
  thumbnail: string | null;
};

type Row = {
  id: string;
  file_name: string;
  display_name: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  alt_text: string;
  caption: string | null;
  created_at: string;
  storage_path: string;
  thumbnail_path: string | null;
  state: MediaAsset["state"];
};

export function parseMediaFilter(params: URLSearchParams) {
  const type = params.get("type") ?? "";
  const page = Number(params.get("page"));
  return {
    q: (params.get("q") ?? "").trim().slice(0, 120),
    type: type === "image" || type === "video" || mediaFormat(type) ? type : "",
    sort: params.get("sort") === "oldest" ? "oldest" : "newest",
    page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1,
  };
}

function present(row: Row, thumbnail: string | null): MediaAsset {
  return {
    id: row.id,
    fileName: row.file_name,
    displayName: row.display_name ?? row.file_name,
    mime: row.mime_type,
    size: row.file_size,
    width: row.width,
    height: row.height,
    alt: row.alt_text,
    caption: row.caption ?? "",
    createdAt: row.created_at,
    state: row.state,
    thumbnail,
  };
}

export async function loadMedia(
  supabase: SupabaseClient,
  filter: ReturnType<typeof parseMediaFilter>,
  picker: boolean,
  imagesOnly: boolean,
  motionOnly = false,
) {
  let query = supabase
    .from("media_assets")
    .select(assetColumns, { count: "exact" })
    .eq("storage_bucket", MEDIA_BUCKET);
  if (picker) query = query.eq("state", "ready");
  if (motionOnly) query = query.in("mime_type", ["image/gif", "video/mp4", "video/webm"]);
  if (imagesOnly)
    query = query.in("mime_type", [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ]);
  if (filter.type === "image" || filter.type === "video")
    query = query.like("mime_type", filter.type + "/%");
  else if (filter.type) query = query.eq("mime_type", filter.type);
  if (filter.q)
    query = query.ilike(
      "search_name",
      "%" + filter.q.replace(/[\\%_]/g, "\\$&") + "%",
    );
  const start = (filter.page - 1) * MEDIA_PAGE_SIZE;
  const ascending = filter.sort === "oldest";
  const { data, error, count } = await query
    .order("created_at", { ascending })
    .order("id", { ascending })
    .range(start, start + MEDIA_PAGE_SIZE - 1);
  if (error || !data) return null;

  const rows: Row[] = data;
  const paths = rows.flatMap((row) =>
    row.state === "ready" && row.thumbnail_path ? [row.thumbnail_path] : [],
  );
  const signed = paths.length
    ? await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrls(paths, MEDIA_URL_TTL)
    : null;
  const thumbnails = new Map(
    (signed?.data ?? []).map((item) => [
      item.path,
      item.error ? null : item.signedUrl,
    ]),
  );
  return {
    items: rows.map((row) =>
      present(row, thumbnails.get(row.thumbnail_path ?? "") ?? null),
    ),
    total: count ?? 0,
    pages: Math.max(1, Math.ceil((count ?? 0) / MEDIA_PAGE_SIZE)),
  };
}

export async function loadMediaAsset(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("media_assets")
    .select(assetColumns)
    .eq("id", id)
    .eq("storage_bucket", MEDIA_BUCKET)
    .maybeSingle();
  if (error) throw new Error("Media could not be loaded.");
  if (!data || data.state !== "ready" || !mediaFormat(data.mime_type))
    return null;
  const { data: signed } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(data.storage_path, MEDIA_URL_TTL);
  if (!signed?.signedUrl) throw new Error("Preview could not be loaded.");
  return { asset: present(data, null), url: signed.signedUrl };
}

export async function validateRecoveryAssets(
  supabase: SupabaseClient,
  fields: DraftFields,
  document: ContentBlocks,
) {
  const refs = new Map<string, Set<"image" | "motion">>();
  function add(id: string | null, kind: "image" | "motion" = "image") {
    if (!id) return;
    const key = id.toLowerCase();
    const kinds = refs.get(key) ?? new Set();
    kinds.add(kind);
    refs.set(key, kinds);
  }
  add(fields.cover_asset_id);
  const stack = [...document.blocks];
  while (stack.length) {
    const block = stack.pop()!;
    if (block.children) stack.push(...block.children);
    switch (block.type) {
      case "image":
      case "image-text": add(block.content.assetId); break;
      case "gallery": for (const item of block.content.images) add(item.assetId); break;
      case "video": add(block.content.assetId, "motion"); add(block.content.posterId); break;
      case "comparison": add(block.content.beforeId); add(block.content.afterId); break;
    }
  }
  const names: Record<string, string> = {};
  const ids = [...refs.keys()];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { data, error } = await supabase.from("media_assets").select("id,mime_type,display_name,file_name")
      .eq("storage_bucket", MEDIA_BUCKET).eq("state", "ready").in("id", batch)
      .abortSignal(AbortSignal.timeout(12_000));
    if (error) throw new Error("Could not verify recovery media.");
    if (data.length !== batch.length || data.some((asset) =>
      [...(refs.get(asset.id) ?? [])].some((kind) => kind === "image"
        ? mediaFormat(asset.mime_type)?.kind !== "image"
        : !["video/mp4", "video/webm", "image/gif"].includes(asset.mime_type)))) return null;
    for (const asset of data) names[asset.id] = asset.display_name ?? asset.file_name;
  }
  return names;
}
