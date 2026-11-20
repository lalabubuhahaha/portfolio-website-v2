import type { Project } from "@/lib/content/cms";

export const WORKS_PAGE_SIZE = 24;

export function parseWorksFilters(params: URLSearchParams) {
  const category = params.get("category") ?? "";
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "";
  const page = Number(params.get("page"));
  return {
    q: (params.get("q") ?? "").trim().slice(0, 120),
    category: ["independent", "client"].includes(category) ? category : "",
    status: ["published", "draft", "archived"].includes(status) ? status : "",
    sort: ["oldest", "display"].includes(sort) ? sort : "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function selectWorksPage(
  projects: Project[],
  filters: ReturnType<typeof parseWorksFilters>,
) {
  const q = filters.q.toLowerCase();
  const visible = projects.filter(
    (project) =>
      project.archived === (filters.status === "archived") &&
      (filters.status !== "published" || project.published) &&
      (filters.status !== "draft" || !project.published) &&
      (!filters.category ||
        project.category.toLowerCase() === filters.category) &&
      (!q ||
        [project.title, project.slug, project.summary].some((value) =>
          value.toLowerCase().includes(q),
        )),
  );
  if (filters.sort === "display")
    visible.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id),
    );
  if (filters.sort === "oldest")
    visible.sort(
      (a, b) =>
        Date.parse(a.updatedAt) - Date.parse(b.updatedAt) ||
        a.id.localeCompare(b.id),
    );
  const pages = Math.max(1, Math.ceil(visible.length / WORKS_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  return {
    projects: visible.slice(
      (page - 1) * WORKS_PAGE_SIZE,
      page * WORKS_PAGE_SIZE,
    ),
    total: visible.length,
    pages,
    page,
  };
}

export function coverPaths(projects: Project[]) {
  return [
    ...new Set(
      projects.flatMap((project) =>
        project.coverPath ? [project.coverPath] : [],
      ),
    ),
  ];
}
