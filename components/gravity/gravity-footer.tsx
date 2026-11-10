import Link from "next/link";
import { FooterMarquee } from "./footer-marquee";
import { HomeSectionLink } from "@/components/gravity/home-section-link";
import { GravityArrow } from "./gravity-arrow";
import { Reveal } from "./reveal";
export function GravityFooter() {
  return (
    <footer className="gravity-footer" id="contact">
      <div className="gravity-footer-glow" aria-hidden="true" />
      <FooterMarquee />
      <div className="gravity-footer-body">
        <div className="gravity-footer-grid">
          <Reveal>
            <p className="gravity-footer-label">[ Let’s connect ]</p>
            <h2>
              Ideas worth
              <br />
              exploring together.
            </h2>
            <p className="gravity-contact-placeholder">
              Contact details coming soon.
            </p>
            <p className="gravity-footer-note">
              A direct contact address has not been provided yet.
            </p>
          </Reveal>
          <Reveal>
            <nav aria-label="Footer navigation">
              <h3>Explore</h3>
              <Link href="/">
                Home <GravityArrow />
              </Link>
              <Link href="/work">
                Work <GravityArrow />
              </Link>
              <Link href="/about">
                About preview <GravityArrow />
              </Link>
            </nav>
          </Reveal>
          <Reveal>
            <div className="gravity-footer-column">
              <h3>Field notes</h3>
              <HomeSectionLink section="drop">
                Motion <GravityArrow />
              </HomeSectionLink>
              <HomeSectionLink section="shape">
                Form <GravityArrow />
              </HomeSectionLink>
              <HomeSectionLink section="release">
                Exploration <GravityArrow />
              </HomeSectionLink>
            </div>
          </Reveal>
          <Reveal>
            <div className="gravity-footer-column">
              <h3>Elsewhere</h3>
              <p>
                Social links
                <br />
                coming soon.
              </p>
            </div>
          </Reveal>
        </div>
        <div className="gravity-footer-bottom">
          <Link href="/" className="lala-wordmark">
            LALA
          </Link>
          <span className="gravity-footer-dot" aria-hidden="true" />
          <small>© 2026 Lala — Personal portfolio.</small>
          <a href="#top">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
