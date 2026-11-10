"use client";
export function SkipToContent() {
  return (
    <a
      href="#main"
      className="skip-link"
      onClick={(event) => {
        const target = Array.from(
          document.querySelectorAll<HTMLElement>("main"),
        ).find((main) => main.getClientRects().length > 0);
        if (!target) return;
        event.preventDefault();
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }}
    >
      Skip to content
    </a>
  );
}
