"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const GravityScene = dynamic(() => import("./gravity-scene"), { ssr: false });
export function GravityHero() {
  const [sceneKey, setSceneKey] = useState(0);
  useEffect(() => {
    const resize = () => setSceneKey((key) => key + 1);
    window.addEventListener("gravity-breakpoint", resize);
    return () => window.removeEventListener("gravity-breakpoint", resize);
  }, []);
  return (
    <section className="gravity-hero" aria-labelledby="hero-heading">
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
      <GravityScene key={sceneKey} />
      <div className="gravity-hero-copy">
        <div className="gravity-hero-title">
          <p className="gravity-eyebrow">[ Digital Designer ]</p>
          <h1 id="hero-heading">
            Less noise.
            <br className="gravity-mobile-break" /> More gravity.
          </h1>
        </div>
        <div className="gravity-hero-aside">
          <p>
            Lala’s personal portfolio.
            <br />
            Exploring digital design through independent products and client
            work.
          </p>
          <p className="gravity-credit">Introduction placeholder</p>
          <a href="#works" className="gravity-scroll">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 4v16m-6-6 6 6 6-6" />
            </svg>{" "}
            Scroll
          </a>
        </div>
      </div>
    </section>
  );
}
