import { Suspense } from "react";
import { connection } from "next/server";
import { AdminNavigation } from "@/components/admin/navigation";
import { requireAdmin } from "@/lib/cms/session";

async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const { user } = await requireAdmin();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <AdminNavigation email={user.email ?? "Admin"} />
      <main className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-9"><div className="mx-auto max-w-350">{children}</div></main>
    </div>
  );
}

export default function Layout(props: Readonly<{ children: React.ReactNode }>) {
  return <Suspense fallback={<main className="p-8 text-sm" aria-busy="true">Loading admin…</main>}><ProtectedLayout {...props} /></Suspense>;
}
