"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Upload, Trash2, Music, Film, ImageIcon } from "lucide-react";
import { api } from "@/lib";
import type { MediaRead, MediaType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function mediaLabel(item: MediaRead): string {
  if (item.media_type === "youtube" && item.youtube_url) {
    return item.youtube_url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48);
  }
  if (item.file_key) return item.file_key.split("/").pop() ?? item.url;
  return item.url.split("/").pop() ?? item.url;
}

// ── Single media card ──────────────────────────────────────────────────────
function MediaCard({
  item,
  onDelete,
}: {
  item: MediaRead;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(item.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  const thumbnail = (() => {
    if (item.media_type === "image") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt=""
          className="w-full h-full object-cover"
        />
      );
    }
    if (item.media_type === "youtube" && item.youtube_url) {
      const vid = getYouTubeId(item.youtube_url);
      return vid ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.style.display = "none";
            target.parentElement?.classList.add("flex", "items-center", "justify-center");
          }}
        />
      ) : (
        <Play size={28} className="text-red-500" />
      );
    }
    if (item.media_type === "video") return <Film size={28} className="text-slate-500" />;
    if (item.media_type === "audio") return <Music size={28} className="text-indigo-500" />;
    return <ImageIcon size={28} className="text-slate-400" />;
  })();

  const typeColors: Record<MediaType, string> = {
    image:   "bg-emerald-100 text-emerald-700",
    video:   "bg-slate-100  text-slate-700",
    audio:   "bg-indigo-100 text-indigo-700",
    youtube: "bg-red-100    text-red-700",
  };

  return (
    <div className="group relative rounded-lg border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
        {thumbnail}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center gap-2">
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            typeColors[item.media_type]
          )}
        >
          {item.media_type}
        </span>
        <span className="flex-1 text-xs text-slate-500 truncate" title={mediaLabel(item)}>
          {mediaLabel(item)}
        </span>
        <button
          onClick={handleDeleteClick}
          className={cn(
            "shrink-0 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            confirmDelete
              ? "bg-destructive text-white hover:bg-destructive/90"
              : "text-slate-400 hover:text-destructive hover:bg-destructive/10"
          )}
          title="Delete media"
        >
          <Trash2 size={12} />
          {confirmDelete ? "Confirm?" : ""}
        </button>
      </div>
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────
export function MediaTab({ contentId }: { contentId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  // ── Fetch media ────────────────────────────────────────────────────────
  const { data: media = [], isLoading } = useQuery<MediaRead[]>({
    queryKey: ["media", contentId],
    queryFn: async () => {
      const { data } = await api.get(`/content/${contentId}/media`);
      return data;
    },
  });

  // ── Delete ─────────────────────────────────────────────────────────────
  const { mutate: deleteMedia } = useMutation({
    mutationFn: (mediaId: string) => api.delete(`/media/${mediaId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["media", contentId] }),
  });

  // ── Add YouTube ────────────────────────────────────────────────────────
  const { mutate: addYoutube, isPending: addingYT } = useMutation({
    mutationFn: async () => {
      const { data: item } = await api.post<MediaRead>("/media/youtube", {
        youtube_url: youtubeUrl,
      });
      await api.post(`/media/${item.id}/attach/${contentId}`);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", contentId] });
      setYoutubeUrl("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setUploadError(typeof msg === "string" ? msg : "Failed to add YouTube video.");
    },
  });

  function handleYoutubeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploadError("");
    addYoutube();
  }

  // ── File upload (presigned URL flow) ───────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("uploading");
    setUploadError("");

    const mimeType = file.type;
    const mediaType: MediaType = mimeType.startsWith("image/")
      ? "image"
      : mimeType.startsWith("video/")
      ? "video"
      : "audio";

    try {
      // 1. Get presigned URL
      const { data: presigned } = await api.post<{ upload_url: string; file_key: string }>(
        "/media/presigned-url",
        { filename: file.name, mime_type: mimeType, media_type: mediaType }
      );

      // 2. Upload file directly to R2
      const putResp = await fetch(presigned.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      });
      if (!putResp.ok) throw new Error("Upload to storage failed.");

      // 3. Confirm in DB — derive public URL from upload_url (strip query params)
      const publicUrl = presigned.upload_url.split("?")[0];
      const { data: item } = await api.post<MediaRead>("/media/confirm", {
        file_key: presigned.file_key,
        url: publicUrl,
        mime_type: mimeType,
        size_bytes: file.size,
        media_type: mediaType,
      });

      // 4. Attach to this content
      await api.post(`/media/${item.id}/attach/${contentId}`);

      queryClient.invalidateQueries({ queryKey: ["media", contentId] });
      setUploadStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setUploadStatus("error");
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Upload failed.");
      if (status === 503 || msg.toLowerCase().includes("r2") || msg.toLowerCase().includes("storage")) {
        setUploadError("File upload requires Cloudflare R2 storage to be configured on the server.");
      } else if (status === 404) {
        setUploadError("Upload destination not found. Check your storage configuration.");
      } else {
        setUploadError(msg || "Upload failed. Please try again.");
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Media grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-slate-100 h-40 animate-pulse" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
          <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-muted-foreground">No media yet. Add some below.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item) => (
            <MediaCard key={item.id} item={item} onDelete={(id) => deleteMedia(id)} />
          ))}
        </div>
      )}

      <div className="border-t" />

      {/* Add YouTube */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Play size={14} className="text-red-500" />
          Add YouTube video
        </p>
        <form onSubmit={handleYoutubeSubmit} className="flex gap-2">
          <Input
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="flex-1 text-sm"
            type="url"
          />
          <Button
            type="submit"
            size="sm"
            disabled={addingYT || !youtubeUrl.trim()}
          >
            {addingYT ? "Adding…" : "Add video"}
          </Button>
        </form>
      </div>

      {/* Upload file */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Upload size={14} className="text-slate-500" />
          Upload file
          <span className="text-xs text-muted-foreground font-normal">
            — image, video, or audio
          </span>
        </p>
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50",
            uploadStatus === "uploading" && "opacity-60 pointer-events-none"
          )}
        >
          <Upload size={24} className="text-slate-300" />
          {uploadStatus === "uploading"
            ? "Uploading…"
            : "Click to choose a file"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="sr-only"
            onChange={handleFileChange}
            disabled={uploadStatus === "uploading"}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Requires Cloudflare R2 storage to be configured.
        </p>
      </div>

      {/* Error */}
      {uploadError && (
        <p className="text-xs text-destructive rounded-md bg-destructive/10 px-3 py-2">
          {uploadError}
        </p>
      )}
    </div>
  );
}
