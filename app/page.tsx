import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { getItems } from "@/lib/content";
export default function HomePage() {
  const items = getItems({ featured: true });
  return <main id="main" className="space-y-8">
    <h1 className="text-3xl font-semibold">Portfolio</h1>
    <p>Independent products and client work. Visual design will be defined in the next phase.</p>
    <section aria-labelledby="featured-title" className="space-y-6">
      <h2 id="featured-title" className="text-2xl">Featured work</h2>
      <div className="grid gap-6 md:grid-cols-2">{items.map(item => <ProjectCard key={item.id} item={item} headingLevel="h3" />)}</div>
    </section>
    <Link href="/work">View all work</Link>
  </main>;
}
