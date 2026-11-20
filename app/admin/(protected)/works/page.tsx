import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { FolderOpen, ImageIcon, Plus, Search } from "lucide-react";
import {
  DataUnavailable,
  PageHeader,
  ProjectStats,
} from "@/components/admin/page-layout";
import { Button } from "@/components/admin/ui/button";
import { Input, Select } from "@/components/admin/ui/fields";
import {
  displayDateTime,
  getCoverPreviews,
  getGravityProjects,
  type Project,
} from "@/lib/content/cms";
import { FeaturedToggle, ProjectActions } from "./project-controls";
import { ProjectOrder } from "./project-order";

const columns = [
  "Cover",
  "Project Title",
  "Category",
  "Year",
  "Status",
  "Featured",
  "Last Updated",
  "Actions",
];
type Filters = { q: string; category: string; status: string; sort: string };
type Search = Record<string, string | string[] | undefined>;

function parseFilters(params: Search): Filters {
  const one = (key: string) =>
    typeof params[key] === "string" ? params[key] : "";
  const category = one("category");
  const status = one("status");
  const sort = one("sort");
  return {
    q: one("q").trim().slice(0, 120),
    category: ["independent", "client"].includes(category) ? category : "",
    status: ["published", "draft", "archived"].includes(status) ? status : "",
    sort: ["oldest", "display"].includes(sort) ? sort : "",
  };
}

function ProjectStatus({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-md px-2 py-1 text-xs font-medium ${project.published && !project.archived ? "bg-emerald-50 text-emerald-800" : "bg-cms-background text-cms-secondary"}`}
      >
        {project.archived
          ? "Archived"
          : project.published
            ? "Published"
            : "Draft"}
      </span>
      {!project.archived && project.unpublishedChanges && (
        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
          Unpublished changes
        </span>
      )}
    </div>
  );
}

function ProjectTable({
  projects,
  previews,
}: {
  projects: Project[];
  previews: Record<string, string>;
}) {
  return (
    <table role="table" className="block w-full text-left text-sm xl:table">
      <thead
        role="rowgroup"
        className="hidden border-b border-cms-border bg-cms-background text-xs text-cms-secondary xl:table-header-group"
      >
        <tr role="row">
          {columns.map((label) => (
            <th
              key={label}
              scope="col"
              role="columnheader"
              className="px-3 py-3 font-medium"
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody
        role="rowgroup"
        className="block divide-y divide-cms-border xl:table-row-group"
      >
        {projects.map((project) => {
          const cover = project.coverPath && previews[project.coverPath];
          return (
            <tr
              key={project.id}
              role="row"
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-3 sm:p-4 xl:table-row"
            >
              <td
                role="cell"
                className="col-start-1 row-start-1 xl:px-3 xl:py-3"
              >
                {cover ? (
                  <Image
                    src={cover}
                    unoptimized
                    width={44}
                    height={44}
                    alt=""
                    className="size-11 rounded-md border border-cms-border object-cover"
                  />
                ) : (
                  <span
                    aria-label="No cover preview"
                    className="grid size-11 place-items-center rounded-md border border-cms-border bg-cms-background text-cms-muted"
                  >
                    <ImageIcon aria-hidden className="size-4" />
                  </span>
                )}
              </td>
              <th
                scope="row"
                role="rowheader"
                className="col-start-2 row-start-1 min-w-0 break-words font-medium xl:px-3 xl:py-3"
              >
                <Link
                  className="hover:text-cms-primary hover:underline"
                  href={`/admin/works/${project.id}`}
                >
                  {project.title}
                </Link>
                <span className="block text-xs font-normal text-cms-secondary">
                  /{project.slug}
                </span>
              </th>
              <td
                role="cell"
                className="col-start-2 text-xs text-cms-secondary xl:p-3 xl:text-sm"
              >
                <span className="xl:hidden">Category · </span>
                {project.category}
              </td>
              <td
                role="cell"
                className="col-start-2 text-xs text-cms-secondary xl:p-3 xl:text-sm"
              >
                <span className="xl:hidden">Year · </span>
                {project.year ?? "—"}
              </td>
              <td role="cell" className="col-start-2 xl:p-3">
                <ProjectStatus project={project} />
              </td>
              <td role="cell" className="col-start-2 xl:p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-cms-secondary">
                  <span className="xl:sr-only">Featured</span>
                  <FeaturedToggle
                    id={project.id}
                    title={project.title}
                    featured={project.featuredIntent}
                    archived={project.archived}
                  />
                  {project.featuredIntent &&
                    !project.archived &&
                    !project.published && <span>Pending Publication</span>}
                </div>
              </td>
              <td
                role="cell"
                className="col-start-2 whitespace-nowrap text-xs text-cms-secondary xl:p-3"
              >
                <span className="xl:hidden">Last updated · </span>
                <time dateTime={project.updatedAt}>
                  {displayDateTime.format(new Date(project.updatedAt))}
                </time>
              </td>
              <td role="cell" className="col-start-3 row-start-1 xl:p-3">
                <ProjectActions
                  id={project.id}
                  title={project.title}
                  archived={project.archived}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

async function Works({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const mode =
    params.order === "display" || params.order === "featured"
      ? params.order
      : undefined;
  const projects = await getGravityProjects(true);
  const active = projects?.filter((project) => !project.archived) ?? [];
  const orderEntries = active
    .filter((project) => mode !== "featured" || project.featuredIntent)
    .sort(
      (a, b) =>
        (mode === "featured"
          ? a.featuredOrder - b.featuredOrder
          : a.displayOrder - b.displayOrder) || a.id.localeCompare(b.id),
    );
  const q = filters.q.toLowerCase();
  const visible =
    projects?.filter(
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
    ) ?? [];
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
  const previews = mode ? {} : await getCoverPreviews(visible);

  return (
    <>
      <PageHeader
        title="Works"
        description="Manage your drafts, project order and featured settings."
        action={
          <Button asChild>
            <Link href="/admin/works/new">
              <Plus />
              New Project
            </Link>
          </Button>
        }
      />
      <ProjectStats projects={projects ? active : null} />
      <nav aria-label="Works views" className="mt-6 flex flex-wrap gap-2">
        {[
          ["All Projects", "/admin/works", undefined],
          ["Display Order", "/admin/works?order=display", "display"],
          ["Featured Order", "/admin/works?order=featured", "featured"],
        ].map(([label, href, value]) => (
          <Button
            key={label}
            asChild
            variant={mode === value ? "default" : "outline"}
          >
            <Link
              href={href ?? "/admin/works"}
              aria-current={mode === value ? "page" : undefined}
            >
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      {!projects ? (
        <div className="mt-6">
          <DataUnavailable />
        </div>
      ) : mode ? (
        <ProjectOrder
          key={mode}
          kind={mode}
          initial={orderEntries.map(({ id, title, published }) => ({
            id,
            title,
            published,
          }))}
        />
      ) : (
        <section
          aria-label="Projects"
          className="mt-5 overflow-hidden rounded-xl border border-cms-border bg-white"
        >
          <form
            action="/admin/works"
            className="flex flex-wrap items-center gap-3 border-b border-cms-border p-4 sm:p-5"
          >
            <div className="relative w-full sm:max-w-64">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-3 left-3 size-4 text-cms-muted"
              />
              <Input
                name="q"
                aria-label="Search projects"
                className="w-full pl-9"
                placeholder="Search projects…"
                defaultValue={filters.q}
                maxLength={120}
              />
            </div>
            <Select
              name="category"
              aria-label="Category"
              defaultValue={filters.category}
            >
              <option value="">All categories</option>
              <option value="independent">Independent</option>
              <option value="client">Client</option>
            </Select>
            <Select
              name="status"
              aria-label="Status"
              defaultValue={filters.status}
            >
              <option value="">All active statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
            <Select name="sort" aria-label="Sort" defaultValue={filters.sort}>
              <option value="">Recently updated</option>
              <option value="oldest">Oldest updated</option>
              <option value="display">Custom order</option>
            </Select>
            <Button variant="outline" type="submit">
              Apply filters
            </Button>
          </form>
          {visible.length ? (
            <ProjectTable projects={visible} previews={previews} />
          ) : (
            <div className="grid justify-items-center gap-2 px-5 py-14 text-center">
              <FolderOpen className="mb-1 size-6 text-cms-primary" />
              <p className="text-sm font-medium">No projects found</p>
              <p className="text-sm text-cms-secondary">
                {projects.length
                  ? "Try changing your search or filters."
                  : "Create a draft to add your first project."}
              </p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default function WorksPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p aria-busy="true">Loading works…</p>}>
      <Works searchParams={searchParams} />
    </Suspense>
  );
}
