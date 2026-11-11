import Link from "next/link";
import { GravityArrow } from "@/components/gravity/gravity-arrow";
import { getItems } from "@/lib/content";
import { FeaturedProjectPreview } from "./featured-project-preview";

export function SelectedWork() {
  const items = getItems({ featured: true });
  return (
    <section
      id="works"
      className="gravity-story-section gravity-drop gravity-featured"
      aria-labelledby="featured-title"
    >
      {/* Preserve the Hero's original Scroll fragment without changing its content. */}
      <span id="drop" className="featured-drop-anchor" aria-hidden="true" />
      <div className="featured-layout">
        <div
          className="gravity-story-copy featured-intro featured-reveal"
          data-work-reveal
        >
          <p className="gravity-section-label">[ 02 — Selected Work ]</p>
          <h2 id="featured-title">
            Ideas take
            <br />
            shape here.
          </h2>
          <p>
            A first look at independent products, interfaces, and design
            explorations. Existing previews; full case studies are coming soon.
          </p>
          <Link href="/work" className="portfolio-text-link" data-gravity-ui>
            View all work <GravityArrow />
          </Link>
        </div>
        <div
          className="featured-previews"
          role="group"
          aria-label="Featured project previews"
        >
          {items.map((item) => (
            <div key={item.id} className="featured-reveal" data-work-reveal>
              <FeaturedProjectPreview item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
