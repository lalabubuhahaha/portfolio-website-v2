// Adapted from the shadcn/ui New York registry.
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cms-primary disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-cms-primary text-white hover:bg-cms-primary-hover",
        outline: "border border-cms-border bg-white hover:bg-cms-background",
        ghost: "hover:bg-cms-background",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Button({ asChild, variant, className, ...props }: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component data-slot="button" className={cn(buttonVariants({ variant }), className)} {...props} />;
}
