"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib";
import type { ContentRead } from "@/lib/types";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { StatusBadge } from "@/components/content/StatusBadge";
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

// ── Delete button with its own confirmation dialog ─────────────────────────
function DeleteButton({
  contentId,
  title,
}: {
  contentId: string;
  title: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { mutate: doDelete, isPending } = useMutation({
    mutationFn: () => api.delete(`/content/${contentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      setOpen(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
            &ldquo;{title}&rdquo; will be permanently deleted. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => doDelete()}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Publish / Unpublish toggle ─────────────────────────────────────────────
function PublishToggle({ content }: { content: ContentRead }) {
  const queryClient = useQueryClient();
  const isPublished = content.status === "published";

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post(`/content/${content.id}/${isPublished ? "unpublish" : "publish"}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["content"] }),
  });

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending || content.status === "archived"}
      onClick={() => mutate()}
    >
      {isPending
        ? "…"
        : isPublished
        ? "Unpublish"
        : "Publish"}
    </Button>
  );
}

// ── Content row ────────────────────────────────────────────────────────────
function ContentRow({ content }: { content: ContentRead }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
    >
      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">{content.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(content.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Status */}
      <StatusBadge status={content.status} />

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Link
          href={`/dashboard/${content.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Edit
        </Link>
        <PublishToggle content={content} />
        <DeleteButton contentId={content.id} title={content.title} />
      </div>
    </motion.div>
  );
}

// ── Dashboard page ─────────────────────────────────────────────────────────
function DashboardContent() {
  const { data, isLoading } = useQuery<ContentRead[]>({
    queryKey: ["content"],
    queryFn: async () => {
      const { data } = await api.get("/content", {
        params: { skip: 0, limit: 100 },
      });
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your content
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className={cn(buttonVariants())}
        >
          + New Content
        </Link>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border"
            >
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-12 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="text-center py-24 space-y-3">
          <p className="text-slate-500">No content yet.</p>
          <Link
            href="/dashboard/new"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Create your first content
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <ContentRow key={c.id} content={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RoleGuard requiredRole="teacher">
      <DashboardContent />
    </RoleGuard>
  );
}
