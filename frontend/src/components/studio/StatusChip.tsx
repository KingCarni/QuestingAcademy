import React from "react";
import { cn } from "../../lib/cn";
import type { StudioStatus } from "../../lib/studioTypes";

const META: Record<StudioStatus, { label: string; cls: string; emoji: string }> = {
  draft:     { label: "Draft",          emoji: "✏️", cls: "bg-[#EEEEEE] text-ink border-[#D4D4D4]" },
  generated: { label: "Generated",      emoji: "🤖", cls: "bg-[#EEF2FB] text-[#3E4A78] border-[#B6C0E5]" },
  pending:   { label: "Pending Review", emoji: "🕓", cls: "bg-[#FFF3D6] text-[#8A6620] border-[#F4C753]" },
  approved:  { label: "Approved",       emoji: "✅", cls: "bg-[#E8F4E1] text-[#3F6B45] border-[#86A789]" },
  published: { label: "Published",      emoji: "🌟", cls: "bg-[#E8E1FA] text-[#3F2A6B] border-[#9D8DF1]" },
  rejected:  { label: "Rejected",       emoji: "🛑", cls: "bg-[#FFE0E0] text-[#8A2424] border-[#FF7B7B]" },
  archived:  { label: "Archived",       emoji: "📦", cls: "bg-[#FBF6EA] text-ink-muted border-[#D4A373]" },
};

interface Props {
  status: StudioStatus;
  className?: string;
  size?: "sm" | "md";
}

export const StatusChip: React.FC<Props> = ({ status, className, size = "sm" }) => {
  const m = META[status];
  return (
    <span
      data-testid={`status-chip-${status}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-2 font-extrabold tracking-wider uppercase",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        m.cls,
        className
      )}
    >
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </span>
  );
};
