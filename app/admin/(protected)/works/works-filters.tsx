"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input, Select } from "@/components/admin/ui/fields";
import { parseWorksFilters } from "@/lib/cms/works-filters";

export function updateWorksQuery(changes: Record<string, string>) {
  const params = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(changes)) {
    if (!value || (name === "page" && value === "1")) params.delete(name);
    else params.set(name, value);
  }
  const query = params.toString();
  const next = window.location.pathname + (query ? "?" + query : "");
  if (next !== window.location.pathname + window.location.search) {
    // Native history updates Next's useSearchParams without a server navigation.
    window.history.pushState(null, "", next);
  }
}

export function WorksFilters() {
  const params = useSearchParams();
  const key = params.toString();
  const { q, category, status, sort } = parseWorksFilters(params);
  const [draft, setDraft] = useState<{ source: string; text: string }>();
  const search = draft?.source === key ? draft.text : q;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function restore() {
      clearTimeout(timer.current);
      setDraft(undefined);
    }
    window.addEventListener("popstate", restore);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("popstate", restore);
    };
  }, []);

  function filter(name: string, value: string) {
    clearTimeout(timer.current);
    updateWorksQuery({ q: search.trim(), [name]: value, page: "" });
  }

  function type(value: string) {
    clearTimeout(timer.current);
    setDraft({ source: key, text: value });
    const source = window.location.search;
    timer.current = setTimeout(() => {
      if (source === window.location.search)
        updateWorksQuery({ q: value.trim(), page: "" });
    }, 300);
  }

  function clear() {
    clearTimeout(timer.current);
    setDraft(undefined);
    updateWorksQuery({ q: "", status: "", category: "", sort: "", page: "" });
  }

  return (
    <div
      role="group"
      aria-label="Works filters"
      className="flex flex-wrap items-center gap-3 border-b border-cms-border p-4 sm:p-5"
    >
      <div className="relative w-full sm:max-w-64">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-3 left-3 size-4 text-cms-muted"
        />
        <Input
          name="q"
          aria-label="Search projects"
          className="w-full pl-9"
          placeholder="Search projects…"
          value={search}
          maxLength={120}
          onChange={(event) => type(event.target.value)}
        />
      </div>
      <Select
        name="category"
        aria-label="Category"
        value={category}
        onChange={(event) => filter("category", event.target.value)}
      >
        <option value="">All categories</option>
        <option value="independent">Independent</option>
        <option value="client">Client</option>
      </Select>
      <Select
        name="status"
        aria-label="Status"
        value={status}
        onChange={(event) => filter("status", event.target.value)}
      >
        <option value="">All active statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </Select>
      <Select
        name="sort"
        aria-label="Sort"
        value={sort}
        onChange={(event) => filter("sort", event.target.value)}
      >
        <option value="">Recently updated</option>
        <option value="oldest">Oldest updated</option>
        <option value="display">Custom order</option>
      </Select>
      <Button
        variant="outline"
        type="button"
        onClick={clear}
        disabled={
          !search && !category && !status && !sort && !params.has("page")
        }
      >
        Clear Filters
      </Button>
    </div>
  );
}
