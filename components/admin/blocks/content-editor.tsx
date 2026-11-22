"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { MAX_BLOCK_DEPTH, MAX_BLOCKS, type BlockType, type ContentBlock, type ContentBlocks } from "@/lib/cms/blocks";
import { Button } from "../ui/button";
import { Input, Select } from "../ui/fields";
import { BlockMediaProvider, BlockRenderer, PreviewBlocks } from "./block-renderer";
import { BlockProperties } from "./block-properties";
import { blockName, columnCount, createBlock, duplicateBlock, registry } from "./registry";

type Location = { block: ContentBlock; siblings: ContentBlock[]; index: number; depth: number };
function locate(blocks: ContentBlock[], id: string, depth = 1): Location | undefined {
  for (const [index, block] of blocks.entries()) {
    if (block.id === id) return { block, siblings: blocks, index, depth };
    const child = block.children && locate(block.children, id, depth + 1);
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
  const matching = registry.filter((entry) =>
    (entry.name + " " + entry.category + " " + entry.description).toLowerCase().includes(query.trim().toLowerCase()));
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
    if (revealProperties && matchMedia("(max-width: 1023px)").matches) {
      const panel = document.getElementById(prefix + "-properties");
      const disclosure = panel?.querySelector("details");
      if (disclosure) disclosure.open = true;
      panel?.scrollIntoView({ block: "start" });
    }
  }

  function add(type: BlockType) {
    if (!mutable || count >= MAX_BLOCKS || cannotAddChild) return;
    if (childPlacement && selected?.block.type === "columns") {
      const lane = Number(insertion.split(":")[1]);
      const child = createBlock(type, lane);
      replace({ ...selected.block, children: [...(selected.block.children ?? []), child] });
      select(child.id, false, true);
      return;
    }
    const around = selected && (insertion === "above" || insertion === "below");
    const block = createBlock(type, around && selected.depth > 1 ? Number(selected.block.layout?.column ?? 0) : undefined);
    if (around) {
      const index = selected.index + (insertion === "below" ? 1 : 0);
      update(selected.siblings, (items) => [...items.slice(0, index), block, ...items.slice(index)]);
    } else update(blocks, (items) => [...items, block]);
    select(block.id, false, true);
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

  function canvas(items: ContentBlock[]): ReactNode {
    return items.map((block) => (
      <section id={canvasId(block.id)} key={block.id} className={`relative min-w-0 scroll-mt-36 rounded-lg ${block.id === selection ? "outline-2 outline-offset-4 outline-cms-primary/60" : ""}`}>
        <button type="button" aria-label={`Select ${blockName(block.type)} block`}
          aria-pressed={block.id === selection} onClick={() => select(block.id, false, true)}
          className={`absolute top-0 right-0 z-10 rounded-md bg-white px-2 py-1 text-xs text-cms-primary shadow-sm focus:opacity-100 ${block.id === selection ? "opacity-100" : "opacity-65 hover:opacity-100"}`}>
          {blockName(block.type)}
        </button>
        <BlockRenderer block={block} renderLane={block.type === "columns"
          ? (children, lane) => children.length ? canvas(children) : (
            <button type="button" className="min-h-20 w-full rounded-lg border border-dashed border-cms-border text-sm text-cms-secondary"
              disabled={!mutable} onClick={() => { select(block.id); setInsertion("column:" + lane); document.getElementById(prefix + "-library")?.scrollIntoView({ block: "nearest" }); }}>
              Add to column {lane + 1}
            </button>
          ) : undefined} />
      </section>
    ));
  }

  const inspect = <fieldset disabled={!mutable} className="min-w-0 space-y-4">
    {selectedBlock && selected ? <>
      <div className="flex flex-wrap gap-1">
        {moveControls(selected)}
        <Button type="button" variant="ghost" className="size-8 px-0" aria-label="Duplicate block" disabled={count + total([selectedBlock]) > MAX_BLOCKS}
          onClick={() => {
            const copy = duplicateBlock(selectedBlock);
            update(selected.siblings, (items) => [...items.slice(0, selected.index + 1), copy, ...items.slice(selected.index + 1)]);
            select(copy.id);
          }}><Copy /></Button>
        <Button type="button" variant="ghost" className="size-8 px-0" aria-label="Delete block"
          onClick={() => {
            if (selectedBlock.children?.length && !window.confirm("Delete this block and its nested content?")) return;
            update(selected.siblings, (items) => items.filter((item) => item.id !== selection));
            select("");
          }}><Trash2 /></Button>
      </div>
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
            <details open>
              <summary className="cursor-pointer font-semibold">Block Library</summary>
              <fieldset disabled={!mutable} className="mt-3 space-y-2">
                <Input aria-label="Search blocks" placeholder="Search blocks…" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full" />
                <Select aria-label="Insert block position" value={insertion} onChange={(event) => setInsertion(event.target.value)} className="w-full">
                  <option value="append">Add at end</option>
                  {selected && <><option value="above">Insert above</option><option value="below">Insert below</option></>}
                  {selectedBlock?.type === "columns" && selected && selected.depth < MAX_BLOCK_DEPTH && Array.from({ length: columnCount(selectedBlock) }, (_, lane) =>
                    <option key={lane} value={"column:" + lane}>Add to column {lane + 1}</option>)}
                </Select>
                <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-1">
                  {[...new Set(matching.map((entry) => entry.category))].map((category) => (
                    <section key={category}>
                      <h3 className="mt-2 text-xs font-semibold text-cms-secondary">{category}</h3>
                      {matching.filter((entry) => entry.category === category).map(({ type, name, description, icon: Icon }) => (
                        <button key={type} type="button" aria-label={`Add ${name}`} disabled={count >= MAX_BLOCKS || cannotAddChild}
                          onClick={() => add(type)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-cms-background focus-visible:outline-2 focus-visible:outline-cms-primary">
                          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-cms-primary" />
                          <span className="text-sm font-medium">{name}<span className="block text-xs font-normal text-cms-secondary">{description}</span></span>
                        </button>
                      ))}
                    </section>
                  ))}
                </div>
                {!matching.length && <p className="text-xs text-cms-secondary">No matching blocks.</p>}
              </fieldset>
            </details>
            <details open className="border-t border-cms-border pt-3">
              <summary className="cursor-pointer font-semibold">Content Outline</summary>
              <div className="mt-2 max-h-64 overflow-y-auto">
                {blocks.length ? outline(blocks) : <p className="text-xs text-cms-secondary">No blocks yet.</p>}
              </div>
            </details>
          </aside>
          <article aria-label="Visual editing canvas" className="order-3 min-h-64 min-w-0 space-y-9 lg:order-none break-words rounded-xl bg-white px-4 py-8 text-cms-foreground sm:px-7 lg:px-10">
            {blocks.length ? canvas(blocks) : <div className="grid min-h-48 place-items-center text-center text-cms-secondary">
              <div><Plus aria-hidden className="mx-auto mb-2 size-6" /><p>Choose a block in the library to start your case study.</p></div>
            </div>}
          </article>
          <aside id={prefix + "-properties"} aria-label="Block Properties" className="min-w-0 scroll-mt-36 rounded-xl border border-cms-border bg-white p-4">
            <details open>
              <summary className="mb-3 cursor-pointer font-semibold">Block Properties</summary>
              {inspect}
            </details>
          </aside>
        </div>
      )}
    </BlockMediaProvider>
  );
}
