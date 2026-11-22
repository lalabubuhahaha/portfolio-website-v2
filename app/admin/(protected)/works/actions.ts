"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/cms/session";
import {
  getCoverPreviews,
  getProjectEditor,
  type CoverPreviews,
} from "@/lib/content/cms";
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
  id?: string;
  updatedAt?: string;
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
  const { supabase } = await requireAdmin();
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

  const { data, error } = await supabase.rpc("cms_save_draft", {
    project: id,
    expected: updatedAt,
    fields: result.data,
  });
  if (error) {
    if (
      error.code === "PT422" ||
      (error.code === "23505" && error.message.includes("projects_slug_key"))
    ) {
      return {
        error: "That slug is already in use.",
        fields: { slug: ["Choose a different slug."] },
      };
    }
    if (error.code === "PT409") {
      return {
        error: "This data changed since you opened the page.",
        conflict: true,
      };
    }
    return { error: message(error.code) };
  }
  const saved = z.object({ id: projectId, updatedAt: version }).safeParse(data);
  if (!saved.success) return { error: message() };
  revalidatePath("/admin/works");
  revalidatePath("/admin/works/" + saved.data.id);
  revalidatePath("/admin");
  return saved.data;
}

export async function saveDraft(
  id: string | null,
  updatedAt: string | null,
  form: FormData,
) {
  return save(id, updatedAt, form);
}

export async function reviewLatestDraft(id: string) {
  if (!projectId.safeParse(id).success) return null;
  const project = await getProjectEditor(id);
  if (!project || project.archived) return null;
  return { fields: project.fields, updatedAt: project.updatedAt };
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
