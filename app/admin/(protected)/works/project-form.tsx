"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { ImageIcon, Save } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input, Select, Textarea } from "@/components/admin/ui/fields";
import {
  projectFieldsSchema,
  slugFromTitle,
  type DraftFields,
} from "@/lib/cms/project-fields";
import { saveDraft, type DraftResult } from "./actions";

const works = "/admin/works";
const unsaved = "Discard your unsaved changes?";
const basics = [
  { key: "title", label: "Project title", required: true, max: 160 },
  { key: "slug", label: "Slug", required: true, max: 120 },
  { key: "category", label: "Category" },
  { key: "year", label: "Year", max: 4 },
  { key: "summary", label: "Summary", multiline: true, max: 5000 },
  { key: "role", label: "Role", max: 160 },
  { key: "external_url", label: "External URL", max: 2048 },
  {
    key: "tools",
    label: "Tools",
    hint: "Separate tools with commas. Remove a value to delete it.",
  },
  {
    key: "category_tags",
    label: "Category tags",
    hint: "Separate tags with commas. Remove a value to delete it.",
  },
] as const;
const seo = [
  { key: "seo_title", label: "SEO title", max: 120 },
  {
    key: "seo_description",
    label: "SEO description",
    multiline: true,
    max: 320,
  },
] as const;
type Field = {
  key: keyof DraftFields;
  label: string;
  required?: boolean;
  max?: number;
  multiline?: boolean;
  hint?: string;
};

export function ProjectForm({
  initial,
  id,
  updatedAt,
  covers,
  archived,
  justCreated,
}: {
  initial: DraftFields;
  id?: string;
  updatedAt?: string;
  covers: { id: string; file_name: string }[] | null;
  archived?: boolean;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [stamp, setStamp] = useState(updatedAt);
  const [customSlug, setCustomSlug] = useState(Boolean(id));
  const [result, setResult] = useState<DraftResult>({});
  const [success, setSuccess] = useState(Boolean(justCreated));
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty && !pending) return;
    function unload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function follow(event: MouseEvent) {
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.href === location.href ||
        link.target === "_blank"
      )
        return;
      if (!window.confirm(unsaved)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", follow, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", follow, true);
    };
  }, [dirty, pending]);

  function change(key: keyof DraftFields, value: string) {
    setSuccess(false);
    if (key === "slug") setCustomSlug(true);
    setFields((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" && !customSlug ? { slug: slugFromTitle(value) } : {}),
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || archived) return;
    const check = projectFieldsSchema.safeParse(fields);
    if (!check.success) {
      const errors = check.error.flatten().fieldErrors;
      setResult({ error: "Check the highlighted fields.", fields: errors });
      const first = Object.keys(errors)[0];
      document.getElementById(first ?? "")?.focus();
      return;
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    setResult({});
    setSuccess(false);
    startTransition(async () => {
      try {
        const next = await saveDraft(id ?? null, stamp ?? null, form);
        setResult(next);
        if (!next.id) return;
        setSaved(fields);
        setStamp(next.updatedAt);
        setSuccess(true);
        if (!id) router.replace(works + "/" + next.id + "?saved=1");
        else router.refresh();
      } catch {
        setResult({
          error:
            "Could not save the draft. Check your connection and try again.",
        });
      }
    });
  }

  function field({ key, label, required, max, multiline, hint }: Field) {
    const error = result.fields?.[key]?.[0];
    const props = {
      id: key,
      name: key,
      value: fields[key],
      onChange: (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => change(key, event.target.value),
      "aria-invalid": Boolean(error),
      "aria-describedby": error || hint ? key + "-hint" : undefined,
      required,
      maxLength: max,
      className: "w-full",
    };
    return (
      <div
        key={key}
        className={multiline ? "space-y-2 sm:col-span-2" : "space-y-2"}
      >
        <label className="block text-sm font-medium" htmlFor={key}>
          {label}
          {required && " *"}
        </label>
        {key === "category" ? (
          <Select {...props}>
            <option value="independent">Independent</option>
            <option value="client">Client / Professional</option>
          </Select>
        ) : multiline ? (
          <Textarea {...props} rows={4} />
        ) : (
          <Input
            {...props}
            inputMode={key === "year" ? "numeric" : undefined}
          />
        )}
        {(error || hint) && (
          <p
            id={key + "-hint"}
            className={
              error ? "text-xs text-red-700" : "text-xs text-cms-secondary"
            }
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset disabled={pending || archived} className="space-y-5">
        <section className="rounded-xl border border-cms-border bg-white p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Project details</h2>
          <div className="grid gap-5 sm:grid-cols-2">{basics.map(field)}</div>
        </section>
        <section className="rounded-xl border border-cms-border bg-white p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Cover image</h2>
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-cms-border bg-cms-background text-cms-muted">
              <ImageIcon aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <label
                htmlFor="cover_asset_id"
                className="mb-2 block text-sm font-medium"
              >
                Existing media
              </label>
              <Select
                id="cover_asset_id"
                name="cover_asset_id"
                className="w-full"
                value={fields.cover_asset_id}
                onChange={(event) =>
                  change("cover_asset_id", event.target.value)
                }
                disabled={!covers}
              >
                <option value="">
                  {covers?.length ? "No cover" : "No media available"}
                </option>
                {covers === null && fields.cover_asset_id && (
                  <option value={fields.cover_asset_id}>Current cover</option>
                )}
                {covers?.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.file_name}
                  </option>
                ))}
              </Select>
              {result.fields?.cover_asset_id && (
                <p className="mt-2 text-xs text-red-700">
                  {result.fields.cover_asset_id[0]}
                </p>
              )}
              {covers === null && (
                <p className="mt-2 text-xs text-cms-secondary">
                  Media could not be loaded.
                </p>
              )}
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-cms-border bg-white p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Search appearance</h2>
          <div className="grid gap-5 sm:grid-cols-2">{seo.map(field)}</div>
        </section>
      </fieldset>
      {result.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {result.error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          Draft saved.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || archived}>
          <Save />
          {pending ? "Saving…" : "Save Draft"}
        </Button>
        <Button asChild variant="outline">
          <Link href={works}>{id ? "Back to Works" : "Cancel"}</Link>
        </Button>
        <span className="text-sm text-cms-secondary">
          {archived
            ? "Restore this project to edit it."
            : dirty
              ? "Unsaved changes · Publishing is unavailable"
              : "Publishing is unavailable"}
        </span>
      </div>
    </form>
  );
}
