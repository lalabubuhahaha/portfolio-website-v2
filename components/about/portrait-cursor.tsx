import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";

export function PortraitCursor({ canvas }: { canvas: RefObject<HTMLCanvasElement | null> }) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const surface = canvas.current;
    const cursor = svg.current;
    if (!surface || !cursor) return;
    const mouse = matchMedia("(hover: hover) and (pointer: fine)");
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    let held = false;

    function hide() {
      held = false;
      cursor?.removeAttribute("data-state");
      surface?.removeAttribute("data-pinch-cursor");
    }

    const show = (event: PointerEvent) => {
      if (!mouse.matches || event.pointerType !== "mouse") return;
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
  }, [canvas]);

  return createPortal(
    <svg ref={svg} className="about-portrait-pinch" viewBox="0 0 42 42" aria-hidden="true">
      <path d="M34 39c-4-1-7-4-10-7l-5-6c-2-3-2-6 0-8 2-2 5-1 7 1l-2-5c-1-2 0-4 2-4s3 1 4 3l1 2c0-3 4-4 5-1l1 3c2-1 4 1 4 4l-1 8c0 4-2 8-6 10Z" />
      <path className="about-pinch-index" d="M28 19c-2-5-6-10-11-10-3 0-5 1-5 3s2 2 4 2c3 0 5 3 6 6" />
      <path className="about-pinch-thumb" d="M24 28c-4-2-6-5-7-9-1-2-2-3-4-3-2-1-2-3-1-4 2-2 5 0 7 1 4 2 5 6 8 7" />
    </svg>,
    document.body,
  );
}
