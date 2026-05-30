import React from "react";
import { cn } from "../lib/cn";
import type { AvatarConfig } from "../lib/types";

interface Props {
  config: AvatarConfig;
  size?: number;
  className?: string;
  animate?: boolean;
}

// Pure CSS/SVG chibi avatar — no external art.
export const ChibiAvatar: React.FC<Props> = ({ config, size = 140, className, animate }) => {
  const s = size;
  return (
    <div
      className={cn("relative inline-block", animate && "animate-bounceSoft", className)}
      style={{ width: s, height: s }}
      aria-label="Player avatar"
    >
      <svg viewBox="0 0 200 200" width={s} height={s}>
        {/* Soft halo */}
        <circle cx="100" cy="110" r="92" fill={config.outfit} opacity="0.12" />
        {/* Body / outfit */}
        <ellipse cx="100" cy="170" rx="62" ry="34" fill={config.outfit} />
        <ellipse cx="100" cy="160" rx="56" ry="28" fill={config.outfit} />
        {/* Neck shadow */}
        <ellipse cx="100" cy="138" rx="22" ry="6" fill="rgba(0,0,0,0.08)" />
        {/* Head */}
        <circle cx="100" cy="100" r="58" fill={config.skin} />
        {/* Hair */}
        {config.hair === "tuft" && (
          <path d="M58 88 Q90 38 142 86 Q140 64 110 56 Q70 56 58 88 Z" fill={config.hairColor} />
        )}
        {config.hair === "braids" && (
          <>
            <path d="M58 92 Q90 40 142 90 Q145 70 110 60 Q70 60 58 92 Z" fill={config.hairColor} />
            <ellipse cx="42" cy="118" rx="10" ry="18" fill={config.hairColor} />
            <ellipse cx="158" cy="118" rx="10" ry="18" fill={config.hairColor} />
          </>
        )}
        {config.hair === "bowl" && (
          <path d="M50 100 Q100 30 150 100 L150 92 Q100 50 50 92 Z" fill={config.hairColor} />
        )}
        {config.hair === "puff" && (
          <>
            <circle cx="100" cy="58" r="36" fill={config.hairColor} />
            <circle cx="72" cy="74" r="22" fill={config.hairColor} />
            <circle cx="128" cy="74" r="22" fill={config.hairColor} />
          </>
        )}
        {config.hair === "spike" && (
          <path
            d="M52 92 L70 50 L82 86 L96 46 L112 86 L126 50 L144 88 Q100 56 52 92 Z"
            fill={config.hairColor}
          />
        )}
        {/* Cheeks */}
        <circle cx="74" cy="118" r="8" fill="#FFB7B7" opacity="0.7" />
        <circle cx="126" cy="118" r="8" fill="#FFB7B7" opacity="0.7" />
        {/* Eyes */}
        <ellipse cx="82" cy="104" rx="6.5" ry="9" fill="#2A2A2A" />
        <ellipse cx="118" cy="104" rx="6.5" ry="9" fill="#2A2A2A" />
        <circle cx="84" cy="100" r="2.2" fill="#fff" />
        <circle cx="120" cy="100" r="2.2" fill="#fff" />
        {/* Smile */}
        <path d="M88 128 Q100 138 112 128" stroke="#2A2A2A" strokeWidth="3.5" strokeLinecap="round" fill="none" />

        {/* Accessory */}
        {config.accessory === "glasses" && (
          <g stroke="#2A2A2A" strokeWidth="3" fill="none">
            <circle cx="82" cy="106" r="12" />
            <circle cx="118" cy="106" r="12" />
            <line x1="94" y1="106" x2="106" y2="106" />
          </g>
        )}
        {config.accessory === "crown" && (
          <path d="M64 64 L78 44 L92 60 L110 40 L122 60 L138 46 L150 66 L62 66 Z" fill="#F4C753" stroke="#B5891F" strokeWidth="2" />
        )}
        {config.accessory === "headband" && (
          <rect x="54" y="80" width="92" height="10" rx="5" fill="#FF7B7B" />
        )}
        {config.accessory === "wizard-hat" && (
          <g>
            <path d="M64 64 L100 8 L136 64 Z" fill="#9D8DF1" />
            <rect x="58" y="60" width="84" height="12" rx="6" fill="#7A6AC6" />
            <circle cx="100" cy="22" r="4" fill="#F4C753" />
          </g>
        )}
      </svg>
    </div>
  );
};
