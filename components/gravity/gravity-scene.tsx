"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createGravityWorld } from "./gravity-world";
import { getHeroPalette } from "./gravity-palettes";
import {
  getSelectedPalette,
  subscribeHeroPalette,
} from "./gravity-palette-store";

import {
  getMotionPreference,
  subscribeMotionPreference,
} from "./gravity-motion-store";
import {
  getStoryProgress,
  shouldUseStaticMotion,
} from "./gravity-story-progress";

import type { GravityExperience } from "./gravity-experience";

export default function GravityScene({
  experience,
}: {
  experience: GravityExperience;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const viewport = container.closest<HTMLElement>(".gravity-viewport");
    const readingContent =
      container.closest(".gravity-story")?.nextElementSibling;
    const updateBackground = () => {
      if (viewport) viewport.dataset.heroPalette = getSelectedPalette();
    };
    updateBackground();
    const unsubscribeBackground = subscribeHeroPalette(updateBackground);
    const canvas = document.createElement("canvas");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      container.dataset.status = "unavailable";
      experience.report("unavailable");
      return unsubscribeBackground;
    }
    container.append(canvas);
    let world: ReturnType<typeof createGravityWorld>;
    try {
      world = createGravityWorld(container, renderer);
    } catch {
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      unsubscribeBackground();
      container.dataset.status = "unavailable";
      experience.report("unavailable");
      return;
    }
    const diagnostic = (event: Event) => {
      const receive = (
        event as CustomEvent<
          (snapshot: ReturnType<typeof world.inspect>) => void
        >
      ).detail;
      if (typeof receive === "function") receive(world.inspect());
    };
    const trace = (event: Event) => {
      const observer = (
        event as CustomEvent<Parameters<typeof world.observeSteps>[0]>
      ).detail;
      if (observer === undefined || typeof observer === "function")
        world.observeSteps(observer);
    };
    const diagnosticsEnabled =
      new URLSearchParams(window.location.search).get("gravity-debug") === "1";
    if (diagnosticsEnabled) {
      canvas.addEventListener("gravity:inspect", diagnostic);
      canvas.addEventListener("gravity:trace", trace);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let frame = 0;
    let progressFrame = 0;
    let lastStaticPose = -1;
    let elapsed = 0;
    let previous = 0;
    let accumulator = 0;
    let visible = true;
    let inStory = true;
    let performanceLimited = false;
    let sampleStart = performance.now();
    let sampleFrames = 0;
    const isStatic = () =>
      reduced.matches ||
      getMotionPreference() === "static" ||
      (getMotionPreference() === "auto" && performanceLimited);
    const usesPerformanceFallback = () =>
      !reduced.matches &&
      getMotionPreference() === "auto" &&
      performanceLimited;
    const resetSample = () => {
      sampleStart = performance.now();
      sampleFrames = 0;
    };
    const describeMotion = () => {
      container.dataset.motionMode = reduced.matches
        ? "static-reduced"
        : getMotionPreference() === "static"
          ? "static-selected"
          : performanceLimited && getMotionPreference() === "auto"
            ? "static-performance"
            : "full";
      container.dataset.activity = inStory ? "story" : "paused-content";
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    };
    const render = () => {
      if (usesPerformanceFallback()) return;
      try {
        world.render();
      } catch {
        stop();
        container.dataset.status = "unavailable";
        experience.report("unavailable");
      }
    };
    // Fixed 60Hz physics keeps the supplied per-frame parameters independent of display refresh.
    const tick = (timestamp: number) => {
      frame = 0;
      if (disposed || isStatic() || !inStory || !visible || document.hidden)
        return;
      accumulator += previous
        ? Math.min((timestamp - previous) / 1000, 0.05)
        : 1 / 60;
      previous = timestamp;
      let steps = 0;
      while (accumulator >= 1 / 60 && steps++ < 3) {
        elapsed += 1 / 60;
        world.simulate(elapsed);
        accumulator -= 1 / 60;
      }
      render();
      if (!world.control.started) resetSample();
      else if (getMotionPreference() === "auto") {
        sampleFrames++;
        const elapsedMs = performance.now() - sampleStart;
        if (shouldUseStaticMotion(sampleFrames, elapsedMs)) {
          performanceLimited = true;
          describeMotion();
          stop();
          renderStatic(true);
          return;
        }
        if (elapsedMs >= 6000 && sampleFrames >= 6) resetSample();
      }
      if (container.dataset.status !== "unavailable")
        frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (
        !frame &&
        !disposed &&
        visible &&
        !document.hidden &&
        !isStatic() &&
        inStory &&
        container.dataset.status !== "unavailable"
      ) {
        resetSample();
        frame = requestAnimationFrame(tick);
      }
    };
    const renderStatic = (force = false) => {
      if (usesPerformanceFallback()) return;
      const progress = world.control.progress;
      const pose = Math.min(3, Math.max(0, Math.round(progress)));
      if (!force && pose === lastStaticPose) return;
      lastStaticPose = pose;
      world.control.progress = [0, 1, 2.2, 3.45][pose];
      for (let i = 0; i < 360; i++) {
        elapsed += 1 / 60;
        world.simulate(elapsed, false);
      }
      world.control.progress = progress;
      render();
    };
    const updateProgress = () => {
      progressFrame = 0;
      if (disposed) return;
      const next = getStoryProgress(
        window.scrollY,
        window.innerHeight,
        readingContent?.getBoundingClientRect().top,
      );
      world.control.progress = next.progress;
      inStory = next.active;
      describeMotion();
      if (!inStory) {
        stop();
        world.mousePos.active = false;
        world.mousePos.isDown = false;
      } else if (!isStatic()) start();
      const progress = world.control.progress;
      if (viewport) {
        viewport.dataset.bgStage = String(
          progress > 1.55 ? 2 : progress > 0.7 ? 1 : 0,
        );
      }
      container.dataset.progress = progress.toFixed(4);
      if (isStatic() && inStory) renderStatic();
    };
    const scheduleProgress = () => {
      if (!progressFrame && !disposed)
        progressFrame = requestAnimationFrame(updateProgress);
    };
    const setMotion = () => {
      stop();
      accumulator = 0;
      world.mousePos.active = false;
      lastStaticPose = -1;
      describeMotion();
      if (isStatic() && inStory) renderStatic();
      else start();
    };
    const updatePointer = (event: PointerEvent) => {
      if (isStatic() || !inStory) return;
      if (
        document.querySelector("dialog.studio-controls[open]") ||
        (event.target instanceof Element &&
          event.target.closest("[data-gravity-ui]"))
      ) {
        world.mousePos.active = false;
        world.mousePos.isDown = false;
        return;
      }
      const rect = container.getBoundingClientRect();
      world.mousePos.active =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      world.mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      world.mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const release = () => {
      world.mousePos.isDown = false;
    };
    const leave = () => {
      release();
      world.mousePos.active = false;
    };
    const press = (event: PointerEvent) => {
      updatePointer(event);
      world.mousePos.isDown = world.mousePos.active;
    };
    const visibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      stop();
      container.dataset.status = "unavailable";
      experience.report("unavailable");
    };
    const resize = new ResizeObserver(() => {
      const changed = world.resize();
      scheduleProgress();
      // ResizeObserver runs after rAF. setSize clears the drawing buffer, so a
      // real resize must paint here, before the browser composites this frame.
      if (changed) {
        if (isStatic()) renderStatic(true);
        else render();
      }
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    resize.observe(container);
    intersection.observe(container);
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", leave);
    window.addEventListener("blur", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", lost);
    reduced.addEventListener("change", setMotion);
    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", scheduleProgress, { passive: true });
    world.setHeroColor(getHeroPalette(getSelectedPalette()).ballColor);
    const unsubscribeMotion = subscribeMotionPreference(() => {
      performanceLimited = false;
      resetSample();
      setMotion();
    });
    const unsubscribePalette = subscribeHeroPalette(() => {
      world.setHeroColor(getHeroPalette(getSelectedPalette()).ballColor);
      render(); // A static/reduced-motion scene also recolors without advancing physics.
    });
    container.dataset.status = "ready";
    container.dataset.ballCount = String(world.balls.length);
    render(); // Warm once; scrolling never restarts the entrance.
    const unregisterEntrance = experience.register(() => {
      world.start();
      lastStaticPose = -1;
      if (isStatic()) renderStatic(true);
    });
    if (container.dataset.status !== "unavailable") experience.report("ready");
    updateProgress();
    if (!isStatic()) start();
    return () => {
      disposed = true;
      unregisterEntrance();
      unsubscribePalette();
      unsubscribeMotion();
      unsubscribeBackground();
      stop();
      resize.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", leave);
      window.removeEventListener("blur", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", lost);
      reduced.removeEventListener("change", setMotion);
      window.removeEventListener("scroll", scheduleProgress);
      window.removeEventListener("resize", scheduleProgress);
      cancelAnimationFrame(progressFrame);
      canvas.removeEventListener("gravity:inspect", diagnostic);
      canvas.removeEventListener("gravity:trace", trace);
      world.observeSteps();
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [experience]);
  return (
    <div ref={containerRef} className="gravity-canvas" aria-hidden="true" />
  );
}
