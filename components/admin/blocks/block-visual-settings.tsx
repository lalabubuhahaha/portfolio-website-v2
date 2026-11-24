import type { ReactNode } from "react";
import type { ContentBlock } from "@/lib/cms/blocks";
import { Select } from "../ui/fields";

const widths = { narrow: "mx-auto max-w-xl", text: "mx-auto max-w-3xl", full: "w-full" };
const spacing = { compact: "py-2", comfortable: "py-5 md:py-8", roomy: "py-8 md:py-14" };
const surfaces = { subtle: "rounded-lg bg-cms-background px-3 md:px-5", accent: "rounded-lg bg-cms-selected px-3 md:px-5" };

function preset<T extends Record<string, string>>(options: T, value: unknown) {
  return typeof value === "string" && Object.hasOwn(options, value) ? options[value] : "";
}

export function BlockVisualFrame({ block, children }: { block: ContentBlock; children: ReactNode }) {
  return <div className={[
    "min-w-0",
    preset(widths, block.layout?.visualWidth),
    preset(spacing, block.styles?.visualSpacing),
    preset(surfaces, block.styles?.visualSurface),
  ].filter(Boolean).join(" ")}>{children}</div>;
}

export function BlockVisualSettings({ block, onChange }: {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
}) {
  return <details className="border-t border-cms-border pt-3">
    <summary className="cursor-pointer text-sm font-semibold">Visual settings</summary>
    <div className="mt-3 space-y-3">
      <label className="block space-y-1 text-xs font-medium">
        <span>Block width</span>
        <Select className="w-full" value={preset(widths, block.layout?.visualWidth) ? String(block.layout?.visualWidth) : ""}
          onChange={(event) => onChange({ ...block, layout: { ...block.layout, visualWidth: event.currentTarget.value } })}>
          <option value="">Default</option><option value="narrow">Narrow</option>
          <option value="text">Text width</option><option value="full">Full canvas</option>
        </Select>
      </label>
      <label className="block space-y-1 text-xs font-medium">
        <span>Vertical padding</span>
        <Select className="w-full" value={preset(spacing, block.styles?.visualSpacing) ? String(block.styles?.visualSpacing) : ""}
          onChange={(event) => onChange({ ...block, styles: { ...block.styles, visualSpacing: event.currentTarget.value } })}>
          <option value="">Default</option><option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option><option value="roomy">Roomy</option>
        </Select>
      </label>
      <label className="block space-y-1 text-xs font-medium">
        <span>Block background</span>
        <Select className="w-full" value={preset(surfaces, block.styles?.visualSurface) ? String(block.styles?.visualSurface) : ""}
          onChange={(event) => onChange({ ...block, styles: { ...block.styles, visualSurface: event.currentTarget.value } })}>
          <option value="">Default</option><option value="subtle">Subtle</option><option value="accent">Accent</option>
        </Select>
      </label>
    </div>
  </details>;
}
