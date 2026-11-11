"use client";

import { useEffect } from "react";

/** Only adapt the floating controls' ink when the footer reaches the header. */
export function HeaderContrast() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const footer = document.querySelector<HTMLElement>(".gravity-footer");
    if (!header || !footer) return;
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      const height = header.getBoundingClientRect().height;
      const update = () => {
        const bounds = footer.getBoundingClientRect();
        header.dataset.surface = bounds.top < height && bounds.bottom > 0
          ? "dark"
          : "light";
      };
      observer = new IntersectionObserver(update, {
        rootMargin: `0px 0px -${Math.max(0, window.innerHeight - height)}px 0px`,
      });
      observer.observe(footer);
      update();
    };
    observe();
    window.addEventListener("resize", observe, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", observe);
      delete header.dataset.surface;
    };
  }, []);
  return null;
}
