"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_HERO_PALETTE, HERO_PALETTES } from "./gravity-palettes";
import { selectHeroPalette, useHeroPalette } from "./gravity-palette-store";

function SlidersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 7h6m4 0h8M3 17h10m4 0h4M9 4v6m4-6v6m0 4v6m4-6v6" />
    </svg>
  );
}

export function StudioControls() {
  const [open, setOpen] = useState(false);
  const selected = useHeroPalette();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.scrollTop = 0;
    dialog
      .querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    // Event-based scroll lock leaves scrollbar width, scrollY, and the WebGL viewport intact.
    const abort = new AbortController();
    const inside = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node) || !dialog.contains(event.target))
        return false;
      const rect = dialog.getBoundingClientRect();
      const x = "touches" in event ? event.touches[0]?.clientX : event.clientX;
      return x !== undefined && x >= rect.left && x <= rect.right;
    };
    const canScroll = (delta: number) =>
      delta < 0
        ? dialog.scrollTop > 0
        : dialog.scrollTop + dialog.clientHeight < dialog.scrollHeight - 1;
    document.addEventListener(
      "wheel",
      (event) => {
        if (!inside(event) || !canScroll(event.deltaY)) event.preventDefault();
      },
      { passive: false, capture: true, signal: abort.signal },
    );
    let touchY = 0;
    document.addEventListener(
      "touchstart",
      (event) => {
        touchY = event.touches[0]?.clientY ?? 0;
      },
      { passive: true, capture: true, signal: abort.signal },
    );
    document.addEventListener(
      "touchmove",
      (event) => {
        const next = event.touches[0]?.clientY ?? touchY;
        const delta = touchY - next;
        touchY = next;
        if (!inside(event) || !canScroll(delta)) event.preventDefault();
      },
      { passive: false, capture: true, signal: abort.signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        const amounts: Record<string, number> = {
          ArrowDown: 40,
          ArrowUp: -40,
          PageDown: dialog.clientHeight,
          PageUp: -dialog.clientHeight,
          Home: -dialog.scrollHeight,
          End: dialog.scrollHeight,
        };
        if (event.key in amounts) {
          event.preventDefault();
          dialog.scrollTop += amounts[event.key];
        }
      },
      { capture: true, signal: abort.signal },
    );
    return () => {
      abort.abort();
      dialog.close();
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="studio-trigger"
        data-gravity-ui
        aria-label="Open Studio Controls"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="studio-controls"
        onClick={() => setOpen(true)}
      >
        <SlidersIcon />
      </button>
      <dialog
        ref={dialogRef}
        id="studio-controls"
        className="studio-controls"
        data-gravity-ui
        aria-labelledby="studio-controls-title"
        aria-describedby="studio-controls-description"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right)
            setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not([disabled])",
            );
          const first = buttons[0],
            last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="studio-controls-heading">
          <h2 id="studio-controls-title">
            <SlidersIcon /> Studio Controls
          </h2>
          <button
            type="button"
            className="studio-close"
            aria-label="Close Studio Controls"
            onClick={() => setOpen(false)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <p id="studio-controls-description" className="studio-description">
          Set the hero sphere palette. As you scroll, the scene morphs to
          volt-lime, then rose-pink as the heart assembles.
        </p>
        <h3 className="studio-palette-heading">
          <span aria-hidden="true">✧</span> Hero Palette Shaders
        </h3>
        <div
          className="studio-palette-list"
          role="group"
          aria-label="Hero palette"
        >
          {HERO_PALETTES.map((palette) => (
            <button
              key={palette.id}
              type="button"
              className="studio-palette"
              data-palette={palette.id}
              aria-pressed={selected === palette.id}
              onClick={() => selectHeroPalette(palette.id)}
            >
              <span className="studio-palette-title">
                {palette.name}
                <span
                  className={`studio-swatch studio-swatch-${palette.token}`}
                  aria-hidden="true"
                />
              </span>
              <span className="studio-palette-description">
                {palette.description}
              </span>
            </button>
          ))}
        </div>
        <div className="studio-engine">
          <p>
            <span>Render engine</span>
            <span>Three.js WebGL</span>
          </p>
          <p>
            <span>Dynamics solver</span>
            <span>3D collision Verlet</span>
          </p>
        </div>
        <button
          type="button"
          className="studio-reset"
          onClick={() => selectHeroPalette(DEFAULT_HERO_PALETTE)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />
          </svg>{" "}
          Reset Defaults
        </button>
      </dialog>
    </>
  );
}
