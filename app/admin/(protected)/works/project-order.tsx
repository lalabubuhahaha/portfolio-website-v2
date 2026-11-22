"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { saveOrder } from "./actions";

type Entry = { id: string; title: string; published: boolean };

function DragRow({
  entry,
  index,
  pending,
  showStatus,
}: {
  entry: Entry;
  index: number;
  pending: boolean;
  showStatus: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, disabled: pending });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-3 rounded-lg border border-cms-border bg-white p-3 ${isDragging ? "z-10 ring-2 ring-cms-primary" : ""}`}
    >
      <Button
        variant="outline"
        type="button"
        ref={setActivatorNodeRef}
        className="size-11 shrink-0 touch-none cursor-grab px-0 text-cms-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-disabled={pending}
        aria-label={`Move ${entry.title}`}
      >
        <GripVertical aria-hidden className="size-5" />
      </Button>
      <span className="text-xs tabular-nums text-cms-secondary">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 break-words text-sm font-medium">
        {entry.title}
      </span>
      {showStatus && (
        <span className="text-right text-xs text-cms-secondary">
          {entry.published ? "Published" : "Pending Publication"}
        </span>
      )}
    </li>
  );
}

export function ProjectOrder({
  kind,
  initial,
}: {
  kind: "display" | "featured";
  initial: Entry[];
}) {
  const router = useRouter();
  const signature = JSON.stringify(initial);
  const [source, setSource] = useState(signature);
  const [entries, setEntries] = useState(initial);
  if (source !== signature) {
    setSource(signature);
    setEntries(initial);
  }
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const [pending, start] = useTransition();
  const name = (id: string | number) =>
    entries.find((entry) => entry.id === id)?.title ?? "Project";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function reorder({ active, over }: DragEndEvent) {
    if (pending || !over || active.id === over.id) return;
    const previous = entries;
    const next = arrayMove(
      previous,
      previous.findIndex((entry) => entry.id === active.id),
      previous.findIndex((entry) => entry.id === over.id),
    );
    setEntries(next);
    setFeedback(undefined);
    start(async () => {
      try {
        const result = await saveOrder(
          kind,
          previous.map((entry) => entry.id),
          next.map((entry) => entry.id),
        );
        if (result.error) {
          setEntries(previous);
          setFeedback({ text: result.error, error: true });
        } else {
          setFeedback({ text: "Order saved." });
        }
      } catch {
        setEntries(previous);
        setFeedback({
          text: "Could not save the order. The previous order was restored.",
          error: true,
        });
      }
    });
  }

  return (
    <section
      aria-label="Custom ordering"
      className="mt-6 rounded-xl border border-cms-border bg-white p-4 sm:p-5"
    >
      <h2 className="font-semibold">
        {kind === "display" ? "Works display order" : "Homepage featured order"}
      </h2>
      <p className="mt-2 text-sm text-cms-secondary">
        <strong className="font-semibold">Drag to reorder.</strong>{" "}
        Grab a handle with a mouse or touch, or press Space, use the arrow keys
        and press Space again. The order saves on drop.
      </p>
      {entries.length === 0 && (
        <p className="mt-5 text-sm text-cms-secondary">
          {kind === "featured"
            ? "Mark a project as Featured to add it here."
            : "Add a draft to start ordering projects."}
        </p>
      )}
      <DndContext
        id={kind + "-order"}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={reorder}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
            onDragOver: ({ active, over }) =>
              over ? `${name(active.id)} is over ${name(over.id)}.` : undefined,
            onDragEnd: ({ active, over }) =>
              over ? `Dropped ${name(active.id)}.` : "Order unchanged.",
            onDragCancel: () => "Sorting canceled.",
          },
        }}
      >
        <SortableContext
          items={entries.map((entry) => entry.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="mt-4 space-y-2">
            {entries.map((entry, index) => (
              <DragRow
                key={entry.id}
                entry={entry}
                index={index}
                pending={pending}
                showStatus={kind === "featured"}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {pending && (
        <p role="status" className="mt-3 text-sm text-cms-secondary">
          Saving order…
        </p>
      )}
      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={`mt-3 text-sm ${feedback.error ? "text-red-700" : "text-emerald-700"}`}
        >
          {feedback.text}
        </p>
      )}
      {feedback?.error && (
        <Button
          variant="outline"
          type="button"
          className="mt-2"
          onClick={() => router.refresh()}
        >
          Reload order
        </Button>
      )}
    </section>
  );
}
