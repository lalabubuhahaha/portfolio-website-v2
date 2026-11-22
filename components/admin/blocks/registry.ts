import {
  AlignLeft, Braces, Columns3, GalleryHorizontal, Heading2, Image, Link2,
  Minus, MoveVertical, Palette, PanelLeft, Play, Quote, Rows3, Type, UnfoldHorizontal,
} from "lucide-react";
import type { BlockContent, BlockType, ContentBlock } from "@/lib/cms/blocks";

const picture = { assetId: null, alt: "", caption: "" };
const defaults: { [T in BlockType]: BlockContent<T> } = {
  heading: { text: "Section heading", level: "h2", alignment: "left", emphasis: "normal", anchor: "" },
  "rich-text": { doc: { type: "doc", content: [{ type: "paragraph" }] } },
  image: { ...picture, alignment: "center", fit: "contain", aspect: "native" },
  gallery: { images: [], columns: "3", gap: "normal", mobileColumns: "1", caption: "" },
  columns: { count: "2", ratio: "equal", stack: true },
  "image-text": { ...picture, heading: "Image and text", description: "", side: "left", ratio: "50:50", stack: true },
  video: { assetId: null, posterId: null, controls: true, loop: false, muted: true, autoplay: false, caption: "", aspect: "native" },
  quote: { quote: "", author: "", source: "", alignment: "left", typography: "editorial" },
  metrics: { items: [], columns: "3" },
  figma: { url: "", aspect: "landscape", caption: "" },
  links: { items: [], alignment: "left" },
  divider: { line: "solid", width: "full", spacing: "medium" },
  spacer: { size: "medium", height: 64, mobileHeight: 32 },
  palette: { swatches: [], columns: "3" },
  typography: { font: "", sample: "The quick brown fox", weight: "500", size: 48, lineHeight: 1.2, letterSpacing: 0, description: "" },
  comparison: { beforeId: null, afterId: null, beforeLabel: "Before", afterLabel: "After", mode: "slider", stack: true },
};

export const registry = [
  { type: "heading", name: "Heading", category: "Text", description: "Section titles and anchors", icon: Heading2 },
  { type: "rich-text", name: "Rich Text", category: "Text", description: "Formatted editorial copy", icon: AlignLeft },
  { type: "quote", name: "Quote", category: "Text", description: "Attributed quotations", icon: Quote },
  { type: "image", name: "Image", category: "Media", description: "Single image and caption", icon: Image },
  { type: "gallery", name: "Image Gallery", category: "Media", description: "Responsive image collection", icon: GalleryHorizontal },
  { type: "video", name: "Video / GIF", category: "Media", description: "Motion and prototypes", icon: Play },
  { type: "columns", name: "Columns", category: "Layout", description: "Nested blocks in two or three lanes", icon: Columns3 },
  { type: "image-text", name: "Image + Text", category: "Layout", description: "A split image and editorial copy", icon: PanelLeft },
  { type: "divider", name: "Divider", category: "Layout", description: "Separate sections with a rule", icon: Minus },
  { type: "spacer", name: "Spacer", category: "Layout", description: "Adjust vertical rhythm", icon: MoveVertical },
  { type: "metrics", name: "Metrics", category: "Presentation", description: "Present measured results", icon: Rows3 },
  { type: "figma", name: "Figma Prototype", category: "Presentation", description: "Embed a Figma prototype", icon: Braces },
  { type: "links", name: "Links / Buttons", category: "Presentation", description: "Group actions and related links", icon: Link2 },
  { type: "palette", name: "Color Palette", category: "Design System", description: "Show colors and copy values", icon: Palette },
  { type: "typography", name: "Typography Specimen", category: "Design System", description: "Show a type scale or sample", icon: Type },
  { type: "comparison", name: "Before / After", category: "Comparison", description: "Compare two visual states", icon: UnfoldHorizontal },
] as const;

export const blockName = (type: BlockType) => registry.find((entry) => entry.type === type)!.name;

export function createBlock(type: BlockType, column?: number): ContentBlock {
  return {
    type, id: crypto.randomUUID(), blockVersion: 1,
    content: structuredClone(defaults[type]),
    ...(column !== undefined ? { layout: { column } } : {}),
  } as ContentBlock;
}

export function duplicateBlock(block: ContentBlock): ContentBlock {
  return {
    ...structuredClone(block), id: crypto.randomUUID(),
    ...(block.children ? { children: block.children.map(duplicateBlock) } : {}),
  };
}

export function columnCount(block: Extract<ContentBlock, { type: "columns" }>) {
  return Number(block.content.count ?? block.layout?.columns ?? 2);
}
