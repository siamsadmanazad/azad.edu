"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ArticleRead, HighlightRead } from "@/lib/types";

// Split body text around highlight occurrences
function buildSegments(body: string, highlights: HighlightRead[]) {
  type Segment = { text: string; highlight?: HighlightRead };
  let segments: Segment[] = [{ text: body }];

  for (const h of highlights) {
    if (!h.display_text) continue;
    const next: Segment[] = [];
    for (const seg of segments) {
      if (seg.highlight) { next.push(seg); continue; }
      const parts = seg.text.split(h.display_text);
      parts.forEach((part, i) => {
        if (part) next.push({ text: part });
        if (i < parts.length - 1) next.push({ text: h.display_text, highlight: h });
      });
    }
    segments = next;
  }
  return segments;
}

function PopupModal({
  highlight,
  onClose,
}: {
  highlight: HighlightRead;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900">
            {highlight.display_text}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none mt-0.5"
          >
            ✕
          </button>
        </div>
        {highlight.popup ? (
          <p className="text-slate-700 leading-relaxed text-sm">
            {highlight.popup.text}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            No explanation added yet.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

export function ArticleRenderer({ article }: { article: ArticleRead }) {
  const [activeHighlight, setActiveHighlight] = useState<HighlightRead | null>(null);
  const segments = buildSegments(article.body, article.highlights ?? []);

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">{article.title}</h2>
        <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">
          {segments.map((seg, i) =>
            seg.highlight ? (
              <mark
                key={i}
                onClick={() => setActiveHighlight(seg.highlight!)}
                className="bg-transparent text-indigo-600 underline underline-offset-2 decoration-indigo-400 cursor-pointer hover:text-indigo-800 transition-colors not-italic font-medium"
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </p>
      </div>

      <AnimatePresence>
        {activeHighlight && (
          <PopupModal
            highlight={activeHighlight}
            onClose={() => setActiveHighlight(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
