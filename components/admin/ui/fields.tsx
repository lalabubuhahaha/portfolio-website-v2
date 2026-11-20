// Adapted from the shadcn/ui New York registry.
import type { ComponentProps } from "react";
import { cn } from "./utils";

export const fieldClass = "h-10 rounded-lg border border-cms-border bg-white px-3 text-sm outline-none placeholder:text-cms-muted focus-visible:border-cms-primary focus-visible:ring-2 focus-visible:ring-cms-primary/20 disabled:bg-cms-background disabled:text-cms-muted";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldClass, className)} {...props} />;
}
