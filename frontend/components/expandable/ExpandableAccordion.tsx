"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExpandableRead } from "@/lib/types";

function ExpandableItem({ section }: { section: ExpandableRead }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-indigo-600 hover:bg-indigo-700 transition-colors text-white"
      >
        <span className="font-medium text-sm">{section.title}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/80 text-xs ml-2 flex-shrink-0"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white">
              {section.body}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExpandableAccordion({ sections }: { sections: ExpandableRead[] }) {
  const visible = sections
    .filter((s) => s.is_visible)
    .sort((a, b) => a.order - b.order);

  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Expandable Content
      </h2>
      <div className="space-y-2">
        {visible.map((section) => (
          <ExpandableItem key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
