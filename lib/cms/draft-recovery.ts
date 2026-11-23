import { z } from "zod";
import { contentBlocksSchema } from "./blocks";
import { projectFieldsSchema, type DraftFields } from "./project-fields";
import type { ContentBlocks } from "./blocks";

import { RECOVERY_LIMIT } from "./draft-recovery-storage";

export type DraftBackup = {
  version?: 1;
  projectId: string;
  exportedAt?: string;
  baseVersion?: string;
  fields: DraftFields;
  content_blocks: ContentBlocks;
};
const envelope = z.strictObject({
  version: z.literal(1).optional(),
  projectId: z.uuid(),
  exportedAt: z.iso.datetime({ offset: true }).optional(),
  baseVersion: z.iso.datetime({ offset: true }).optional(),
  fields: z.unknown(),
  content_blocks: z.unknown(),
});
export function readBackup(raw: string, projectId: string): DraftBackup | null {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > RECOVERY_LIMIT) return null;
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return null; }
  const result = envelope.safeParse(input);
  if (!result.success || result.data.projectId.toLowerCase() !== projectId.toLowerCase()) return null;
  const { fields, content_blocks, ...info } = result.data;
  const checked = projectFieldsSchema.strict().safeParse(fields);
  const document = contentBlocksSchema.safeParse(content_blocks);
  if (!checked.success || !document.success) return null;
  return { ...info, fields: fields as DraftFields, content_blocks: document.data };
}
