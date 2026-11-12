import Image from "next/image";
import Link from "next/link";
import type { ContentItem } from "@/lib/content";
import { GravityArrow } from "@/components/gravity/gravity-arrow";

export function FeaturedProjectPreview({ item }: { item: ContentItem }) {
  const typeLabel = item.type === "independent" ? "Independent" : "Client work";
  return (
    <article className="featured-preview" data-featured-preview>
      <Link
        href={`/work?type=${item.type}`}
        className="featured-preview-link"
        data-gravity-ui
        aria-label={`${item.title} — browse ${typeLabel.toLowerCase()} previews`}
      >
        <div className="featured-preview-cover">
          <Image
            src={item.cover}
            alt={item.cover_alt}
            width={800}
            height={500}
            sizes="(max-width: 767px) 104px, (max-width: 1023px) 140px, (max-width: 1439px) 20vw, 280px"
          />
        </div>
        <div className="featured-preview-copy">
          <p className="featured-preview-meta">
            <span>{typeLabel}</span>
            <time dateTime={String(item.year)}>{item.year}</time>
          </p>
          <h3>{item.title}</h3>
          <p className="featured-preview-category">{item.category.join(" / ")}</p>
          <p className="featured-preview-status">
            <span>Case study coming soon</span>
            <span className="featured-preview-browse">Browse <GravityArrow /></span>
          </p>
        </div>
      </Link>
    </article>
  );
}
