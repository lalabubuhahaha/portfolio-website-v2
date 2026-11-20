import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, FolderOpen } from "lucide-react";
import { DataUnavailable, PageHeader, ProjectStats, ViewWebsite } from "@/components/admin/page-layout";
import { Button } from "@/components/admin/ui/button";
import { displayDate, getGravityProjects } from "@/lib/content/cms";

async function Overview() {
  const projects = await getGravityProjects();

  return (
    <>
      <PageHeader title="Overview" description="Manage the Gravity Edition portfolio." action={<div className="flex flex-wrap gap-2"><ViewWebsite /><Button asChild><Link href="/admin/works">Go to Works <ArrowRight /></Link></Button></div>} />
      <ProjectStats projects={projects} includeFeatured />
      <section className="mt-7 overflow-hidden rounded-xl border border-cms-border bg-white">
        <div className="border-b border-cms-border p-5"><h2 className="font-semibold">Recently Updated</h2></div>
        {projects === null ? <div className="p-5"><DataUnavailable /></div> : projects.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-5 py-12 text-center">
            <FolderOpen className="mb-1 size-6 text-cms-primary" /><p className="text-sm font-medium">No projects yet</p>
            <p className="text-sm text-cms-secondary">Projects will appear here after they are added to the CMS.</p>
          </div>
        ) : (
          <ul className="divide-y divide-cms-border">
            {projects.slice(0, 5).map((project) => (
              <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
                <span className="font-medium">{project.title}</span><time dateTime={project.updatedAt} className="text-cms-secondary">{displayDate.format(new Date(project.updatedAt))}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function OverviewPage() {
  return <Suspense fallback={<p aria-busy="true">Loading overview…</p>}><Overview /></Suspense>;
}
