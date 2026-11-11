import Link from "next/link";
import { HomeSectionLink } from "@/components/gravity/home-section-link";
import { GravityArrow } from "@/components/gravity/gravity-arrow";
import { HeaderContrast } from "@/components/gravity/header-contrast";
import { StudioControls } from "@/components/gravity/studio-controls";
export function SiteHeader() {
  return (
    <header className="site-header" data-gravity-ui>
      <HeaderContrast />
      <Link href="/" className="lala-wordmark" aria-label="Lala home">
        LALA
      </Link>
      <nav aria-label="Main navigation" className="gravity-nav">
        <div className="gravity-nav-links">
          <Link href="/">Home</Link>
          <HomeSectionLink section="works">Work</HomeSectionLink>
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
