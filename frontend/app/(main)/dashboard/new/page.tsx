"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NewContentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post("/content", { title, description: description || undefined }),
    onSuccess: ({ data }) => router.push(`/dashboard/${data.id}`),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Failed to create content.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    mutate();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-xl"
    >
      <div className="mb-6">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-2 -ml-2 text-muted-foreground"
          )}
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Give it a title to get started. You can add articles and media after.
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Content details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="title">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                placeholder="e.g. Introduction to Algebra"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Brief overview of what this content covers…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isPending || !title.trim()}>
                {isPending ? "Creating…" : "Create & continue"}
              </Button>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function NewContentPage() {
  return (
    <RoleGuard requiredRole="teacher">
      <NewContentForm />
    </RoleGuard>
  );
}
