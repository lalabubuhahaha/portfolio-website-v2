import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/cms/session";
import { LoginForm } from "./login-form";

type Props = { searchParams: Promise<{ signout?: string }> };

async function Login({ searchParams }: Props) {
  const { signout } = await searchParams;
  const session = await getAdminSession();
  if (session.state === "authorized" && signout !== "failed") redirect("/admin");

  const notice = signout === "failed" ? "Could not sign out. Return to the dashboard to try again."
    : session.state === "unconfigured" ? "Supabase is missing or misconfigured. Check the environment settings."
      : session.state === "forbidden" ? "This account does not have admin access."
        : session.state === "unavailable" ? "Admin access could not be verified. Check the Supabase connection and migration."
          : null;

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <section className="w-full max-w-105 rounded-xl border border-cms-border bg-white p-7 sm:p-9">
        <Link className="inline-block text-xl font-extrabold tracking-tight text-cms-primary" href="/">LALA.</Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Portfolio Admin</h1>
        <p className="mt-2 text-sm text-cms-secondary">Sign in to manage your portfolio.</p>
        {notice && <p role="status" className="mt-4 rounded-lg bg-cms-selected p-3 text-sm text-cms-secondary">{notice}</p>}
        {session.state === "authorized" ? <a className="mt-5 inline-block text-sm font-medium text-cms-primary" href="/admin">Return to dashboard</a> : <LoginForm disabled={session.state === "unconfigured"} />}
      </section>
    </main>
  );
}

export default function LoginPage(props: Props) {
  return <Suspense fallback={<main className="p-8 text-sm" aria-busy="true">Loading sign-in…</main>}><Login {...props} /></Suspense>;
}
