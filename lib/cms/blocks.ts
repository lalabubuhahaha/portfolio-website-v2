import { z } from "zod";

export const MAX_BLOCK_BYTES = 200_000;
export const MAX_BLOCK_DEPTH = 5;
export const MAX_BLOCKS = 150;
const short = z.string().max(200);
const copy = z.string().max(8000);
const caption = z.string().max(600);
const asset = z.uuid().nullable();
export const alignment = z.enum(["left", "center", "right"]);
const aspect = z.enum(["native", "square", "landscape", "portrait"]);
export const textColors = ["#182230", "#475569", "#2354c7", "#a02548", "#197052"] as const;
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
export const safeLink = z.string().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return /^https?:\/\//i.test(value) && !/[\s\\]/.test(value)
      && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Use an HTTP or HTTPS link without credentials.");
export const figmaLink = safeLink.refine((value) => {
  try {
    const url = new URL(value);
    return url.origin === "https://www.figma.com"
      && /^\/proto\/[\w-]+(?:\/[^/]+)?\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}, "Use a https://www.figma.com/proto/ link.");

const richMark = z.discriminatedUnion("type", [
  z.strictObject({ type: z.enum(["bold", "italic", "underline", "strike", "code"]) }),
  z.strictObject({ type: z.literal("link"), attrs: z.strictObject({
    href: safeLink, target: z.literal("_blank").nullable().optional(),
    rel: z.string().max(100).nullable().optional(), class: z.null().optional(),
    title: short.nullable().optional(),
  }) }),
  z.strictObject({ type: z.literal("textStyle"), attrs: z.strictObject({
    color: z.enum(textColors).nullable().optional(),
  }) }),
]);
const richKind = z.enum(["doc", "paragraph", "text", "hardBreak", "bulletList", "orderedList", "listItem", "blockquote"]);
export type RichNode = {
  type: z.infer<typeof richKind>;
  text?: string;
  marks?: z.infer<typeof richMark>[];
  attrs?: { textAlign?: "left" | "center" | "right" | null; start?: number; type?: string | null };
  content?: RichNode[];
};
const richNode: z.ZodType<RichNode> = z.lazy(() => z.strictObject({
  type: richKind,
  text: z.string().min(1).max(16000).optional(),
  marks: z.array(richMark).max(8).optional(),
  attrs: z.strictObject({
    textAlign: alignment.nullable().optional(),
    start: z.number().int().min(1).max(999).optional(),
    type: z.string().max(12).nullable().optional(),
  }).optional(),
  content: z.array(richNode).max(250).optional(),
}));
const richChildren: Partial<Record<RichNode["type"], RichNode["type"][]>> = {
  doc: ["paragraph", "blockquote", "bulletList", "orderedList"],
  paragraph: ["text", "hardBreak"],
  blockquote: ["paragraph", "blockquote", "bulletList", "orderedList"],
  listItem: ["paragraph", "blockquote", "bulletList", "orderedList"],
  bulletList: ["listItem"], orderedList: ["listItem"],
};
function validRich(node: RichNode): boolean {
  return (node.type === "text" ? !!node.text : node.text === undefined && !node.marks)
    && (node.content ?? []).every((child) =>
      (richChildren[node.type]?.includes(child.type) ?? false) && validRich(child))
    && (!(node.type === "bulletList" || node.type === "orderedList" || node.type === "blockquote" || node.type === "listItem") || !!node.content?.length)
    && (node.type !== "listItem" || node.content?.[0]?.type === "paragraph");
}

const picture = { assetId: asset, alt: short, caption };
const optionalNote = caption.optional();
export const blockSchemas = {
  heading: z.strictObject({
    text: short, level: z.enum(["h2", "h3", "h4"]).optional(),
    alignment: alignment.optional(), emphasis: z.enum(["normal", "strong", "italic"]).optional(),
    anchor: z.string().regex(/^(?:[a-z][a-z0-9-]{0,79})?$/).optional(),
  }),
  "rich-text": z.strictObject({ doc: richNode.refine((value) => value.type === "doc" && validRich(value)) }),
  image: z.strictObject({ ...picture, alignment, fit: z.enum(["contain", "cover"]), aspect }),
  gallery: z.strictObject({
    images: z.array(z.strictObject({ id: z.uuid(), ...picture })).max(24),
    columns: z.enum(["2", "3", "4"]), gap: z.enum(["tight", "normal", "wide"]),
    mobileColumns: z.enum(["1", "2"]), caption,
  }),
  columns: z.strictObject({
    count: z.enum(["2", "3"]).optional(),
    ratio: z.enum(["equal", "wide-left", "wide-right"]),
    stack: z.boolean(),
  }).partial(),
  "image-text": z.strictObject({
    ...picture, heading: short, description: copy, side: z.enum(["left", "right"]),
    ratio: z.enum(["50:50", "40:60", "60:40"]), stack: z.boolean(),
  }),
  video: z.strictObject({
    assetId: asset, posterId: asset, controls: z.boolean(), loop: z.boolean(),
    muted: z.boolean(), autoplay: z.boolean(), caption, aspect,
  }),
  quote: z.strictObject({
    quote: copy, author: short, source: short, alignment,
    typography: z.enum(["editorial", "compact"]),
  }),
  metrics: z.strictObject({
    items: z.array(z.strictObject({ id: z.uuid(), value: short, prefix: short, suffix: short, label: short, description: caption })).max(16),
    columns: z.enum(["1", "2", "3", "4"]),
  }),
  figma: z.strictObject({
    url: z.union([z.literal(""), figmaLink]), aspect: z.enum(["square", "landscape", "portrait"]), caption,
  }),
  links: z.strictObject({
    items: z.array(z.strictObject({
      id: z.uuid(), text: short, url: z.union([z.literal(""), safeLink]),
      variant: z.enum(["primary", "secondary", "text"]), newTab: z.boolean(),
    })).max(12), alignment,
  }),
  divider: z.strictObject({
    line: z.enum(["solid", "dashed", "subtle"]), width: z.enum(["short", "medium", "full"]),
    spacing: z.enum(["small", "medium", "large"]),
  }),
  spacer: z.strictObject({
    size: z.enum(["small", "medium", "large", "custom"]),
    height: z.number().int().min(8).max(400), mobileHeight: z.number().int().min(8).max(240),
  }),
  palette: z.strictObject({
    swatches: z.array(z.strictObject({ id: z.uuid(), name: short, hex, role: short })).max(24),
    columns: z.enum(["2", "3", "4"]),
  }),
  typography: z.strictObject({
    font: short, sample: copy, weight: z.enum(["400", "500", "600", "700", "800"]),
    size: z.number().int().min(12).max(144), lineHeight: z.number().min(0.8).max(3),
    letterSpacing: z.number().min(-5).max(20), description: optionalNote,
  }),
  comparison: z.strictObject({
    beforeId: asset, afterId: asset, beforeLabel: short, afterLabel: short,
    mode: z.enum(["side-by-side", "slider"]), stack: z.boolean(),
  }),
} as const;

export type BlockType = keyof typeof blockSchemas;
export type BlockContent<T extends BlockType> = z.infer<(typeof blockSchemas)[T]>;
const settings = z.record(z.string(), z.json());
const envelope = z.strictObject({
  id: z.uuid(), blockVersion: z.literal(1).optional(), layout: settings.optional(),
  styles: settings.optional(), animation: settings.optional(),
  responsive: z.record(z.string(), settings).optional(),
});
type Envelope = z.infer<typeof envelope>;
export type ContentBlock = { [T in BlockType]: Envelope & {
  type: T; content: BlockContent<T>; children?: ContentBlock[];
} }[BlockType];
export type ContentBlocks = { version: 1; blocks: ContentBlock[] };

const shell = envelope.extend({
  type: z.enum(Object.keys(blockSchemas) as [BlockType, ...BlockType[]]),
  content: z.unknown(),
  children: z.array(z.unknown()).max(MAX_BLOCKS).optional(),
});
const document = z.strictObject({ version: z.literal(1), blocks: z.array(z.unknown()).max(MAX_BLOCKS) });

function boundedJson(input: unknown) {
  const stack: { value: unknown; depth: number }[] = [{ value: input, depth: 0 }];
  let values = 0;
  while (stack.length) {
    const { value, depth } = stack.pop()!;
    if (++values > 25000 || depth > 32) return false;
    if (typeof value === "object" && value !== null) {
      for (const child of Object.values(value)) stack.push({ value: child, depth: depth + 1 });
    }
  }
  try {
    return new TextEncoder().encode(JSON.stringify(input)).length <= MAX_BLOCK_BYTES;
  } catch {
    return false;
  }
}

export const contentBlocksSchema = z.unknown()
  .refine(boundedJson, "The document exceeds its size or nesting limit.")
  .pipe(document)
  .transform((doc, ctx): ContentBlocks => {
    const seen = new Set<string>();
    function visit(input: unknown, depth: number, path: (string | number)[], lanes?: number): ContentBlock | undefined {
      const fail = (message: string) => { ctx.addIssue({ code: "custom", path, message }); return undefined; };
      const shape = shell.safeParse(input);
      if (!shape.success) return fail("Unsupported or invalid block.");
      const b = shape.data;
      const id = b.id.toLowerCase();
      if (seen.has(id)) return fail("Duplicate block ID.");
      if (depth > MAX_BLOCK_DEPTH || seen.size >= MAX_BLOCKS) return fail("The document has too many blocks or levels.");
      seen.add(id);
      if (b.children?.length && b.type !== "columns") return fail("Only Columns can contain blocks.");
      const lane = b.layout?.column;
      if (lane !== undefined && (!lanes || typeof lane !== "number" || !Number.isInteger(lane) || lane < 0 || lane >= lanes)) {
        return fail("Invalid column assignment.");
      }
      const payload = blockSchemas[b.type].safeParse(b.content);
      if (!payload.success) {
        for (const issue of payload.error.issues) ctx.addIssue({
          code: "custom", path: [...path, "content", ...issue.path], message: issue.message,
        });
        return undefined;
      }
      const count = b.type === "columns" ? Number((payload.data as BlockContent<"columns">).count ?? b.layout?.columns ?? 2) : undefined;
      if (count !== undefined && count !== 2 && count !== 3) return fail("Columns must have two or three lanes.");
      const children = b.children?.flatMap((child, index) => {
        const result = visit(child, depth + 1, [...path, "children", index], count);
        return result ? [result] : [];
      });
      return { ...b, content: payload.data, ...(children ? { children } : {}) } as ContentBlock;
    }
    return {
      version: 1,
      blocks: doc.blocks.flatMap((block, index) => {
        const result = visit(block, 1, ["blocks", index]);
        return result ? [result] : [];
      }),
    };
  });

export const themeSchema = z.object({ version: z.literal(1), settings });
export type ProjectTheme = z.infer<typeof themeSchema>;
