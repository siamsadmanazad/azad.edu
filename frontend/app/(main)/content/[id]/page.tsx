"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib";
import type { ContentFullView } from "@/lib/types";
import { StatusBadge } from "@/components/content/StatusBadge";
import { MediaGallery } from "@/components/media/MediaGallery";
import { ArticleRenderer } from "@/components/article/ArticleRenderer";
import { ExpandableAccordion } from "@/components/expandable/ExpandableAccordion";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-36 w-48 rounded-lg flex-shrink-0" />
        <Skeleton className="h-36 w-64 rounded-lg flex-shrink-0" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function ContentViewPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, isLoading, isError } = useQuery<ContentFullView>({
    queryKey: ["content", params.id, "view"],
    queryFn: async () => {
      const { data } = await api.get(`/content/${params.id}/view`);
      return data;
    },
  });

  if (isLoading) return <PageSkeleton />;

  if (isError || !data) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-lg font-medium text-slate-800">Content not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been unpublished or deleted.
        </p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          ← Back to feed
        </Link>
      </div>
    );
  }

  const articles = [...(data.articles ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-slate-900 transition-colors"
        >
          ← Back
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-slate-900 flex-1">
            {data.title}
          </h1>
          <StatusBadge status={data.status} />
        </div>
        {data.description && (
          <p className="text-slate-500 text-base">{data.description}</p>
        )}
      </div>

      {/* Media Gallery */}
      <MediaGallery media={data.media ?? []} />

      {/* Articles + Expandables */}
      <div className="space-y-12">
        {articles.map((article) => {
          const hasSections = (article.expandable_sections ?? []).length > 0;
          return (
            <div
              key={article.id}
              className={
                hasSections
                  ? "grid grid-cols-1 lg:grid-cols-3 gap-8"
                  : "max-w-2xl"
              }
            >
              {/* Article body */}
              <div className={hasSections ? "lg:col-span-2" : ""}>
                <ArticleRenderer article={article} />
              </div>

              {/* Expandable sidebar */}
              {hasSections && (
                <div className="lg:col-span-1">
                  <ExpandableAccordion
                    sections={article.expandable_sections ?? []}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!articles.length && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No articles in this content yet.
        </p>
      )}
    </div>
  );
}
