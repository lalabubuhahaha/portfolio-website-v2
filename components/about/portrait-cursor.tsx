import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";

export function PortraitCursor({ face }: { face: RefObject<HTMLDivElement | null> }) {
  const overlay = useRef<HTMLDivElement>(null);
  const animated = useRef<HTMLImageElement>(null);
  const closed = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const surface = face.current;
    const cursor = overlay.current;
    const animatedImage = animated.current;
    const closedImage = closed.current;
    if (!surface || !cursor || !animatedImage || !closedImage) return;
    const mouse = matchMedia("(hover: hover) and (pointer: fine)");
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    let held = false;
    let decoded = false;
    void Promise.all([animatedImage.decode(), closedImage.decode()]).then(() => {
      decoded = true;
    }, () => { if (!listeners.signal.aborted) hide(); });

    function hide() {
      held = false;
      cursor?.removeAttribute("data-state");
      surface?.removeAttribute("data-pinch-cursor");
    }

    const show = (event: PointerEvent) => {
      if (!decoded || !mouse.matches || event.pointerType !== "mouse") return;
      cursor.style.setProperty("--pointer-x", `${event.clientX}px`);
      cursor.style.setProperty("--pointer-y", `${event.clientY}px`);
      cursor.dataset.state = held ? "held" : "ready";
      surface.dataset.pinchCursor = "";
    };

    surface.addEventListener("pointerenter", show, options);
    surface.addEventListener("pointermove", show, options);
    surface.addEventListener("pointerdown", (event) => {
      if (!mouse.matches || event.pointerType !== "mouse" || event.button !== 0) return;
      queueMicrotask(() => {
        if (listeners.signal.aborted || surface.dataset.dragging !== "true") return;
        held = true;
        show(event);
      });
    }, options);
    surface.addEventListener("lostpointercapture", (event) => {
      held = false;
      if (document.elementFromPoint(event.clientX, event.clientY) === surface) show(event);
      else hide();
    }, options);
    surface.addEventListener("pointerleave", () => { if (!held) hide(); }, options);
    surface.addEventListener("pointercancel", hide, options);
    window.addEventListener("blur", hide, options);
    mouse.addEventListener("change", hide, options);
    return () => { listeners.abort(); hide(); };
  }, [face]);

  return createPortal(
    <div ref={overlay} className="about-portrait-pinch" aria-hidden="true">
      {/* Load both local SVGs before suppressing the native cursor. */}
      {/* eslint-disable @next/next/no-img-element */}
      <img ref={animated} src="/images/about/cursor/pinch-animated.svg" className="about-pinch-animated" alt="" />
      <img ref={closed} src="/images/about/cursor/pinch-closed.svg" className="about-pinch-closed" alt="" />
      {/* eslint-enable @next/next/no-img-element */}
    </div>,
    document.body,
  );
}
