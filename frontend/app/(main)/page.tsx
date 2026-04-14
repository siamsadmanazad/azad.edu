"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, useAuthStore } from "@/lib";
import type { ContentRead, ContentStatus } from "@/lib";
import { ContentCard } from "@/components/content/ContentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Filter = ContentStatus | "all";

const PAGE_SIZE = 20;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex justify-between gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role.name === "teacher";

  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, isFetching } = useQuery<ContentRead[]>({
    queryKey: ["content", filter, limit],
    queryFn: async () => {
      const params: Record<string, string | number> = { skip: 0, limit };
      if (filter !== "all") params.status = filter;
      const { data } = await api.get("/content", { params });
      return data;
    },
  });

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" },
  ];

  const hasMore = (data?.length ?? 0) >= limit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isTeacher ? "My Content" : "Browse Content"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTeacher
              ? "Manage and publish your teaching materials"
              : "Explore published lessons and materials"}
          </p>
        </div>

        {/* Teacher-only filter bar */}
        {isTeacher && (
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setFilter(f.value);
                  setLimit(PAGE_SIZE);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  filter === f.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">No content found.</p>
          {isTeacher && (
            <p className="text-sm mt-1">
              Go to your{" "}
              <a href="/dashboard" className="underline text-primary">
                dashboard
              </a>{" "}
              to create some.
            </p>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {data.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                isTeacher={isTeacher}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Load More */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            disabled={isFetching}
          >
            {isFetching ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
