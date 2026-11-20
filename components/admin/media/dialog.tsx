"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";

export function MediaDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-cms-foreground/40" />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-1/2 overflow-y-auto rounded-xl border border-cms-border bg-white p-5 sm:p-6 ${wide ? "max-w-4xl" : "max-w-2xl"}`}
        >
          <Dialog.Title className="pr-10 text-lg font-semibold">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-1 pr-8 text-sm text-cms-secondary">
            {description}
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Close dialog"
              className="absolute top-3 right-3 size-9 px-0"
            >
              <X />
            </Button>
          </Dialog.Close>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
