"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/admin/ui/button";
import type { ContentBlocks } from "@/lib/cms/blocks";
import type { DraftFields } from "@/lib/cms/project-fields";
import {
  consentKey, disableUserRecovery, listSnapshots, RECOVERY_DELAY, RECOVERY_LIMIT, RECOVERY_PREFIX, RECOVERY_TTL,
  snapshotPrefix, writeSnapshot, type RecoveryItem,
} from "@/lib/cms/draft-recovery-storage";
import type { DraftBackup } from "@/lib/cms/draft-recovery";
import { reviewDraftBackup } from "./actions";

type Review = Awaited<ReturnType<typeof reviewDraftBackup>>;

export function DraftRecoveryPanel({
  project, user, version, dirty, busy, fields, content, onApply,
}: {
  project: string;
  user: string;
  version: string;
  dirty: boolean;
  busy: boolean;
  fields: DraftFields;
  content: ContentBlocks;
  onApply: (backup: DraftBackup) => void;
}) {
  const id = useRef<string>(null);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<Review>();
  const [acceptVersion, setAcceptVersion] = useState(false);
  const consent = consentKey(user);

  useEffect(() => {
    mounted.current = true;
    if (!globalThis.crypto?.randomUUID) {
      queueMicrotask(() => setStorageError("Browser recovery is unavailable. Use Download draft backup."));
      return;
    }
    id.current ??= snapshotPrefix(user, project) + crypto.randomUUID();
    function read() {
      try {
        const store = window.localStorage;
        const allowed = store.getItem(consent) === "enabled";
        setEnabled(allowed);
        setItems(allowed ? listSnapshots(store, user, project).filter((item) => item.key !== id.current) : []);
      } catch {
        setStorageError("Browser recovery is unavailable. Use Download draft backup.");
      }
    }
    function change(event: StorageEvent) {
      if (event.key === null || event.key.startsWith(RECOVERY_PREFIX)) read();
    }
    queueMicrotask(() => { if (mounted.current) read(); });
    window.addEventListener("storage", change);
    return () => { mounted.current = false; window.removeEventListener("storage", change); };
  }, [consent, project, user]);

  useEffect(() => {
    if (!enabled) return;
    function persist() {
      if (!id.current) return;
      try {
        if (!dirty) { window.localStorage.removeItem(id.current); return; }
        writeSnapshot(window.localStorage, user, id.current, JSON.stringify({
          version: 1, projectId: project, baseVersion: version,
          exportedAt: new Date().toISOString(), fields, content_blocks: content,
        } satisfies DraftBackup));
      } catch {
        setStorageError("Browser recovery could not write a snapshot. Download a draft backup before leaving.");
      }
    }
    function visibility() {
      if (document.visibilityState === "hidden") persist();
    }
    const timer = window.setTimeout(persist, dirty ? RECOVERY_DELAY : 0);
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, dirty, project, user, version, fields, content]);

  function toggle() {
    try {
      const store = window.localStorage;
      if (enabled) {
        if (!window.confirm("Disable and remove this account’s browser snapshots on this device?")) return;
        disableUserRecovery(store, user);
        setItems([]);
      } else {
        store.setItem(consent, "enabled");
        setItems(listSnapshots(store, user, project).filter((item) => item.key !== id.current));
      }
      setEnabled(!enabled);
      setStorageError("");
    } catch {
      setStorageError("Browser recovery is unavailable. Use Download draft backup.");
    }
  }
  function discard(key: string) {
    try {
      window.localStorage.removeItem(key);
      setItems((current) => current.filter((item) => item.key !== key));
    } catch {
      setStorageError("Could not remove this browser snapshot.");
    }
  }
  async function stage(raw: string) {
    setError("");
    setReview(undefined);
    setAcceptVersion(false);
    setReviewing(true);
    try {
      const checked = await reviewDraftBackup(project, version, raw);
      if (checked.error) setError(checked.error);
      else setReview(checked);
    } catch {
      setError("The backup could not be reviewed. Keep your file and try again when connected.");
    } finally { setReviewing(false); }
  }

  const candidate = review?.backup;
  const stored = review?.stored;
  const changedVersion = candidate?.baseVersion !== review?.reviewedVersion;
  return (
    <section aria-label="Draft recovery" className="rounded-xl border border-cms-border bg-white p-4 text-sm">
      <h2 className="font-semibold">Draft recovery</h2>
      <p className="mt-1 text-cms-secondary">Browser recovery is for private devices. Snapshots are kept in this browser for up to 24 hours while this feature is enabled. Use a downloaded backup for a separate copy.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" aria-pressed={enabled} onClick={toggle}>
          {enabled ? "Disable browser recovery" : "Enable browser recovery"}
        </Button>
        <Button type="button" variant="outline" disabled={busy || reviewing} onClick={() => input.current?.click()}>Import draft backup</Button>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          if (file.size > RECOVERY_LIMIT) { setError("This backup exceeds the size limit."); return; }
          try { await stage(await file.text()); }
          catch { setError("Could not read the backup file."); }
        }} />
      </div>
      {storageError && <p role="alert" className="mt-2 text-red-800">{storageError}</p>}
      {error && <p role="alert" className="mt-2 text-red-800">{error}</p>}
      {reviewing && <p role="status" className="mt-2">Checking the backup and private media…</p>}
      {!!items.length && <ul className="mt-2 space-y-2">
        {items.map((item) => <li className="flex flex-wrap items-center gap-2" key={item.key}>
          <span>Unsaved browser snapshot · {new Date(item.expiresAt - RECOVERY_TTL).toLocaleString()}</span>
          <Button type="button" variant="outline" disabled={busy || reviewing} onClick={() => {
            if (item.expiresAt <= Date.now()) {
              discard(item.key);
              setError("This browser snapshot has expired.");
            } else void stage(item.raw);
          }}>Review snapshot</Button>
          <Button type="button" variant="ghost" onClick={() => {
            if (item.expiresAt <= Date.now()) { discard(item.key); return; }
            const url = URL.createObjectURL(new Blob([item.raw], { type: "application/json" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "draft-snapshot-" + project + ".json";
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
          }}>Download snapshot</Button>
          <Button type="button" variant="ghost" disabled={reviewing}
            onClick={() => { if (window.confirm("Discard this browser snapshot?")) discard(item.key); }}>Discard snapshot</Button>
        </li>)}
      </ul>}
      {candidate && stored && (
        <section aria-label="Backup comparison" className="mt-4 space-y-2 rounded-lg border border-cms-border p-3">
          <h3 className="font-semibold">Review backup differences</h3>
          <p>Applying the backup replaces the open editor fields and blocks. Save Draft is a separate action.</p>
          {review.reviewedVersion !== version && <p role="alert">The editor version changed. Review the backup again.</p>}
          {changedVersion && <label className="flex items-center gap-2">
            <input type="checkbox" checked={acceptVersion} onChange={(event) => setAcceptVersion(event.target.checked)} />
            This backup has an older or unknown base version. I reviewed the stored draft below.
          </label>}
          <dl className="space-y-2">
            {(Object.keys(candidate.fields) as (keyof DraftFields)[]).filter((key) => candidate.fields[key] !== stored.fields[key]).map((key) => <div key={key} className="break-all">
              <dt className="font-semibold">{key}</dt>
              <dd>Stored · {stored.fields[key] || "Empty"}</dd>
              <dd>Backup · {candidate.fields[key] || "Empty"}</dd>
            </div>)}
          </dl>
          <div className="grid gap-2 md:grid-cols-2">
            {[["Stored blocks", stored.content], ["Backup blocks", candidate.content_blocks]].map(([label, value]) =>
              <details key={String(label)} className="min-w-0">
                <summary className="cursor-pointer font-medium">{String(label)}</summary>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(value, null, 2)}</pre>
              </details>)}
          </div>
          {dirty && <p>The open editor also has unsaved work. Download its backup before replacing it if you need to keep it.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || review.reviewedVersion !== version || (changedVersion && !acceptVersion)}
              onClick={() => {
                if (dirty && !window.confirm("Replace the current unsaved editor contents with this backup?")) return;
                onApply(candidate);
                setReview(undefined);
              }}>Apply backup to editor</Button>
            <Button type="button" variant="ghost" onClick={() => setReview(undefined)}>Cancel review</Button>
          </div>
        </section>
      )}
    </section>
  );
}
