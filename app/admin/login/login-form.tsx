"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/fields";
import { signIn } from "../actions";

export function LoginForm({ disabled }: { disabled: boolean }) {
  const [error, action, pending] = useActionState(signIn, "");
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="mt-7 space-y-5">
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="username" required disabled={disabled || pending} />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <div className="relative">
          <Input className="w-full pr-11" id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required disabled={disabled || pending} />
          <Button type="button" variant="ghost" className="absolute right-1 top-1 size-8 px-0 text-cms-secondary" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} disabled={disabled || pending} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <Button type="submit" className="h-10 w-full" disabled={disabled || pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
