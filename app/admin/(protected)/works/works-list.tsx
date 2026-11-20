"use client";

import Link from "next/link";
import Image from "next/image";
import { FolderOpen, ImageIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/admin/ui/button";
import {
  coverPaths,
  parseWorksFilters,
  selectWorksPage,
} from "@/lib/cms/works-filters";
import type { CoverPreviews, Project } from "@/lib/content/cms";
import { FeaturedToggle, ProjectActions } from "./project-controls";
import { signWorksCovers } from "./actions";
import { WorksFilters, updateWorksQuery } from "./works-filters";

const displayDateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Taipei",
});

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
  previews: CoverPreviews;
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
          const cover = project.coverPath && previews[project.coverPath]?.url;
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

export function WorksList({
  projects,
  initialPreviews,
}: {
  projects: Project[];
  initialPreviews: CoverPreviews;
}) {
  const params = useSearchParams();
  const [signed, setSigned] = useState<CoverPreviews>({});
  const pending = useRef(new Set<string>());
  const visible = useMemo(
    () => selectWorksPage(projects, parseWorksFilters(params)),
    [params, projects],
  );
  const paths = useMemo(() => coverPaths(visible.projects), [visible.projects]);
  const previews = useMemo(() => {
    const combined: CoverPreviews = Object.assign(
      Object.create(null),
      initialPreviews,
    );
    for (const [path, entry] of Object.entries(signed)) {
      if (!combined[path] || entry.expiresAt > combined[path].expiresAt)
        combined[path] = entry;
    }
    return combined;
  }, [initialPreviews, signed]);

  useEffect(() => {
    const now = Date.now();
    const missing = paths.filter(
      (path) =>
        (previews[path]?.expiresAt ?? 0) <= now && !pending.current.has(path),
    );
    if (!missing.length) return;
    for (const path of missing) pending.current.add(path);

    void signWorksCovers(missing)
      .catch((): CoverPreviews => ({}))
      .then((result) => {
        const expiresAt = Date.now() + 15_000;
        const entries = Object.fromEntries(
          missing.map((path) => [
            path,
            result[path] ?? { url: null, expiresAt },
          ]),
        );
        for (const path of missing) pending.current.delete(path);
        setSigned((current) => ({ ...current, ...entries }));
      });
  }, [paths, previews]);

  return (
    <section
      aria-label="Projects"
      className="mt-5 overflow-hidden rounded-xl border border-cms-border bg-white"
    >
      <WorksFilters />
      {visible.projects.length ? (
        <ProjectTable projects={visible.projects} previews={previews} />
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
      {visible.pages > 1 && (
        <nav
          aria-label="Works pagination"
          className="flex flex-wrap items-center gap-3 border-t border-cms-border px-4 py-3"
        >
          <Button
            type="button"
            variant="outline"
            disabled={visible.page <= 1}
            onClick={() => updateWorksQuery({ page: String(visible.page - 1) })}
          >
            Previous
          </Button>
          <span className="text-sm text-cms-secondary" aria-live="polite">
            Page {visible.page} of {visible.pages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={visible.page >= visible.pages}
            onClick={() => updateWorksQuery({ page: String(visible.page + 1) })}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}
