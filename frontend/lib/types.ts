export type ContentStatus = "draft" | "published" | "archived";
export type MediaType = "image" | "audio" | "video" | "youtube";

export interface ContentRead {
  id: string;
  title: string;
  description: string | null;
  status: ContentStatus;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

export interface MediaRead {
  id: string;
  file_key: string | null;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  media_type: MediaType;
  youtube_url: string | null;
  created_at: string;
}

export interface PopupRead {
  id: string;
  highlight_id: string;
  text: string;
  media_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HighlightRead {
  id: string;
  article_id: string;
  anchor_key: string;
  display_text: string;
  created_at: string;
  popup: PopupRead | null;
}

export interface ExpandableRead {
  id: string;
  article_id: string;
  title: string;
  body: string;
  order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArticleRead {
  id: string;
  title: string;
  body: string;
  content_id: string;
  order: number;
  created_at: string;
  updated_at: string;
  highlights: HighlightRead[];
  expandable_sections: ExpandableRead[];
}

export interface ContentFullView extends ContentRead {
  media: MediaRead[];
  articles: ArticleRead[];
}
