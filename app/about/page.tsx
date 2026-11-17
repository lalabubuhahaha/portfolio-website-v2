import type { Metadata } from "next";
import { InteractivePortrait } from "@/components/about/interactive-portrait";
import { AboutOverview } from "@/components/portfolio/about-overview";
export const metadata: Metadata = {
  title: "About Lala — Introduction Draft",
  description:
    "An introduction draft and areas of design interest. Personal history and case studies are pending review.",
};
export default function AboutPage() {
  return (
    <main id="main" tabIndex={-1} className="portfolio-page about-page">
      <section className="about-portrait-hero" aria-label="Meet Lala">
        <div className="portfolio-page-heading">
          <p className="gravity-section-label">[ Lala — Digital Designer ]</p>
          <h1>About Lala.</h1>
          <p>
            Personal introduction draft. Full biography and confirmed experience
            will be added after review.
          </p>
        </div>
        <InteractivePortrait />
      </section>
      <AboutOverview standalone />
    </main>
  );
}
