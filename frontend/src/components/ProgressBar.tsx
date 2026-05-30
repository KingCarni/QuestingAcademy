import React from "react";
import { cn } from "../lib/cn";

interface Props {
  value: number;
  max: number;
  className?: string;
  color?: "primary" | "sage" | "gold" | "fire" | "egg";
  showLabel?: boolean;
  label?: string;
  testid?: string;
}

const COLORS: Record<NonNullable<Props["color"]>, string> = {
  primary: "from-primary to-[#C4B6FF]",
  sage: "from-sage to-[#B5DCB8]",
  gold: "from-gold to-[#FFE39A]",
  fire: "from-fire to-[#FFD0B5]",
  egg: "from-[#9D8DF1] to-[#F4C753]",
};

export const ProgressBar: React.FC<Props> = ({
  value,
  max,
  className,
  color = "primary",
  showLabel,
  label,
  testid,
}) => {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={cn("w-full", className)} data-testid={testid}>
      {showLabel && (
        <div className="flex justify-between mb-1 text-xs font-extrabold uppercase tracking-wider text-ink-muted">
          <span>{label}</span>
          <span>
            {Math.round(value)} / {max}
          </span>
        </div>
      )}
      <div className="h-5 w-full bg-[#F2EEE3] rounded-full overflow-hidden border-2 border-white shadow-inner">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", COLORS[color])}
          style={{ width: pct + "%" }}
        />
      </div>
    </div>
  );
};
