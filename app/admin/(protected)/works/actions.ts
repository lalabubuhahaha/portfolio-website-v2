"use server";

import { isDeepStrictEqual } from "node:util";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contentBlocksSchema, MAX_BLOCK_BYTES } from "@/lib/cms/blocks";
import { getAdminSession, requireAdmin } from "@/lib/cms/session";
import {
  getCoverPreviews,
  getProjectEditor,
  type CoverPreviews,
} from "@/lib/content/cms";
import { readBackup } from "@/lib/cms/draft-recovery";
import { validateRecoveryAssets } from "@/lib/content/media";
import { WORKS_PAGE_SIZE } from "@/lib/cms/works-filters";
import {
  emptyDraft,
  projectFieldsSchema,
  type DraftFields,
} from "@/lib/cms/project-fields";

export type DraftResult = {
  error?: string;
  conflict?: boolean;
  fields?: Partial<Record<keyof DraftFields, string[]>>;
  verified?: { id: string; updatedAt: string; revisionId: string; revisionNumber: number };
};
const version = z.iso.datetime({ offset: true });
const projectId = z.uuid();

function message(code?: string) {
  if (code === "PGRST202" || code === "42883")
    return "The Works database update is required before saving.";
  if (code === "PT409")
    return "This data changed since you opened the page. Reload and try again.";
  if (code === "P0002")
    return "This project is unavailable. Return to Works and try again.";
  if (code === "22023" || code === "23503")
    return "Check your fields and selected cover, then try again.";
  return "Could not save the change. Check your connection and try again.";
}

async function save(
  id: string | null,
  updatedAt: string | null,
  form: FormData,
): Promise<DraftResult> {
  const session = await getAdminSession();
  if (session.state !== "authorized") return {
    error: session.state === "unavailable"
      ? "The authentication service is unavailable. Your edits are still here. Download a backup before leaving."
      : "Admin sign-in is required to save. Your edits are still here. Download a backup or sign in in a separate tab.",
  };
  const { supabase } = session;
  if (
    id !== null &&
    (!projectId.safeParse(id).success || !version.safeParse(updatedAt).success)
  ) {
    return { error: "Reload the editor and try again." };
  }
  const result = projectFieldsSchema.safeParse(
    Object.fromEntries(
      Object.keys(emptyDraft).map((key) => [key, form.get(key)]),
    ),
  );
  if (!result.success)
    return {
      error: "Check the highlighted fields.",
      fields: z.flattenError(result.error).fieldErrors,
    };

  const mode = form.get("content_mode");
  const raw = form.get("content_blocks");
  if (
    (mode !== "document" && mode !== "metadata-only") ||
    (mode === "metadata-only" ? raw !== null : raw === null)
  ) {
    return { error: "The draft request is incomplete. Your edits have been kept." };
  }
  let blocks;
  if (raw !== null) {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_BLOCK_BYTES)
      return { error: "The case study document is too large." };
    let input: unknown;
    try { input = JSON.parse(raw); }
    catch { return { error: "The case study document is invalid." }; }
    const check = contentBlocksSchema.safeParse(input);
    if (!check.success) {
      const issue = check.error.issues[0];
      return { error: `Case study ${issue.path.join(".")}: ${issue.message}` };
    }
    blocks = check.data;
  }
  if (mode === "metadata-only" && id !== null) {
    const existing = await getProjectEditor(id).catch(() => null);
    if (!existing || existing.content !== null || existing.updatedAt !== updatedAt)
      return { error: "Verify the latest draft before saving these fields. Your edits have been kept.", conflict: true };
  }
  const args = { project: id, expected: updatedAt, fields: result.data };
  const deadline = AbortSignal.timeout(12_000);
  const { data, error } = blocks
    ? await supabase.rpc("cms_save_case_study", { ...args, document: blocks }).abortSignal(deadline)
    : await supabase.rpc("cms_save_draft", args).abortSignal(deadline);
  if (error) {
    console.warn("CMS draft RPC rejected", { projectId: id, code: error.code, mode });
    if (
      error.code === "PT422" ||
      (error.code === "23505" && error.message.includes("projects_slug_key"))
    ) {
      return {
        error: "That slug is already in use.",
        fields: { slug: ["Choose a different slug."] },
      };
    }
    if (!error.code || error.code === "57014" || error.code === "PGRST003")
      return { error: "The save could not be confirmed. Your edits are still here. Review the latest stored draft before retrying.", conflict: id !== null };
    if (error.code === "PT409") {
      return {
        error: "This data changed since you opened the page.",
        conflict: true,
      };
    }
    if (blocks && error.code === "PGRST202")
      return { error: "The Stage 7.4 database migration is required to save case studies." };
    if (blocks && ["22023", "23503"].includes(error.code))
      return { error: "Check the selected media and case study fields. A referenced file may no longer be available." };
    return { error: message(error.code) };
  }
  const saved = z.object({ id: projectId, updatedAt: version }).safeParse(data);
  if (!saved.success || (id !== null && saved.data.id !== id.toLowerCase())) {
    return { error: "The save could not be confirmed. Your edits have been kept." };
  }

  // PostgREST has completed the write transaction. Use the same latest-revision
  // read as the editor to check what another session can actually load.
  const confirmed = await getProjectEditor(saved.data.id).catch(() => null);
  const confirmedFields = projectFieldsSchema.safeParse(confirmed?.fields);
  const actual = confirmedFields.success ? confirmedFields.data : null;
  const expected = { ...result.data, cover_asset_id: result.data.cover_asset_id?.toLowerCase() ?? null };
  if (!confirmed?.revisionId || typeof confirmed.revisionNumber !== "number" ||
    confirmed.updatedAt !== saved.data.updatedAt || !isDeepStrictEqual(actual, expected) ||
    (blocks && !isDeepStrictEqual(confirmed.content, blocks)) ||
    (mode === "metadata-only" && id !== null && confirmed.content !== null)) {
    console.warn("CMS draft read-back did not confirm the write", { projectId: saved.data.id });
    return {
      error: "The save could not be confirmed against the latest stored draft. Your edits have been kept.",
      conflict: id !== null,
    };
  }
  revalidatePath("/admin/works");
  revalidatePath("/admin/works/" + saved.data.id);
  revalidatePath("/admin");
  return { verified: {
    ...saved.data, revisionId: confirmed.revisionId, revisionNumber: confirmed.revisionNumber,
  } };
}

export async function saveDraft(
  id: string | null,
  updatedAt: string | null,
  form: FormData,
) {
  return save(id, updatedAt, form);
}

export async function reviewLatestDraft(id: string) {
  if (!projectId.safeParse(id).success || (await getAdminSession()).state !== "authorized") return null;
  const project = await getProjectEditor(id);
  if (!project || project.archived) return null;
  return { fields: project.fields, updatedAt: project.updatedAt, content: project.content };
}

export async function reviewDraftBackup(id: string, expected: string, raw: string) {
  if (!projectId.safeParse(id).success || !version.safeParse(expected).success)
    return { error: "Open the matching project to review a backup." };
  const session = await getAdminSession();
  if (session.state !== "authorized") return { error: "An active administrator session is required to review the backup." };
  const backup = readBackup(raw, id);
  if (!backup) return { error: "Invalid backup or different project. Check the project ID, metadata and block structure." };
  try {
    const project = await getProjectEditor(id);
    if (!project || project.archived || !project.content || project.updatedAt !== expected)
      return { error: "The stored draft changed or is unavailable. Download your current work and review the latest draft before importing." };
    const mediaNames = await validateRecoveryAssets(session.supabase, backup.fields, backup.content_blocks);
    if (!mediaNames)
      return { error: "The backup references missing, unavailable or incompatible media. No changes were applied." };
    return { backup, mediaNames, reviewedVersion: project.updatedAt };
  } catch {
    return { error: "Could not validate the backup. Keep the file and try again when connected." };
  }
}

export async function changeProject(
  id: string,
  kind: "archive" | "featured",
  enabled: boolean,
) {
  const { supabase } = await requireAdmin();
  if (
    !projectId.safeParse(id).success ||
    typeof enabled !== "boolean" ||
    (kind !== "archive" && kind !== "featured")
  ) {
    return { error: "Invalid project request." };
  }
  const { error } =
    kind === "archive"
      ? await supabase.rpc("cms_set_archived", {
          project: id,
          archived: enabled,
        })
      : await supabase.rpc("cms_set_featured", {
          project: id,
          featured: enabled,
        });
  if (error) return { error: message(error.code) };
  revalidatePath("/admin/works");
  revalidatePath("/admin/works/" + id);
  revalidatePath("/admin");
  return {};
}

export async function saveOrder(
  kind: "display" | "featured",
  prior: string[],
  next: string[],
) {
  const { supabase } = await requireAdmin();
  const ids = z.array(projectId).min(1).max(10000);
  if (
    (kind !== "display" && kind !== "featured") ||
    !ids.safeParse(prior).success ||
    !ids.safeParse(next).success
  ) {
    return { error: "Invalid project order." };
  }
  const { error } = await supabase.rpc("cms_reorder_projects", {
    order_kind: kind,
    prior,
    next_order: next,
  });
  if (error) return { error: message(error.code) };
  revalidatePath("/admin/works");
  return {};
}

export async function signWorksCovers(paths: string[]): Promise<CoverPreviews> {
  await requireAdmin();
  const result = z
    .array(
      z
        .string()
        .min(1)
        .max(1024)
        .refine(
          (path) =>
            !/[\\\p{Cc}]/u.test(path) &&
            !path
              .split("/")
              .some((part) => !part || part === ".." || part === "."),
        ),
    )
    .max(WORKS_PAGE_SIZE)
    .safeParse(paths);
  return result.success ? getCoverPreviews([...new Set(result.data)]) : {};
}
