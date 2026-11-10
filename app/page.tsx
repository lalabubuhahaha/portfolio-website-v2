import Link from "next/link";
import { Reveal } from "@/components/gravity/reveal";
import { GravityStory } from "@/components/gravity/gravity-story";
import { ProjectCard } from "@/components/project-card";
import { getItems } from "@/lib/content";
export default function HomePage() {
  const items = getItems({ featured: true });
  return (
    <main id="main" className="home-main">
      <GravityStory />
      <div className="foundation-content">
        <Reveal>
          <section id="about" className="mb-12" aria-labelledby="about-title">
            <h2 id="about-title" className="text-2xl">
              About Lala
            </h2>
            <p>
              Personal introduction placeholder. Full About content is planned
              for a later stage.
            </p>
          </section>
        </Reveal>
        <section
          id="works"
          aria-labelledby="featured-title"
          className="space-y-6"
        >
          <Reveal>
            <h2 id="featured-title" className="text-2xl">
              Featured work
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((item) => (
              <Reveal key={item.id}>
                <ProjectCard item={item} headingLevel="h3" />
              </Reveal>
            ))}
          </div>
        </section>
        <Link href="/work">View all work</Link>
      </div>
    </main>
  );
}
