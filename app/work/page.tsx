import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkResults } from "@/components/work-results";
export const metadata: Metadata = { title: "Work | Portfolio v2" };
interface WorkPageProps { searchParams: Promise<Record<string, string | string[] | undefined>>; }
export default function WorkPage({ searchParams }: WorkPageProps) {
  return <main id="main" className="space-y-8">
    <h1 className="text-3xl font-semibold">Work</h1>
    <Suspense fallback={<p role="status">Loading projects…</p>}><WorkResults searchParams={searchParams} /></Suspense>
  </main>;
}
