import { cache } from "react";
import { requireAdmin } from "@/lib/cms/session";

export type Project = {
  id: string;
  title: string;
  category: "Independent" | "Client";
  year: number | null;
  updatedAt: string;
  published: boolean;
  featured: boolean;
};

export const getGravityProjects = cache(async (): Promise<Project[] | null> => {
  const { supabase } = await requireAdmin();
  const { data: site, error: siteError } = await supabase
    .from("sites").select("id").eq("key", "gravity").single();
  if (siteError || !site) return null;

  const projects: Project[] = [];
  const batchSize = 100;

  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase.from("projects").select(`
      id, slug, category, updated_at,
      revisions:project_revisions!project_revisions_project_id_fkey(title, year),
      settings:project_site_settings!project_site_settings_project_id_fkey(published_revision_id, is_featured)
    `)
      .is("archived_at", null)
      .eq("settings.site_id", site.id)
      .order("revision_number", { referencedTable: "revisions", ascending: false })
      .limit(1, { referencedTable: "revisions" })
      .order("updated_at", { ascending: false })
      .order("id")
      .range(offset, offset + batchSize - 1);
    if (error) return null;

    for (const row of data) {
      const settings = row.settings[0];
      const revision = row.revisions[0];
      projects.push({
        id: row.id,
        title: revision?.title ?? row.slug,
        category: row.category === "independent" ? "Independent" : "Client",
        year: revision?.year ?? null,
        updatedAt: row.updated_at,
        published: Boolean(settings?.published_revision_id),
        featured: Boolean(settings?.published_revision_id && settings.is_featured),
      });
    }
    if (data.length < batchSize) return projects;
  }
});

export const displayDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "Asia/Taipei" });
