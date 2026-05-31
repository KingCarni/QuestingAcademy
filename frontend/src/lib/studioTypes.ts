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
  "draft", "generated", "pending", "approved", "published", "rejected", "archived",
];

export const PLAYER_VISIBLE_STATUSES: StudioStatus[] = ["approved", "published"];

export interface StudioBase {
  id: string;
  status: StudioStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  origin?: "seed" | "user" | "generator";
}

// ----- Shared enums (dropdown sources) --------------------------------------

export const AVATAR_CATEGORIES = [
  "hair", "outfit", "accessory", "skin", "eyes", "hat", "cape", "back-item",
] as const;
export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number];

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

export const AFFINITIES = ["nature", "fire", "earth", "water", "air", "star"] as const;
export type Affinity = (typeof AFFINITIES)[number];

export const COMPANION_ROLES = ["offense", "defense", "support", "balanced"] as const;
export type CompanionRole = (typeof COMPANION_ROLES)[number];

export const ASSET_KINDS = [
  "egg", "badge", "icon", "sticker", "academy-room-prop", "cosmetic", "currency", "ui-decoration",
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const SCENE_PURPOSES = [
  "town-hub", "classroom", "academy-interior", "hatchery", "shop",
  "guild-hall", "quest-area", "boss-room", "cutscene",
] as const;
export type ScenePurpose = (typeof SCENE_PURPOSES)[number];

export const REALM_BUILDINGS = [
  "town-hub", "hatchery", "learning-academy", "shop", "quest-board",
  "guild-hall", "companion-habitat", "boss-gate",
] as const;
export type RealmBuilding = (typeof REALM_BUILDINGS)[number];

export const NPC_TONES = ["cheerful", "wise", "mischievous", "calm", "energetic"] as const;
export type NPCTone = (typeof NPC_TONES)[number];

export const NPC_ROLES = [
  "teacher", "guide", "shopkeeper", "quest-giver", "guardian", "rival", "caretaker",
] as const;
export type NPCRole = (typeof NPC_ROLES)[number];

export const NPC_TEMPERAMENTS = ["patient", "playful", "serious", "gentle", "quirky"] as const;
export type NPCTemperament = (typeof NPC_TEMPERAMENTS)[number];

export const NPC_TEACHING_STYLES = ["encouraging", "direct", "storytelling", "coach", "socratic"] as const;
export type NPCTeachingStyle = (typeof NPC_TEACHING_STYLES)[number];

export const NPC_HUMOR_LEVELS = ["none", "light", "silly"] as const;
export type NPCHumorLevel = (typeof NPC_HUMOR_LEVELS)[number];

export const NPC_FORMALITIES = ["casual", "balanced", "formal"] as const;
export type NPCFormality = (typeof NPC_FORMALITIES)[number];

export const NPC_ENCOURAGEMENT = ["praise", "hints", "calm-reassurance", "challenge"] as const;
export type NPCEncouragement = (typeof NPC_ENCOURAGEMENT)[number];

export const TIMES_OF_DAY = ["dawn", "morning", "midday", "afternoon", "dusk", "night", "twilight"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const SCENE_MOODS = ["cozy", "magical", "heroic", "playful", "mysterious", "serene"] as const;
export type SceneMood = (typeof SCENE_MOODS)[number];

// ----- Reusable preset entities ---------------------------------------------

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[]; // hex
  createdAt: string;
}

export interface StylePreset {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  // optional reference fields
  appliesTo?: ("art" | "battleBgs" | "scenes" | "realms" | "assets")[];
}

// ----- Per-tab item interfaces ----------------------------------------------

export interface AvatarHairFields {
  length?: "short" | "medium" | "long";
  style?: "tuft" | "braids" | "bowl" | "puff" | "spike" | "wavy" | "ponytail";
  texture?: "straight" | "wavy" | "curly" | "coily";
  color?: string;
  accessoryCompat?: string[];
}
export interface AvatarOutfitFields {
  outfitType?: "robe" | "tunic" | "uniform" | "dress" | "armor" | "casual";
  primaryColor?: string;
  secondaryColor?: string;
  theme?: string;
  trim?: string;
}
export interface AvatarAccessoryFields {
  accessoryType?: string;
  placement?: "head" | "neck" | "shoulder" | "back" | "wrist" | "ankle";
  material?: "fabric" | "metal" | "wood" | "crystal" | "feather";
  color?: string;
}

export interface StudioAvatar extends StudioBase {
  name: string;
  category: AvatarCategory;
  rarity: Rarity;
  previewColor: string;
  paletteId?: string;
  description?: string;
  // category-specific
  hair?: AvatarHairFields;
  outfit?: AvatarOutfitFields;
  accessory?: AvatarAccessoryFields;
}

export interface CompanionStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface StudioCompanion extends StudioBase {
  name: string;
  affinity: Affinity;
  rarity: Rarity;
  role: CompanionRole;
  academyAffinity: string;
  personality: string;
  lore: string;
  moves: string[];
  emoji: string;
  stats: CompanionStats;
  palette: { from: string; to: string };
  previewUrl?: string;
  promptUsed?: string;
  imageProvider?: string;
  // Shiny variant — recolor only, no stat changes.
  shinyEnabled?: boolean;
  shinyPalette?: { from: string; to: string };
}

export interface StudioEvolution extends StudioBase {
  baseCompanionId?: string;        // references StudioCompanion.id
  baseCompanionName: string;
  stageNumber: 1 | 2 | 3;
  evolutionName: string;
  lore: string;
  unlockCondition: string;
  academyInfluence: string;
  visualNotes: string;
  statGrowthNotes: string;
  // legacy: kept so old seed data still renders
  stages?: { name: string; lore: string; unlockCondition: string; visualDescription: string }[];
}

export interface StudioArt extends StudioBase {
  companionId: string;
  companionName: string;
  title?: string;
  prompt: string;
  styleNotes: string;
  stylePresetId?: string;
  previewUrl?: string;
}

// Asset category-specific
export interface AssetEggFields {
  rarity?: Rarity;
  baseColor?: string;
  accentColor?: string;
  shinyChance?: number; // 0-100
  hatchCategory?: string;
  glowEffect?: "none" | "soft" | "pulse" | "shimmer";
  companionFamily?: string;
  eventTag?: string;
}
export interface AssetBadgeFields {
  badgeType?: "achievement" | "milestone" | "event" | "rank";
  achievementCategory?: string;
  iconShape?: "circle" | "star" | "shield" | "leaf" | "heart";
  rarity?: Rarity;
}

export interface StudioAsset extends StudioBase {
  name: string;
  kind: AssetKind;
  previewColor: string;
  paletteId?: string;
  description?: string;
  egg?: AssetEggFields;
  badge?: AssetBadgeFields;
}

export interface StudioRealm extends StudioBase {
  name: string;
  biome: string;
  tone?: SceneMood;
  grades: string[];
  subjects: string[];
  enemyTypes: string[];
  habitats: string[];
  description: string;
  buildings?: RealmBuilding[];
  mapNotes?: string;
  battleBackgroundSet?: string;
  stylePresetId?: string;
}

export interface StudioBattleBg extends StudioBase {
  realmId?: string;
  realm: string;
  environment: string;
  timeOfDay?: TimeOfDay;
  mood?: SceneMood;
  prompt: string;
  stylePresetId?: string;
  previewUrl?: string;
}

export interface StudioScene extends StudioBase {
  name: string;
  purpose: ScenePurpose;
  realmId?: string;
  realm: string;
  npcIds?: string[];
  npcs: string[]; // names for legacy display
  visualPrompt: string;
  stylePresetId?: string;
}

export interface StudioNPC extends StudioBase {
  name: string;
  role: NPCRole;
  customRole?: string;
  realmId?: string;
  realm: string;
  dialogue: string;
  tone: NPCTone;
  temperament: NPCTemperament;
  teachingStyle: NPCTeachingStyle;
  humorLevel: NPCHumorLevel;
  formality: NPCFormality;
  encouragementStyle: NPCEncouragement;
  safetyNotes: string;
}

export interface StudioQuest extends StudioBase {
  title: string;
  objective: string;
  steps: string[];
  rewards: string;
  subject: string;
  npcGiverId?: string;
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
  templateId: string;
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
  palettes: ColorPalette[];
  stylePresets: StylePreset[];
}

export type StudioCollectionKey =
  | "templates" | "avatars" | "companions" | "evolutions" | "arts"
  | "assets" | "realms" | "battleBgs" | "scenes" | "npcs"
  | "quests" | "events" | "palettes" | "stylePresets";
