"use client";
import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";
import { createGravityExperience } from "./gravity-experience";
import { GravityLoader } from "./gravity-loader";
import { Reveal } from "./reveal";
import { GravityHero } from "./gravity-hero";
import { useHeroWorkTransition } from "./use-hero-work-transition";
const GravityScene = dynamic(() => import("./gravity-scene"), { ssr: false });

export function GravityStory({ featuredWork }: { featuredWork: ReactNode }) {
  const [experience] = useState(createGravityExperience);
  const storyRef = useRef<HTMLDivElement>(null);
  useHeroWorkTransition(storyRef);
  return (
    <div ref={storyRef} className="gravity-story">
      <GravityLoader experience={experience} />
      <div className="gravity-viewport" data-bg-stage="0">
        <div className="gravity-background" aria-hidden="true">
          <div className="gravity-gradient gravity-gradient-blue" />
          <div className="gravity-gradient gravity-gradient-lime" />
          <div className="gravity-gradient gravity-gradient-pink" />
        </div>
        <div className="gravity-static" aria-hidden="true">
          <svg viewBox="0 0 800 440" role="presentation">
            <defs>
              <radialGradient id="gravity-fallback">
                <stop stopColor="var(--gravity-pearl)" />
                <stop offset="1" stopColor="var(--gravity-royal)" />
              </radialGradient>
            </defs>
            <ellipse
              cx="400"
              cy="220"
              rx="240"
              ry="110"
              fill="none"
              stroke="var(--gravity-light)"
            />
            {[
              [260, 190, 62],
              [365, 230, 85],
              [490, 170, 70],
              [550, 250, 45],
              [235, 285, 35],
              [450, 305, 40],
            ].map(([cx, cy, r], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="url(#gravity-fallback)"
              />
            ))}
          </svg>
        </div>

        <GravityScene experience={experience} />
      </div>
      <GravityHero />
      {featuredWork}
      <section
        id="shape"
        className="gravity-story-section gravity-shape"
        aria-labelledby="shape-heading"
      >
        <Reveal className="gravity-story-copy">
          <p className="gravity-section-label">[ 03 — Form ]</p>
          <h2 id="shape-heading">
            A little chaos.
            <br />A clearer form.
          </h2>
        </Reveal>
        <Reveal className="gravity-shape-note">
          <p>
            Design is a process of finding relationships. Move through the
            field: each small part can wander, then find its place again.
          </p>
        </Reveal>
      </section>
      <section
        id="release"
        className="gravity-story-section gravity-release"
        aria-labelledby="release-heading"
      >
        <Reveal className="gravity-story-copy">
          <p className="gravity-section-label">[ 04 — Release ]</p>
          <h2 id="release-heading">
            Room for
            <br />
            what comes next.
          </h2>
          <p>
            Space for the next idea. Continue to the interests behind the work,
            or return to the selected previews.
          </p>
          <a href="#works">
            Back to selected work <span aria-hidden="true">↑</span>
          </a>
        </Reveal>
      </section>
    </div>
  );
}
