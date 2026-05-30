import React, { useMemo, useState } from "react";
import { Check, X, Send, Archive, RefreshCw } from "lucide-react";
import { StatusChip } from "./StatusChip";
import { useStudio } from "../../lib/studioStore";
import type { StudioCollectionKey, StudioStatus } from "../../lib/studioTypes";
import { cn } from "../../lib/cn";

type FilterKey = "all" | "pending" | "approved" | "published" | "rejected" | "drafts";

interface Item { id: string; status: StudioStatus; createdAt: string }

interface Props<T extends Item> {
  testId: string;
  collection: StudioCollectionKey;
  items: T[];
  // What to render inside each card (item-specific fields/preview)
  renderItem: (item: T) => React.ReactNode;
  // Optional inline editor field (e.g., notes) for an item
  emptyHint?: string;
  generator?: React.ReactNode;
  defaultFilter?: FilterKey;
}

const FILTERS: { key: FilterKey; label: string; predicate: (s: StudioStatus) => boolean }[] = [
  { key: "all",       label: "All",       predicate: () => true },
  { key: "drafts",    label: "Drafts",    predicate: (s) => s === "draft" || s === "generated" },
  { key: "pending",   label: "Pending",   predicate: (s) => s === "pending" },
  { key: "approved",  label: "Approved",  predicate: (s) => s === "approved" },
  { key: "published", label: "Published", predicate: (s) => s === "published" },
  { key: "rejected",  label: "Rejected",  predicate: (s) => s === "rejected" || s === "archived" },
];

export function StudioPanel<T extends Item>({
  testId,
  collection,
  items,
  renderItem,
  emptyHint,
  generator,
  defaultFilter = "all",
}: Props<T>) {
  const [filter, setFilter] = useState<FilterKey>(defaultFilter);
  const setStatus = useStudio((s) => s.setStatus);

  const filtered = useMemo(() => {
    const pred = FILTERS.find((f) => f.key === filter)!.predicate;
    return items.filter((i) => pred(i.status)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [items, filter]);

  return (
    <div className="space-y-5" data-testid={`studio-panel-${testId}`}>
      {generator}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count = items.filter((i) => f.predicate(i.status)).length;
            return (
              <button
                key={f.key}
                data-testid={`${testId}-filter-${f.key}`}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full border-2 text-sm font-extrabold transition-colors",
                  filter === f.key
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-ink border-white hover:border-primary/40"
                )}
              >
                {f.label}{" "}
                <span className={cn("ml-1 text-[10px]", filter === f.key ? "text-white/70" : "text-ink-muted")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
          {filtered.length} of {items.length} shown
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card bg-bg border-4 border-white p-10 text-center">
          <p className="h-display text-xl">Nothing here yet</p>
          <p className="text-ink-muted text-sm">{emptyHint ?? "Use the generator above or change the filter."}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              data-testid={`${testId}-card-${item.id}`}
              className="rounded-2xl bg-white border-4 border-white shadow-lg shadow-indigo-900/5 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <StatusChip status={item.status} />
                <span className="text-[10px] font-extrabold uppercase text-ink-muted">
                  {item.id.slice(-6)}
                </span>
              </div>
              <div className="flex-1">{renderItem(item)}</div>

              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t-2 border-white">
                <ActionBtn
                  testid={`${testId}-approve-${item.id}`}
                  disabled={item.status === "approved"}
                  onClick={() => setStatus(collection, item.id, "approved")}
                  className="bg-sage text-white"
                  icon={<Check size={14} strokeWidth={3} />}
                  label="Approve"
                />
                <ActionBtn
                  testid={`${testId}-publish-${item.id}`}
                  disabled={item.status === "published"}
                  onClick={() => setStatus(collection, item.id, "published")}
                  className="bg-primary text-white"
                  icon={<Send size={14} strokeWidth={3} />}
                  label="Publish"
                />
                <ActionBtn
                  testid={`${testId}-reject-${item.id}`}
                  disabled={item.status === "rejected"}
                  onClick={() => setStatus(collection, item.id, "rejected")}
                  className="bg-white text-danger border-2 border-danger/40"
                  icon={<X size={14} strokeWidth={3} />}
                  label="Reject"
                />
                <ActionBtn
                  testid={`${testId}-archive-${item.id}`}
                  disabled={item.status === "archived"}
                  onClick={() => setStatus(collection, item.id, "archived")}
                  className="bg-white text-ink-muted border-2 border-ink-muted/30"
                  icon={<Archive size={14} strokeWidth={3} />}
                  label="Archive"
                />
                <ActionBtn
                  testid={`${testId}-resend-${item.id}`}
                  disabled={item.status === "pending"}
                  onClick={() => setStatus(collection, item.id, "pending")}
                  className="bg-white text-ink-muted border-2 border-ink-muted/30 col-span-2"
                  icon={<RefreshCw size={14} strokeWidth={3} />}
                  label="Send to review"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ActionBtn: React.FC<{
  testid: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}> = ({ testid, onClick, disabled, icon, label, className }) => (
  <button
    data-testid={testid}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center gap-1 text-xs font-extrabold rounded-full py-2 px-3 transition",
      "disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 active:translate-y-px",
      className
    )}
  >
    {icon} {label}
  </button>
);
