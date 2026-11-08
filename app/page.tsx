import Link from "next/link";
import { GravityHero } from "@/components/gravity/gravity-hero";
import { ProjectCard } from "@/components/project-card";
import { getItems } from "@/lib/content";
export default function HomePage() {
  const items = getItems({ featured: true });
  return (
    <main id="main" className="home-main">
      <GravityHero />
      <div className="foundation-content">
        <section id="about" className="mb-12" aria-labelledby="about-title">
          <h2 id="about-title" className="text-2xl">
            About Lala
          </h2>
          <p>
            Personal introduction placeholder. Full About content is planned for
            a later stage.
          </p>
        </section>
        <section
          id="works"
          aria-labelledby="featured-title"
          className="space-y-6"
        >
          <h2 id="featured-title" className="text-2xl">
            Featured work
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((item) => (
              <ProjectCard key={item.id} item={item} headingLevel="h3" />
            ))}
          </div>
        </section>
        <Link href="/work">View all work</Link>
      </div>
    </main>
  );
}
