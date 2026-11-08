import { mockContentItems } from "./mock-data";
import type { ContentItem, ContentType } from "./types";

export type { ContentItem, ContentStatus, ContentType } from "./types";

export interface GetItemsOptions {
  type?: ContentType;
  featured?: boolean;
}

export function getItems(options: GetItemsOptions = {}): ContentItem[] {
  const { type, featured } = options;

  return mockContentItems
    .filter((item) => item.status === "published")
    .filter((item) => type === undefined || item.type === type)
    .filter((item) => featured === undefined || item.featured === featured)
    .toSorted((firstItem, secondItem) => firstItem.sort_order - secondItem.sort_order);
}

export function getItemBySlug(slug: string): ContentItem | undefined {
  return mockContentItems.find(
    (item) => item.status === "published" && item.slug === slug,
  );
}
