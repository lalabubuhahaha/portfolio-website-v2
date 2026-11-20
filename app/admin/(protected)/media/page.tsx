import { Suspense } from "react";
import Link from "next/link";
import { Grid2X2, Images, List } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Select } from "@/components/admin/ui/fields";
import { PageHeader } from "@/components/admin/page-layout";
import { MediaLibrary } from "@/components/admin/media/media-library";
import { MediaFilterFields } from "@/components/admin/media/media-filters";
import { UploadDialog } from "@/components/admin/media/upload-dialog";
import { requireAdmin } from "@/lib/cms/session";
import { loadMedia, parseMediaFilter } from "@/lib/content/media";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function Library({ searchParams }: Props) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (typeof value === "string") params.set(key, value);
  const filter = parseMediaFilter(params);
  const list = params.get("view") === "list";
  const { supabase } = await requireAdmin();
  const result = await loadMedia(supabase, filter, false, false);

  function href(change: Record<string, string>) {
    const next = new URLSearchParams({
      q: filter.q,
      type: filter.type,
      sort: filter.sort,
      page: String(filter.page),
      view: list ? "list" : "grid",
      ...change,
    });
    return "/admin/media?" + next.toString();
  }

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Manage private images, GIFs and videos."
        action={<UploadDialog />}
      />
      {result && (
        <p className="mb-4 text-sm text-cms-secondary">
          {result.total} {result.total === 1 ? "asset" : "assets"}
          {filter.q || filter.type ? " matching filters" : ""}
        </p>
      )}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-cms-border bg-white p-4">
        <form
          action="/admin/media"
          className="flex min-w-0 flex-1 flex-wrap gap-2"
        >
          <input type="hidden" name="view" value={list ? "list" : "grid"} />
          <MediaFilterFields q={filter.q} type={filter.type} />
          <Select name="sort" aria-label="Sort date" defaultValue={filter.sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
          <Button type="submit" variant="outline">
            Apply Filters
          </Button>
        </form>
        <div className="flex gap-2" aria-label="Media view">
          <Button asChild variant={list ? "outline" : "default"}>
            <Link
              href={href({ view: "grid" })}
              aria-current={!list ? "page" : undefined}
            >
              <Grid2X2 />
              Grid
            </Link>
          </Button>
          <Button asChild variant={list ? "default" : "outline"}>
            <Link
              href={href({ view: "list" })}
              aria-current={list ? "page" : undefined}
            >
              <List />
              List
            </Link>
          </Button>
        </div>
      </div>
      {!result ? (
        <p role="alert" className="rounded-lg bg-cms-selected p-4 text-sm">
          Media could not be loaded. Check the Supabase connection and Stage 7.3
          migration.
        </p>
      ) : result.items.length ? (
        <MediaLibrary assets={result.items} list={list} />
      ) : (
        <div className="grid justify-items-center gap-2 rounded-xl border border-cms-border bg-white px-4 py-12 text-center">
          <Images aria-hidden className="size-6 text-cms-primary" />
          <p className="font-medium">No media found</p>
          <p className="text-sm text-cms-secondary">
            {filter.q || filter.type
              ? "Try another search or format."
              : "Upload files to start your media library."}
          </p>
        </div>
      )}
      {result && (result.pages > 1 || filter.page > 1) && (
        <nav
          aria-label="Media pagination"
          className="mt-5 flex flex-wrap items-center gap-3"
        >
          {filter.page > 1 && (
            <Button asChild variant="outline">
              <Link
                href={href({
                  page: String(Math.min(result.pages, filter.page - 1)),
                })}
              >
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-cms-secondary">
            Page {filter.page} of {result.pages}
          </span>
          {filter.page < result.pages && (
            <Button asChild variant="outline">
              <Link href={href({ page: String(filter.page + 1) })}>Next</Link>
            </Button>
          )}
        </nav>
      )}
    </>
  );
}

export default function MediaPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" role="status" className="space-y-4">
          <p>Loading media…</p>
          <div className="h-40 rounded-xl border border-cms-border bg-white" />
        </div>
      }
    >
      <Library {...props} />
    </Suspense>
  );
}
