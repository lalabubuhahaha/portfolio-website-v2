import { blockName } from "@/components/admin/blocks/registry";
import type { ContentBlock, ContentBlocks, RichNode } from "@/lib/cms/blocks";
import type { DraftBackup } from "@/lib/cms/draft-recovery";
import type { DraftFields } from "@/lib/cms/project-fields";

const taipeiTime = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short",
});

type Entry = { block: ContentBlock; position: string; parentId?: string };
type Version = { fields: DraftFields; content: ContentBlocks };

function orderedBlocks(blocks: ContentBlock[], parent = "", parentId?: string): Entry[] {
  const laneCounts = new Map<number, number>();
  const ordered = parentId ? blocks.toSorted((left, right) => Number(left.layout?.column ?? 0) - Number(right.layout?.column ?? 0)) : blocks;
  return ordered.flatMap((block, index) => {
    const lane = Number(block.layout?.column ?? 0);
    const order = (laneCounts.get(lane) ?? 0) + 1;
    laneCounts.set(lane, order);
    const position = parent ? `${parent} / Column ${lane + 1} · ${order}` : String(index + 1);
    return [{ block, position, parentId }, ...orderedBlocks(block.children ?? [], position, block.id)];
  });
}

// Compare object keys independently of the order in which the editor and database serialized them.
function sortedKeys(_key: string, value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value))
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  return value;
}

function ownBlock(block: ContentBlock) {
  return JSON.stringify({ ...block, children: undefined }, sortedKeys);
}

function richText(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(richText).join(node.type === "paragraph" ? "" : "\n");
}

function description(block: ContentBlock, media: Record<string, string>): string[] {
  const asset = (id: string | null, label = "Media") =>
    id ? `${label}: ${media[id.toLowerCase()] ?? "Selected asset"}` : `${label}: None`;
  switch (block.type) {
    case "heading": return [block.content.text];
    case "rich-text": return [richText(block.content.doc)];
    case "quote": return [block.content.quote, block.content.author, block.content.source];
    case "image": return [asset(block.content.assetId, "Image"), block.content.alt, block.content.caption];
    case "image-text": return [block.content.heading, block.content.description, asset(block.content.assetId, "Image"), block.content.alt, block.content.caption];
    case "gallery": return [
      block.content.caption,
      ...block.content.images.flatMap((item, index) => [asset(item.assetId, `Image ${index + 1}`), item.alt, item.caption]),
    ];
    case "video": return [asset(block.content.assetId, "Video or GIF"), asset(block.content.posterId, "Poster"), block.content.caption];
    case "comparison": return [asset(block.content.beforeId, block.content.beforeLabel || "Before"), asset(block.content.afterId, block.content.afterLabel || "After")];
    case "columns": return [`${block.content.count ?? "2"} columns`];
    case "metrics": return block.content.items.flatMap((item) => [`${item.prefix}${item.value}${item.suffix} ${item.label}`, item.description]);
    case "palette": return block.content.swatches.map((item) => [item.name, item.hex, item.role].filter(Boolean).join(" · "));
    case "typography": return [block.content.sample, block.content.font, block.content.description ?? ""];
    case "figma": return [block.content.caption, block.content.url];
    case "links": return block.content.items.flatMap((item) => [item.text, item.url]);
    case "divider": return [`${block.content.line} divider · ${block.content.width}`];
    case "spacer": return [`${block.content.height}px spacing`];
  }
}

const fieldLabels: Record<keyof DraftFields, string> = {
  title: "Project title", slug: "Slug", category: "Category", summary: "Summary", year: "Year",
  role: "Role", tools: "Tools", category_tags: "Category tags", external_url: "External link",
  cover_asset_id: "Cover image", seo_title: "SEO title", seo_description: "SEO description",
};

function BlockVersion({ item, media }: { item?: Entry; media: Record<string, string> }) {
  if (!item) return <p className="text-cms-secondary">No block</p>;
  const lines = description(item.block, media).filter(Boolean);
  return <>
    <p className="text-xs text-cms-secondary">Position {item.position}</p>
    {lines.length ? lines.map((line, index) => (
      <p key={index} className="mt-1 whitespace-pre-wrap wrap-anywhere">{line}</p>
    )) : <p className="text-cms-secondary">Empty block</p>}
  </>;
}

export function RecoveryComparison({ current, backup, media, source }: {
  current: Version;
  backup: DraftBackup;
  media: Record<string, string>;
  source: "snapshot" | "backup";
}) {
  const currentEntries = orderedBlocks(current.content.blocks);
  const incoming = orderedBlocks(backup.content_blocks.blocks);
  const currentById = new Map(currentEntries.map((item) => [item.block.id, item]));
  const incomingIds = new Set(incoming.map((item) => item.block.id));
  const matches = [
    ...incoming.map((next) => ({ id: next.block.id, next, prior: currentById.get(next.block.id) })),
    ...currentEntries.filter((prior) => !incomingIds.has(prior.block.id))
      .map((prior) => ({ id: prior.block.id, next: undefined, prior })),
  ];
  const rows = matches.map(({ id, next, prior }) => {
    const moved = !!next && !!prior && (next.position !== prior.position || next.parentId !== prior.parentId);
    const edited = !!next && !!prior && ownBlock(next.block) !== ownBlock(prior.block);
    const status = !prior ? "Added" : !next ? "Removed" : moved || edited ? "Modified" : "Unchanged";
    return { id, next, prior, moved, edited, status };
  });
  const fieldKeys = (Object.keys(fieldLabels) as (keyof DraftFields)[])
    .filter((key) => current.fields[key] !== backup.fields[key] || (key === "cover_asset_id" && backup.fields[key]));
  const label = source === "snapshot" ? "Snapshot Version" : "Backup Version";
  const fieldValue = (key: keyof DraftFields, value: string) =>
    key === "cover_asset_id" && value ? media[value.toLowerCase()] ?? "Selected image" : value || "Empty";

  function blockRow({ id, next, prior, status, moved, edited }: typeof rows[number]) {
    return <li key={id} className="rounded-lg border border-cms-border p-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <h4 className="font-semibold">{blockName((next ?? prior)!.block.type)}</h4>
        <span className="rounded bg-cms-background px-2 py-1 text-xs font-medium">{status}</span>
        {edited && <span className="text-xs text-cms-secondary">Content or settings changed</span>}
        {moved && <span className="text-xs text-cms-secondary">Position changed</span>}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="min-w-0 rounded bg-cms-background p-2">
          <p className="mb-1 font-medium">Current Version</p><BlockVersion item={prior} media={media} />
        </div>
        <div className="min-w-0 rounded bg-cms-selected p-2">
          <p className="mb-1 font-medium">{label}</p><BlockVersion item={next} media={media} />
        </div>
      </div>
    </li>;
  }
  const changed = rows.filter((row) => row.status !== "Unchanged");
  const unchanged = rows.filter((row) => row.status === "Unchanged");

  return <>
    <p className="font-medium wrap-anywhere">{backup.fields.title}</p>
    <p className="text-cms-secondary">
      {backup.exportedAt ? <time dateTime={backup.exportedAt}>{taipeiTime.format(new Date(backup.exportedAt))} (Taipei)</time> : "Backup time unavailable"}
      {" · "}{incoming.length} {incoming.length === 1 ? "block" : "blocks"} including nested content
    </p>
    {!!fieldKeys.length && <ul aria-label="Project details" className="space-y-2">
      {fieldKeys.map((key) => <li key={key} className="rounded border border-cms-border p-2 wrap-anywhere">
        <p className="font-medium">{fieldLabels[key]} · {current.fields[key] === backup.fields[key] ? "Unchanged" : "Modified"}</p>
        <div className="grid gap-2 md:grid-cols-2">
          <p className="whitespace-pre-wrap">Current Version · {fieldValue(key, current.fields[key])}</p>
          <p className="whitespace-pre-wrap">{label} · {fieldValue(key, backup.fields[key])}</p>
        </div>
      </li>)}
    </ul>}
    {!!changed.length && <ol aria-label="Changed blocks in recovery order" className="space-y-2">{changed.map(blockRow)}</ol>}
    {!!unchanged.length && <details open={!changed.length}>
      <summary className="cursor-pointer font-medium">Unchanged blocks ({unchanged.length})</summary>
      <ol aria-label="Unchanged blocks" className="mt-2 space-y-2">{unchanged.map(blockRow)}</ol>
    </details>}
    {!rows.length && <p>Both versions have no content blocks.</p>}
  </>;
}
