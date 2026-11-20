import Link from "next/link";
import { ArrowUpRight, ChevronRight, FilePenLine, FolderOpen, Globe2, Star } from "lucide-react";
import type { ReactNode } from "react";
import type { Project } from "@/lib/content/cms";
import { Button } from "./ui/button";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-7">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs font-medium text-cms-secondary">
        <Link href="/admin" className="hover:text-cms-primary">Admin</Link><ChevronRight className="size-3.5" />
        <span aria-current="page" className="text-cms-foreground">{title}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm text-cms-secondary">{description}</p></div>
        {action}
      </div>
    </div>
  );
}

export function ProjectStats({ projects, includeFeatured }: { projects: Project[] | null; includeFeatured?: boolean }) {
  const published = projects?.filter((project) => project.published).length;
  const stats = [
    { label: "Total Projects", Icon: FolderOpen, count: projects?.length },
    { label: "Published", Icon: Globe2, count: published },
    { label: "Draft", Icon: FilePenLine, count: projects && published !== undefined ? projects.length - published : undefined },
  ];
  if (includeFeatured) stats.push({ label: "Featured Projects", Icon: Star, count: projects?.filter((project) => project.featured).length });

  return (
    <dl className={includeFeatured ? "grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" : "grid gap-3 sm:grid-cols-3 lg:gap-4"}>
      {stats.map(({ label, count, Icon }) => (
        <div key={label} className="rounded-xl border border-cms-border bg-white p-4 sm:p-5">
          <dt className="flex items-center justify-between gap-2 text-sm font-medium text-cms-secondary"><span>{label}</span><Icon className="size-4 shrink-0 text-cms-primary" /></dt>
          <dd className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{count ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DataUnavailable() {
  return <p role="alert" className="rounded-lg border border-cms-border bg-cms-selected p-4 text-sm text-cms-secondary">Project data could not be loaded. Check the Supabase connection and migration.</p>;
}

export function ViewWebsite() {
  return <Button asChild variant="outline"><Link href="/">View website <ArrowUpRight /></Link></Button>;
}
