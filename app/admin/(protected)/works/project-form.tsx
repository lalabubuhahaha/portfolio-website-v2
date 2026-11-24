"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
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
import { blockHistory, startBlockHistory } from "@/lib/cms/block-history";
import { contentBlocksSchema, type ContentBlocks } from "@/lib/cms/blocks";
import { reviewLatestDraft, saveDraft, type DraftResult } from "./actions";

import { DraftRecoveryPanel } from "./draft-recovery-panel";

const ContentEditor = dynamic(() => import("@/components/admin/blocks/content-editor"), {
  loading: () => <p role="status" className="p-4 text-sm">Loading content editor…</p>,
});

function subscribeConnection(listener: () => void) {
  window.addEventListener("offline", listener);
  window.addEventListener("online", listener);
  return () => {
    window.removeEventListener("offline", listener);
    window.removeEventListener("online", listener);
  };
}

const isOffline = () => navigator.onLine === false;
const onlineOnServer = () => false;
const savedTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Taipei",
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
  recoveryUser,
}: {
  initial: DraftFields;
  initialContent?: ContentBlocks | null;
  status?: string;
  id?: string;
  updatedAt?: string;
  archived?: boolean;
  recoveryUser?: string;
}) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const currentContent = useRef(initialContent);
  const history = useRef(startBlockHistory(initialContent));
  const [contentReset, setContentReset] = useState(0);
  const [historyControls, setHistoryControls] = useState({ undo: false, redo: false });
  const [autosave, setAutosave] = useState(false);
  const [composing, setComposing] = useState(false);
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
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const offline = useSyncExternalStore(subscribeConnection, isOffline, onlineOnServer);
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
    if (!dirty && !pending && !uploadingMedia && !offline) return;
    function unload(event: BeforeUnloadEvent) {
      if (!dirty && !pending && !uploadingMedia) return;
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
      if (isOffline() || ((dirty || pending || uploadingMedia) && !window.confirm(unsaved))) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    function beforeSignOut(event: Event) {
      if (isOffline() || ((dirty || pending || uploadingMedia) &&
        !window.confirm("Leave the open draft? Download a backup first if you need to keep your edits.")))
        event.preventDefault();
    }
    window.addEventListener("cms:before-sign-out", beforeSignOut);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", follow, true);
    return () => {
      window.removeEventListener("cms:before-sign-out", beforeSignOut);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", follow, true);
    };
  }, [dirty, pending, uploadingMedia, offline]);

  function change(key: keyof DraftFields, value: string) {
    setSuccess(false);
    if (key === "slug") setCustomSlug(true);
    setFields((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" && !customSlug ? { slug: slugFromTitle(value) } : {}),
    }));
  }

  function updateDocument(action: Parameters<typeof blockHistory>[1]) {
    const next = blockHistory(history.current, action);
    history.current = next;
    if (action.type !== "edit") setContentReset((current) => current + 1);
    currentContent.current = next.current;
    setContent(next.current);
    setHistoryControls({ undo: next.before.length > 0, redo: next.after.length > 0 });
    setSuccess(false);
  }

  function changeContent(document: ContentBlocks | null) {
    updateDocument({ type: "edit", document });
  }

  function downloadBackup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({
      version: 1, projectId: id, baseVersion: stamp, exportedAt: new Date().toISOString(), fields,
      content_blocks: currentContent.current,
    }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "draft-backup-" + (id ?? "new") + ".json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    persistDraft();
  }

  function persistDraft(automatic = false) {
    if (pending || composing || uploadingMedia || inFlight.current || archived || result.conflict ||
      (automatic && (!autosave || !id || !content || !dirty || showPreview || result.error))) return;
    setSuccess(false);
    if (isOffline()) {
      setResult({ error: "You’re offline. Your edits are still open. Reconnect to save or download a draft backup." });
      return;
    }
    const check = projectFieldsSchema.safeParse(fields);
    if (!check.success) {
      const errors = check.error.flatten().fieldErrors;
      setResult({ error: "Check the highlighted fields.", fields: errors });
      const first = Object.keys(errors)[0];
      if (!automatic) {
        setDetailsOpen(true);
        requestAnimationFrame(() => document.getElementById(first ?? "")?.focus());
      }
      return;
    }
    const form = new FormData();
    const snapshot = currentContent.current;
    form.set("content_mode", snapshot === null ? "metadata-only" : "document");
    if (snapshot !== null) {
      const check = contentBlocksSchema.safeParse(snapshot);
      if (!check.success) {
        const issue = check.error.issues[0];
        setResult({ error: `Case study ${issue.path.join(".")}: ${issue.message}` });
        return;
      }
      form.set("content_blocks", JSON.stringify(check.data));
    }
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    inFlight.current = true;
    setSaving(true);
    setResult({});
    setSuccess(false);
    startTransition(async () => {
      try {
        const next = await saveDraft(id ?? null, stamp ?? null, form);
        setResult(next);
        if (!next.verified) return;
        setSaved(fields);
        setSavedContent(snapshot);
        setStamp(next.verified.updatedAt);
        setSuccess(true);
        if (!id) router.replace(works + "/" + next.verified.id);
      } catch {
        setResult({
          error:
            "The save response could not be confirmed. Your edits have been kept. Review the latest draft before retrying.",
          conflict: id !== undefined,
        });
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    });
  }

  const persistAutomatically = useEffectEvent(() => persistDraft(true));
  useEffect(() => {
    if (!autosave || !id || !content || !dirty || offline || composing || pending ||
      saving || uploadingMedia || archived || showPreview || result.error || result.conflict) return;
    const timer = window.setTimeout(() => persistAutomatically(), 3000);
    return () => window.clearTimeout(timer);
  }, [autosave, id, content, fields, dirty, offline, composing, pending, saving, uploadingMedia,
    archived, showPreview, result.error, result.conflict]);

  function review() {
    if (!id || pending) return;
    setAutosave(false);
    setReviewError("");
    if (isOffline()) {
      setReviewError("Reconnect to review the latest stored draft. Your edits are still open.");
      return;
    }
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
    updateDocument({ type: "reset", document: contentDirty && contentChoice !== "latest" ? currentContent.current : latest.content });
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
      {saving ? "Saving…" : "Save Draft"}
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
    <form onSubmit={submit} onCompositionStart={() => setComposing(true)}
      onCompositionEnd={() => setComposing(false)} noValidate className="space-y-5">
      {id && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-cms-border bg-white p-3">
          <Button asChild variant="ghost">
            <Link href={works}><ArrowLeft aria-hidden /> Back to Works</Link>
          </Button>
          <div className="mr-auto min-w-0">
            <p className="max-w-56 truncate text-sm font-semibold">{fields.title || "Untitled draft"}</p>
            <p className="text-xs text-cms-secondary">{status}{dirty ? " · Unsaved Changes" : ""}</p>
            {stamp && <p className="text-xs text-cms-secondary">Last saved <time dateTime={stamp}>
              {savedTime.format(new Date(stamp))} (Taipei)
            </time></p>}
          </div>
          <Button type="button" variant="outline" disabled={pending || uploadingMedia}
            onClick={() => setShowPreview(!showPreview)}><Eye aria-hidden />{showPreview ? "Back to editor" : "Preview"}</Button>
          {!showPreview && (
            <>
              {recoveryUser && content !== null && !archived && <Button type="button" variant="ghost"
                onClick={() => document.getElementById("draft-recovery")?.focus()}>Draft recovery</Button>}
              {content !== null && <Button type="button" variant="ghost" onClick={downloadBackup}>Download draft backup</Button>}
              {content && !archived && <>
                <Button type="button" variant="outline" disabled={pending || uploadingMedia || !historyControls.undo}
                  onClick={() => updateDocument({ type: "undo" })}>Undo blocks</Button>
                <Button type="button" variant="outline" disabled={pending || uploadingMedia || !historyControls.redo}
                  onClick={() => updateDocument({ type: "redo" })}>Redo blocks</Button>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={autosave} onChange={(event) => setAutosave(event.currentTarget.checked)} />
                  Autosave
                </label>
              </>}
              {saveButton}
            </>
          )}
          {offline && <p role="status" className="basis-full text-sm text-cms-secondary">
            Offline. You can keep editing and download a backup. Reconnect to save or navigate.
          </p>}
          {autosave && result.error && <p className="basis-full text-sm text-cms-secondary">
            Autosave paused. Review any conflict and use Save Draft to resume.
          </p>}
          {saving && <p role="status" className="basis-full text-sm text-cms-secondary">Saving…</p>}
          {success && !saving && !result.error && <p role="status" className="basis-full text-sm font-semibold text-emerald-700">
            Saved successfully
          </p>}
          {result.error && <p role="alert" className="basis-full text-sm text-red-800">
            <strong>Save failed.</strong> {result.error}
          </p>}
        </div>
      )}
      {id && recoveryUser && stamp && content && !archived && (
        <div className={showPreview ? "hidden" : undefined}>
          <DraftRecoveryPanel key={recoveryUser + ":" + id} project={id} user={recoveryUser}
            version={stamp} dirty={dirty} busy={pending || uploadingMedia || !!result.conflict}
            fields={fields} content={content} offline={offline}
            onReview={() => setAutosave(false)}
            onApply={(backup) => {
              setFields(backup.fields);
              setAutosave(false);
              updateDocument({ type: "reset", document: backup.content_blocks });
              setResult({});
            }} />
        </div>
      )}
      {!id && result.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <strong>Save failed.</strong> {result.error}
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
              busy={pending || uploadingMedia} contentReset={contentReset} onUploading={setEditingMedia}
              onChange={changeContent} />
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
