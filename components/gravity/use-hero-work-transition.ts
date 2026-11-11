"use client";

import { useEffect, type RefObject } from "react";

/** Foreground only: never writes to the WebGL world or its scroll progress. */
export function useHeroWorkTransition(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const story = ref.current;
    const hero = story?.querySelector<HTMLElement>(".gravity-hero");
    const copy = story?.querySelector<HTMLElement>(".gravity-hero-copy");
    const works = story?.querySelector<HTMLElement>("#works");
    const intro = works?.querySelector<HTMLElement>(".featured-intro");
    if (!story || !hero || !copy || !works || !intro) return;
    const cards = Array.from(
      works.querySelectorAll<HTMLElement>(".featured-previews > [data-work-reveal]"),
    );
    const nodes = [intro, ...cards];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let disposed = false;
    let previousTop = hero.getBoundingClientRect().top;
    let introSeen = false;
    const seen = new Set<HTMLElement>();
    const reveal = (node: HTMLElement, delay: number, immediate: boolean) => {
      if (seen.has(node) && !immediate) return;
      seen.add(node);
      node.style.setProperty("--work-reveal-delay", `${delay}ms`);
      node.dataset.workReveal = immediate ? "instant" : "visible";
    };
    const update = () => {
      frame = 0;
      if (disposed) return;
      const viewport = window.innerHeight || 1;
      const bounds = hero.getBoundingClientRect();
      const workBounds = works.getBoundingClientRect();
      // Normalize against the actual section, independently of physics progress.
      const local = Math.max(0, Math.min(1, -bounds.top / bounds.height));
      const exit = Math.max(0, Math.min(1, (local - 0.08) / (0.42 - 0.08)));
      const eased = exit * exit * (3 - 2 * exit);
      const opacity = reduced.matches ? (exit === 1 ? 0 : 1) : 1 - eased;
      copy.style.opacity = String(opacity);
      copy.style.transform =
        reduced.matches || exit === 0
          ? "none"
          : `translateY(${-eased * copy.offsetHeight * 0.22}px)`;
      copy.dataset.heroExited = String(opacity === 0);
      copy.inert = opacity === 0;

      const headerBottom =
        document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
      const jumped = Math.abs(bounds.top - previousTop) > viewport * 0.35;
      previousTop = bounds.top;
      const atReadingSurface =
        workBounds.top <= headerBottom && workBounds.bottom > 0;
      const visible = (node: HTMLElement) => {
        const rect = node.getBoundingClientRect();
        return rect.top < viewport && rect.bottom > headerBottom;
      };
      // Direct fragments, restored scroll and fast jumps must never leave a blank surface.
      const immediate =
        reduced.matches || atReadingSurface || (jumped && visible(intro));
      const heroGone = opacity <= 0.08;
      if (heroGone && (visible(intro) || workBounds.top < 0)) {
        introSeen = true;
        reveal(intro, 0, immediate);
      }
      if (introSeen) {
        cards.forEach((card, index) => {
          if (immediate || visible(card)) reveal(card, (index + 1) * 120, immediate);
        });
      }
    };
    const schedule = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(update);
    };
    nodes.forEach((node) => {
      node.dataset.workReveal = "pending";
    });
    const resize =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(hero);
    resize?.observe(works);
    resize?.observe(copy);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("hashchange", schedule);
    window.addEventListener("pageshow", schedule);
    reduced.addEventListener("change", schedule);
    update();
    void document.fonts.ready.then(schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("pageshow", schedule);
      reduced.removeEventListener("change", schedule);
      copy.style.removeProperty("opacity");
      copy.style.removeProperty("transform");
      delete copy.dataset.heroExited;
      copy.inert = false;
      nodes.forEach((node) => {
        delete node.dataset.workReveal;
        node.style.removeProperty("--work-reveal-delay");
      });
    };
  }, [ref]);
}
