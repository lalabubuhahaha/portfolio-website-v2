import { z } from "zod";

const settings = z.record(z.string(), z.json());
const block = z.object({
  id: z.uuid(),
  type: z.string().regex(/^[a-z][a-z0-9-]*$/),
  content: settings,
  layout: settings.optional(),
  styles: settings.optional(),
  animation: settings.optional(),
  responsive: z.record(z.string(), settings).optional(),
  get children(): z.ZodOptional<z.ZodArray<typeof block>> {
    return z.array(block).optional();
  },
});

export const contentBlocksSchema = z.object({ version: z.literal(1), blocks: z.array(block) });
export const themeSchema = z.object({ version: z.literal(1), settings });
export type ContentBlocks = z.infer<typeof contentBlocksSchema>;
export type ProjectTheme = z.infer<typeof themeSchema>;
