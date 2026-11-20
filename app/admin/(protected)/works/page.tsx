import { Suspense } from "react";
import { ChevronDown, FolderOpen, ImageIcon, Plus, Search } from "lucide-react";
import { DataUnavailable, PageHeader, ProjectStats } from "@/components/admin/page-layout";
import { Button } from "@/components/admin/ui/button";
import { fieldClass, Input } from "@/components/admin/ui/fields";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { displayDate, getGravityProjects } from "@/lib/content/cms";

const columns = ["Cover", "Project Title", "Category", "Year", "Status", "Featured", "Last Updated", "Actions"];

async function Works() {
  const projects = await getGravityProjects();

  return (
    <>
      <PageHeader title="Works" description="Manage and publish your projects." action={<Button disabled title="Available in Stage 7.2"><Plus />New Project</Button>} />
      <ProjectStats projects={projects} />
      <section aria-label="Projects" className="mt-7 overflow-hidden rounded-xl border border-cms-border bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-cms-border p-4 sm:p-5">
          <div className="relative w-full sm:max-w-64">
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-cms-muted" />
            <Input aria-label="Search projects" className="w-full pl-9" placeholder="Search projects…" disabled />
          </div>
          {["Category", "Status"].map((label) => (
            <div className="relative" key={label}>
              <select aria-label={label} className={fieldClass + " appearance-none pr-9"} disabled><option>All {label === "Category" ? "categories" : "statuses"}</option></select>
              <ChevronDown className="pointer-events-none absolute top-3 right-2.5 size-4 text-cms-muted" />
            </div>
          ))}
          <p className="text-xs text-cms-secondary">Project editing and filters open in Stage 7.2.</p>
        </div>
        <Table className="w-full min-w-205 text-left text-sm">
          <TableHeader className="border-b border-cms-border bg-cms-background text-xs text-cms-secondary">
            <TableRow>{columns.map((column) => <TableHead key={column} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{column}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-cms-border">
            {projects?.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="p-4"><span className="grid size-9 place-items-center rounded-md border border-cms-border bg-cms-background text-cms-muted"><ImageIcon className="size-4" aria-label="Cover preview unavailable" /></span></TableCell>
                <th scope="row" className="p-4 font-medium">{project.title}</th>
                <TableCell className="p-4">{project.category}</TableCell>
                <TableCell className="p-4">{project.year ?? "—"}</TableCell>
                <TableCell className="p-4"><span className={project.published ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800" : "rounded-full bg-cms-background px-2 py-1 text-xs font-medium text-cms-secondary"}>{project.published ? "Published" : "Draft"}</span></TableCell>
                <TableCell className="p-4">{project.featured ? "Yes" : "—"}</TableCell>
                <TableCell className="p-4 whitespace-nowrap"><time dateTime={project.updatedAt}>{displayDate.format(new Date(project.updatedAt))}</time></TableCell>
                <TableCell className="p-4"><Button variant="outline" disabled>Edit</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {projects === null ? <div className="p-5"><DataUnavailable /></div> : projects.length === 0 && (
          <div className="grid justify-items-center gap-2 px-5 py-14 text-center">
            <FolderOpen className="mb-1 size-6 text-cms-primary" /><p className="text-sm font-medium">No projects yet</p>
            <p className="text-sm text-cms-secondary">Projects added to the CMS will appear in this table.</p>
          </div>
        )}
      </section>
    </>
  );
}

export default function WorksPage() {
  return <Suspense fallback={<p aria-busy="true">Loading works…</p>}><Works /></Suspense>;
}
