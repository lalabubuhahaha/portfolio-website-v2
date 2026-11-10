import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkResults, WorkResultsSkeleton } from "@/components/work-results";
export const metadata: Metadata = {
  title: "Work — Lala Portfolio",
  description: "Browse Lala’s independent product and client project previews.",
};
interface WorkPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
export default function WorkPage({ searchParams }: WorkPageProps) {
  return (
    <main id="main" tabIndex={-1} className="portfolio-page work-page">
      <div className="portfolio-page-heading">
        <p className="gravity-section-label">[ Selected projects ]</p>
        <h1>Work, with intention.</h1>
        <p>
          Independent products and client work, collected in one place. These
          are content previews; case study pages are not published yet.
        </p>
      </div>
      <Suspense fallback={<WorkResultsSkeleton />}>
        <WorkResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
