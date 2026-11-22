"use client";

import dynamic from "next/dynamic";
import { useId, type ReactNode } from "react";
import type { ContentBlock, RichNode } from "@/lib/cms/blocks";
import type { MediaScope } from "@/lib/cms/media-formats";
import { MediaPicker } from "../media/media-picker";
import { SingleMediaUpload } from "../media/single-media-upload";
import { Button } from "../ui/button";
import { Input, Select, Textarea } from "../ui/fields";
import { blockName, columnCount } from "./registry";

const RichTextEditor = dynamic(() => import("./rich-text-editor"), {
  ssr: false,
  loading: () => <p role="status">Loading text editor…</p>,
});

type Values = Record<string, unknown>;
type Field = [key: string, label: string, options?: readonly string[] | "long" | "url"];
const align = ["left", "center", "right"];
const aspect = ["native", "square", "landscape", "portrait"];
const imageFields: Field[] = [["alt", "Alt text"], ["caption", "Caption", "long"]];
const fields: Record<ContentBlock["type"], Field[]> = {
  heading: [["text", "Text"], ["level", "Heading level", ["h2", "h3", "h4"]], ["alignment", "Alignment", align], ["emphasis", "Emphasis", ["normal", "strong", "italic"]], ["anchor", "Anchor ID"]],
  "rich-text": [],
  image: [...imageFields, ["alignment", "Alignment", align], ["fit", "Image fit", ["contain", "cover"]], ["aspect", "Aspect ratio", aspect]],
  gallery: [["caption", "Gallery caption", "long"], ["columns", "Desktop columns", ["2", "3", "4"]], ["mobileColumns", "Mobile columns", ["1", "2"]], ["gap", "Gallery gap", ["tight", "normal", "wide"]]],
  columns: [["count", "Column count", ["2", "3"]], ["ratio", "Column ratios", ["equal", "wide-left", "wide-right"]], ["stack", "Stack on mobile"]],
  "image-text": [["heading", "Heading"], ["description", "Description", "long"], ...imageFields, ["side", "Image position", ["left", "right"]], ["ratio", "Column ratios", ["50:50", "40:60", "60:40"]], ["stack", "Stack on mobile"]],
  video: [["caption", "Caption", "long"], ["aspect", "Aspect ratio", aspect], ["controls", "Player controls"], ["loop", "Loop"], ["muted", "Muted"], ["autoplay", "Autoplay when muted"]],
  quote: [["quote", "Quotation", "long"], ["author", "Author"], ["source", "Role or source"], ["alignment", "Alignment", align], ["typography", "Typography", ["editorial", "compact"]]],
  metrics: [["columns", "Columns", ["1", "2", "3", "4"]]],
  figma: [["url", "Figma prototype URL", "url"], ["aspect", "Aspect ratio", aspect.slice(1)], ["caption", "Caption", "long"]],
  links: [["alignment", "Alignment", align]],
  divider: [["line", "Line", ["solid", "dashed", "subtle"]], ["width", "Width", ["short", "medium", "full"]], ["spacing", "Spacing", ["small", "medium", "large"]]],
  spacer: [["size", "Size", ["small", "medium", "large", "custom"]], ["height", "Custom height (px)"], ["mobileHeight", "Mobile height (px)"]],
  palette: [["columns", "Columns", ["2", "3", "4"]]],
  typography: [["font", "Font name"], ["sample", "Sample text", "long"], ["weight", "Font weight", ["400", "500", "600", "700", "800"]], ["size", "Font size (px)"], ["lineHeight", "Line height"], ["letterSpacing", "Letter spacing (px)"], ["description", "Description", "long"]],
  comparison: [["mode", "Comparison mode", ["side-by-side", "slider"]], ["beforeLabel", "Before label"], ["afterLabel", "After label"], ["stack", "Stack side-by-side layout on mobile"]],
};

function Control({ field, value, update }: { field: Field; value: unknown; update: (value: unknown) => void }) {
  const id = useId();
  const [key, label, options] = field;
  let input: ReactNode;
  if (Array.isArray(options)) {
    input = <Select id={id} value={String(value ?? options[0])} onChange={(event) => update(event.currentTarget.value)} className="w-full">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </Select>;
  } else if (typeof value === "boolean") {
    input = <input id={id} type="checkbox" checked={value} onChange={(event) => update(event.currentTarget.checked)} className="size-4 accent-cms-primary" />;
  } else if (options === "long") {
    input = <Textarea id={id} rows={3} value={String(value ?? "")} onChange={(event) => update(event.currentTarget.value)} className="w-full" />;
  } else {
    const number = typeof value === "number";
    input = <Input id={id} type={number ? "number" : options === "url" ? "url" : "text"}
      value={String(value ?? "")} step={number && ["lineHeight", "letterSpacing"].includes(key) ? "0.1" : undefined}
      onChange={(event) => update(number ? Number(event.currentTarget.value) : event.currentTarget.value)} className="w-full" />;
  }
  return <div className={typeof value === "boolean" ? "flex items-center justify-between gap-2" : "space-y-1"}>
    <label htmlFor={id} className="block text-xs font-medium text-cms-secondary">{label}</label>
    {input}
  </div>;
}

function MediaField({ label, value, scope = "image", update, onUploading }: {
  label: string; value: unknown; scope?: MediaScope;
  update: (value: string | null) => void; onUploading: (busy: boolean) => void;
}) {
  const id = typeof value === "string" ? value : "";
  return <fieldset className="space-y-2 rounded-md border border-cms-border p-2">
    <legend className="px-1 text-xs font-semibold">{label}</legend>
    <SingleMediaUpload label={id ? "Upload replacement" : "Upload media"} scope={scope} onUploaded={update} onUploading={onUploading} />
    <MediaPicker value={id} scope={scope} onSelect={update} />
    {id && <Button type="button" variant="ghost" onClick={() => update(null)}>Remove media</Button>}
  </fieldset>;
}

function Collection({ value, config, update, onUploading }: {
  value: unknown;
  config: { item: string; initial: Values; fields: Field[]; media?: boolean; limit: number };
  update: (value: Values[]) => void;
  onUploading: (busy: boolean) => void;
}) {
  const entries = value as (Values & { id: string })[];
  function move(index: number, step: number) {
    const next = [...entries];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    update(next);
  }
  function patch(index: number, key: string, value: unknown) {
    update(entries.map((entry, i) => i === index ? { ...entry, [key]: value } : entry));
  }
  return <div className="space-y-3">
    {entries.map((entry, index) => (
      <fieldset key={entry.id} className="space-y-2 rounded-md border border-cms-border p-2">
        <legend className="px-1 text-xs font-semibold">{config.item} {index + 1}</legend>
        {config.media && <MediaField label="Gallery image" value={entry.assetId}
          update={(id) => patch(index, "assetId", id)} onUploading={onUploading} />}
        {config.fields.map((field) => (
          <Control key={field[0]} field={field} value={entry[field[0]]}
            update={(value) => patch(index, field[0], value)} />
        ))}
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" className="px-2" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${config.item} ${index + 1} up`}>↑</Button>
          <Button type="button" variant="ghost" className="px-2" disabled={index === entries.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${config.item} ${index + 1} down`}>↓</Button>
          <Button type="button" variant="ghost" className="px-2" onClick={() => update(entries.filter((_, i) => i !== index))}>Remove</Button>
        </div>
      </fieldset>
    ))}
    <Button type="button" variant="outline" disabled={entries.length >= config.limit}
      onClick={() => update([...entries, { ...config.initial, id: crypto.randomUUID() }])}>
      Add {config.item.toLowerCase()}
    </Button>
  </div>;
}
const collections = {
  gallery: { key: "images", item: "Image", initial: { assetId: null, alt: "", caption: "" }, fields: imageFields, media: true, limit: 24 },
  metrics: { key: "items", item: "Metric", initial: { value: "", prefix: "", suffix: "", label: "", description: "" }, fields: [["value", "Value"], ["prefix", "Prefix"], ["suffix", "Suffix"], ["label", "Label"], ["description", "Description", "long"]] as Field[], limit: 16 },
  links: { key: "items", item: "Link", initial: { text: "", url: "", variant: "primary", newTab: true }, fields: [["text", "Link text"], ["url", "Link URL", "url"], ["variant", "Appearance", ["primary", "secondary", "text"]], ["newTab", "Open in new tab"]] as Field[], limit: 12 },
  palette: { key: "swatches", item: "Swatch", initial: { name: "", hex: "#2354c7", role: "" }, fields: [["name", "Color name"], ["hex", "HEX"], ["role", "Color role"]] as Field[], limit: 24 },
};

export function BlockProperties({ block, onChange, onUploading }: {
  block: ContentBlock; onChange: (block: ContentBlock) => void;
  onUploading: (busy: boolean) => void;
}) {
  const content = block.content as Values;
  function patch(key: string, value: unknown) {
    const children = block.type === "columns" && key === "count" && value === "2"
      ? block.children?.map((child) => child.layout?.column === 2
        ? { ...child, layout: { ...child.layout, column: 1 } } : child)
      : block.children;
    onChange({ ...block, content: { ...content, [key]: value }, children } as ContentBlock);
  }
  const structured = block.type === "rich-text";
  const collection = block.type in collections ? collections[block.type as keyof typeof collections] : null;
  return <div className="space-y-3">
    <h3 className="text-sm font-semibold">{blockName(block.type)}</h3>
    {structured && <RichTextEditor doc={block.content.doc} onChange={(doc: RichNode) => patch("doc", doc)} />}
    {(block.type === "image" || block.type === "image-text" || block.type === "video") && <MediaField label={block.type === "video" ? "Video or GIF" : "Image"}
      scope={block.type === "video" ? "motion" : "image"} value={content.assetId}
      update={(id) => patch("assetId", id)} onUploading={onUploading} />}
    {block.type === "video" && <MediaField label="Poster image" value={content.posterId} update={(id) => patch("posterId", id)} onUploading={onUploading} />}
    {block.type === "comparison" && (["beforeId", "afterId"] as const).map((key) => (
      <MediaField key={key} label={key === "beforeId" ? "Before image" : "After image"} value={content[key]} update={(id) => patch(key, id)} onUploading={onUploading} />
    ))}
    {fields[block.type].map((field) => {
      const [key] = field;
      const value = block.type === "columns"
        ? key === "count" ? String(columnCount(block)) : key === "stack" ? block.content.stack ?? true : content[key]
        : key === "level" ? content[key] ?? "h2" : content[key];
      return <Control key={key} field={field} value={value} update={(value) => patch(key, value)} />;
    })}
    {collection && <Collection value={content[collection.key]} config={collection} update={(value) => patch(collection.key, value)} onUploading={onUploading} />}
  </div>;
}
