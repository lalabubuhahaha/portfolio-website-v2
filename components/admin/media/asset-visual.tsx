"use client";

import Image from "next/image";
import { Film, ImageIcon, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { mediaFormat } from "@/lib/cms/media-formats";
import type { MediaAsset } from "@/lib/content/media";
import { Button } from "../ui/button";

export function AssetThumbnail({ asset }: { asset: MediaAsset }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (asset.thumbnail && failed !== asset.thumbnail) {
    return (
      <Image
        src={asset.thumbnail}
        alt=""
        unoptimized
        width={480}
        height={360}
        onError={() => setFailed(asset.thumbnail)}
        className="h-full w-full object-contain"
      />
    );
  }
  const Icon = mediaFormat(asset.mime)?.kind === "video" ? Film : ImageIcon;
  return (
    <span className="flex h-full flex-col items-center justify-center gap-2 text-xs text-cms-secondary">
      <Icon className="size-6" aria-hidden />
      <span>
        {asset.state !== "ready"
          ? "Pending cleanup"
          : (mediaFormat(asset.mime)?.label ?? "File")}
      </span>
    </span>
  );
}

export function AssetPreview({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    id: string;
    attempt: number;
    asset?: MediaAsset;
    url?: string;
    error?: boolean;
  }>();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = await fetch("/admin/media/api/" + id, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!result.ok) throw new Error("Preview unavailable");
        const { asset, url }: { asset: MediaAsset; url: string } =
          await result.json();
        setResponse({ id, attempt, asset, url });
      } catch {
        if (!controller.signal.aborted)
          setResponse({ id, attempt, error: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, id]);

  if (response?.id !== id || response.attempt !== attempt) {
    return (
      <div
        role="status"
        className="grid min-h-28 place-items-center rounded-lg bg-cms-background text-sm text-cms-secondary"
      >
        Loading preview…
      </div>
    );
  }
  if (
    response.error ||
    !response.asset ||
    !response.url ||
    failedUrl === response.url
  ) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 rounded-lg bg-cms-background p-3 text-sm"
      >
        Preview unavailable.
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFailedUrl(null);
            setAttempt(attempt + 1);
          }}
        >
          <RefreshCw />
          Reload preview
        </Button>
      </div>
    );
  }
  const { asset, url } = response;
  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-lg border border-cms-border bg-cms-background ${compact ? "h-40" : "min-h-40"}`}
    >
      {mediaFormat(asset.mime)?.kind === "video" ? (
        <video
          aria-label={asset.displayName}
          controls
          playsInline
          preload="metadata"
          src={url}
          className="max-h-[55dvh] w-full object-contain"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <Image
          src={url}
          unoptimized
          width={asset.width ?? 720}
          height={asset.height ?? 480}
          alt={asset.alt || asset.displayName}
          onError={() => setFailedUrl(url)}
          className={`h-full w-full object-contain ${compact ? "max-h-40" : "max-h-[55dvh]"}`}
        />
      )}
    </div>
  );
}
