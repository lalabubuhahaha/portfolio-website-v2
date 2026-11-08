import Link from "next/link";
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="lala-wordmark" aria-label="Lala home">
        LALA
      </Link>
      <nav aria-label="Main navigation" className="gravity-nav">
        <Link href="/work">Work</Link>
        <Link href="/#about" className="gravity-glass-link">
          About{" "}
          <span aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 18 18 6M6 6h12v12" />
            </svg>
          </span>
        </Link>
      </nav>
    </header>
  );
}
