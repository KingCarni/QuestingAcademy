import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useGame } from "../lib/gameStore";
import { ChibiAvatar } from "./ChibiAvatar";
import { Coins, Sparkles, ArrowLeft, Home, Volume2, VolumeX } from "lucide-react";

interface Props {
  back?: string;
  title?: string;
  rightSlot?: React.ReactNode;
}

export const TopBar: React.FC<Props> = ({ back, title, rightSlot }) => {
  const player = useGame((s) => s.player);
  const soundOn = useGame((s) => s.settings.soundOn);
  const setSoundOn = useGame((s) => s.setSoundOn);
  const loc = useLocation();
  const isHub = loc.pathname === "/hub" || loc.pathname === "/adventure";

  return (
    <header className="sticky top-0 z-30 px-4 md:px-8 pt-4">
      <div className="card-base flex items-center gap-4 px-4 py-3 md:px-6">
        {back ? (
          <Link
            data-testid="topbar-back-btn"
            to={back}
            className="btn-ghost !py-2 !px-4 !text-base"
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={3} /> Back
          </Link>
        ) : !isHub ? (
          <Link
            data-testid="topbar-home-btn"
            to="/adventure"
            className="btn-ghost !py-2 !px-4 !text-base"
            aria-label="Home"
          >
            <Home size={20} strokeWidth={3} /> Hub
          </Link>
        ) : null}

        <div className="flex items-center gap-3 min-w-0">
          {player && (
            <div className="hidden md:block">
              <ChibiAvatar config={player.avatar} size={52} />
            </div>
          )}
          <div className="min-w-0">
            <p className="h-display text-xl md:text-2xl truncate">
              {title ?? (player?.name ? `Hi, ${player.name}!` : "Edu-Mates")}
            </p>
            {player && (
              <p className="text-xs md:text-sm font-bold text-ink-muted">
                Grade {player.grade} · Level {player.level}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {player && (
            <>
              <div data-testid="topbar-xp" className="chip">
                <Sparkles size={16} strokeWidth={3} className="text-primary" /> {player.xp}/{player.xpToNext} XP
              </div>
              <div data-testid="topbar-coins" className="chip">
                <Coins size={16} strokeWidth={3} className="text-gold" /> {player.coins}
              </div>
            </>
          )}
          <button
            data-testid="topbar-sound-toggle"
            onClick={() => setSoundOn(!soundOn)}
            aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
            title={soundOn ? "Sound on" : "Sound off"}
            className="w-9 h-9 rounded-full grid place-items-center bg-white/80 border-2 border-white hover:bg-white"
          >
            {soundOn ? <Volume2 size={16} strokeWidth={3} /> : <VolumeX size={16} strokeWidth={3} className="text-ink-muted" />}
          </button>
          {rightSlot}
        </div>
      </div>
    </header>
  );
};
