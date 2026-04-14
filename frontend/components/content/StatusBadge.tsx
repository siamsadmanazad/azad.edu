import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/types";

const config: Record<ContentStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100",
  },
  published: {
    label: "Published",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  archived: {
    label: "Archived",
    className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
