"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import {
  cleanFileName,
  MEDIA_FORMATS,
  validateMediaInput,
} from "@/lib/cms/media-formats";
import { Button } from "../ui/button";
import { uploadMedia } from "./upload-media";

export function SingleMediaUpload({
  label,
  imagesOnly,
  onUploaded,
  onUploading,
}: {
  label: string;
  imagesOnly?: boolean;
  onUploaded: (id: string) => void;
  onUploading?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<XMLHttpRequest | null>(null);
  const [retry, setRetry] = useState<{ file: File; id: string }>();
  const [progress, setProgress] = useState<number>();
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const accept = Object.entries(MEDIA_FORMATS)
    .filter(([, format]) => !imagesOnly || format.kind === "image")
    .map(([mime]) => mime)
    .join(",");

  useEffect(() => () => {
    const request = active.current;
    active.current = null;
    request?.abort();
  }, []);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || active.current) return;

    const error = imagesOnly && !file.type.startsWith("image/")
      ? "Choose a supported image file."
      : validateMediaInput(cleanFileName(file.name), file.type, file.size);
    setRetry(undefined);
    if (error) {
      setMessage({ text: error, error: true });
      return;
    }

    start(file, crypto.randomUUID());
  }

  function start(file: File, id: string) {
    if (active.current) return;
    setRetry(undefined);
    setMessage(undefined);
    setProgress(0);
    onUploading?.(true);
    active.current = uploadMedia(file, id, setProgress, (result) => {
      if (!active.current) return;
      active.current = null;
      setProgress(undefined);
      onUploading?.(false);
      if (result.status === "saved") {
        onUploaded(result.id);
        setMessage({ text: "Uploaded to the Media Library." });
      } else {
        setRetry({ file, id });
        setMessage({ text: result.error, error: true });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept={accept} className="hidden" onChange={choose} />
      <Button type="button" variant="outline" disabled={progress !== undefined} onClick={() => input.current?.click()}>
        <Upload aria-hidden />
        {label}
      </Button>
      {progress !== undefined && (
        <div className="flex items-center gap-2 text-xs text-cms-secondary">
          <progress aria-label="Upload progress" max={100} value={progress} className="w-20 accent-cms-primary" />
          <span role="status">
            {progress === 100 ? "Validating and saving…" : `Uploading ${progress}%`}
          </span>
        </div>
      )}
      {retry && (
        <Button type="button" variant="ghost" onClick={() => start(retry.file, retry.id)}>
          Retry Upload
        </Button>
      )}
      {message && (
        <p role={message.error ? "alert" : "status"} className={`text-xs ${message.error ? "text-red-700" : "text-cms-secondary"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
