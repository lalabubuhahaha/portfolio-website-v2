"use client";

export function GravityHero() {
  return (
    <section className="gravity-hero" aria-labelledby="hero-heading">
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
          <a href="#drop" className="gravity-scroll">
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
