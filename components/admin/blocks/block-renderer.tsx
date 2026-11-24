"use client";

import Image from "next/image";
import {
  createContext, memo, useContext, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from "react";
import { figmaLink, safeLink, type ContentBlock, type RichNode } from "@/lib/cms/blocks";
import type { MediaAsset } from "@/lib/content/media";
import { BlockVisualFrame } from "./block-visual-settings";
import { columnCount } from "./registry";

export type BlockAsset = { url: string; asset: Pick<MediaAsset, "mime" | "alt" | "displayName" | "width" | "height"> };
type AssetResolver = (id: string) => Promise<BlockAsset>;
type MediaCache = Map<string, { at: number; value: Promise<BlockAsset> }>;
const MediaContext = createContext<{ cache: MediaCache; resolve: AssetResolver } | null>(null);

async function resolvePrivateAsset(id: string): Promise<BlockAsset> {
  const response = await fetch("/admin/media/api/" + encodeURIComponent(id), { cache: "no-store" });
  if (!response.ok) throw Error("Asset unavailable");
  return response.json();
}

export function BlockMediaProvider({
  children, resolve = resolvePrivateAsset,
}: { children: ReactNode; resolve?: AssetResolver }) {
  const context = useMemo(() => ({ cache: new Map() as MediaCache, resolve }), [resolve]);
  return <MediaContext.Provider value={context}>{children}</MediaContext.Provider>;
}

function useAsset(id: string | null, visible = true) {
  const context = useContext(MediaContext);
  const cache = context?.cache;
  const resolve = context?.resolve ?? resolvePrivateAsset;
  const [result, setResult] = useState<{ id: string; info?: BlockAsset }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id || !visible) return;
    let current = true;
    let request = cache?.get(id);
    if (!request || Date.now() - request.at > 90_000) {
      const value = resolve(id);
      request = { at: Date.now(), value };
      cache?.set(id, request);
    }
    const activeRequest = request;
    void activeRequest.value.then(
      (info) => { if (current) setResult({ id, info }); },
      () => {
        if (cache?.get(id) === activeRequest) cache.delete(id);
        if (current) setResult({ id });
      },
    );
    return () => { current = false; };
  }, [cache, id, resolve, retry, visible]);
  return {
    info: result?.id === id ? result.info : undefined,
    failed: !!id && result?.id === id && !result.info,
    retry: () => {
      if (id) cache?.delete(id);
      setResult(undefined);
      setRetry((n) => n + 1);
    },
  };
}

const aspectClass = { native: "", square: "aspect-square", landscape: "aspect-video", portrait: "aspect-[3/4]" };
const captionClass = "mt-2 text-sm leading-relaxed text-cms-secondary";
const alignClass = { left: "text-left", center: "text-center", right: "text-right" };
const gridClass = { "1": "md:grid-cols-1", "2": "md:grid-cols-2", "3": "md:grid-cols-3", "4": "md:grid-cols-4" };
const positionClass = { left: "mr-auto", center: "mx-auto", right: "ml-auto" };
const placeholder = "grid min-h-24 place-items-center rounded-md bg-cms-background px-4 text-center text-sm text-cms-secondary";

function MediaVisual({
  id, alt, fit = "contain", aspect = "native", video, className,
}: {
  id: string | null;
  alt?: string;
  fit?: "contain" | "cover";
  aspect?: keyof typeof aspectClass;
  className?: string;
  video?: { posterId: string | null; muted: boolean; autoplay: boolean; loop: boolean; controls: boolean };
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [failedUrl, setFailedUrl] = useState("");
  const [playingGif, setPlayingGif] = useState("");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "350px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const current = useAsset(id, visible);
  const poster = useAsset(video?.posterId ?? null, visible);
  const { info } = current;
  const fixedAspect = video && aspect === "native" ? "landscape" : aspect;
  const classNames = `relative overflow-hidden ${aspectClass[fixedAspect]} ${video ? "rounded-lg bg-cms-foreground" : ""} ${className ?? ""}`;
  const gif = !!video && info?.asset.mime === "image/gif";
  const pausedGif = gif && !video.autoplay && playingGif !== id;
  return (
    <div ref={host} className={classNames}>
      {info && failedUrl !== info.url ? (
        info.asset.mime.startsWith("video/") ? (
          <video
            src={info.url} poster={poster.info?.url}
            aria-label={alt || info.asset.displayName}
            controls={video?.controls ?? true} loop={video?.loop}
            muted={video?.muted} autoPlay={video?.autoplay && video.muted}
            playsInline preload="auto"
            onError={() => setFailedUrl(info.url)}
            className={`block w-full object-contain ${fixedAspect !== "native" ? "h-full" : ""}`}
          />
        ) : pausedGif ? (
          <button type="button" onClick={() => setPlayingGif(id ?? "")} className="relative grid h-full w-full place-items-center">
            {poster.info && <Image src={poster.info.url} width={poster.info.asset.width ?? 1200} height={poster.info.asset.height ?? 800}
              alt="" unoptimized className="h-full w-full object-contain" />}
            <span className={poster.info ? "absolute inset-x-0 bottom-2 mx-auto w-fit rounded-md bg-white px-3 py-2 text-sm" : "rounded-md bg-white px-3 py-2 text-sm"}>
              Play GIF
            </span>
          </button>
        ) : (
          <Image
            src={info.url} alt={alt || info.asset.alt || info.asset.displayName}
            width={info.asset.width ?? 1200} height={info.asset.height ?? 800} unoptimized
            onError={() => setFailedUrl(info.url)}
            className={`block w-full ${fixedAspect === "native" && !className ? "h-auto" : "h-full"} ${fit === "cover" ? "object-cover" : "object-contain"}`}
          />
        )
      ) : current.failed || (info && failedUrl === info.url) ? (
        <button type="button" onClick={() => { setFailedUrl(""); current.retry(); }} className={`${placeholder} w-full ${video ? "h-full" : ""}`}>
          Media unavailable · Retry
        </button>
      ) : (
        <div className={video ? "grid h-full place-items-center p-4 text-center text-sm text-white" : placeholder}>
          {id ? (video ? "Preparing media preview…" : "Loading media…") : "Choose media"}
        </div>
      )}
      {gif && !video.autoplay && !pausedGif && video.controls && (
        <button type="button" className="absolute right-2 bottom-2 rounded-md bg-white px-3 py-2 text-sm"
          onClick={() => setPlayingGif("")}>Stop GIF</button>
      )}
    </div>
  );
}

function RichText({ node, interactiveLinks }: { node: RichNode; interactiveLinks: boolean }) {
  const children = node.content?.map((entry, index) => <RichText node={entry} interactiveLinks={interactiveLinks} key={index} />);
  switch (node.type) {
    case "doc": return <>{children}</>;
    case "paragraph": return <p style={{ textAlign: node.attrs?.textAlign ?? undefined }}>{children}</p>;
    case "blockquote": return <blockquote>{children}</blockquote>;
    case "bulletList": return <ul>{children}</ul>;
    case "orderedList": return <ol start={node.attrs?.start}>{children}</ol>;
    case "listItem": return <li>{children}</li>;
    case "hardBreak": return <br />;
    case "text": {
      let value: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case "bold": value = <strong>{value}</strong>; break;
          case "italic": value = <em>{value}</em>; break;
          case "underline": value = <u>{value}</u>; break;
          case "strike": value = <s>{value}</s>; break;
          case "code": value = <code>{value}</code>; break;
          case "textStyle": value = <span style={{ color: mark.attrs.color ?? undefined }}>{value}</span>; break;
          case "link":
            if (safeLink.safeParse(mark.attrs.href).success) {
              value = interactiveLinks
                ? <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer">{value}</a>
                : <span className="underline">{value}</span>;
            }
            break;
        }
      }
      return value;
    }
  }
}

function Comparison({ content }: { content: Extract<ContentBlock, { type: "comparison" }>["content"] }) {
  const [value, setValue] = useState(50);
  const side = (id: string | null, label: string) => (
    <figure>
      <MediaVisual id={id} alt={label} />
      <figcaption className={captionClass}>{label}</figcaption>
    </figure>
  );
  if (content.mode === "side-by-side") return (
    <div className={`grid gap-4 ${content.stack ? "md:grid-cols-2" : "grid-cols-2"}`}>
      {side(content.beforeId, content.beforeLabel)}{side(content.afterId, content.afterLabel)}
    </div>
  );
  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-cms-background">
        <MediaVisual id={content.afterId} alt={content.afterLabel} className="absolute inset-0" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
          <MediaVisual id={content.beforeId} alt={content.beforeLabel} className="absolute inset-0" />
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${value}%` }} />
      </div>
      <label className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm">
        <span>{content.beforeLabel}</span>
        <input aria-label="Before and after comparison" type="range" min={0} max={100} value={value} onChange={(event) => setValue(event.currentTarget.valueAsNumber)} className="w-full cursor-ew-resize accent-cms-primary" />
        <span>{content.afterLabel}</span>
      </label>
    </div>
  );
}

function Figma({
  url, aspect, caption, frameRatio,
}: Extract<ContentBlock, { type: "figma" }>["content"] & { frameRatio?: unknown }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state !== "loading") return;
    const timeout = window.setTimeout(() => setState("error"), 15000);
    return () => window.clearTimeout(timeout);
  }, [state, attempt]);
  if (!figmaLink.safeParse(url).success) return <div className={placeholder}>Add a Figma prototype link</div>;
  const source = new URL(url);
  const embed = new URL(source.pathname + source.search, "https://embed.figma.com");
  embed.searchParams.set("embed-host", "share");
  const ratio = frameRatio === "4:3" ? "aspect-[4/3]" : aspectClass[aspect];
  function load() {
    setAttempt((n) => n + 1);
    setState("loading");
  }
  return (
    <figure className="min-w-0">
      <div ref={frame} className={`relative w-full overflow-hidden rounded-lg bg-cms-background ${ratio}`}>
        {(state === "loading" || state === "ready") && (
          <iframe
            key={attempt}
            title={caption || "Figma prototype"} src={embed.href}
            className="absolute inset-0 block size-full border-0"
            sandbox="allow-scripts allow-same-origin" allowFullScreen
            referrerPolicy="no-referrer"
            onLoad={() => setState("ready")} onError={() => setState("error")}
          />
        )}
        {state === "loading" && <p role="status" className="pointer-events-none absolute inset-x-0 top-0 bg-white/95 p-2 text-center text-sm">Loading Figma preview…</p>}
        {(state === "idle" || state === "error") && (
          <div className="grid h-full place-content-center gap-2 overflow-auto p-3 text-center">
            <p role={state === "error" ? "alert" : undefined} className="text-xs text-cms-secondary sm:text-sm">
              {state === "error" ? "Figma did not load. Retry or open it in Figma."
                : "Load the preview to connect to Figma. Sharing permissions still apply."}
            </p>
            <button type="button" className="mx-auto rounded-md bg-cms-primary px-3 py-2 text-sm text-white" onClick={load}>
              {state === "error" ? "Retry Figma preview" : "Load Figma preview"}
            </button>
          </div>
        )}
      </div>
      <figcaption className={`${captionClass} flex flex-wrap items-center gap-x-4 gap-y-2`}>
        {caption && <span className="mr-auto">{caption}</span>}
        {state === "ready" && <span role="status">Preview frame loaded</span>}
        {state === "ready" && typeof document !== "undefined" && document.fullscreenEnabled && (
          <button type="button" className="underline" onClick={() => void frame.current?.requestFullscreen().catch(() => undefined)}>Fullscreen</button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">Open in Figma</a>
      </figcaption>
    </figure>
  );
}

function CopyColor({ hex }: { hex: string }) {
  const [status, setStatus] = useState("");
  return (
    <button
      type="button" className="font-mono text-xs underline"
      onClick={() => void navigator.clipboard.writeText(hex).then(() => setStatus("Copied"), () => setStatus("Copy unavailable"))}
      aria-label={`Copy ${hex}`}
    >
      {hex}{status && <span role="status"> · {status}</span>}
    </button>
  );
}

type LaneRenderer = (children: ContentBlock[], lane: number) => ReactNode;
export const BlockRenderer = memo(function BlockRenderer({
  block, renderLane, interactiveRichLinks = true,
}: { block: ContentBlock; renderLane?: LaneRenderer; interactiveRichLinks?: boolean }) {
  switch (block.type) {
    case "heading": {
      const c = block.content;
      const H = c.level ?? "h2";
      return <H id={c.anchor ? "section-" + c.anchor : undefined}
        className={`tracking-tight text-balance ${H === "h2" ? "text-3xl md:text-5xl" : H === "h3" ? "text-2xl md:text-3xl" : "text-xl"} ${alignClass[c.alignment ?? "left"]} ${c.emphasis === "italic" ? "italic" : c.emphasis === "strong" ? "font-bold" : "font-semibold"}`}
      >{c.text}</H>;
    }
    case "rich-text": return <div className="cms-rich-copy max-w-[70ch]"><RichText node={block.content.doc} interactiveLinks={interactiveRichLinks} /></div>;
    case "image": {
      const c = block.content;
      return <figure className={`${positionClass[c.alignment]} ${c.alignment === "center" ? "w-full" : "w-full md:w-4/5"}`}>
        <MediaVisual id={c.assetId} alt={c.alt} fit={c.fit} aspect={c.aspect} />
        {c.caption && <figcaption className={`${captionClass} ${alignClass[c.alignment]}`}>{c.caption}</figcaption>}
      </figure>;
    }
    case "gallery": {
      const c = block.content;
      return <figure className="@container min-w-0">
        <div aria-label="Gallery images" className={`grid ${c.mobileColumns === "2" ? "grid-cols-2" : "grid-cols-1"} ${{ 2: "md:@min-[320px]:grid-cols-2", 3: "md:@min-[320px]:grid-cols-3", 4: "md:@min-[320px]:grid-cols-4" }[c.columns]} ${{ tight: "gap-2", normal: "gap-4", wide: "gap-8" }[c.gap]}`}>
          {c.images.map((item) => <figure key={item.id}>
            <MediaVisual id={item.assetId} alt={item.alt} />
            {item.caption && <figcaption className={captionClass}>{item.caption}</figcaption>}
          </figure>)}
          {!c.images.length && <div className={placeholder}>Add images in Properties</div>}
        </div>
        {c.caption && <figcaption className={captionClass}>{c.caption}</figcaption>}
      </figure>;
    }
    case "columns": {
      const count = columnCount(block);
      const ratio = block.content.ratio;
      const template = Array.from({ length: count }, (_, index) =>
        (ratio === "wide-left" && index === 0) || (ratio === "wide-right" && index === count - 1) ? "minmax(0,2fr)" : "minmax(0,1fr)").join(" ");
      return <div className={`grid gap-6 ${block.content.stack === false ? "grid-cols-[var(--case-columns)]" : "grid-cols-1 md:grid-cols-[var(--case-columns)]"}`}
        style={{ "--case-columns": template } as CSSProperties}>
        {Array.from({ length: count }, (_, lane) => {
          const children = (block.children ?? []).filter((child) => (child.layout?.column ?? 0) === lane);
          return <div key={lane} className="min-w-0 space-y-7">{renderLane
            ? renderLane(children, lane)
            : <PreviewBlocks blocks={children} />}
          </div>;
        })}
      </div>;
    }
    case "image-text": {
      const c = block.content;
      const ratio = c.ratio.split(":");
      return <div className={`grid items-center gap-6 ${c.stack ? "grid-cols-1 md:grid-cols-[var(--case-columns)]" : "grid-cols-[var(--case-columns)]"}`}
        style={{ "--case-columns": ratio.map((size) => `minmax(0,${size}fr)`).join(" ") } as CSSProperties}>
        <figure className={c.side === "right" ? "order-2" : ""}>
          <MediaVisual id={c.assetId} alt={c.alt} />
          {c.caption && <figcaption className={captionClass}>{c.caption}</figcaption>}
        </figure>
        <div className="min-w-0">
          {c.heading && <h3 className="text-2xl font-semibold tracking-tight">{c.heading}</h3>}
          <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed">{c.description}</p>
        </div>
      </div>;
    }
    case "video": return <figure>
      <MediaVisual id={block.content.assetId} aspect={block.content.aspect} video={block.content} />
      {block.content.caption && <figcaption className={captionClass}>{block.content.caption}</figcaption>}
    </figure>;
    case "quote": {
      const c = block.content;
      return <figure className={`border-l-2 border-cms-primary py-2 pl-5 ${alignClass[c.alignment]}`}>
        <blockquote className={`whitespace-pre-wrap ${c.typography === "editorial" ? "text-2xl font-medium italic md:text-3xl" : "text-base"}`}>{c.quote || "Add a quotation"}</blockquote>
        {(c.author || c.source) && <figcaption className={captionClass}>{[c.author, c.source].filter(Boolean).join(" · ")}</figcaption>}
      </figure>;
    }
    case "metrics": return <dl className={`grid grid-cols-1 gap-6 ${gridClass[block.content.columns]}`}>
      {block.content.items.map((item) => <div key={item.id} className="flex flex-col gap-2 border-t border-cms-border pt-3">
        <dt className="text-sm font-semibold">{item.label}</dt>
        <dd className="order-first break-words text-3xl font-semibold tracking-tight text-cms-primary">{item.prefix}{item.value}{item.suffix}</dd>
        {item.description && <dd className="text-sm text-cms-secondary">{item.description}</dd>}
      </div>)}
      {!block.content.items.length && <div className={placeholder}>Add measured results in Properties</div>}
    </dl>;
    case "figma": return <Figma key={block.content.url} {...block.content} frameRatio={block.layout?.embedRatio} />;
    case "links": return <div className={`flex flex-wrap gap-3 ${{ left: "justify-start", center: "justify-center", right: "justify-end" }[block.content.alignment]}`}>
      {block.content.items.map((item) => safeLink.safeParse(item.url).success
        ? <a key={item.id} href={item.url} target={item.newTab ? "_blank" : undefined}
          rel={item.newTab ? "noopener noreferrer" : undefined}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${{ primary: "bg-cms-primary text-white", secondary: "border border-cms-border", text: "underline" }[item.variant]}`}>{item.text || item.url}</a>
        : <span key={item.id} className="text-sm text-cms-secondary">{item.text || "Add a link"}</span>)}
      {!block.content.items.length && <div className={placeholder}>Add links in Properties</div>}
    </div>;
    case "divider": return <div className={{ small: "py-1", medium: "py-4", large: "py-8" }[block.content.spacing]}>
      <hr className={`border-0 border-t border-cms-border ${{ solid: "", dashed: "border-dashed", subtle: "opacity-40" }[block.content.line]} ${{ short: "w-1/4", medium: "w-1/2", full: "w-full" }[block.content.width]}`} />
    </div>;
    case "spacer": return <div aria-hidden
      className="h-[var(--space-mobile)] md:h-[var(--space-desktop)]"
      style={{
        "--space-desktop": `${{ small: 24, medium: 64, large: 120, custom: block.content.height }[block.content.size]}px`,
        "--space-mobile": `${block.content.mobileHeight}px`,
      } as CSSProperties}
    />;
    case "palette": return <ul className={`grid grid-cols-2 gap-4 ${gridClass[block.content.columns]}`}>
      {block.content.swatches.map((item) => <li key={item.id}>
        <div className="mb-2 h-20 rounded-md border border-cms-border" style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(item.hex) ? item.hex : undefined }} />
        <p className="font-semibold">{item.name}</p>
        <p className="text-xs text-cms-secondary">{item.role}</p>
        <CopyColor hex={item.hex} />
      </li>)}
      {!block.content.swatches.length && <li className={placeholder}>Add swatches in Properties</li>}
    </ul>;
    case "typography": {
      const c = block.content;
      const allowed: Record<string, string> = { Inter: "var(--font-inter), system-ui, sans-serif", Raleway: "var(--font-raleway), system-ui, sans-serif", Georgia: "Georgia, serif", Monospace: "ui-monospace, monospace" };
      return <figure>
        {c.font && <p className="font-mono text-xs uppercase tracking-wider text-cms-secondary">{c.font} · {c.weight}</p>}
        <div className="mt-2 break-words whitespace-pre-wrap" style={{
          fontFamily: Object.hasOwn(allowed, c.font) ? allowed[c.font] : "system-ui, sans-serif", fontWeight: Number(c.weight),
          fontSize: `clamp(0.75rem, 8vw, ${c.size}px)`, lineHeight: c.lineHeight, letterSpacing: c.letterSpacing,
        }}>{c.sample}</div>
        {c.description && <figcaption className={captionClass}>{c.description}</figcaption>}
      </figure>;
    }
    case "comparison": return <Comparison content={block.content} />;
  }
});

export function PreviewBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return blocks.map((block) => <BlockVisualFrame key={block.id} block={block}><BlockRenderer block={block} /></BlockVisualFrame>);
}
