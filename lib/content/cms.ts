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

const gravitySettings = `settings:project_site_settings!project_site_settings_project_id_fkey(
  published_revision_id, is_featured, display_order, featured_order, site:sites!inner()
)`;

type ProjectListRow = {
  id: string;
  slug: string;
  category: string;
  updated_at: string;
  archived_at: string | null;
  revisions: {
    id: string;
    title: string;
    year?: number | null;
    summary?: string;
    cover?: {
      storage_bucket: string;
      storage_path: string;
      thumbnail_path: string | null;
      mime_type: string;
      state: string;
      file_size: number;
    } | null;
  }[];
  settings: {
    published_revision_id: string | null;
    is_featured: boolean;
    display_order: number;
    featured_order: number;
  }[];
};

export const getGravityProjects = cache(
  async (includeArchived = false): Promise<Project[] | null> => {
    const { supabase } = await requireAdmin();
    const revisionFields = includeArchived
      ? "id,title,year,summary,cover:media_assets(storage_bucket,storage_path,thumbnail_path,mime_type,state,file_size)"
      : "id,title";

    const projects: Project[] = [];
    const batchSize = 100;

    for (let offset = 0; ; offset += batchSize) {
      const query = supabase
        .from("projects")
        .select(
          `id,slug,category,updated_at,archived_at,
          revisions:project_revisions!project_revisions_project_id_fkey(${revisionFields}), ${gravitySettings}`,
        )
        .eq("settings.site.key", "gravity")
        .order("revision_number", {
          referencedTable: "revisions",
          ascending: false,
        })
        .limit(1, { referencedTable: "revisions" })
        .order("updated_at", { ascending: false })
        .order("id")
        .range(offset, offset + batchSize - 1);
      const { data, error } = await (
        includeArchived ? query : query.is("archived_at", null)
      ).overrideTypes<ProjectListRow[], { merge: false }>();
      if (error) return null;

      for (const row of data) {
        const settings = row.settings[0];
        const revision = row.revisions[0];
        const cover = revision?.cover;
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
            cover?.storage_bucket === MEDIA_BUCKET &&
            cover.state === "ready" &&
            mediaFormat(cover.mime_type)?.kind === "image"
              ? (cover.thumbnail_path ??
                (cover.file_size <= 128 * 1024 ? cover.storage_path : null))
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
  const { data: row, error } = await supabase
    .from("projects")
    .select(
      `
      id, slug, category, updated_at, archived_at,
      revisions:project_revisions!project_revisions_project_id_fkey(
        id, title, summary, year, role, tools, category_tags, external_url, cover_asset_id, seo_title, seo_description
      ),
      settings:project_site_settings!project_site_settings_project_id_fkey(published_revision_id, site:sites!inner())
    `,
    )
    .eq("id", id)
    .eq("settings.site.key", "gravity")
    .order("revision_number", {
      referencedTable: "revisions",
      ascending: false,
    })
    .limit(1, { referencedTable: "revisions" })
    .maybeSingle();
  if (error) throw new Error("Project data is temporarily unavailable.");
  if (!row) return null;
  const settings = row.settings[0];
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

export type CoverPreviews = Record<
  string,
  { url: string | null; expiresAt: number }
>;

export async function getCoverPreviews(
  paths: string[],
): Promise<CoverPreviews> {
  if (!paths.length) return {};
  const { supabase } = await requireAdmin();
  const now = Date.now();
  const { data } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, MEDIA_URL_TTL);
  const urls = new Map(
    (data ?? []).map((item) => [item.path, item.error ? null : item.signedUrl]),
  );
  return Object.fromEntries(
    paths.map((path) => {
      const url = urls.get(path) ?? null;
      return [
        path,
        { url, expiresAt: now + (url ? MEDIA_URL_TTL - 5 : 15) * 1000 },
      ];
    }),
  );
}

export const displayDateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Taipei",
});
