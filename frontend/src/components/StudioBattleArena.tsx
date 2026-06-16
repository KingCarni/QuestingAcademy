import React from "react";
import BattleArena from "./BattleArena";
import { useBattleSceneAssets, type BattleSceneAssetSelection } from "../lib/useBattleSceneAssets";

export type StudioBattleArenaProps = {
  selection?: BattleSceneAssetSelection;
};

export const StudioBattleArena: React.FC<StudioBattleArenaProps> = ({ selection }) => {
  const scene = useBattleSceneAssets(selection);
  return <BattleArena scene={scene} />;
};

export default StudioBattleArena;
