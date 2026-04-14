"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib";
import type { HighlightRead, MediaRead, PopupRead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

// ── Popup drawer ───────────────────────────────────────────────────────────
function PopupDrawer({
  highlight,
  contentId,
  open,
  onClose,
}: {
  highlight: HighlightRead;
  contentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Fetch existing popup when drawer opens
  const { data: existing } = useQuery<PopupRead | null>({
    queryKey: ["popup", highlight.id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/highlights/${highlight.id}/popup`);
        return data;
      } catch {
        return null;
      }
    },
    enabled: open,
  });

  useEffect(() => {
    if (existing !== undefined && !initialized) {
      setText(existing?.text ?? "");
      setMediaId(existing?.media_id ?? "");
      setInitialized(true);
    }
  }, [existing, initialized]);

  // Fetch media options for this content
  const { data: mediaList } = useQuery<MediaRead[]>({
    queryKey: ["media", contentId],
    queryFn: async () => {
      const { data } = await api.get(`/content/${contentId}/media`);
      return data;
    },
    enabled: open,
  });

  const isEdit = !!existing;

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const body = { text, media_id: mediaId || undefined };
      return isEdit
        ? api.patch(`/highlights/${highlight.id}/popup`, body)
        : api.post(`/highlights/${highlight.id}/popup`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popup", highlight.id] });
      queryClient.invalidateQueries({ queryKey: ["highlights", highlight.article_id] });
      onClose();
      setInitialized(false);
    },
  });

  function handleClose() {
    onClose();
    setInitialized(false);
  }

  return (
    <Sheet open={open} onOpenChange={(o: boolean) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit popup" : "Add popup"} — &ldquo;{highlight.display_text}&rdquo;
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 px-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Explanation text
            </label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What should students learn from this term?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {mediaList && mediaList.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Attach media{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <select
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— None —</option>
                {mediaList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.media_type.toUpperCase()} —{" "}
                    {m.youtube_url
                      ? m.youtube_url.slice(0, 40)
                      : m.file_key?.split("/").pop() ?? m.url.slice(0, 40)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <SheetFooter>
          <SheetClose className="order-last">
            <Button
              onClick={() => save()}
              disabled={isPending || !text.trim()}
              className="w-full"
            >
              {isPending ? "Saving…" : isEdit ? "Update popup" : "Create popup"}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function HighlightsList({
  articleId,
  contentId,
}: {
  articleId: string;
  contentId: string;
}) {
  const queryClient = useQueryClient();
  const [drawerHighlight, setDrawerHighlight] = useState<HighlightRead | null>(null);
  const [displayText, setDisplayText] = useState("");
  const [anchorKey, setAnchorKey] = useState("");
  const [anchorKeyTouched, setAnchorKeyTouched] = useState(false);
  const [addError, setAddError] = useState("");

  const { data: highlights = [] } = useQuery<HighlightRead[]>({
    queryKey: ["highlights", articleId],
    queryFn: async () => {
      const { data } = await api.get(`/highlights/by-article/${articleId}`);
      return data;
    },
  });

  const { mutate: deleteHighlight } = useMutation({
    mutationFn: (id: string) => api.delete(`/highlights/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["highlights", articleId] }),
  });

  const { mutate: addHighlight, isPending: adding } = useMutation({
    mutationFn: () =>
      api.post("/highlights", {
        article_id: articleId,
        display_text: displayText,
        anchor_key: anchorKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights", articleId] });
      setDisplayText("");
      setAnchorKey("");
      setAnchorKeyTouched(false);
      setAddError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setAddError(typeof msg === "string" ? msg : "Failed to add highlight.");
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    addHighlight();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Highlights
      </p>

      {highlights.length === 0 && (
        <p className="text-xs text-muted-foreground">No highlights yet.</p>
      )}

      {highlights.map((h) => (
        <div
          key={h.id}
          className="flex items-center gap-2 text-sm bg-slate-50 rounded-md px-3 py-2 border"
        >
          <div className="flex-1 min-w-0">
            <span className="font-medium text-indigo-700">{h.display_text}</span>
            <span className="ml-2 text-xs text-muted-foreground font-mono">
              {h.anchor_key}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDrawerHighlight(h)}
            className="text-xs h-7 px-2"
          >
            Popup
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteHighlight(h.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
          >
            ✕
          </Button>
        </div>
      ))}

      {/* Add highlight form */}
      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <Input
          placeholder="Highlight term (e.g. photosynthesis)"
          value={displayText}
          onChange={(e) => {
            const val = e.target.value;
            setDisplayText(val);
            if (!anchorKeyTouched) {
              setAnchorKey(
                val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
              );
            }
          }}
          className="flex-1 min-w-32 h-8 text-sm"
          required
        />
        <Input
          placeholder="anchor-key"
          value={anchorKey}
          onChange={(e) => {
            setAnchorKeyTouched(true);
            setAnchorKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
          }}
          className="w-36 h-8 text-sm font-mono"
          required
          pattern="^[a-z0-9-]+$"
          title="Lowercase letters, numbers and hyphens only"
        />
        <Button
          type="submit"
          size="sm"
          disabled={adding || !displayText.trim() || !anchorKey.trim()}
          className="h-8"
        >
          {adding ? "…" : "+ Add"}
        </Button>
      </form>
      {addError && (
        <p className="text-xs text-destructive">{addError}</p>
      )}

      {/* Popup drawer */}
      {drawerHighlight && (
        <PopupDrawer
          highlight={drawerHighlight}
          contentId={contentId}
          open={!!drawerHighlight}
          onClose={() => setDrawerHighlight(null)}
        />
      )}
    </div>
  );
}
