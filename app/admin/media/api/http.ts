import { getAdminSession } from "@/lib/cms/session";

export function mediaJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  // Next can normalize its internal request URL to localhost behind a proxy.
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.slice(0, -1);
  if (protocol !== "http" && protocol !== "https") return false;
  return origin === `${protocol}://${host}`;
}

export async function mediaAdmin() {
  const session = await getAdminSession();
  if (session.state !== "authorized") {
    const status =
      session.state === "forbidden"
        ? 403
        : session.state === "signed-out"
          ? 401
          : 503;
    return {
      response: mediaJson(
        { error: "An active administrator session is required." },
        status,
      ),
    };
  }
  return { session };
}

export async function readMediaBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return size ? Buffer.concat(chunks, size) : null;
  } finally {
    reader.releaseLock();
  }
}
