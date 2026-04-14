import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import type { ContentRead } from "@/lib/types";

export const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface ContentCardProps {
  content: ContentRead;
  isTeacher: boolean;
}

export function ContentCard({ content, isTeacher }: ContentCardProps) {
  return (
    <motion.div variants={cardVariant}>
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug line-clamp-2">
              {content.title}
            </CardTitle>
            <StatusBadge status={content.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 gap-4">
          {content.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {content.description}
            </p>
          )}
          <div className="mt-auto flex gap-2">
            <Link
              href={`/content/${content.id}`}
              className={cn(buttonVariants({ size: "sm" }), "flex-1 justify-center")}
            >
              Read
            </Link>
            {isTeacher && (
              <Link
                href={`/dashboard/${content.id}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "flex-1 justify-center")}
              >
                Edit
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
