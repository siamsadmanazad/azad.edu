"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2, BookOpen, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib";
import type { ContentRead } from "@/lib/types";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatusBadge } from "@/components/content/StatusBadge";
import { ArticlesTab } from "@/components/article/ArticlesTab";
import { MediaTab } from "@/components/media/MediaTab";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Section types ──────────────────────────────────────────────────────────
type Section = "details" | "articles" | "media";

// ── Collapsible side nav ───────────────────────────────────────────────────
const NAV_ITEMS: { id: Section; icon: React.ReactNode; label: string }[] = [
  { id: "details",  icon: <Settings2 size={16} />,  label: "Details"  },
  { id: "articles", icon: <BookOpen  size={16} />,  label: "Articles" },
  { id: "media",    icon: <ImageIcon size={16} />,  label: "Media"    },
];

function EditorSideNav({
  active,
  onSelect,
}: {
  active: Section;
  onSelect: (s: Section) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-slate-50 shrink-0 transition-all duration-200",
        collapsed ? "w-14" : "w-48"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "flex h-10 items-center border-b px-3 text-slate-400 hover:text-slate-700 transition-colors",
          collapsed ? "justify-center" : "justify-end"
        )}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 p-2 pt-3">
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center" : "justify-start",
              active === id
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <span className="shrink-0">{icon}</span>
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ── Details Tab ────────────────────────────────────────────────────────────
function DetailsTab({ content }: { content: ContentRead }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(content.title);
  const [description, setDescription] = useState(content.description ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      api.patch(`/content/${content.id}`, {
        title,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", content.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const isPublished = content.status === "published";
  const { mutate: togglePublish, isPending: toggling } = useMutation({
    mutationFn: () =>
      api.post(`/content/${content.id}/${isPublished ? "unpublish" : "publish"}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["content", content.id] }),
  });

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: () => api.delete(`/content/${content.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      router.push("/dashboard");
    },
  });

  return (
    <div className="space-y-6 max-w-xl">
      {/* Edit form */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="edit-title">
            Title
          </label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="edit-desc">
            Description{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="edit-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
        <Button onClick={() => save()} disabled={saving || !title.trim()}>
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="border-t" />

      {/* Publish toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Visibility</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPublished
              ? "Students can see this content."
              : "Only you can see this content."}
          </p>
        </div>
        <Button
          variant={isPublished ? "outline" : "default"}
          size="sm"
          disabled={toggling || content.status === "archived"}
          onClick={() => togglePublish()}
        >
          {toggling ? "…" : isPublished ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <div className="border-t" />

      {/* Danger zone */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-destructive">Delete content</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanently removes this content and all its articles.
          </p>
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-destructive hover:text-destructive hover:bg-destructive/10"
            )}
          >
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete content?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{content.title}&rdquo; and all its articles will be
                permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={() => doDelete()}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ── Edit page shell ────────────────────────────────────────────────────────
function EditContent({ id }: { id: string }) {
  const [activeSection, setActiveSection] = useState<Section>("details");

  const { data: content, isLoading } = useQuery<ContentRead>({
    queryKey: ["content", id],
    queryFn: async () => {
      const { data } = await api.get(`/content/${id}`);
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <div className="flex gap-2 mt-6">
          {["Details", "Articles", "Media"].map((t) => (
            <Skeleton key={t} className="h-8 w-20 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-10 w-full mt-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Content not found.</p>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-block")}
        >
          ← Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 text-muted-foreground mb-1"
          )}
        >
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 flex-1 min-w-0 truncate">
            {content.title}
          </h1>
          <StatusBadge status={content.status} />
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex border rounded-xl overflow-hidden bg-white min-h-[520px] shadow-sm">
        <EditorSideNav active={activeSection} onSelect={setActiveSection} />

        <div className="flex-1 p-6 overflow-y-auto">
          {activeSection === "details"  && <DetailsTab content={content} />}
          {activeSection === "articles" && <ArticlesTab contentId={id} />}
          {activeSection === "media"    && <MediaTab contentId={id} />}
        </div>
      </div>
    </div>
  );
}

export default function EditContentPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <RoleGuard requiredRole="teacher">
      <EditContent id={params.id} />
    </RoleGuard>
  );
}
