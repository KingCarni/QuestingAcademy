import React from "react";
import { cn } from "../lib/cn";
import type { Companion } from "../lib/types";

interface Props {
  companion: Companion;
  size?: number;
  locked?: boolean;
  animate?: boolean;
  className?: string;
}

export const CompanionAvatar: React.FC<Props> = ({
  companion,
  size = 120,
  locked,
  animate,
  className,
}) => {
  return (
    <div
      data-testid={`companion-avatar-${companion.id}`}
      className={cn(
        "relative grid place-items-center rounded-full",
        companion.palette.bg,
        "border-[6px]",
        companion.palette.ring,
        animate && "animate-floaty",
        className
      )}
      style={{
        width: size,
        height: size,
        boxShadow: `0 10px 0 ${companion.palette.glow}55, inset 0 -8px 12px rgba(0,0,0,0.05)`,
      }}
    >
      <div
        className="absolute inset-2 rounded-full bg-white/50"
        style={{ filter: "blur(0.5px)" }}
      />
      <span
        className="relative z-10 select-none"
        style={{ fontSize: size * 0.5, lineHeight: 1, filter: locked ? "grayscale(1) brightness(1.3)" : "none" }}
        aria-hidden
      >
        {locked ? "❔" : companion.emoji}
      </span>
      {/* Cute eyes */}
      {!locked && (
        <svg className="absolute" width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100" style={{ top: size * 0.18 }}>
          <circle cx="38" cy="50" r="5" fill="#2A2A2A" />
          <circle cx="62" cy="50" r="5" fill="#2A2A2A" />
          <circle cx="40" cy="48" r="1.6" fill="#fff" />
          <circle cx="64" cy="48" r="1.6" fill="#fff" />
        </svg>
      )}
    </div>
  );
};
