"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Archive, Ellipsis, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { changeProject } from "./actions";

export function FeaturedToggle({
  id,
  title,
  featured,
  archived,
}: {
  id: string;
  title: string;
  featured: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    setError("");
    start(async () => {
      try {
        const result = await changeProject(id, "featured", !featured);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Could not update Featured. Try again.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={featured}
        aria-label={`Feature ${title}`}
        disabled={pending || archived}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border border-cms-border focus-visible:outline-2 focus-visible:outline-cms-primary disabled:opacity-50 ${featured ? "bg-cms-primary" : "bg-cms-background"}`}
      >
        <span
          className={`size-4 rounded-full border border-cms-border bg-white ${featured ? "translate-x-5.5" : "translate-x-1"}`}
        />
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function ProjectActions({
  id,
  title,
  archived,
}: {
  id: string;
  title: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function update() {
    setError("");
    start(async () => {
      try {
        const result = await changeProject(id, "archive", !archived);
        if (result.error) setError(result.error);
        else {
          setOpen(false);
          router.refresh();
        }
      } catch {
        setError("Could not update the project. Try again.");
      }
    });
  }

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="size-9 px-0"
            data-project-actions={id}
            aria-label={`Actions for ${title}`}
          >
            <Ellipsis />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content
            align="end"
            sideOffset={4}
            className="z-40 min-w-42 rounded-lg border border-cms-border bg-white p-1 text-sm shadow-sm"
          >
            <Dropdown.Item asChild>
              <Link
                href={`/admin/works/${id}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 outline-none data-highlighted:bg-cms-background"
              >
                <Pencil className="size-4" />
                {archived ? "View project" : "Edit project"}
              </Link>
            </Dropdown.Item>
            <Dropdown.Item
              onSelect={() => {
                setError("");
                setOpen(true);
              }}
              className="flex cursor-default items-center gap-2 rounded-md px-3 py-2 outline-none data-highlighted:bg-cms-background"
            >
              {archived ? (
                <RotateCcw className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
              {archived ? "Restore project" : "Archive project"}
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
      <Dialog.Root
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-cms-foreground/35" />
          <Dialog.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document
                .querySelector<HTMLButtonElement>(
                  `[data-project-actions="${id}"]`,
                )
                ?.focus();
            }}
            className="fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-1/2 rounded-xl border border-cms-border bg-white p-6 shadow-sm"
          >
            <Dialog.Title className="text-lg font-semibold">
              {archived ? "Restore project?" : "Archive project?"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-cms-secondary">
              {archived
                ? `“${title}” will return to the active Works list.`
                : `“${title}” will move to Archived. Drafts, revisions and media links will be retained.`}
            </Dialog.Description>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="button" onClick={update} disabled={pending}>
                {pending
                  ? "Saving…"
                  : archived
                    ? "Restore project"
                    : "Archive project"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
