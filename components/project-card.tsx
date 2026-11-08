import Image from "next/image";
import Link from "next/link";
import type { ContentItem } from "@/lib/content";
interface ProjectCardProps { item: ContentItem; headingLevel?: "h2" | "h3"; }
export function ProjectCard({ item, headingLevel: Heading = "h2" }: ProjectCardProps) {
  return <article data-project-card className="space-y-3 border border-foreground/20 p-4">
    <Link href={`/work/${item.slug}`} aria-label={`View ${item.title}`}>
      <Image src={item.cover} alt={item.cover_alt} width={800} height={500} className="h-auto w-full" />
      <Heading className="text-xl font-semibold">{item.title}</Heading>
    </Link>
    <p>{item.type === "independent" ? "Independent Product" : "Client & Professional Work"} · <time dateTime={String(item.year)}>{item.year}</time></p>
    <p>{item.summary}</p>
    <ul aria-label="Project categories">{item.category.map(category => <li key={category}>{category}</li>)}</ul>
  </article>;
}
