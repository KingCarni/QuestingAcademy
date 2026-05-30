// Content Studio domain types.
// All content created/generated inside the studio flows through a status pipeline
// before it reaches player-facing screens.

export type StudioStatus =
  | "draft"
  | "generated"
  | "pending"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export const STUDIO_STATUSES: StudioStatus[] = [
  "draft",
  "generated",
  "pending",
  "approved",
  "published",
  "rejected",
  "archived",
];

// Statuses considered "live" for player-facing surfaces.
export const PLAYER_VISIBLE_STATUSES: StudioStatus[] = ["approved", "published"];

export interface StudioBase {
  id: string;
  status: StudioStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  origin?: "seed" | "user" | "generator";
}

// --- Per-tab item interfaces ------------------------------------------------

export interface StudioAvatar extends StudioBase {
  name: string;
  category: "hair" | "outfit" | "accessory" | "skin";
  rarity: "common" | "rare" | "epic" | "legendary";
  ageRange: string;
  previewColor: string;
  description?: string;
}

export interface StudioCompanion extends StudioBase {
  name: string;
  affinity: "nature" | "fire" | "earth" | "water" | "air" | "star";
  rarity: "common" | "rare" | "epic" | "legendary";
  personality: string;
  lore: string;
  academyAffinity: string;
  moves: string[];
  emoji: string;
  palette: { from: string; to: string };
}

export interface StudioEvolution extends StudioBase {
  baseCompanionName: string;
  stages: {
    name: string;
    lore: string;
    unlockCondition: string;
    visualDescription: string;
  }[];
  academyInfluence: string;
}

export interface StudioArt extends StudioBase {
  companionId: string;
  companionName: string;
  prompt: string;
  styleNotes: string;
  previewUrl?: string;
}

export interface StudioAsset extends StudioBase {
  name: string;
  kind: "icon" | "badge" | "academy-room" | "egg" | "cosmetic" | "sticker";
  previewColor: string;
  description?: string;
}

export interface StudioRealm extends StudioBase {
  name: string;
  biome: string;
  grades: string[];
  subjects: string[];
  enemyTypes: string[];
  habitats: string[];
  description: string;
}

export interface StudioBattleBg extends StudioBase {
  realm: string;
  environment: string;
  prompt: string;
  previewUrl?: string;
}

export interface StudioScene extends StudioBase {
  name: string;
  purpose: string;
  realm: string;
  npcs: string[];
  visualPrompt: string;
}

export interface StudioNPC extends StudioBase {
  name: string;
  role: string;
  realm: string;
  dialogue: string;
  safetyNotes: string;
}

export interface StudioQuest extends StudioBase {
  title: string;
  objective: string;
  steps: string[];
  rewards: string;
  subject: string;
  npcGiver: string;
}

export interface StudioEvent extends StudioBase {
  name: string;
  startDate: string;
  endDate: string;
  rewardType: string;
  special: string;
  community: string;
}

export interface StudioTemplateMeta extends StudioBase {
  templateId: string; // matches questionEngine ALL_TEMPLATES[].id
}

export interface StudioState {
  templates: StudioTemplateMeta[];
  avatars: StudioAvatar[];
  companions: StudioCompanion[];
  evolutions: StudioEvolution[];
  arts: StudioArt[];
  assets: StudioAsset[];
  realms: StudioRealm[];
  battleBgs: StudioBattleBg[];
  scenes: StudioScene[];
  npcs: StudioNPC[];
  quests: StudioQuest[];
  events: StudioEvent[];
}

export type StudioCollectionKey = keyof StudioState;
