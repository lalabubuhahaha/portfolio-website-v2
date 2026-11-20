import { cache } from "react";
import { MEDIA_BUCKET, mediaFormat } from "@/lib/cms/media-formats";
import { MEDIA_URL_TTL } from "./media";
import type { DraftFields } from "@/lib/cms/project-fields";
import { requireAdmin } from "@/lib/cms/session";

export type Project = {
  id: string;
  title: string;
  category: "Independent" | "Client";
  year: number | null;
  updatedAt: string;
  published: boolean;
  featured: boolean;
  featuredIntent: boolean;
  unpublishedChanges: boolean;
  slug: string;
  summary: string;
  archived: boolean;
  displayOrder: number;
  featuredOrder: number;
  coverPath: string | null;
};

export const getGravityProjects = cache(
  async (includeArchived = false): Promise<Project[] | null> => {
    const { supabase } = await requireAdmin();
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id")
      .eq("key", "gravity")
      .single();
    if (siteError || !site) return null;

    const projects: Project[] = [];
    const batchSize = 100;

    for (let offset = 0; ; offset += batchSize) {
      const query = supabase
        .from("projects")
        .select(
          `
      id, slug, category, updated_at, archived_at,
      revisions:project_revisions!project_revisions_project_id_fkey(id, title, year, summary, cover:media_assets(storage_bucket,storage_path,mime_type)),
      settings:project_site_settings!project_site_settings_project_id_fkey(published_revision_id, is_featured, display_order, featured_order)
    `,
        )
        .eq("settings.site_id", site.id)
        .order("revision_number", {
          referencedTable: "revisions",
          ascending: false,
        })
        .limit(1, { referencedTable: "revisions" })
        .order("updated_at", { ascending: false })
        .order("id")
        .range(offset, offset + batchSize - 1);
      const { data, error } = await (includeArchived
        ? query
        : query.is("archived_at", null));
      if (error) return null;

      for (const row of data) {
        const settings = row.settings[0];
        const revision = row.revisions[0];
        const cover = Array.isArray(revision?.cover)
          ? revision.cover[0]
          : revision?.cover;
        projects.push({
          id: row.id,
          title: revision?.title ?? row.slug,
          category: row.category === "independent" ? "Independent" : "Client",
          year: revision?.year ?? null,
          updatedAt: row.updated_at,
          published: Boolean(settings?.published_revision_id),
          featured: Boolean(
            settings?.published_revision_id &&
            settings.is_featured &&
            !row.archived_at,
          ),
          featuredIntent: Boolean(settings?.is_featured),
          unpublishedChanges: Boolean(
            settings?.published_revision_id &&
            revision &&
            settings.published_revision_id !== revision.id,
          ),
          slug: row.slug,
          summary: revision?.summary ?? "",
          archived: Boolean(row.archived_at),
          displayOrder: settings?.display_order ?? 0,
          featuredOrder: settings?.featured_order ?? 0,
          coverPath:
            cover?.storage_bucket === "cms-private" &&
            cover.mime_type.startsWith("image/")
              ? cover.storage_path
              : null,
        });
      }
      if (data.length < batchSize) return projects;
    }
  },
);

export const displayDate = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "Asia/Taipei",
});

export async function getProjectEditor(id: string) {
  const { supabase } = await requireAdmin();
  const [{ data: site, error: siteError }, { data: row, error }] =
    await Promise.all([
      supabase.from("sites").select("id").eq("key", "gravity").single(),
      supabase
        .from("projects")
        .select(
          `
      id, slug, category, updated_at, archived_at,
      revisions:project_revisions!project_revisions_project_id_fkey(
        id, title, summary, year, role, tools, category_tags, external_url, cover_asset_id, seo_title, seo_description
      )
    `,
        )
        .eq("id", id)
        .order("revision_number", {
          referencedTable: "revisions",
          ascending: false,
        })
        .limit(1, { referencedTable: "revisions" })
        .maybeSingle(),
    ]);
  if (error || siteError || !site)
    throw new Error("Project data is temporarily unavailable.");
  if (!row) return null;
  const { data: settings, error: settingsError } = await supabase
    .from("project_site_settings")
    .select("published_revision_id")
    .eq("project_id", id)
    .eq("site_id", site.id)
    .maybeSingle();
  if (settingsError)
    throw new Error("Project settings are temporarily unavailable.");
  const revision = row.revisions[0];
  const fields: DraftFields = {
    title: revision?.title ?? "",
    slug: row.slug,
    category: row.category === "client" ? "client" : "independent",
    summary: revision?.summary ?? "",
    year: revision?.year?.toString() ?? "",
    role: revision?.role ?? "",
    tools: revision?.tools?.join(", ") ?? "",
    category_tags: revision?.category_tags?.join(", ") ?? "",
    external_url: revision?.external_url ?? "",
    cover_asset_id: revision?.cover_asset_id ?? "",
    seo_title: revision?.seo_title ?? "",
    seo_description: revision?.seo_description ?? "",
  };
  return {
    id: row.id as string,
    fields,
    updatedAt: row.updated_at as string,
    archived: Boolean(row.archived_at),
    published: Boolean(settings?.published_revision_id),
    unpublishedChanges: Boolean(
      settings?.published_revision_id &&
      revision &&
      settings.published_revision_id !== revision.id,
    ),
  };
}

export async function getCoverPreviews(projects: Project[]) {
  const paths = [
    ...new Set(
      projects.flatMap((project) =>
        project.coverPath ? [project.coverPath] : [],
      ),
    ),
  ];
  const previews: Record<string, string> = Object.create(null);
  if (!paths.length) return previews;
  const { supabase } = await requireAdmin();
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { data: assets } = await supabase
      .from("media_assets")
      .select("storage_path,thumbnail_path,mime_type,file_size")
      .eq("storage_bucket", MEDIA_BUCKET)
      .eq("state", "ready")
      .in("storage_path", paths.slice(offset, offset + 100));
    const targets = new Map<string, string>();
    for (const asset of assets ?? []) {
      if (mediaFormat(asset.mime_type)?.kind !== "image") continue;
      const preview =
        asset.thumbnail_path ??
        (asset.file_size <= 128 * 1024 ? asset.storage_path : null);
      if (preview) targets.set(preview, asset.storage_path);
    }
    if (!targets.size) continue;
    const { data } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls([...targets.keys()], MEDIA_URL_TTL);
    for (const asset of data ?? []) {
      const original = asset.path && targets.get(asset.path);
      if (original && asset.signedUrl && !asset.error)
        previews[original] = asset.signedUrl;
    }
  }
  return previews;
}

export const displayDateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Taipei",
});
