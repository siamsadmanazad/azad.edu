"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib";
import type { ArticleRead } from "@/lib/types";
import { HighlightsList } from "./HighlightsList";
import { ExpandablesList } from "./ExpandablesList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// ── Single article editor ──────────────────────────────────────────────────
function ArticleCard({
  article,
  contentId,
}: {
  article: ArticleRead;
  contentId: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  const [order, setOrder] = useState(String(article.order));
  const [saved, setSaved] = useState(false);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      api.patch(`/articles/${article.id}`, {
        title,
        body,
        order: parseInt(order) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles", contentId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: () => api.delete(`/articles/${article.id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["articles", contentId] }),
  });

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {/* Article header */}
      <div className="px-4 py-3 border-b bg-slate-50 rounded-t-lg flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">#{order}</span>
        <span className="font-medium text-sm text-slate-800 flex-1 truncate">
          {article.title}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => remove()}
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Delete article
        </Button>
      </div>

      {/* Edit form */}
      <div className="p-4 space-y-3 border-b">
        <div className="flex gap-2 items-center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            className="flex-1 h-8 text-sm"
          />
          <Input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="w-20 h-8 text-sm"
            placeholder="Order"
            min={0}
          />
        </div>
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Article body…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
        <Button
          size="sm"
          disabled={saving || !title.trim() || !body.trim()}
          onClick={() => save()}
          className="h-8"
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save article"}
        </Button>
      </div>

      {/* Highlights + Expandables */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <HighlightsList articleId={article.id} contentId={contentId} />
        <ExpandablesList articleId={article.id} />
      </div>
    </div>
  );
}

// ── Articles tab ───────────────────────────────────────────────────────────
export function ArticlesTab({ contentId }: { contentId: string }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [addError, setAddError] = useState("");

  const { data: articles = [], isLoading } = useQuery<ArticleRead[]>({
    queryKey: ["articles", contentId],
    queryFn: async () => {
      const { data } = await api.get(`/articles/by-content/${contentId}`, {
        params: { skip: 0, limit: 100 },
      });
      return data;
    },
  });

  const { mutate: addArticle, isPending: adding } = useMutation({
    mutationFn: () =>
      api.post("/articles", {
        content_id: contentId,
        title: newTitle,
        body: newBody,
        order: articles.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles", contentId] });
      setNewTitle("");
      setNewBody("");
      setAddError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setAddError(typeof msg === "string" ? msg : "Failed to create article.");
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    addArticle();
  }

  const sorted = [...articles].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 pt-4">
      {/* New article form */}
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">New Article</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <Input
            placeholder="Article title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-8 text-sm"
            required
          />
          <textarea
            rows={3}
            placeholder="Article body…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            required
          />
          {addError && <p className="text-xs text-destructive">{addError}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={adding || !newTitle.trim() || !newBody.trim()}
            className="h-8"
          >
            {adding ? "Creating…" : "+ Add article"}
          </Button>
        </form>
      </div>

      {/* Article list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No articles yet. Add one above.
        </p>
      ) : (
        <div className="space-y-4">
          {sorted.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              contentId={contentId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
