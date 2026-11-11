import Link from "next/link";
import { GravityArrow } from "@/components/gravity/gravity-arrow";
const expertise = [
  "Web UI/UX Design",
  "Design Systems",
  "Product Thinking",
  "Creative Coding",
  "Front-end Collaboration",
];
export function AboutOverview({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  return (
    <section
      id={standalone ? "about-draft" : "about"}
      className="portfolio-about"
      aria-labelledby={standalone ? "about-draft-title" : "about-title"}
    >
      <div className="portfolio-about-intro">
        <p className="gravity-section-label">[ 05 — About / Expertise ]</p>
        <h2 id={standalone ? "about-draft-title" : "about-title"}>
          Clarity in the interface.
          <br />
          Curiosity in the process.
        </h2>
        <p>
          Lala’s personal portfolio explores the relationship between interface
          design, product thinking, and creative technology.
        </p>
        <p className="portfolio-draft-note">
          Introduction draft — pending Lala’s review. This page describes areas
          of interest, not verified experience, clients, or outcomes.
        </p>
        {!standalone && (
          <Link href="/about" className="portfolio-text-link">
            About Lala <GravityArrow />
          </Link>
        )}
      </div>
      <div className="portfolio-expertise">
        <h3>Areas I explore</h3>
        <ol>
          {expertise.map((item, i) => (
            <li key={item}>
              <span aria-hidden="true">0{i + 1}</span>
              <span>{item}</span>
              <GravityArrow />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
