"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (!node || reduced.matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          node.dataset.reveal = "visible";
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    node.dataset.reveal = "pending";
    observer.observe(node);
    const show = () => {
      if (reduced.matches) {
        delete node.dataset.reveal;
        observer.disconnect();
      }
    };
    reduced.addEventListener("change", show);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", show);
      delete node.dataset.reveal;
    };
  }, []);
  return (
    <div ref={ref} className={`gravity-reveal ${className}`}>
      {children}
    </div>
  );
}
