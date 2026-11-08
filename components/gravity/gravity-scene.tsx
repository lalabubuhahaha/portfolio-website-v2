"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createGravityWorld } from "./gravity-world";

export default function GravityScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
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
      return;
    }
    container.append(canvas);
    const world = createGravityWorld(container, renderer);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 767px)");
    let disposed = false;
    let frame = 0;
    let elapsed = 0;
    let previous = 0;
    let accumulator = 0;
    let visible = true;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    };
    const render = () => {
      try {
        world.render();
      } catch {
        stop();
        container.dataset.status = "unavailable";
      }
    };
    // Fixed 60Hz physics keeps the supplied per-frame parameters independent of display refresh.
    const tick = (timestamp: number) => {
      frame = 0;
      if (disposed || reduced.matches || !visible || document.hidden) return;
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
      if (container.dataset.status !== "unavailable")
        frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (
        !frame &&
        !disposed &&
        visible &&
        !document.hidden &&
        !reduced.matches
      )
        frame = requestAnimationFrame(tick);
    };
    const setMotion = () => {
      stop();
      accumulator = 0;
      world.mousePos.active = false;
      world.scatterFar(true);
      elapsed = 0;
      if (reduced.matches) {
        // Settle offscreen before a single static render; no perpetual rAF in reduced motion.
        for (let i = 0; i < 360; i++) world.simulate(i / 60, false);
        render();
      } else start();
    };
    const updatePointer = (event: PointerEvent) => {
      if (reduced.matches) return;
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
    };
    const resize = new ResizeObserver(() => {
      world.resize();
      if (reduced.matches) render();
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
    // Match the 54/96 count if the responsive breakpoint changes, without a second React effect.
    const breakpoint = () => {
      window.dispatchEvent(new Event("gravity-breakpoint"));
    };
    mobile.addEventListener("change", breakpoint);
    container.dataset.status = "ready";
    container.dataset.ballCount = String(world.balls.length);
    render(); // Warm the actual scene, then release immediately (no PageLoader).
    setMotion();
    return () => {
      disposed = true;
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
      mobile.removeEventListener("change", breakpoint);
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);
  return (
    <div ref={containerRef} className="gravity-canvas" aria-hidden="true" />
  );
}
