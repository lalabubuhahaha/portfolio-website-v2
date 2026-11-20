import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Portfolio Admin", template: "%s | Portfolio Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-cms-background font-cms text-cms-foreground antialiased">{children}</body>
    </html>
  );
}
