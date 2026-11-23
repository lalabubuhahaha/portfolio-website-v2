"use client";

import dynamic from "next/dynamic";
import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { MAX_BLOCK_DEPTH, MAX_BLOCKS, type BlockType, type ContentBlock, type ContentBlocks } from "@/lib/cms/blocks";
import { Button } from "../ui/button";
import { Input, Select } from "../ui/fields";
import { BlockMediaProvider, BlockRenderer, PreviewBlocks } from "./block-renderer";
import { MediaDialog } from "../media/dialog";
import { BlockProperties, MediaField } from "./block-properties";
import { blockName, columnCount, createBlock, duplicateBlock, registry } from "./registry";

const RichTextEditor = dynamic(() => import("./rich-text-editor"), {
  ssr: false,
  loading: () => <p role="status">Loading text editor…</p>,
});

type InsertTarget = { kind: "append" }
  | { kind: "above" | "below"; id: string }
  | { kind: "column"; id: string; lane: number };

type Location = {
  block: ContentBlock;
  siblings: ContentBlock[];
  index: number;
  depth: number;
  parent?: ContentBlock;
};

function editsOnCanvas(type: BlockType) {
  return type === "heading" || type === "rich-text" || type === "image";
}
function locate(blocks: ContentBlock[], id: string, depth = 1, parent?: ContentBlock): Location | undefined {
  for (const [index, block] of blocks.entries()) {
    if (block.id === id) return { block, siblings: blocks, index, depth, parent };
    const child = block.children && locate(block.children, id, depth + 1, block);
    if (child) return child;
  }
}
function total(blocks: ContentBlock[]): number {
  return blocks.reduce((count, block) => count + 1 + total(block.children ?? []), 0);
}
function editSiblings(blocks: ContentBlock[], siblings: ContentBlock[], transform: (items: ContentBlock[]) => ContentBlock[]): ContentBlock[] {
  if (blocks === siblings) return transform(blocks);
  return blocks.map((block) => {
    if (!block.children) return block;
    const children = editSiblings(block.children, siblings, transform);
    return children === block.children ? block : { ...block, children };
  });
}
function label(block: ContentBlock) {
  return block.type === "heading" && block.content.text ? block.content.text : blockName(block.type);
}

export default function ContentEditor({
  doc, onChange, preview, onUploading, busy, readOnly, title,
}: {
  doc: ContentBlocks | null;
  onChange: (doc: ContentBlocks) => void;
  onUploading: (busy: boolean) => void;
  busy: boolean;
  preview: boolean;
  readOnly: boolean;
  title: string;
}) {
  const [selection, setSelection] = useState("");
  const [query, setQuery] = useState("");
  const [insertion, setInsertion] = useState("append");
  const [picker, setPicker] = useState<InsertTarget>();
  const [pickerQuery, setPickerQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [openerId, setOpenerId] = useState("");
  const prefix = useId();
  if (!doc) return (
    <p role="alert" className="rounded-lg border border-cms-border bg-white p-4 text-sm">
      This draft contains older or unsupported blocks. Their original data is preserved.
      Content editing requires review and conversion of the original document.
    </p>
  );
  const { blocks } = doc;
  const selected = locate(blocks, selection);
  const mutable = !readOnly && !busy;
  const count = total(blocks);
  const selectedBlock = selected?.block;
  const childPlacement = insertion.startsWith("column:");
  const cannotAddChild = childPlacement && (!selected || selected.block.type !== "columns" || selected.depth >= MAX_BLOCK_DEPTH);
  const canvasId = (id: string) => prefix + "-block-" + id;

  function update(siblings: ContentBlock[], transform: (items: ContentBlock[]) => ContentBlock[]) {
    if (mutable) onChange({ version: 1, blocks: editSiblings(blocks, siblings, transform) });
  }

  function replace(block: ContentBlock) {
    const location = locate(blocks, block.id);
    if (location) update(location.siblings, (items) => items.map((item) => item.id === block.id ? block : item));
  }

  function select(id: string, locateCanvas = false, revealProperties = false) {
    if (busy) return;
    setSelection(id);
    setInsertion("append");
    if (locateCanvas) document.getElementById(canvasId(id))?.scrollIntoView({ block: "nearest" });
    if (revealProperties && matchMedia("(max-width: 1023px)").matches) revealInspector();
  }

  function revealInspector() {
    const panel = document.getElementById(prefix + "-properties");
    const disclosure = panel?.querySelector("details");
    if (disclosure) disclosure.open = true;
    panel?.scrollIntoView({ block: "start" });
  }

  function openLibrary(target: InsertTarget, trigger: HTMLElement) {
    setOpenerId(trigger.id);
    setPickerQuery("");
    setPicker(target);
  }

  function add(type: BlockType, target?: InsertTarget) {
    if (!mutable || count >= MAX_BLOCKS) return;
    const destination: InsertTarget = target ?? (selected && childPlacement
      ? { kind: "column", id: selected.block.id, lane: Number(insertion.split(":")[1]) }
      : selected && (insertion === "above" || insertion === "below")
        ? { kind: insertion, id: selected.block.id }
        : { kind: "append" });
    const anchor = destination.kind !== "append" ? locate(blocks, destination.id) : undefined;
    if (destination.kind !== "append" && !anchor) return;
    let block: ContentBlock;
    if (destination.kind === "column") {
      if (anchor?.block.type !== "columns" || anchor.depth >= MAX_BLOCK_DEPTH ||
        destination.lane >= columnCount(anchor.block)) return;
      block = createBlock(type, destination.lane);
      replace({ ...anchor.block, children: [...(anchor.block.children ?? []), block] });
    } else {
      block = createBlock(type, anchor && anchor.depth > 1 ? Number(anchor.block.layout?.column ?? 0) : undefined);
      if (anchor) {
        const index = anchor.index + (destination.kind === "below" ? 1 : 0);
        update(anchor.siblings, (items) => [...items.slice(0, index), block, ...items.slice(index)]);
      } else update(blocks, (items) => [...items, block]);
    }
    setFeedback(blockName(type) + " added.");
    setPicker(undefined);
    select(block.id);
    requestAnimationFrame(() => {
      if (!editsOnCanvas(block.type) && matchMedia("(max-width: 1023px)").matches) {
        revealInspector();
        return;
      }
      const node = document.getElementById(canvasId(block.id));
      node?.scrollIntoView({ block: "nearest" });
      node?.querySelector<HTMLElement>("[data-block-edit]")?.focus({ preventScroll: true });
    });
  }

  function blockChoices(search: string, choose: (type: BlockType) => void, unavailable = false, compact = false) {
    const matching = registry.filter((entry) =>
      (entry.name + " " + entry.category + " " + entry.description).toLowerCase().includes(search.trim().toLowerCase()));
    return <>
      <div className={`grid max-h-72 grid-cols-1 gap-2 overflow-y-auto ${compact ? "" : "sm:grid-cols-2"}`}>
        {[...new Set(matching.map((entry) => entry.category))].map((category) => (
          <section key={category}>
            <h3 className="mt-2 text-xs font-semibold text-cms-secondary">{category}</h3>
            {matching.filter((entry) => entry.category === category).map(({ type, name, description, icon: Icon }) => (
              <button key={type} type="button" aria-label={`Add ${name}`} disabled={unavailable}
                onClick={() => choose(type)} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-cms-background focus-visible:outline-2 focus-visible:outline-cms-primary disabled:opacity-50">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-cms-primary" />
                <span className="text-sm font-medium">{name}<span className="block text-xs font-normal text-cms-secondary">{description}</span></span>
              </button>
            ))}
          </section>
        ))}
      </div>
      {!matching.length && <p className="text-xs text-cms-secondary">No matching blocks.</p>}
    </>;
  }

  function siblingIndex(location: Location, direction: number) {
    const lane = location.block.layout?.column ?? 0;
    for (let index = location.index + direction; index >= 0 && index < location.siblings.length; index += direction) {
      if ((location.siblings[index].layout?.column ?? 0) === lane) return index;
    }
    return -1;
  }

  function move(location: Location, direction: number) {
    const index = siblingIndex(location, direction);
    if (index < 0) return;
    setFeedback(blockName(location.block.type) + (direction < 0 ? " moved up." : " moved down."));
    update(location.siblings, (items) => {
      const next = [...items];
      [next[location.index], next[index]] = [next[index], next[location.index]];
      return next;
    });
  }

  function moveControls(location: Location) {
    return <>
      <Button type="button" variant="ghost" className="size-8 px-0" aria-label="Move block up" disabled={siblingIndex(location, -1) < 0} onClick={() => move(location, -1)}><ArrowUp /></Button>
      <Button type="button" variant="ghost" className="size-8 px-0" aria-label="Move block down" disabled={siblingIndex(location, 1) < 0} onClick={() => move(location, 1)}><ArrowDown /></Button>
    </>;
  }

  function outline(items: ContentBlock[], depth = 1): ReactNode {
    return <ol className={depth > 1 ? "ml-2 border-l border-cms-border pl-2" : "space-y-1"}>
      {items.map((block, index) => <li key={block.id}>
        <div className="flex items-center gap-1">
          <Button type="button" variant={block.id === selection ? "outline" : "ghost"}
            aria-pressed={block.id === selection}
            onClick={() => select(block.id, true)} className="h-auto min-h-8 min-w-0 flex-1 justify-start whitespace-normal px-2 text-left text-xs">
            {depth > 1 && <span aria-label="Column number">{Number(block.layout?.column ?? 0) + 1} ·</span>}
            {label(block)}
          </Button>
          {mutable && block.id === selection && moveControls({ block, siblings: items, index, depth })}
        </div>
        {!!block.children?.length && outline(block.children, depth + 1)}
      </li>)}
    </ol>;
  }

  function canvas(items: ContentBlock[], depth = 1): ReactNode {
    return items.map((block) => {
      const active = block.id === selection;
      return (
        <section id={canvasId(block.id)} key={block.id} className={`relative min-w-0 scroll-mt-36 ${active ? "rounded-md outline-2 outline-offset-4 outline-cms-primary/40" : ""}`}>
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <button type="button" data-block-edit={block.type !== "heading" ? "" : undefined}
              aria-label={`Select ${blockName(block.type)} block`} aria-pressed={active}
              onClick={() => select(block.id, false, !editsOnCanvas(block.type))}
              className={`rounded px-2 py-1 text-xs font-medium ${active ? "bg-cms-selected text-cms-primary" : "text-cms-secondary hover:bg-cms-background"}`}>
              {active ? blockName(block.type) : "Edit " + blockName(block.type)}
            </button>
            {active && mutable && count < MAX_BLOCKS && (["above", "below"] as const).map((kind) => (
              <button key={kind} id={canvasId(block.id) + "-" + kind} type="button" onClick={(event) => openLibrary({ kind, id: block.id }, event.currentTarget)}
                className="rounded px-2 py-1 text-xs text-cms-primary hover:bg-cms-background">+ Insert {kind}</button>
            ))}
          </div>
          {active && block.type === "heading" && !readOnly ? (
            <input data-block-edit aria-label="Heading text" maxLength={200} disabled={busy}
              value={block.content.text} onChange={(event) => replace({ ...block, content: { ...block.content, text: event.currentTarget.value } })}
              onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
              className={`w-full rounded bg-transparent px-1 tracking-tight outline-cms-primary
                ${block.content.level === "h4" ? "text-xl" : block.content.level === "h3" ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl"}
                ${block.content.emphasis === "italic" ? "italic" : block.content.emphasis === "strong" ? "font-bold" : "font-semibold"}`}
              style={{ textAlign: block.content.alignment ?? "left" }}
            />
          ) : active && block.type === "rich-text" && !readOnly ? (
            <RichTextEditor doc={block.content.doc} disabled={busy}
              onChange={(doc) => replace({ ...block, content: { ...block.content, doc } })} />
          ) : (
            <BlockRenderer block={block} renderLane={block.type === "columns"
              ? (children, lane) => (
                <div className="min-w-0 space-y-4">
                  {canvas(children, depth + 1)}
                  {mutable && depth < MAX_BLOCK_DEPTH && count < MAX_BLOCKS && (
                    <button type="button" id={canvasId(block.id) + "-column-" + lane} aria-label={`Add content to column ${lane + 1}`}
                      className={`w-full rounded-md px-2 py-3 text-sm font-medium text-cms-primary hover:bg-cms-selected ${children.length ? "" : "min-h-24 border border-dashed border-cms-border bg-cms-background"}`}
                      onClick={(event) => openLibrary({ kind: "column", id: block.id, lane }, event.currentTarget)}>
                      + Add content
                    </button>
                  )}
                </div>
              ) : undefined} />
          )}
          {active && block.type === "image" && !readOnly && (
            <fieldset disabled={busy} className="mt-3">
              <MediaField label={block.content.assetId ? "Replace image" : "Add image"} value={block.content.assetId}
                onUploading={onUploading} update={(assetId) => replace({ ...block, content: { ...block.content, assetId } })} />
            </fieldset>
          )}
        </section>
      );
    });
  }

  const inspect = <fieldset disabled={!mutable} className="min-w-0 space-y-4">
    {selectedBlock && selected ? <>
      <div className="flex flex-wrap gap-1">
        {moveControls(selected)}
        <Button type="button" variant="ghost" className="size-8 px-0" aria-label="Duplicate block" disabled={count + total([selectedBlock]) > MAX_BLOCKS}
          onClick={() => {
            const copy = duplicateBlock(selectedBlock);
            update(selected.siblings, (items) => [...items.slice(0, selected.index + 1), copy, ...items.slice(selected.index + 1)]);
            setFeedback(blockName(selectedBlock.type) + " duplicated.");
            select(copy.id);
          }}><Copy /></Button>
        <Button type="button" variant="ghost" className="size-8 px-0" aria-label="Delete block"
          onClick={() => {
            if (selectedBlock.children?.length && !window.confirm("Delete this block and its nested content?")) return;
            update(selected.siblings, (items) => items.filter((item) => item.id !== selection));
            setFeedback(blockName(selectedBlock.type) + " deleted.");
            select("");
          }}><Trash2 /></Button>
      </div>
      {selected.parent?.type === "columns" && (
        <label className="block space-y-1 text-xs font-medium">
          <span>Move to column</span>
          <Select aria-label="Move to column" className="w-full"
            value={String(selectedBlock.layout?.column ?? 0)}
            onChange={(event) => {
              const column = Number(event.currentTarget.value);
              replace({ ...selectedBlock, layout: { ...selectedBlock.layout, column } });
              setFeedback(blockName(selectedBlock.type) + " moved to column " + (column + 1) + ".");
            }}>
            {Array.from({ length: columnCount(selected.parent) }, (_, lane) => (
              <option key={lane} value={lane}>Column {lane + 1}</option>
            ))}
          </Select>
        </label>
      )}
      <BlockProperties key={selectedBlock.id} block={selectedBlock} onChange={replace} onUploading={onUploading} />
    </> : <p className="text-sm text-cms-secondary">Select a block to edit its properties.</p>}
  </fieldset>;

  return (
    <BlockMediaProvider>
      {preview ? (
        <article aria-label="Case study preview" className="mx-auto max-w-5xl space-y-10 break-words rounded-xl bg-white px-4 py-8 sm:px-8 lg:px-14 lg:py-16">
          <p className="text-4xl font-semibold tracking-tight md:text-6xl">{title}</p>
          {blocks.length ? <PreviewBlocks blocks={blocks} /> : <p className="text-cms-secondary">This draft has no case study content.</p>}
        </article>
      ) : (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(9rem,0.85fr)_minmax(0,3fr)_minmax(12rem,1fr)]">
          <aside id={prefix + "-library"} aria-label="Block Library" className="min-w-0 space-y-4 rounded-xl border border-cms-border bg-white p-4">
            <details>
              <summary className="cursor-pointer font-semibold">Block Library</summary>
              <fieldset disabled={!mutable} className="mt-3 space-y-2">
                <Input aria-label="Search blocks" placeholder="Search blocks…" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full" />
                <Select aria-label="Insert block position" value={insertion} onChange={(event) => setInsertion(event.target.value)} className="w-full">
                  <option value="append">Add at end</option>
                  {selected && <><option value="above">Insert above</option><option value="below">Insert below</option></>}
                  {selectedBlock?.type === "columns" && selected && selected.depth < MAX_BLOCK_DEPTH && Array.from({ length: columnCount(selectedBlock) }, (_, lane) =>
                    <option key={lane} value={"column:" + lane}>Add to column {lane + 1}</option>)}
                </Select>
                {blockChoices(query, (type) => add(type), count >= MAX_BLOCKS || cannotAddChild, true)}
              </fieldset>
            </details>
            <details className="border-t border-cms-border pt-3">
              <summary className="cursor-pointer font-semibold">Content Outline</summary>
              <div className="mt-2 max-h-64 overflow-y-auto">
                {blocks.length ? outline(blocks) : <p className="text-xs text-cms-secondary">No blocks yet.</p>}
              </div>
            </details>
          </aside>
          <article aria-label="Visual editing canvas" className="order-3 min-h-64 min-w-0 space-y-9 lg:order-none break-words rounded-xl bg-white px-4 py-8 text-cms-foreground sm:px-7 lg:px-10">
            <div className="flex flex-wrap items-center gap-3">
              {mutable && count < MAX_BLOCKS && <Button id={prefix + "-add-block"} type="button" onClick={(event) => openLibrary({ kind: "append" }, event.currentTarget)}>
                <Plus aria-hidden /> Add Block
              </Button>}
              <p role="status" aria-live="polite" className="text-xs text-cms-secondary">{feedback}</p>
            </div>
            {blocks.length ? canvas(blocks) : <div className="grid min-h-32 place-items-center text-center text-cms-secondary">
              <p>Start with a heading, or add an image to introduce your work.</p>
            </div>}
          </article>
          <aside id={prefix + "-properties"} aria-label="Block Properties" className="min-w-0 scroll-mt-36 rounded-xl lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto border border-cms-border bg-white p-4">
            <details open>
              <summary className="mb-3 cursor-pointer font-semibold">Block Properties</summary>
              {inspect}
            </details>
          </aside>
        </div>
      )}
      <MediaDialog open={!!picker && !preview} wide
        onOpenChange={(open) => {
          if (!open) { setPicker(undefined); requestAnimationFrame(() => document.getElementById(openerId)?.focus()); }
        }}
        title="Block Library"
        description={picker?.kind === "column" ? `Add content to column ${picker.lane + 1}.`
          : picker?.kind === "above" || picker?.kind === "below" ? `Insert a block ${picker.kind} the selected content.`
            : "Choose a block to add to your case study."}>
        <Input aria-label="Search block library" placeholder="Search blocks…" value={pickerQuery}
          onChange={(event) => setPickerQuery(event.currentTarget.value)} className="mb-3 w-full" />
        {blockChoices(pickerQuery, (type) => { if (picker) add(type, picker); }, !mutable || count >= MAX_BLOCKS)}
      </MediaDialog>
    </BlockMediaProvider>
  );
}
