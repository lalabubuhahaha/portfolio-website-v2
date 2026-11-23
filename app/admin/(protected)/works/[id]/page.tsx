import { Suspense } from "react";
import { notFound, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { DataUnavailable, PageHeader } from "@/components/admin/page-layout";
import {
  displayDateTime,
  getProjectEditor,
} from "@/lib/content/cms";
import { ProjectForm } from "../project-form";

type Props = {
  params: Promise<{ id: string }>;
};

async function EditProject({ params }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const project = await getProjectEditor(id).catch((error) => {
    unstable_rethrow(error);
    return undefined;
  });
  if (project === undefined) return <DataUnavailable />;
  if (!project) notFound();
  const status = project.archived
    ? "Archived"
    : project.published
      ? project.unpublishedChanges
        ? "Published · Unpublished changes"
        : "Published"
      : "Draft";

  return (
    <div className="min-w-0">
      <PageHeader
        title={project.fields.title || project.fields.slug}
        description="Edit the project details and save a draft."
        parent={{ title: "Works", href: "/admin/works" }}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-cms-secondary">
        <span className="rounded-md bg-cms-selected px-2.5 py-1 font-medium text-cms-primary">
          {status}
        </span>
        <span>
          Last saved{" "}
          <time dateTime={project.updatedAt}>
            {displayDateTime.format(new Date(project.updatedAt))}
          </time>
        </span>
      </div>
      <ProjectForm
        key={project.id}
        id={project.id}
        updatedAt={project.updatedAt}
        initial={project.fields}
        initialContent={project.content}
        status={status}
        archived={project.archived}
      />
    </div>
  );
}

export default function EditProjectPage(props: Props) {
  return (
    <Suspense fallback={<p aria-busy="true">Loading project…</p>}>
      <EditProject {...props} />
    </Suspense>
  );
}
