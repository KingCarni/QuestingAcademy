import React from "react";
import { useGame } from "../lib/gameStore";
import { Navigate } from "react-router-dom";

// Gate routes that require a player.
export const RequirePlayer: React.FC<{ children: React.ReactNode; requireStarter?: boolean }> = ({
  children,
  requireStarter,
}) => {
  const player = useGame((s) => s.player);
  if (!player) return <Navigate to="/onboarding" replace />;
  if (!player.avatar.name) return <Navigate to="/character" replace />;
  if (requireStarter && !player.starterCompanionId) return <Navigate to="/starter" replace />;
  return <>{children}</>;
};
