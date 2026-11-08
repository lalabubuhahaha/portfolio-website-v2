import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "Portfolio v2",
  description: "Independent portfolio foundation; visual design pending.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
    <header><nav aria-label="Main navigation" className="flex gap-6"><Link href="/">Home</Link><Link href="/work">Work</Link></nav></header>
    {children}
    <footer>Portfolio v2 — visual design pending.</footer>
  </body></html>;
}
