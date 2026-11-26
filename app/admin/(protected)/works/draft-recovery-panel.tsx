"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/admin/ui/button";
import type { ContentBlocks } from "@/lib/cms/blocks";
import type { DraftFields } from "@/lib/cms/project-fields";
import {
  consentKey, disableUserRecovery, listSnapshots, RECOVERY_DELAY, RECOVERY_LIMIT, RECOVERY_PREFIX, RECOVERY_TTL,
  snapshotPrefix, writeSnapshot, type RecoveryItem,
} from "@/lib/cms/draft-recovery-storage";
import type { DraftBackup } from "@/lib/cms/draft-recovery";
import { RecoveryComparison } from "./recovery-comparison";
import { reviewDraftBackup } from "./actions";

type Review = Awaited<ReturnType<typeof reviewDraftBackup>>;

export function DraftRecoveryPanel({
  project, user, version, dirty, busy, fields, content, offline, onReview, onApply,
}: {
  project: string;
  user: string;
  version: string;
  dirty: boolean;
  busy: boolean;
  fields: DraftFields;
  content: ContentBlocks;
  offline: boolean;
  onReview: () => void;
  onApply: (backup: DraftBackup) => void;
}) {
  const id = useRef<string>(null);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<{ at: string; fields: DraftFields; content: ContentBlocks; version: string }>();
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<{
    result: Review; raw: string; source: "snapshot" | "backup"; expiresAt?: number;
  }>();
  const comparison = useRef<HTMLElement>(null);
  const openEditor = useRef({ version, fields, content, busy });
  useLayoutEffect(() => {
    if (openEditor.current.version !== version || openEditor.current.fields !== fields ||
      openEditor.current.content !== content || openEditor.current.busy !== busy)
      openEditor.current = { version, fields, content, busy };
  }, [version, fields, content, busy]);
  useEffect(() => {
    const panel = comparison.current;
    if (!review || !panel) return;
    const toolbarHeight = document.getElementById("draft-save-toolbar")?.getBoundingClientRect().height ?? 0;
    panel.style.scrollMarginTop = `${toolbarHeight + 12}px`;
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "start" });
  }, [review]);
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
        if (!id.current || !store.getItem(id.current)) setSnapshot(undefined);
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
        const now = Date.now();
        const at = new Date(now).toISOString();
        if (writeSnapshot(window.localStorage, user, id.current, JSON.stringify({
          version: 1, projectId: project, baseVersion: version,
          exportedAt: at, fields, content_blocks: content,
        } satisfies DraftBackup), now)) {
          setSnapshot({ at, fields, content, version });
          setStorageError("");
        }
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

  useEffect(() => {
    if (!snapshot) return;
    const timer = window.setTimeout(() => setSnapshot(undefined),
      Math.max(0, Date.parse(snapshot.at) + RECOVERY_TTL - Date.now()));
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  function toggle() {
    try {
      const store = window.localStorage;
      if (enabled) {
        if (!window.confirm("Disable and remove this account’s browser snapshots on this device?")) return;
        disableUserRecovery(store, user);
        setItems([]);
        setSnapshot(undefined);
        setReview(undefined);
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
  async function stage(raw: string, source: "snapshot" | "backup", expiresAt?: number) {
    onReview();
    setError("");
    if (!navigator.onLine) {
      setError("Reconnect to compare a backup with the stored draft. Your local copy is still available.");
      return;
    }
    setReview(undefined);
    setAcceptVersion(false);
    setReviewing(true);
    try {
      const checked = await reviewDraftBackup(project, version, raw);
      if (checked.error) setError(checked.error);
      else setReview({ result: checked, raw, source, expiresAt });
    } catch {
      setError("The backup could not be reviewed. Keep your file and try again when connected.");
    } finally { setReviewing(false); }
  }

  const currentSnapshot = snapshot?.fields === fields && snapshot.content === content && snapshot.version === version;
  const candidate = review?.result.backup;
  const changedVersion = candidate?.baseVersion !== review?.result.reviewedVersion;

  async function apply() {
    if (!review || !candidate || busy || offline || reviewing || review.result.reviewedVersion !== version ||
      (changedVersion && !acceptVersion)) return;
    if (review.expiresAt !== undefined && review.expiresAt <= Date.now()) {
      setReview(undefined);
      setError("This browser snapshot has expired. Choose another backup.");
      return;
    }
    if (dirty && !window.confirm("Replace the unsaved edits in this editor? You can restore them from the toolbar before saving.")) return;
    const editorAtConfirmation = openEditor.current;
    setReviewing(true);
    setError("");
    try {
      const checked = await reviewDraftBackup(project, version, review.raw);
      if (!mounted.current) return;
      if (checked.error || !checked.backup) {
        setReview(undefined);
        setError(checked.error ?? "This backup could not be applied.");
      } else if (openEditor.current !== editorAtConfirmation) {
        setError("The open editor changed during the check. Compare the latest differences before applying.");
      } else if (review.expiresAt !== undefined && review.expiresAt <= Date.now()) {
        setReview(undefined);
        setError("This browser snapshot has expired. Choose another backup.");
      } else {
        onApply(checked.backup);
        setReview(undefined);
      }
    } catch {
      setError("Could not check the backup. Your open edits are still here. Try again when connected.");
    } finally { setReviewing(false); }
  }
  return (
    <section id="draft-recovery" tabIndex={-1} aria-label="Draft recovery" className="scroll-mt-44 rounded-xl border border-cms-border bg-white p-4 text-sm">
      <h2 className="font-semibold">Draft recovery</h2>
      <p className="mt-1 text-cms-secondary">Browser recovery is for private devices. Snapshots are kept in this browser for up to 24 hours while this feature is enabled. Use a downloaded backup for a separate copy.</p>
      <p className="mt-1 text-cms-secondary">Enable local recovery before editing. After reopening this draft in the same browser, choose Review snapshot to compare any unsaved copy.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" aria-pressed={enabled} disabled={reviewing} onClick={toggle}>
          {enabled ? "Disable local recovery" : "Enable local recovery"}
        </Button>
        <Button type="button" variant="outline" disabled={offline || busy || reviewing} onClick={() => input.current?.click()}>Import draft backup</Button>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setReview(undefined);
          if (file.size > RECOVERY_LIMIT) { setError("This backup exceeds the size limit."); return; }
          try { await stage(await file.text(), "backup"); }
          catch { setError("Could not read the backup file."); }
        }} />
      </div>
      {offline && <p className="mt-2 text-cms-secondary">Reconnect to import or compare. Download and local snapshot storage are available when supported by your browser.</p>}
      {enabled && dirty && !storageError && <p role="status" className="mt-2 text-cms-secondary">
        {currentSnapshot && snapshot ? <>Snapshot saved on this device · <time dateTime={snapshot.at}>
          {new Date(snapshot.at).toLocaleTimeString("en", { timeZone: "Asia/Taipei" })} (Taipei)
        </time></> : "Waiting to save the current local snapshot…"}
      </p>}
      {storageError && <p role="alert" className="mt-2 text-red-800">{storageError}</p>}
      {error && <p role="alert" className="mt-2 text-red-800">{error}</p>}
      {reviewing && <p role="status" className="mt-2">Checking the backup and private media…</p>}
      {!!items.length && <ul className="mt-2 space-y-2">
        {items.map((item) => <li className="flex flex-wrap items-center gap-2" key={item.key}>
          <span>Unsaved browser snapshot · {new Date(item.expiresAt - RECOVERY_TTL).toLocaleString()}</span>
          <Button type="button" variant="outline" disabled={offline || busy || reviewing} onClick={() => {
            if (item.expiresAt <= Date.now()) {
              discard(item.key);
              setError("This browser snapshot has expired.");
            } else void stage(item.raw, "snapshot", item.expiresAt);
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
      {candidate && review && (
        <section ref={comparison} tabIndex={-1} aria-label="Backup comparison"
          className="mt-4 space-y-3 rounded-lg border border-cms-border p-3">
          <h3 className="font-semibold">Compare with your open editor</h3>
          <p>Apply backup to editor replaces the project details and blocks shown here. The stored draft changes only when you click Save Draft.</p>
          {dirty && <p className="rounded bg-cms-background p-2 font-medium">
            You have unsaved edits. If you apply this copy, use Restore previous edits in the toolbar to bring them back before saving.
          </p>}
          {review.result.reviewedVersion !== version && <p role="alert">The editor version changed. Review the backup again.</p>}
          {changedVersion && <label className="flex items-start gap-2">
            <input type="checkbox" checked={acceptVersion} onChange={(event) => setAcceptVersion(event.target.checked)} disabled={reviewing} />
            This copy is older than the stored draft or its starting version is unknown. I reviewed the differences and want to continue.
          </label>}
          <RecoveryComparison current={{ fields, content }} backup={candidate} media={review.result.mediaNames ?? {}} source={review.source} />
          <div className="flex flex-wrap gap-2">
            <Button type="button"
              disabled={offline || busy || reviewing || review.result.reviewedVersion !== version || (changedVersion && !acceptVersion)}
              onClick={() => void apply()}>Apply backup to editor</Button>
            <Button type="button" variant="ghost" disabled={reviewing} onClick={() => setReview(undefined)}>Cancel review</Button>
          </div>
        </section>
      )}
    </section>
  );
}
