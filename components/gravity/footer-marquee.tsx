"use client";
import { useState } from "react";
export function FooterMarquee() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="gravity-marquee" data-paused={paused}>
      <div className="gravity-marquee-track" aria-hidden="true">
        {[0, 1].map((repeat) => (
          <div key={repeat}>
            {["Design", "Explore", "Build", "Create"].map((word) => (
              <span key={word}>
                {word}
                <i />
              </span>
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="gravity-marquee-toggle"
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
        aria-label={
          paused ? "Resume footer animation" : "Pause footer animation"
        }
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="currentColor"
        >
          {paused ? (
            <path d="M4 2 13 8 4 14Z" />
          ) : (
            <path d="M3 2h3v12H3zm7 0h3v12h-3z" />
          )}
        </svg>
      </button>
    </div>
  );
}
