import Image from "next/image";
import Link from "next/link";
import type { ContentItem } from "@/lib/content";
import { GravityArrow } from "./gravity/gravity-arrow";
interface ProjectCardProps {
  item: ContentItem;
  headingLevel?: "h2" | "h3";
  detailAvailable?: boolean;
}
export function ProjectCard({
  item,
  headingLevel: Heading = "h2",
  detailAvailable = false,
}: ProjectCardProps) {
  const href = `/work/${item.slug}`;
  return (
    <article data-project-card className="project-card">
      <div className="project-cover">
        <Image
          src={item.cover}
          alt={item.cover_alt}
          width={800}
          height={500}
          sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1439px) 45vw, 640px"
          className="project-cover-image"
        />
      </div>
      <div className="project-card-body">
        <div className="project-meta">
          <p>
            {item.type === "independent"
              ? "Independent Product"
              : "Client & Professional Work"}
          </p>
          <time dateTime={String(item.year)}>{item.year}</time>
        </div>
        <Heading>{item.title}</Heading>
        <p className="project-summary">{item.summary}</p>
        <ul aria-label="Project categories" className="project-categories">
          {item.category.map((category) => (
            <li key={category}>{category}</li>
          ))}
        </ul>
        {detailAvailable ? (
          <Link
            href={href}
            className="project-view-link"
            aria-label={`View project: ${item.title}`}
          >
            View Project <GravityArrow />
          </Link>
        ) : (
          <div className="project-detail-status" data-planned-route={href}>
            <span>
              View Project <GravityArrow />
            </span>
            <p>Case study coming soon — detail page not available.</p>
          </div>
        )}
      </div>
    </article>
  );
}
