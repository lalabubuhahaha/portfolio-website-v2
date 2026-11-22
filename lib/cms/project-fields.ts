import { z } from "zod";

export const slugFromTitle = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/, "");

const tags = z
  .string()
  .max(1400)
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ])
  .pipe(z.array(z.string().max(64)).max(20, "Enter at most 20 values."));

export const projectFieldsSchema = z.object({
  title: z.string().trim().min(1, "Enter a project title.").max(160),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and single hyphens.",
    ),
  category: z.enum(["independent", "client"]),
  summary: z.string().trim().max(5000),
  year: z
    .union([
      z.literal(""),
      z.string().regex(/^[1-9]\d{3}$/, "Enter a four-digit year."),
    ])
    .transform((value) => (value ? Number(value) : null)),
  role: z
    .string()
    .trim()
    .max(160)
    .transform((value) => value || null),
  tools: tags,
  category_tags: tags,
  external_url: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => {
      if (!value) return true;
      if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return false;
      try {
        const url = new URL(value);
        return (
          (url.protocol === "https:" || url.protocol === "http:") &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    }, "Enter an HTTP or HTTPS URL without credentials.")
    .transform((value) => (value ? new URL(value).href : null)),
  cover_asset_id: z
    .union([z.literal(""), z.uuid()])
    .transform((value) => value || null),
  seo_title: z
    .string()
    .trim()
    .max(120)
    .transform((value) => value || null),
  seo_description: z
    .string()
    .trim()
    .max(320)
    .transform((value) => value || null),
});

export type DraftFields = z.input<typeof projectFieldsSchema>;
export const emptyDraft: DraftFields = {
  title: "",
  slug: "",
  category: "independent",
  summary: "",
  year: "",
  role: "",
  tools: "",
  category_tags: "",
  external_url: "",
  cover_asset_id: "",
  seo_title: "",
  seo_description: "",
};

export function compareDraftEdits(
  original: DraftFields,
  local: DraftFields,
  latest: DraftFields,
) {
  const merged = { ...latest };
  const overlapping: (keyof DraftFields)[] = [];
  for (const key of Object.keys(emptyDraft) as (keyof DraftFields)[]) {
    if (local[key] === original[key]) continue;
    if (latest[key] !== original[key] && latest[key] !== local[key]) {
      overlapping.push(key);
    }
    Object.assign(merged, { [key]: local[key] });
  }
  return { merged, overlapping };
}
