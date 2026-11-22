"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Upload } from "lucide-react";
import {
  cleanFileName,
  MEDIA_FORMATS,
  validateMediaInput,
} from "@/lib/cms/media-formats";
import { Button } from "../ui/button";
import { MediaDialog } from "./dialog";
import { uploadMedia } from "./upload-media";

type Entry = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "saved" | "failed" | "canceled";
  progress: number;
  error?: string;
};

export function UploadDialog() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<{ id: string; request: XMLHttpRequest } | null>(null);
  const [open, setOpen] = useState(false);
  const batch = useRef(new Set<string>());
  const [batchId, advanceBatch] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  function add(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files, (file) => {
      const error = validateMediaInput(
        cleanFileName(file.name),
        file.type,
        file.size,
      );
      return {
        id: crypto.randomUUID(),
        file,
        status: error ? ("failed" as const) : ("queued" as const),
        progress: 0,
        error: error ?? undefined,
      };
    });
    setEntries((current) => [...current, ...next]);
  }

  useEffect(() => {
    if (active.current) return;
    const entry = entries.find(
      (item) => item.status === "queued" && batch.current.has(item.id),
    );
    if (!entry) return;

    const update = (data: Partial<Entry>) =>
      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id ? { ...item, ...data } : item,
        ),
      );
    const finish = (status: Entry["status"], error?: string) => {
      active.current = null;
      batch.current.delete(entry.id);
      update({
        status,
        error,
        ...(status === "saved" ? { progress: 100 } : {}),
      });
      if (status === "saved") router.refresh();
    };

    update({ status: "uploading", progress: 0, error: undefined });
    const request = uploadMedia(
      entry.file,
      entry.id,
      (progress) => update({ progress }),
      (result) => finish(result.status, result.status === "saved" ? undefined : result.error),
    );
    active.current = { id: entry.id, request };
  }, [batchId, entries, router]);

  function cancel(id: string) {
    if (active.current?.id === id) active.current.request.abort();
    else {
      batch.current.delete(id);
      setEntries((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: "canceled" } : item,
        ),
      );
    }
  }

  function retry(id: string) {
    setEntries((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "queued", progress: 0, error: undefined }
          : item,
      ),
    );
    batch.current.add(id);
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    add(event.target.files);
    event.target.value = "";
  }

  return (
    <MediaDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button">
          <Upload />
          Upload Files
        </Button>
      }
      title="Upload files"
      description="JPEG, PNG, WebP, AVIF, GIF, MP4 and WebM. Up to 4 MiB per file."
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={`grid justify-items-center gap-3 rounded-xl border border-dashed p-6 text-center ${dragging ? "border-cms-primary bg-cms-selected" : "border-cms-border bg-cms-background"}`}
      >
        <FileUp aria-hidden className="size-7 text-cms-primary" />
        <p className="text-sm font-medium">Drop files here or browse</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={Object.keys(MEDIA_FORMATS).join(",")}
          aria-label="Browse media files"
          onChange={choose}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => input.current?.click()}
        >
          Browse Files
        </Button>
      </div>
      {entries.length > 0 && (
        <ul
          aria-label="Upload queue"
          className="mt-4 max-h-72 divide-y divide-cms-border overflow-y-auto"
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">
                  {entry.file.name}
                </p>
                <p
                  className={`text-xs ${entry.error ? "text-red-700" : "text-cms-secondary"}`}
                  role={entry.error ? "status" : undefined}
                >
                  {entry.error ??
                    (entry.status === "uploading"
                      ? entry.progress === 100
                        ? "Validating and saving…"
                        : `Uploading ${entry.progress}%`
                      : entry.status === "saved"
                        ? "Uploaded"
                        : entry.status === "queued"
                          ? "Queued"
                          : "Canceled")}
                </p>
                {entry.status === "uploading" && (
                  <progress
                    aria-label={`Upload progress for ${entry.file.name}`}
                    max={100}
                    value={entry.progress}
                    className="mt-1 w-full accent-cms-primary"
                  />
                )}
              </div>
              {entry.status === "uploading" || entry.status === "queued" ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => cancel(entry.id)}
                >
                  Cancel
                </Button>
              ) : (entry.status === "failed" || entry.status === "canceled") &&
                !validateMediaInput(
                  cleanFileName(entry.file.name),
                  entry.file.type,
                  entry.file.size,
                ) ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => retry(entry.id)}
                >
                  Retry
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button
          type="button"
          disabled={!entries.some((entry) => entry.status === "queued")}
          onClick={() => {
            for (const entry of entries)
              if (entry.status === "queued") batch.current.add(entry.id);
            advanceBatch((value) => value + 1);
          }}
        >
          Start Upload
        </Button>
      </div>
    </MediaDialog>
  );
}
