export type ContentType = "independent" | "client";

export type ContentStatus = "draft" | "published";

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  category: string[];
  cover: string;
  cover_alt: string;
  video_url?: string;
  summary: string;
  role?: string;
  year: number;
  tools: string[];
  featured: boolean;
  sort_order: number;
  status: ContentStatus;
  content: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}
