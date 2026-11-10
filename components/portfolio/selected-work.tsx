import Link from "next/link";
import { GravityArrow } from "@/components/gravity/gravity-arrow";
import { getItems } from "@/lib/content";
import { ProjectCard } from "@/components/project-card";
import { Reveal } from "@/components/gravity/reveal";
export function SelectedWork() {
  const items = getItems({ featured: true });
  return (
    <section
      id="works"
      className="portfolio-selected"
      aria-labelledby="featured-title"
    >
      <Reveal>
        <div className="portfolio-section-heading">
          <div>
            <p className="gravity-section-label">[ 05 — Selected Work ]</p>
            <h2 id="featured-title">Work, with intention.</h2>
          </div>
          <Link href="/work" className="portfolio-text-link">
            View all work <GravityArrow />
          </Link>
        </div>
        <p className="portfolio-section-intro">
          Selected independent products and client work. Current previews use
          the existing placeholder content and covers; case studies are not
          published yet.
        </p>
      </Reveal>
      <div className="project-grid">
        {items.map((item) => (
          <Reveal key={item.id}>
            <ProjectCard item={item} headingLevel="h3" />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
