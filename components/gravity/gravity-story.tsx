"use client";
import dynamic from "next/dynamic";
import { GravityHero } from "./gravity-hero";
const GravityScene = dynamic(() => import("./gravity-scene"), { ssr: false });

export function GravityStory() {
  return (
    <div className="gravity-story">
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

        <GravityScene />
      </div>
      <GravityHero />
      <section
        id="drop"
        className="gravity-story-section gravity-drop"
        aria-labelledby="drop-heading"
      >
        <div className="gravity-story-copy">
          <p className="gravity-section-label">[ 02 — Physics ]</p>
          <h2 id="drop-heading">
            Let ideas
            <br />
            find their weight.
          </h2>
          <p>
            I explore how an interface responds, adapts, and feels. This field
            is a study in motion: structure gives way to gravity, contact, and
            momentum.
          </p>
        </div>
      </section>
      <section
        id="shape"
        className="gravity-story-section gravity-shape"
        aria-labelledby="shape-heading"
      >
        <div className="gravity-story-copy">
          <p className="gravity-section-label">[ 03 — Form ]</p>
          <h2 id="shape-heading">
            A little chaos.
            <br />A clearer form.
          </h2>
        </div>
        <p className="gravity-shape-note">
          Design is a process of finding relationships. Move through the field:
          each small part can wander, then find its place again.
        </p>
      </section>
      <section
        id="release"
        className="gravity-story-section gravity-release"
        aria-labelledby="release-heading"
      >
        <div className="gravity-story-copy">
          <p className="gravity-section-label">[ 04 — Release ]</p>
          <h2 id="release-heading">
            Room for
            <br />
            what comes next.
          </h2>
          <p>
            From an idea to something you can explore. Keep scrolling to
            discover selected independent products and client work.
          </p>
          <a href="#works">
            Explore selected work <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
    </div>
  );
}
