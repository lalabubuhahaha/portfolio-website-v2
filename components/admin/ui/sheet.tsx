"use client";

// Adapted from the shadcn/ui New York registry.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({ children }: { children: ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-cms-foreground/35 md:hidden" />
      <Dialog.Content data-slot="sheet-content" className="fixed inset-y-0 left-0 z-50 flex w-[min(290px,90vw)] flex-col border-r border-cms-border bg-white md:hidden">
        <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
        <Dialog.Description className="sr-only">Navigate the portfolio administration.</Dialog.Description>
        <Dialog.Close asChild>
          <Button variant="ghost" className="absolute top-4 right-3 size-9 px-0" aria-label="Close navigation"><X /></Button>
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
