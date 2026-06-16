import { useMemo } from "react";
import type { BattleBackgroundAsset, BattleCompanionAsset, BattleSceneConfig } from "../components/BattleArena";
import { useStudio } from "./studioStore";

const STUDIO_BACKEND_ORIGIN = "http://localhost:5050";

const normalizeBattleAssetUrl = (url?: string): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/api/studio/image")) return `${STUDIO_BACKEND_ORIGIN}${trimmed}`;
  if (trimmed.startsWith("api/studio/image")) return `${STUDIO_BACKEND_ORIGIN}/${trimmed}`;
  if (trimmed.startsWith("/studio/image")) return `${STUDIO_BACKEND_ORIGIN}/api${trimmed}`;
  if (trimmed.startsWith("studio/image")) return `${STUDIO_BACKEND_ORIGIN}/api/${trimmed}`;
  if (trimmed.startsWith("/image?")) return `${STUDIO_BACKEND_ORIGIN}/api/studio${trimmed}`;
  if (trimmed.startsWith("image?")) return `${STUDIO_BACKEND_ORIGIN}/api/studio/${trimmed}`;
  return trimmed;
};

const isRuntimeVisible = (item: any): boolean => item?.status === "approved" || item?.status === "published";

const getImageUrl = (item?: any, preferTransparent = false): string => {
  if (!item) return "";
  const url =
    (preferTransparent ? item.transparentPreviewUrl || item.transparentUrl : "") ||
    item.battleAssetUrl ||
    item.battleSpriteUrl ||
    item.previewUrl ||
    item.imageUrl ||
    item.generatedImageUrl ||
    item.url ||
    item.backgroundUrl ||
    item.manualComposition?.previewCompositeUrl ||
    item.manualComposition?.backgroundUrl ||
    "";
  return normalizeBattleAssetUrl(url);
};

const affinityEmoji = (affinity?: string): string => {
  const key = String(affinity || "").toLowerCase();
  if (key === "fire") return "🔥";
  if (key === "water") return "🫧";
  if (key === "earth") return "🪨";
  if (key === "air") return "🌬️";
  if (key === "star") return "✨";
  if (key === "nature") return "🌱";
  return "🐾";
};

const toBattleCompanionAsset = (item: any, fallback: BattleCompanionAsset): BattleCompanionAsset => {
  if (!item) return fallback;
  return {
    id: item.id || fallback.id,
    name: item.name || fallback.name,
    affinity: item.affinity || fallback.affinity,
    hp: Number(item.battleHp ?? item.stats?.hp ?? fallback.hp),
    maxHp: Number(item.battleMaxHp ?? item.stats?.hp ?? fallback.maxHp),
    imageUrl: getImageUrl(item, true) || getImageUrl(item, false) || fallback.imageUrl,
    iconUrl: normalizeBattleAssetUrl(item.iconAssetUrl || item.iconUrl || "") || fallback.iconUrl,
    fallbackEmoji: item.emoji || affinityEmoji(item.affinity) || fallback.fallbackEmoji,
  };
};

const toBattleBackgroundAsset = (item: any, fallback: BattleBackgroundAsset): BattleBackgroundAsset => {
  if (!item) return fallback;
  return {
    id: item.id || fallback.id,
    name: item.realm || item.name || item.environment || fallback.name,
    imageUrl: getImageUrl(item, false) || fallback.imageUrl,
  };
};

export type BattleSceneAssetSelection = {
  backgroundId?: string;
  playerCompanionId?: string;
  enemyCompanionId?: string;
};

export const useBattleSceneAssets = (selection: BattleSceneAssetSelection = {}): BattleSceneConfig => {
  const companions = useStudio((s) => s.companions);
  const battleBgs = useStudio((s) => s.battleBgs);
  const scenes = useStudio((s) => s.scenes);

  return useMemo(() => {
    const runtimeCompanions = companions.filter(isRuntimeVisible);
    const runtimeBackgrounds = [...battleBgs, ...scenes].filter(isRuntimeVisible);

    const playerSource = runtimeCompanions.find((item: any) => item.id === selection.playerCompanionId) || runtimeCompanions[0];
    const enemySource = runtimeCompanions.find((item: any) => item.id === selection.enemyCompanionId) || runtimeCompanions.find((item: any) => item.id !== playerSource?.id) || runtimeCompanions[1] || runtimeCompanions[0];
    const backgroundSource = runtimeBackgrounds.find((item: any) => item.id === selection.backgroundId) || runtimeBackgrounds[0];

    const fallbackBackground: BattleBackgroundAsset = {
      id: "fallback-academy-bg",
      name: "Questing Academy Training Field",
      imageUrl: "/assets/battle-backgrounds/winter-village.png",
    };

    const fallbackPlayer: BattleCompanionAsset = {
      id: "fallback-player-companion",
      name: "Player Companion",
      affinity: "fire",
      hp: 80,
      maxHp: 80,
      imageUrl: "/assets/companions/embercub.png",
      fallbackEmoji: "🔥",
    };

    const fallbackEnemy: BattleCompanionAsset = {
      id: "fallback-enemy-companion",
      name: "Training Companion",
      affinity: "nature",
      hp: 60,
      maxHp: 60,
      imageUrl: "/assets/companions/slumbug.png",
      fallbackEmoji: "🐾",
    };

    return {
      id: "studio-runtime-battle",
      background: toBattleBackgroundAsset(backgroundSource, fallbackBackground),
      player: toBattleCompanionAsset(playerSource, fallbackPlayer),
      enemy: toBattleCompanionAsset(enemySource, fallbackEnemy),
    };
  }, [battleBgs, companions, scenes, selection.backgroundId, selection.enemyCompanionId, selection.playerCompanionId]);
};
