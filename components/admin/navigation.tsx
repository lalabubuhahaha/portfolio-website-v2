"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, FolderOpen, House, Images, LayoutDashboard, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { clearBrowserRecovery } from "@/lib/cms/draft-recovery-storage";
import { signOut } from "@/app/admin/actions";
import { Button } from "./ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import { cn } from "./ui/utils";

const destinations = [
  { label: "Overview", icon: LayoutDashboard, href: "/admin" },
  { label: "Works", icon: FolderOpen, href: "/admin/works" },
  { label: "Home", icon: House },
  { label: "About", icon: UserRound },
  { label: "Media Library", icon: Images, href: "/admin/media" },
  { label: "Settings", icon: Settings },
];

function Sidebar({ email, mobile }: { email: string; mobile?: boolean }) {
  const current = usePathname();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-6 pt-7 pb-8">
        <div className="text-[23px] font-extrabold tracking-tight text-cms-primary">LALA.</div>
        <div className="mt-1 text-[10px] font-semibold tracking-[.15em] text-cms-secondary">PORTFOLIO ADMIN</div>
      </div>
      <nav aria-label="Administration" className="flex-1 space-y-1 overflow-y-auto px-3">
        {destinations.map(({ label, href, icon: Icon }) => {
          const selected = href === "/admin" ? current === href : Boolean(href && current.startsWith(href));
          const row = "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium";
          if (!href) return <div key={label} aria-disabled="true" title="Coming soon" className={cn(row, "text-cms-muted")}><Icon className="size-4" />{label}<span className="sr-only"> (coming soon)</span></div>;
          const link = <Link href={href} aria-current={selected ? "page" : undefined} className={cn(row, selected ? "bg-cms-selected text-cms-primary" : "text-cms-secondary hover:bg-cms-background")}><Icon className="size-4" />{label}</Link>;
          return mobile ? <SheetClose asChild key={label}>{link}</SheetClose> : <div key={label}>{link}</div>;
        })}
      </nav>
      <div className="border-t border-cms-border p-3">
        <div className="mb-2 flex items-center gap-3 px-2 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-cms-selected text-xs font-semibold text-cms-primary">{email.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0"><div className="text-xs font-semibold">Administrator</div><div title={email} className="truncate text-xs text-cms-secondary">{email}</div></div>
        </div>
        <form action={signOut} onSubmit={(event) => {
          if (!window.dispatchEvent(new Event("cms:before-sign-out", { cancelable: true }))) {
            event.preventDefault();
            return;
          }
          try { if (!clearBrowserRecovery(window.localStorage)) event.preventDefault(); }
          catch {
            if (!window.confirm("Browser recovery storage could not be cleared. Sign out anyway?")) event.preventDefault();
          }
        }}>
          <Button variant="ghost" type="submit" className="w-full justify-start text-cms-secondary"><LogOut />Sign out</Button>
        </form>
        <Button asChild variant="ghost" className="w-full justify-start text-cms-secondary"><Link href="/"><ArrowUpRight />View website</Link></Button>
      </div>
    </div>
  );
}

export function AdminNavigation({ email }: { email: string }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh border-r border-cms-border bg-white md:block"><Sidebar email={email} /></aside>
      <header className="flex h-14 items-center gap-3 border-b border-cms-border bg-white px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild><Button variant="ghost" className="size-9 px-0" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
          <SheetContent><Sidebar email={email} mobile /></SheetContent>
        </Sheet>
        <span className="font-extrabold tracking-tight text-cms-primary">LALA.</span>
        <span className="text-xs text-cms-secondary">Portfolio Admin</span>
      </header>
    </>
  );
}
