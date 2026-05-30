import React, { useState } from "react";
import { cn } from "../lib/cn";
import type { Companion } from "../lib/types";

interface Props {
  companion: Companion;
  size?: number;
  locked?: boolean;
  animate?: boolean;
  className?: string;
  // When true, applies a richer "hatched reveal" treatment (glow ring, sparkles).
  reveal?: boolean;
}

export const CompanionAvatar: React.FC<Props> = ({
  companion,
  size = 120,
  locked,
  animate,
  className,
  reveal,
}) => {
  // If a real illustration URL is provided AND it loads, we use it. Otherwise the
  // CSS+emoji fallback renders. Either way the API surface is identical.
  // TODO(art-pipeline): point illustrationUrl at the AI Companion Art Pipeline CDN.
  const [imgOk, setImgOk] = useState(true);
  const useImage = !!companion.illustrationUrl && imgOk && !locked;

  return (
    <div
      data-testid={`companion-avatar-${companion.id}`}
      className={cn(
        "relative grid place-items-center rounded-full",
        companion.palette.bg,
        "border-[6px]",
        companion.palette.ring,
        animate && "animate-floaty",
        reveal && "animate-popIn",
        className
      )}
      style={{
        width: size,
        height: size,
        boxShadow: reveal
          ? `0 0 0 8px ${companion.palette.glow}33, 0 14px 0 ${companion.palette.glow}77, inset 0 -8px 12px rgba(0,0,0,0.05)`
          : `0 10px 0 ${companion.palette.glow}55, inset 0 -8px 12px rgba(0,0,0,0.05)`,
      }}
    >
      {/* Reveal: sparkle ring */}
      {reveal && (
        <div
          className="absolute -inset-3 rounded-full pointer-events-none"
          style={{
            background:
              `radial-gradient(closest-side, ${companion.palette.glow}22 0%, transparent 70%)`,
            animation: "pulseGlow 2s ease-out infinite",
          }}
          aria-hidden
        />
      )}

      <div
        className="absolute inset-2 rounded-full bg-white/50"
        style={{ filter: "blur(0.5px)" }}
      />

      {useImage ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={companion.illustrationUrl}
          alt={companion.name}
          onError={() => setImgOk(false)}
          className="relative z-10 rounded-full object-cover"
          style={{ width: size * 0.86, height: size * 0.86 }}
        />
      ) : (
        <span
          className="relative z-10 select-none"
          style={{
            fontSize: size * 0.5,
            lineHeight: 1,
            filter: locked ? "grayscale(1) brightness(1.3)" : "none",
          }}
          aria-hidden
        >
          {locked ? "❔" : companion.emoji}
        </span>
      )}

      {/* Cute eyes (only on emoji fallback) */}
      {!locked && !useImage && (
        <svg
          className="absolute"
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 100 100"
          style={{ top: size * 0.18 }}
        >
          <circle cx="38" cy="50" r="5" fill="#2A2A2A" />
          <circle cx="62" cy="50" r="5" fill="#2A2A2A" />
          <circle cx="40" cy="48" r="1.6" fill="#fff" />
          <circle cx="64" cy="48" r="1.6" fill="#fff" />
        </svg>
      )}

      {/* Reveal sparkles */}
      {reveal && (
        <>
          <span className="absolute -top-2 -right-1 text-2xl animate-bounceSoft" aria-hidden>✨</span>
          <span className="absolute -bottom-1 -left-2 text-xl animate-bounceSoft" aria-hidden style={{ animationDelay: "0.4s" }}>⭐</span>
        </>
      )}
    </div>
  );
};
