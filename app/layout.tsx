import type { Metadata } from "next";
import { GravityFooter } from "@/components/gravity/gravity-footer";
import { SiteHeader } from "@/components/site-header";
import "@fontsource-variable/raleway";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
export const metadata: Metadata = {
  title: "Lala — Digital Designer",
  description: "Lala’s personal digital design portfolio.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <GravityFooter />
      </body>
    </html>
  );
}
