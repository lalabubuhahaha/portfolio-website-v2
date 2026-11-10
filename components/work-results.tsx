import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { getItems, type ContentType } from "@/lib/content";

interface WorkResultsProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface FilterOption {
  href: string;
  label: string;
  type?: ContentType;
}

const filterOptions: readonly FilterOption[] = [
  { href: "/work", label: "All" },
  {
    href: "/work?type=independent",
    label: "Independent Products",
    type: "independent",
  },
  {
    href: "/work?type=client",
    label: "Client & Professional Work",
    type: "client",
  },
];

function parseContentType(value: string | string[] | undefined) {
  return value === "independent" || value === "client" ? value : undefined;
}

export async function WorkResults({ searchParams }: WorkResultsProps) {
  const params = await searchParams;
  const activeType = parseContentType(params.type);
  const items = getItems(activeType === undefined ? {} : { type: activeType });

  return (
    <div>
      <nav aria-label="Filter projects" className="project-filters">
        <ul className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = option.type === activeType;

            return (
              <li key={option.href}>
                <Link
                  href={option.href}
                  aria-current={isActive ? "page" : undefined}
                  className="project-filter"
                >
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="project-results-count" aria-live="polite">
        {items.length} {items.length === 1 ? "project" : "projects"}
      </p>
      <div className="project-grid">
        {items.map((item) => (
          <ProjectCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function WorkResultsSkeleton() {
  return (
    <div className="work-results-loading" role="status">
      <p>Loading project previews…</p>
      <div className="project-grid" aria-hidden="true">
        {[0, 1].map((index) => (
          <div className="work-loading-card" key={index}>
            <div />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
