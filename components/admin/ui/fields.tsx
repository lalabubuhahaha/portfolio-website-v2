// Adapted from the shadcn/ui New York registry.
import type { ComponentProps } from "react";
import { cn } from "./utils";

export const fieldClass = "h-10 rounded-lg border border-cms-border bg-white px-3 text-sm outline-none placeholder:text-cms-muted focus-visible:border-cms-primary focus-visible:ring-2 focus-visible:ring-cms-primary/20 disabled:bg-cms-background disabled:text-cms-muted";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldClass, className)} {...props} />;
}


export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldClass, "h-auto min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldClass, className)} {...props} />;
}
