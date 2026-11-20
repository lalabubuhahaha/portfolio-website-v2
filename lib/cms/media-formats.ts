export const MEDIA_BUCKET = "cms-private";
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
export const MEDIA_FORMATS = {
  "image/jpeg": {
    ext: "jpg",
    extensions: ["jpg", "jpeg"],
    label: "JPEG",
    kind: "image",
  },
  "image/png": { ext: "png", extensions: ["png"], label: "PNG", kind: "image" },
  "image/webp": {
    ext: "webp",
    extensions: ["webp"],
    label: "WebP",
    kind: "image",
  },
  "image/avif": {
    ext: "avif",
    extensions: ["avif"],
    label: "AVIF",
    kind: "image",
  },
  "image/gif": { ext: "gif", extensions: ["gif"], label: "GIF", kind: "image" },
  "video/mp4": { ext: "mp4", extensions: ["mp4"], label: "MP4", kind: "video" },
  "video/webm": {
    ext: "webm",
    extensions: ["webm"],
    label: "WebM",
    kind: "video",
  },
} as const;

export function mediaFormat(mime: string) {
  return Object.hasOwn(MEDIA_FORMATS, mime)
    ? MEDIA_FORMATS[mime as keyof typeof MEDIA_FORMATS]
    : undefined;
}

export function cleanFileName(name: string) {
  return name
    .normalize("NFC")
    .replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
}

export function validateMediaInput(name: string, mime: string, size: number) {
  const format = mediaFormat(mime);
  if (!name || name.length > 255 || /[\\/]/.test(name))
    return "Use a file name of at most 255 characters without path separators.";
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_MEDIA_BYTES)
    return "Each file must be between 1 byte and 4 MiB.";
  const ext = name.split(".").pop()?.toLowerCase();
  if (
    !format ||
    !ext ||
    !name.includes(".") ||
    !format.extensions.some((allowed) => allowed === ext)
  ) {
    return "Choose a JPEG, PNG, WebP, AVIF, GIF, MP4 or WebM file with the matching extension.";
  }
  return null;
}

export function formatMediaSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : bytes >= 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${bytes} B`;
}
