import { cleanFileName } from "@/lib/cms/media-formats";

type UploadResult =
  | { status: "saved"; id: string }
  | { status: "failed" | "canceled"; error: string };

export function uploadMedia(
  file: File,
  uploadId: string,
  onProgress: (progress: number) => void,
  onFinish: (result: UploadResult) => void,
) {
  const request = new XMLHttpRequest();
  request.open("POST", "/admin/media/api");
  request.responseType = "json";
  request.timeout = 65000;
  request.setRequestHeader("Content-Type", file.type);
  request.setRequestHeader("X-File-Name", encodeURIComponent(cleanFileName(file.name)));
  request.setRequestHeader("X-Upload-Id", uploadId);
  request.upload.onprogress = (event) => {
    if (event.lengthComputable)
      onProgress(Math.round((event.loaded / event.total) * 100));
  };
  request.onload = () => {
    const id: unknown = request.response?.id;
    if (request.status >= 200 && request.status < 300 && typeof id === "string") {
      onFinish({ status: "saved", id });
      return;
    }
    const error: unknown = request.response?.error;
    onFinish({
      status: "failed",
      error: typeof error === "string" ? error : "Upload failed. Try again.",
    });
  };
  request.onerror = request.ontimeout = () =>
    onFinish({ status: "failed", error: "Upload interrupted. Retry when connected." });
  request.onabort = () =>
    onFinish({
      status: "canceled",
      error: "Canceled. A fully received file can still finish saving.",
    });
  request.send(file);
  return request;
}
