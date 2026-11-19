"use client";

import { useEffect, useRef, useState } from "react";
import "./mobile-navigation.css";
import Link from "next/link";
import { HomeSectionLink } from "@/components/gravity/home-section-link";
import { GravityArrow } from "@/components/gravity/gravity-arrow";
import { HeaderContrast } from "@/components/gravity/header-contrast";
import { StudioControls } from "@/components/gravity/studio-controls";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);

  function closeMenu(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    const mobile = matchMedia("(width < 768px)");
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (nav.current?.contains(event.target) || trigger.current?.contains(event.target)) return;
      closeMenu(!!nav.current?.contains(document.activeElement));
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || nav.current?.querySelector("dialog[open]")) return;
      event.preventDefault();
      closeMenu();
    };
    const resize = () => {
      if (!mobile.matches) closeMenu(false);
    };

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    mobile.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      mobile.removeEventListener("change", resize);
    };
  }, [open]);

  return (
    <header className="site-header" data-gravity-ui>
      <HeaderContrast />
      <Link href="/" className="lala-wordmark" aria-label="Lala home" onClick={() => open && closeMenu(false)}>
        LALA
      </Link>
      <button
        ref={trigger}
        className="gravity-menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="gravity-main-nav"
        onClick={() => open ? closeMenu() : setOpen(true)}
      >
        {open ? "Close" : "Menu"}
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="M3 6h14" />
          <path d="M3 14h14" />
        </svg>
      </button>
      <nav
        ref={nav}
        id="gravity-main-nav"
        aria-label="Main navigation"
        className="gravity-nav"
        data-mobile-open={open}
        onClick={(event) => {
          if (open && event.target instanceof Element && event.target.closest("a")) closeMenu();
        }}
      >
        <div className="gravity-nav-links">
          <Link href="/">Home</Link>
          <Link href="/work">Work</Link>
          <Link href="/about">About</Link>
        </div>
        <div className="gravity-header-actions">
          <StudioControls />
          <HomeSectionLink
            section="contact"
            className="gravity-glass-link"
            aria-label="Contact — details coming soon"
          >
            Contact{" "}
            <span>
              <GravityArrow />
            </span>
          </HomeSectionLink>
        </div>
      </nav>
    </header>
  );
}
