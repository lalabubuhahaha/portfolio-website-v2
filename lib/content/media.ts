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
) {
  let query = supabase
    .from("media_assets")
    .select(assetColumns, { count: "exact" })
    .eq("storage_bucket", MEDIA_BUCKET);
  if (picker) query = query.eq("state", "ready");
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
