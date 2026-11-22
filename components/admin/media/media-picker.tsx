"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import type { MediaAsset } from "@/lib/content/media";
import { Button } from "../ui/button";
import { AssetPreview, AssetThumbnail } from "./asset-visual";
import { MediaDialog } from "./dialog";
import { MediaFilterFields } from "./media-filters";
import { SingleMediaUpload } from "./single-media-upload";

type Results = { items: MediaAsset[]; pages: number };

export function MediaPicker({
  value,
  onSelect,
  imagesOnly = false,
  disabled = false,
}: {
  value: string;
  onSelect: (id: string) => void;
  imagesOnly?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterReset, resetFilter] = useState(0);
  const [selected, setSelected] = useState(value);
  const [preview, setPreview] = useState("");
  const [filter, setFilter] = useState({ q: "", type: "", page: 1 });
  const [request, setRequest] = useState(0);
  const [reply, setReply] = useState<{ key: string; data?: Results }>();
  const query = new URLSearchParams({
    picker: "1",
    images: imagesOnly ? "1" : "0",
    q: filter.q,
    type: filter.type,
    page: String(filter.page),
  }).toString();
  const key = query + ":" + request;
  const results = reply?.key === key ? reply.data : undefined;
  const loading = reply?.key !== key;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/admin/media/api?" + query, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Media unavailable");
        const data: Results = await response.json();
        setReply({ key, data });
      } catch {
        if (!controller.signal.aborted) setReply({ key });
      }
    }
    void load();
    return () => controller.abort();
  }, [key, open, query]);

  function changeOpen(next: boolean) {
    if (next) {
      setSelected(value);
      setUploading(false);
      setPreview("");
      setRequest((current) => current + 1);
    }
    setOpen(next);
  }

  function uploaded(id: string) {
    setSelected(id);
    setPreview(id);
    setFilter({ q: "", type: "", page: 1 });
    resetFilter((current) => current + 1);
    setRequest((current) => current + 1);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const form = new FormData(event.currentTarget);
    setFilter({
      q: String(form.get("q") ?? "").trim(),
      type: String(form.get("type") ?? ""),
      page: 1,
    });
  }

  return (
    <MediaDialog
      open={open}
      onOpenChange={changeOpen}
      trigger={
        <Button type="button" variant="outline" disabled={disabled}>
          <ImagePlus />
          Choose from Media Library
        </Button>
      }
      title="Select media"
      description={
        imagesOnly
          ? "Choose an image from the private library."
          : "Choose an asset from the private library."
      }
      wide
    >
      <div className="mb-4">
        <SingleMediaUpload
          label="Upload New"
          imagesOnly={imagesOnly}
          onUploaded={uploaded}
          onUploading={setUploading}
        />
      </div>
      <h3 className="mb-2 text-sm font-semibold">Select Existing</h3>
      <form key={filterReset} onSubmit={search} className="flex flex-wrap gap-2">
        <MediaFilterFields
          q={filter.q}
          type={filter.type}
          imagesOnly={imagesOnly}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {loading ? (
        <p role="status" className="py-6 text-sm">
          Loading assets…
        </p>
      ) : !results ? (
        <p role="alert" className="py-6 text-sm">
          Media could not be loaded.{" "}
          <Button
            type="button"
            variant="outline"
            onClick={() => setRequest((current) => current + 1)}
          >
            Retry
          </Button>
        </p>
      ) : results.items.length ? (
        <div
          role="group"
          aria-label="Available assets"
          className="my-4 grid max-h-[42dvh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4"
        >
          {results.items.map((asset) => (
            <div
              key={asset.id}
              className={`min-w-0 overflow-hidden rounded-lg border ${selected === asset.id ? "border-cms-primary ring-1 ring-cms-primary" : "border-cms-border"}`}
            >
              <button
                type="button"
                aria-pressed={selected === asset.id}
                onClick={() => setSelected(asset.id)}
                className="block w-full min-w-0 text-left"
              >
                <span className="block aspect-square bg-cms-background">
                  <AssetThumbnail asset={asset} />
                </span>
                <span
                  className="block truncate px-2 py-2 text-xs font-medium"
                  title={asset.displayName}
                >
                  {asset.displayName}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                className="m-1 h-7 px-2 text-xs"
                onClick={() => setPreview(preview === asset.id ? "" : asset.id)}
              >
                {preview === asset.id ? "Hide preview" : "Preview"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm text-cms-secondary">No matching media.</p>
      )}
      {preview && (
        <div className="mb-4">
          <AssetPreview id={preview} compact />
        </div>
      )}
      {results && results.pages > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={filter.page <= 1}
            onClick={() =>
              setFilter((current) => ({ ...current, page: current.page - 1 }))
            }
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {filter.page} of {results.pages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={filter.page >= results.pages}
            onClick={() =>
              setFilter((current) => ({ ...current, page: current.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-cms-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => changeOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!selected || uploading}
          onClick={() => {
            onSelect(selected);
            changeOpen(false);
          }}
        >
          Confirm Selection
        </Button>
      </div>
    </MediaDialog>
  );
}
