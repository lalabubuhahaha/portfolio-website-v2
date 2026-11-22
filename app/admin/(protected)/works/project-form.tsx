"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { ArrowLeft, Eye, ImageIcon, Save } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input, Select, Textarea } from "@/components/admin/ui/fields";
import {
  compareDraftEdits,
  projectFieldsSchema,
  slugFromTitle,
  type DraftFields,
} from "@/lib/cms/project-fields";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { SingleMediaUpload } from "@/components/admin/media/single-media-upload";
import { AssetPreview } from "@/components/admin/media/asset-visual";
import { contentBlocksSchema, type ContentBlocks } from "@/lib/cms/blocks";
import { reviewLatestDraft, saveDraft, type DraftResult } from "./actions";

const ContentEditor = dynamic(() => import("@/components/admin/blocks/content-editor"), {
  loading: () => <p role="status" className="p-4 text-sm">Loading content editor…</p>,
});

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
const labels: readonly { key: keyof DraftFields; label: string }[] = [
  ...basics,
  ...seo,
  { key: "cover_asset_id", label: "Cover image" },
];

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
  initialContent = null,
  status,
  id,
  updatedAt,
  archived,
  justCreated,
}: {
  initial: DraftFields;
  initialContent?: ContentBlocks | null;
  status?: string;
  id?: string;
  updatedAt?: string;
  archived?: boolean;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [contentChoice, setContentChoice] = useState<"local" | "latest">();
  const [detailsOpen, setDetailsOpen] = useState(!id);
  const [editingMedia, setEditingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stamp, setStamp] = useState(updatedAt);
  const [customSlug, setCustomSlug] = useState(Boolean(id));
  const [result, setResult] = useState<DraftResult>({});
  const [latest, setLatest] =
    useState<Awaited<ReturnType<typeof reviewLatestDraft>>>();
  const [reviewError, setReviewError] = useState("");
  const inFlight = useRef(false);
  const [success, setSuccess] = useState(Boolean(justCreated));
  const [pending, startTransition] = useTransition();
  const contentDirty = content !== savedContent && JSON.stringify(content) !== JSON.stringify(savedContent);
  const contentsOverlap = !!latest && contentDirty
    && JSON.stringify(latest.content) !== JSON.stringify(savedContent)
    && JSON.stringify(latest.content) !== JSON.stringify(content);
  const uploadingMedia = uploading || editingMedia;
  const dirty = contentDirty || (Object.keys(fields) as (keyof DraftFields)[]).some(
    (key) => fields[key] !== saved[key],
  );
  const comparison = latest
    ? compareDraftEdits(saved, fields, latest.fields)
    : null;

  useEffect(() => {
    if (!dirty && !pending && !uploadingMedia) return;
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
  }, [dirty, pending, uploadingMedia]);

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
    if (pending || uploadingMedia || inFlight.current || archived || result.conflict) return;
    const check = projectFieldsSchema.safeParse(fields);
    if (!check.success) {
      const errors = check.error.flatten().fieldErrors;
      setResult({ error: "Check the highlighted fields.", fields: errors });
      const first = Object.keys(errors)[0];
      setDetailsOpen(true);
      requestAnimationFrame(() => document.getElementById(first ?? "")?.focus());
      return;
    }
    const form = new FormData();
    if (contentDirty) {
      const check = contentBlocksSchema.safeParse(content);
      if (!check.success) {
        const issue = check.error.issues[0];
        setResult({ error: `Case study ${issue.path.join(".")}: ${issue.message}` });
        return;
      }
      form.set("content_blocks", JSON.stringify(check.data));
    }
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    inFlight.current = true;
    setResult({});
    setSuccess(false);
    startTransition(async () => {
      try {
        const next = await saveDraft(id ?? null, stamp ?? null, form);
        setResult(next);
        if (!next.id) return;
        setSaved(fields);
        setSavedContent(content);
        setStamp(next.updatedAt);
        setSuccess(true);
        if (!id) router.replace(works + "/" + next.id + "?saved=1");
      } catch {
        setResult({
          error:
            "Could not save the draft. Check your connection and try again.",
        });
      } finally {
        inFlight.current = false;
      }
    });
  }

  function review() {
    if (!id || pending) return;
    setReviewError("");
    startTransition(async () => {
      try {
        const current = await reviewLatestDraft(id);
        setLatest(current);
        if (!current) setReviewError("The latest draft is unavailable.");
      } catch {
        setReviewError("Could not load the latest draft. Try again.");
      }
    });
  }

  function applyLatest() {
    if (!latest || !comparison || (contentsOverlap && !contentChoice)) return;
    setFields(comparison.merged);
    setSaved(latest.fields);
    setContent(contentDirty && contentChoice !== "latest" ? content : latest.content);
    setSavedContent(latest.content);
    setContentChoice(undefined);
    setStamp(latest.updatedAt);
    setLatest(undefined);
    setResult({});
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

  const saveButton = (
    <Button type="submit" disabled={pending || uploadingMedia || archived || result.conflict}>
      <Save aria-hidden />
      {pending ? "Saving…" : "Save Draft"}
    </Button>
  );

  const metadata = (
      <fieldset disabled={pending || archived || editingMedia} className="space-y-5">
        <section className="rounded-xl border border-cms-border bg-white p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Project details</h2>
          <div className="grid gap-5 sm:grid-cols-2">{basics.map(field)}</div>
        </section>
        <section className="rounded-xl border border-cms-border bg-white p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Cover image</h2>
          {fields.cover_asset_id ? (
            <div className="mb-3 max-w-sm">
              <AssetPreview id={fields.cover_asset_id} compact />
            </div>
          ) : (
            <span className="mb-3 grid size-14 place-items-center rounded-lg border border-cms-border bg-cms-background text-cms-muted">
              <ImageIcon aria-hidden className="size-5" />
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {!archived && (
              <>
                <SingleMediaUpload
                  label="Upload Image"
                  imagesOnly
                  onUploaded={(id) => change("cover_asset_id", id)}
                  onUploading={setUploading}
                />
                <MediaPicker
                  value={fields.cover_asset_id}
                  imagesOnly
                  disabled={uploading}
                  onSelect={(id) => change("cover_asset_id", id)}
                />
              </>
            )}
            {!!fields.cover_asset_id && !archived && (
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() => change("cover_asset_id", "")}
              >
                Remove Cover
              </Button>
            )}
          </div>
          {result.fields?.cover_asset_id && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {result.fields.cover_asset_id[0]}
            </p>
          )}
        </section>
        <section className="rounded-xl border border-cms-border bg-white p-5 sm:p-6">
          <h2 className="mb-5 font-semibold">Search appearance</h2>
          <div className="grid gap-5 sm:grid-cols-2">{seo.map(field)}</div>
        </section>
      </fieldset>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {id && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-cms-border bg-white p-3">
          <Button asChild variant="ghost">
            <Link href={works}><ArrowLeft aria-hidden /> Back to Works</Link>
          </Button>
          <div className="mr-auto min-w-0">
            <p className="max-w-56 truncate text-sm font-semibold">{fields.title || "Untitled draft"}</p>
            <p className="text-xs text-cms-secondary">{status}{dirty ? " · Unsaved changes" : ""}</p>
          </div>
          <Button type="button" variant="outline" disabled={pending || uploadingMedia}
            onClick={() => setShowPreview(!showPreview)}><Eye aria-hidden />{showPreview ? "Back to editor" : "Preview"}</Button>
          {!showPreview && saveButton}
        </div>
      )}
      {!showPreview && result.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {result.error}
        </p>
      )}
      {!showPreview && result.conflict && (
        <section
          aria-label="Draft conflict"
          className="space-y-3 rounded-lg border border-cms-border bg-white p-4 text-sm"
        >
          <p>
            Your edits are still here. Review the latest draft before saving again.
          </p>
          {comparison && latest ? (
            <>
              {comparison.overlapping.length > 0 && (
                <div className="space-y-3">
                  <p>
                    Both versions changed these fields. Choose the latest values
                    you want to keep before applying your edits.
                  </p>
                  <dl className="space-y-2">
                    {comparison.overlapping.map((key) => (
                      <div key={key} className="break-words">
                        <dt className="font-medium">
                          {labels.find((field) => field.key === key)?.label}
                        </dt>
                        <dd className="whitespace-pre-wrap">
                          Latest draft · {latest.fields[key] || "Empty"}
                        </dd>
                        <dd className="whitespace-pre-wrap">
                          Your edit · {fields[key] || "Empty"}
                        </dd>
                        <dd>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => change(key, latest.fields[key])}
                          >
                            Use latest value
                          </Button>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {contentsOverlap && (
                <fieldset className="space-y-2">
                  <legend className="font-semibold">Both versions changed the case study</legend>
                  <p>Open Preview to review your changes before choosing which version to retain.</p>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="content-conflict" checked={contentChoice === "local"} onChange={() => setContentChoice("local")} />
                    Keep my case study ({content?.blocks.length ?? 0} top-level blocks)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="content-conflict" checked={contentChoice === "latest"} onChange={() => setContentChoice("latest")} />
                    Use latest case study ({latest.content?.blocks.length ?? 0} top-level blocks)
                  </label>
                </fieldset>
              )}
              <Button type="button" variant="outline" disabled={contentsOverlap && !contentChoice} onClick={applyLatest}>
                Apply changes to latest draft
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={review}
            >
              {pending ? "Loading latest draft…" : "Review latest draft"}
            </Button>
          )}
          {reviewError && <p role="alert">{reviewError}</p>}
        </section>
      )}
      {!showPreview && success && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          Draft saved.
        </p>
      )}
      {id ? (
        <>
          {!showPreview && <details open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
            className="rounded-xl border border-cms-border bg-white p-4">
            <summary className="cursor-pointer font-semibold">Project details, cover and SEO</summary>
            <div className="mt-4">{metadata}</div>
          </details>}
          <section aria-label={showPreview ? "Draft preview" : "Content Editor"} className="space-y-3">
            <h2 className="text-lg font-semibold">{showPreview ? "Draft preview" : "Content Editor"}</h2>
            <ContentEditor doc={content} title={fields.title} readOnly={!!archived} preview={showPreview}
              busy={pending || uploadingMedia} onUploading={setEditingMedia}
              onChange={(document) => { setSuccess(false); setContent(document); }} />
          </section>
        </>
      ) : (
        <>
          {metadata}
          <div className="flex flex-wrap items-center gap-3">
            {saveButton}
            <Button asChild variant="outline"><Link href={works}>Cancel</Link></Button>
            {dirty && <span className="text-sm text-cms-secondary">Unsaved changes</span>}
          </div>
        </>
      )}
    </form>
  );
}
