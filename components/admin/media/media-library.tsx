"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, Pencil, Trash2 } from "lucide-react";
import { formatMediaSize, mediaFormat } from "@/lib/cms/media-formats";
import type { MediaAsset } from "@/lib/content/media";
import { Button } from "../ui/button";
import { Input, Textarea } from "../ui/fields";
import { AssetPreview, AssetThumbnail } from "./asset-visual";
import { MediaDialog } from "./dialog";

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "Asia/Taipei",
});
const dateText = (date: string) => dateFormat.format(new Date(date));
const dimensions = (asset: MediaAsset) =>
  asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—";

function Details({
  asset,
  onDelete,
}: {
  asset: MediaAsset;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const ready = asset.state === "ready";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(undefined);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await fetch("/admin/media/api/" + asset.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!result.ok) {
        const data = await result.json().catch(() => null);
        setNotice({
          text: data?.error ?? "Changes could not be saved.",
          error: true,
        });
      } else {
        setNotice({ text: "Details saved." });
        router.refresh();
      }
    } catch {
      setNotice({
        text: "Connection interrupted. Retry your changes.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {ready ? (
        <AssetPreview id={asset.id} />
      ) : (
        <p className="rounded-lg bg-cms-background p-4 text-sm">
          This file is awaiting upload or cleanup.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-cms-background p-4 text-sm sm:grid-cols-3">
        {[
          ["Original file", asset.fileName],
          ["Type", mediaFormat(asset.mime)?.label ?? asset.mime],
          ["Size", formatMediaSize(asset.size)],
          ["Dimensions", dimensions(asset)],
          [
            "Aspect ratio",
            asset.width && asset.height
              ? `${(asset.width / asset.height).toFixed(2)}:1`
              : "—",
          ],
          ["Uploaded", dateText(asset.createdAt)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-cms-secondary">{label}</dt>
            <dd className="mt-1 break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {ready && (
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="media-name">
                Display name
              </label>
              <Input
                id="media-name"
                name="displayName"
                required
                maxLength={160}
                defaultValue={asset.displayName}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="media-alt">
                Alt text
              </label>
              <Input
                id="media-alt"
                name="alt"
                maxLength={500}
                defaultValue={asset.alt}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="media-caption">
                Caption
              </label>
              <Textarea
                id="media-caption"
                name="caption"
                maxLength={2000}
                defaultValue={asset.caption}
                className="w-full"
              />
            </div>
          </fieldset>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save Details"}
          </Button>
        </form>
      )}
      <div className="flex flex-wrap gap-2 border-t border-cms-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(asset.id);
              setNotice({ text: "Asset reference copied." });
            } catch {
              setNotice({
                text: "Select the asset ID below to copy it.",
                error: true,
              });
            }
          }}
        >
          <Copy />
          Copy Asset Reference
        </Button>
        <Button type="button" variant="outline" onClick={onDelete}>
          <Trash2 />
          Delete Asset
        </Button>
      </div>
      <p className="break-all font-mono text-xs text-cms-secondary">
        {asset.id}
      </p>
      {notice && (
        <p
          role={notice.error ? "alert" : "status"}
          className={`text-sm ${notice.error ? "text-red-700" : "text-emerald-700"}`}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}

export function MediaLibrary({
  assets,
  list,
}: {
  assets: MediaAsset[];
  list: boolean;
}) {
  const router = useRouter();
  const opener = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<{ id: string; remove: boolean }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = assets.find((asset) => asset.id === selection?.id);

  function choose(id: string, remove: boolean, element?: HTMLElement) {
    if (element) opener.current = element;
    setMessage("");
    setSelection({ id, remove });
  }
  function close() {
    if (busy) return;
    setSelection(undefined);
    queueMicrotask(() => opener.current?.focus());
  }

  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch("/admin/media/api/" + selected.id, {
        method: "DELETE",
      });
      if (result.ok) {
        setSelection(undefined);
        router.refresh();
      } else {
        const data = await result.json().catch(() => null);
        setMessage(data?.error ?? "Could not delete the asset. Try again.");
      }
    } catch {
      setMessage("Connection interrupted. Retry the deletion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ul
        aria-label="Media assets"
        className={
          list
            ? "overflow-hidden rounded-xl border border-cms-border bg-white"
            : "grid grid-cols-1 gap-4 min-[410px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        }
      >
        {assets.map((asset) => (
          <li
            key={asset.id}
            className={
              list
                ? "grid items-center gap-3 border-b border-cms-border p-3 last:border-0 sm:grid-cols-[64px_minmax(0,1fr)_auto]"
                : "group overflow-hidden rounded-xl border border-cms-border bg-white"
            }
          >
            <button
              type="button"
              onClick={(event) => choose(asset.id, false, event.currentTarget)}
              aria-label={`Preview ${asset.displayName}`}
              className={`block w-full overflow-hidden bg-cms-background focus-visible:outline-cms-primary ${list ? "h-16 max-w-24 rounded-md sm:max-w-none" : "aspect-[4/3] border-b border-cms-border"}`}
            >
              <AssetThumbnail asset={asset} />
            </button>
            <div className={`min-w-0 ${list ? "" : "p-4 pb-2"}`}>
              <h2
                className="break-words text-sm font-semibold [overflow-wrap:anywhere]"
                title={asset.displayName}
              >
                {asset.displayName}
              </h2>
              {asset.fileName !== asset.displayName && (
                <p
                  className="mt-1 truncate text-xs text-cms-secondary"
                  title={asset.fileName}
                >
                  {asset.fileName}
                </p>
              )}
              <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-cms-secondary">
                <span className="font-medium">
                  {mediaFormat(asset.mime)?.label ?? asset.mime}
                </span>
                <span>{formatMediaSize(asset.size)}</span>
                {asset.width && asset.height ? (
                  <span>{dimensions(asset)}</span>
                ) : null}
                <span>{dateText(asset.createdAt)}</span>
                {asset.state !== "ready" && (
                  <span className="text-amber-800">Pending cleanup</span>
                )}
              </p>
            </div>
            <div className={`flex flex-wrap gap-1 ${list ? "" : "px-3 pb-3"}`}>
              <Button
                type="button"
                variant="ghost"
                className="size-8 px-0"
                title="Preview"
                aria-label={`View ${asset.displayName}`}
                onClick={(event) =>
                  choose(asset.id, false, event.currentTarget)
                }
              >
                <Eye />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="size-8 px-0"
                title="Edit details"
                aria-label={`Edit ${asset.displayName}`}
                onClick={(event) =>
                  choose(asset.id, false, event.currentTarget)
                }
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="size-8 px-0"
                title="Delete asset"
                aria-label={`Delete ${asset.displayName}`}
                onClick={(event) => choose(asset.id, true, event.currentTarget)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <MediaDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={selection?.remove ? "Delete asset?" : "Media details"}
        description={
          selection?.remove
            ? "This permanently removes the private file. Referenced assets are protected."
            : (selected?.displayName ?? "")
        }
      >
        {selected &&
          (selection?.remove ? (
            <div className="space-y-4">
              <p className="break-words text-sm font-medium">
                {selected.displayName}
              </p>
              {message && (
                <p role="alert" className="text-sm text-red-700">
                  {message}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="bg-red-700 hover:bg-red-800"
                >
                  {busy ? "Removing…" : "Delete Asset"}
                </Button>
              </div>
            </div>
          ) : (
            <Details
              key={selected.id}
              asset={selected}
              onDelete={() => choose(selected.id, true)}
            />
          ))}
      </MediaDialog>
    </>
  );
}
