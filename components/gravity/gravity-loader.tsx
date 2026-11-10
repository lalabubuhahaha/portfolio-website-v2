"use client";
import { useEffect, useRef } from "react";
import type { GravityExperience } from "./gravity-experience";

export function GravityLoader({
  experience,
}: {
  experience: GravityExperience;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    // React Activity may reactivate the cached Story with its state preserved.
    experience.begin();
    delete element.dataset.leaving;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let value = 0;
    let previous = 0;
    let completedAt = 0;
    let done = false;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".site-header, .foundation-content, .gravity-footer, .gravity-story > :not(.gravity-loader), body > a.skip-link",
      ),
    ).map((node) => ({ node, inert: node.inert }));
    const restore = () =>
      background.forEach(({ node, inert }) => {
        node.inert = inert;
      });
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      const restoreFocus = element.contains(document.activeElement);
      restore();
      element.hidden = true;
      document.documentElement.dataset.gravityEntrance = "revealed";
      if (restoreFocus)
        document
          .querySelector<HTMLElement>(".site-header .lala-wordmark")
          ?.focus({ preventScroll: true });
      experience.finish();
    };
    const check = () => {
      if (experience.getStatus() === "unavailable" || reduced.matches) finish();
    };
    const skip = element.querySelector("button");
    skip?.addEventListener("click", finish);
    const unsubscribe = experience.subscribe(check);
    const tick = (time: number) => {
      if (done) return;
      const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      const ready = experience.getStatus() === "ready";
      value += ((ready ? 100 : 92) - value) * (ready ? 6 : 1.7) * dt;
      if (ready && value >= 99.4) value = 100;
      const counter = element.querySelector(".gravity-loader-counter");
      const fill = element.querySelector<HTMLElement>(".gravity-loader-fill");
      if (counter)
        counter.textContent = `${String(Math.floor(value)).padStart(3, "0")}%`;
      if (fill) fill.style.width = `${value}%`;
      if (value === 100) {
        if (!completedAt) completedAt = time;
        const status = element.querySelector(".gravity-loader-status");
        if (status) status.textContent = "Entering Lala’s orbit";
        if (time - completedAt >= 140) element.dataset.leaving = "true";
        if (time - completedAt >= 660) {
          finish();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    if (!reduced.matches && experience.getStatus() !== "unavailable") {
      background.forEach(({ node }) => {
        node.inert = true;
      });
      element.hidden = false;
      document.documentElement.dataset.gravityEntrance = "loading";
      frame = requestAnimationFrame(tick);
    } else finish();
    // Scene readiness only; never claim to measure all network downloads.
    const timeout = window.setTimeout(finish, 12000);
    reduced.addEventListener("change", check);
    return () => {
      done = true;
      restore();
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      unsubscribe();
      skip?.removeEventListener("click", finish);
      reduced.removeEventListener("change", check);
      delete document.documentElement.dataset.gravityEntrance;
    };
  }, [experience]);
  return (
    <div
      ref={root}
      className="gravity-loader"
      hidden
      data-gravity-ui
      aria-label="Preparing the interactive scene"
    >
      <div className="gravity-loader-content">
        <p className="gravity-loader-status" role="status">
          Calibrating Lala’s gravity field
        </p>
        <div className="gravity-loader-track" aria-hidden="true">
          <div className="gravity-loader-fill" />
        </div>
        <p className="gravity-loader-counter" aria-hidden="true">
          000%
        </p>
        <p className="sr-only">
          Preparing the interactive scene, not measuring page downloads. Loading
          is skipped if the scene is unavailable.
        </p>
        <button type="button" className="gravity-loader-skip">
          Skip scene intro
        </button>
      </div>
    </div>
  );
}
