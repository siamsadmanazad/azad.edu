"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib";
import type { ExpandableRead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ExpandableRow({ section }: { section: ExpandableRead }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body);

  const { mutate: toggleVisibility, isPending: toggling } = useMutation({
    mutationFn: () => api.post(`/expandable/${section.id}/toggle-visibility`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["expandables", section.article_id] }),
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.patch(`/expandable/${section.id}`, { title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expandables", section.article_id] });
      setEditing(false);
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: () => api.delete(`/expandable/${section.id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["expandables", section.article_id] }),
  });

  return (
    <div className="rounded-md border bg-slate-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {/* Visibility toggle */}
        <button
          onClick={() => toggleVisibility()}
          disabled={toggling}
          title={section.is_visible ? "Visible to students — click to hide" : "Hidden — click to show"}
          className="text-base leading-none transition-opacity"
        >
          {section.is_visible ? "👁" : "🚫"}
        </button>

        {editing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 h-7 text-sm"
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-slate-800">
            {section.title}
            {!section.is_visible && (
              <span className="ml-1.5 text-xs text-muted-foreground">(hidden)</span>
            )}
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing((v) => !v)}
          className="h-7 px-2 text-xs"
        >
          {editing ? "Cancel" : "Edit"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => remove()}
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          ✕
        </Button>
      </div>

      {editing && (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <Button
            size="sm"
            disabled={saving || !title.trim() || !body.trim()}
            onClick={() => save()}
            className="h-7"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ExpandablesList({ articleId }: { articleId: string }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [addError, setAddError] = useState("");

  const { data: sections = [] } = useQuery<ExpandableRead[]>({
    queryKey: ["expandables", articleId],
    queryFn: async () => {
      const { data } = await api.get(`/expandable/by-article/${articleId}`);
      return data;
    },
  });

  const { mutate: addSection, isPending: adding } = useMutation({
    mutationFn: () =>
      api.post("/expandable", {
        article_id: articleId,
        title: newTitle,
        body: newBody,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expandables", articleId] });
      setNewTitle("");
      setNewBody("");
      setAddError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setAddError(typeof msg === "string" ? msg : "Failed to add section.");
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    addSection();
  }

  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Expandable Sections
      </p>

      {sorted.length === 0 && (
        <p className="text-xs text-muted-foreground">No sections yet.</p>
      )}

      {sorted.map((s) => (
        <ExpandableRow key={s.id} section={s} />
      ))}

      {/* Add section form */}
      <form onSubmit={handleAdd} className="space-y-2 pt-1">
        <Input
          placeholder="Section title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="h-8 text-sm"
          required
        />
        <textarea
          rows={2}
          placeholder="Section body…"
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
          {adding ? "…" : "+ Add section"}
        </Button>
      </form>
    </div>
  );
}
