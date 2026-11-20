import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-layout";
import { emptyDraft } from "@/lib/cms/project-fields";
import { ProjectForm } from "../project-form";

async function NewProject() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New Project"
        description="Create a draft for the Gravity portfolio."
        parent={{ title: "Works", href: "/admin/works" }}
      />
      <ProjectForm initial={emptyDraft} />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<p aria-busy="true">Loading project form…</p>}>
      <NewProject />
    </Suspense>
  );
}
