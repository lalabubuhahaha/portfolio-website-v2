import { Suspense } from "react";
import Link from "next/link";
import { ListOrdered, Plus, Star } from "lucide-react";
import {
  DataUnavailable,
  PageHeader,
  ProjectStats,
} from "@/components/admin/page-layout";
import { Button } from "@/components/admin/ui/button";
import { getCoverPreviews, getGravityProjects } from "@/lib/content/cms";
import {
  coverPaths,
  parseWorksFilters,
  selectWorksPage,
} from "@/lib/cms/works-filters";
import { WorksList } from "./works-list";
import { ProjectOrder } from "./project-order";

type Search = Record<string, string | string[] | undefined>;

async function Works({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;

  const mode =
    params.order === "display" || params.order === "featured"
      ? params.order
      : undefined;
  const projects = await getGravityProjects(!mode);
  const active = projects?.filter((project) => !project.archived) ?? [];
  const orderEntries = !mode
    ? []
    : active
        .filter((project) => mode !== "featured" || project.featuredIntent)
        .sort(
          (a, b) =>
            (mode === "featured"
              ? a.featuredOrder - b.featuredOrder
              : a.displayOrder - b.displayOrder) || a.id.localeCompare(b.id),
        );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (typeof value === "string") query.set(key, value);
  const initialPreviews =
    mode || !projects
      ? {}
      : await getCoverPreviews(
          coverPaths(
            selectWorksPage(projects, parseWorksFilters(query)).projects,
          ),
        );

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
          { label: "All Projects", href: "/admin/works" },
          { label: "Display Order", href: "/admin/works?order=display", value: "display", Icon: ListOrdered },
          { label: "Featured Order", href: "/admin/works?order=featured", value: "featured", Icon: Star },
        ].map(({ label, href, value, Icon }) => (
          <Button
            key={label}
            asChild
            variant={mode === value ? "default" : "outline"}
          >
            <Link
              href={href}
              aria-current={mode === value ? "page" : undefined}
            >
              {Icon && <Icon aria-hidden />}
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      {!mode && (
        <p className="mt-2 text-sm text-cms-secondary">
          Open Display Order to drag all active works into order. Use Featured
          Order to arrange the works marked for the homepage.
        </p>
      )}
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
        <WorksList projects={projects} initialPreviews={initialPreviews} />
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
