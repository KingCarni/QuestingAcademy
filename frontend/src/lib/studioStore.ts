import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  StudioState,
  StudioCollectionKey,
  StudioStatus,
  StudioTemplateMeta,
  StudioAvatar,
  StudioCompanion,
  StudioEvolution,
  StudioArt,
  StudioAsset,
  StudioRealm,
  StudioBattleBg,
  StudioScene,
  StudioNPC,
  StudioQuest,
  StudioEvent,
  ColorPalette,
  StylePreset,
} from "./studioTypes";
import { PLAYER_VISIBLE_STATUSES } from "./studioTypes";
import { mockNanoBananaGenerateImage, nowISO, seedTemplateMeta } from "./mockGen";

// TODO(backend): Replace localStorage persistence with an authenticated /api/studio/* surface.

interface StudioStore extends StudioState {
  setStatus: (collection: StudioCollectionKey, id: string, status: StudioStatus) => void;
  addItem: <K extends StudioCollectionKey>(collection: K, item: StudioState[K][number]) => void;
  removeItem: (collection: StudioCollectionKey, id: string) => void;
  updateItem: <K extends StudioCollectionKey>(
    collection: K,
    id: string,
    patch: Partial<StudioState[K][number]>
  ) => void;
  bulkSetStatus: (collection: StudioCollectionKey, ids: string[], status: StudioStatus) => void;
  resetStudio: () => void;

  // Presets
  addPalette: (palette: ColorPalette) => void;
  removePalette: (id: string) => void;
  addStylePreset: (preset: StylePreset) => void;
  removeStylePreset: (id: string) => void;

  // Selectors
  isTemplatePlayerReady: (templateId: string) => boolean;
}

// --- seed data --------------------------------------------------------------
const T = nowISO();
const seedBase = { createdAt: T, updatedAt: T, origin: "seed" as const };

const SEED_PALETTES: ColorPalette[] = [
  { id: "pal-lavender", name: "Lavender Academy", colors: ["#9D8DF1", "#D8D2FA", "#F4C753", "#FDFBF7"], createdAt: T },
  { id: "pal-meadow",   name: "Meadow Bright",    colors: ["#86A789", "#CDE0CF", "#F4C753", "#FBF6EA"], createdAt: T },
  { id: "pal-tide",     name: "Tide Pool",        colors: ["#7BB7D6", "#DCEEF7", "#F4C753", "#FFFFFF"], createdAt: T },
];

const SEED_STYLE_PRESETS: StylePreset[] = [
  { id: "sp-cozy-chibi", name: "Cozy Chibi", notes: "Studio Ghibli x Pokemon, soft round shapes, no shading", createdAt: T, appliesTo: ["art", "battleBgs", "scenes"] },
  { id: "sp-storybook",  name: "Storybook Watercolor", notes: "Watercolor textures, gentle outlines, warm light", createdAt: T, appliesTo: ["scenes", "realms", "battleBgs"] },
  { id: "sp-flat-pastel",name: "Flat Pastel", notes: "Flat fills, no outline, pastel palette, generous negative space", createdAt: T, appliesTo: ["assets", "art"] },
];

const SEED_AVATARS: StudioAvatar[] = [
  { ...seedBase, id: "av-1", name: "Lavender Tuft",     category: "hair",      rarity: "common",    previewColor: "#9D8DF1", status: "published", description: "Classic chibi tuft, soft lavender.", hair: { length: "short", style: "tuft", texture: "wavy", color: "#9D8DF1" } },
  { ...seedBase, id: "av-2", name: "Sun Braids",        category: "hair",      rarity: "rare",      previewColor: "#F4C753", status: "approved",  description: "Twin braids with gold ribbons.",     hair: { length: "long",  style: "braids", texture: "straight", color: "#F4C753" } },
  { ...seedBase, id: "av-3", name: "Cozy Knit Outfit",  category: "outfit",    rarity: "common",    previewColor: "#86A789", status: "published", description: "Sage knit set.",                       outfit: { outfitType: "tunic", primaryColor: "#86A789", secondaryColor: "#CDE0CF", theme: "cozy", trim: "cream" } },
  { ...seedBase, id: "av-4", name: "Wizardling Robe",   category: "outfit",    rarity: "epic",      previewColor: "#7A6AC6", status: "pending",   description: "Dark lavender robe with star piping.", outfit: { outfitType: "robe",  primaryColor: "#7A6AC6", secondaryColor: "#F4C753", theme: "magical", trim: "gold" } },
  { ...seedBase, id: "av-5", name: "Moon Halo",         category: "accessory", rarity: "legendary", previewColor: "#D8D2FA", status: "pending",   description: "Soft glowing circlet.",               accessory: { accessoryType: "halo", placement: "head", material: "crystal", color: "#D8D2FA" } },
  { ...seedBase, id: "av-6", name: "Tide Skin Palette", category: "skin",      rarity: "rare",      previewColor: "#7BB7D6", status: "draft",     description: "Cool ocean undertones." },
];

const STAT = (hp: number, a: number, d: number, sp: number) => ({ hp, attack: a, defense: d, speed: sp });
const SEED_COMPANIONS: StudioCompanion[] = [
  { ...seedBase, id: "scmp-1", name: "Spriggle",  affinity: "nature", rarity: "common", role: "support", academyAffinity: "addition",       personality: "friendly support", lore: "A bashful leaf-cub who hums when its friends solve problems.", moves: ["Leaf Pat","Sun Hug","Petal Shield"], emoji: "🌱", stats: STAT(90,22,14,15),  palette: { from: "#E8F4E1", to: "#86A789" }, status: "published", shinyEnabled: true, shinyPalette: { from: "#FCE2F0", to: "#D77DA5" } },
  { ...seedBase, id: "scmp-2", name: "Embercub",  affinity: "fire",   rarity: "common", role: "offense", academyAffinity: "multiplication", personality: "bold attacker",    lore: "Tiny spark, big courage.",                                       moves: ["Spark Hop","Warm Glow","Cinder Pat"], emoji: "🔥", stats: STAT(80,28,10,18), palette: { from: "#FFE6D6", to: "#FF9F68" }, status: "published" },
  { ...seedBase, id: "scmp-3", name: "Pebblin",   affinity: "earth",  rarity: "common", role: "defense", academyAffinity: "shapes",         personality: "calm defender",    lore: "Steady stone, sturdy soul.",                                     moves: ["Stone Tumble","Earth Snug","Pebble Shield"], emoji: "🪨", stats: STAT(110,18,22,8), palette: { from: "#F1E5D1", to: "#D4A373" }, status: "published" },
  { ...seedBase, id: "scmp-4", name: "Bubblefin", affinity: "water",  rarity: "rare",   role: "balanced",academyAffinity: "fractions",      personality: "cheery scout",     lore: "Pearl giggles in pond glow.",                                    moves: ["Bubble Bop","Splash","Mist Veil"],    emoji: "🫧", stats: STAT(95,20,16,20), palette: { from: "#DCEEF7", to: "#7BB7D6" }, status: "pending" },
];

const SEED_EVOLUTIONS: StudioEvolution[] = [
  { ...seedBase, id: "evo-1", baseCompanionId: "scmp-1", baseCompanionName: "Spriggle", stageNumber: 2, evolutionName: "Bloomling", lore: "Petal armor blossoms outward.",     unlockCondition: "Answer 50 addition correctly",  academyInfluence: "addition", visualNotes: "Rounder body with three petal collars",     statGrowthNotes: "+10 HP, +4 ATK", status: "approved",  stages: [{ name:"Spriggle", lore:"Sprout", unlockCondition:"Starter", visualDescription:"Tiny sprout" }] },
  { ...seedBase, id: "evo-2", baseCompanionId: "scmp-1", baseCompanionName: "Spriggle", stageNumber: 3, evolutionName: "Hartleaf",  lore: "A gentle forest guardian.",         unlockCondition: "Reach Academy mastery 80%",      academyInfluence: "addition", visualNotes: "Antlered head, glowing leaf cape",          statGrowthNotes: "+20 HP, +8 ATK, +4 DEF", status: "pending" },
];

const SEED_ARTS: StudioArt[] = [
  { ...seedBase, id: "art-1", companionId: "scmp-1", companionName: "Spriggle",  title: "Spriggle hero shot", prompt: "Cozy chibi nature companion, soft lavender + sage, big eyes, gentle smile", styleNotes: "Studio Ghibli x Pokemon", stylePresetId: "sp-cozy-chibi", status: "published", previewUrl: mockNanoBananaGenerateImage("Spriggle chibi companion") },
  { ...seedBase, id: "art-2", companionId: "scmp-4", companionName: "Bubblefin", title: "Bubblefin debut",    prompt: "Cute water bubble pup, transparent shimmer, pearl giggle expression",         styleNotes: "Same cozy chibi family",   stylePresetId: "sp-cozy-chibi", status: "pending",   previewUrl: mockNanoBananaGenerateImage("Bubblefin chibi water pup") },
];

const SEED_ASSETS: StudioAsset[] = [
  { ...seedBase, id: "as-1", name: "Coin Icon",        kind: "icon",                previewColor: "#F4C753", status: "published" },
  { ...seedBase, id: "as-2", name: "XP Sparkle",       kind: "icon",                previewColor: "#9D8DF1", status: "published" },
  { ...seedBase, id: "as-3", name: "First-5 Badge",    kind: "badge",               previewColor: "#FF9F68", status: "approved", badge: { badgeType: "achievement", achievementCategory: "first-correct", iconShape: "star", rarity: "common" } },
  { ...seedBase, id: "as-4", name: "Addition Hall",    kind: "academy-room-prop",   previewColor: "#FFF3D6", status: "approved" },
  { ...seedBase, id: "as-5", name: "Aqua Egg Art",     kind: "egg",                 previewColor: "#7BB7D6", status: "pending",  egg: { rarity: "rare", baseColor: "#DCEEF7", accentColor: "#7BB7D6", shinyChance: 4, hatchCategory: "water", glowEffect: "soft", companionFamily: "water-pups", eventTag: "" } },
  { ...seedBase, id: "as-6", name: "Wizard Hat Item",  kind: "cosmetic",            previewColor: "#7A6AC6", status: "draft" },
  { ...seedBase, id: "as-7", name: "Sparkle Sticker",  kind: "sticker",             previewColor: "#F4C753", status: "pending" },
];

const SEED_REALMS: StudioRealm[] = [
  { ...seedBase, id: "realm-1", name: "Meadowfall Grove", biome: "spring meadow",      grades: ["K","1","2","3"], subjects: ["math","reading"], enemyTypes: ["Slumbug","Mossling","Acornaut"], habitats: ["meadow","forest edge","brook"], description: "The starter realm. Cozy and bright, perfect for first quests.",            status: "published", buildings: ["town-hub","hatchery","learning-academy","shop","quest-board"], tone: "cozy",    mapNotes: "Sun-dappled paths circle a central well.", stylePresetId: "sp-storybook" },
  { ...seedBase, id: "realm-2", name: "Frostpine Hollow", biome: "snowy pine forest", grades: ["2","3","4","5"], subjects: ["math","reading"], enemyTypes: ["Snowmite","Flakeling","Iceburrow"], habitats: ["snow drift","pine canopy"],         description: "Crisp winter wonderland for intermediate adventurers.",                       status: "pending",   buildings: ["town-hub","hatchery","guild-hall"],                                tone: "magical", mapNotes: "Frozen pond at center.",                  stylePresetId: "sp-storybook" },
];

const SEED_BG: StudioBattleBg[] = [
  { ...seedBase, id: "bg-1", realmId: "realm-1", realm: "Meadowfall Grove", environment: "sunlit meadow path", timeOfDay: "afternoon", mood: "cozy",    prompt: "soft pastel meadow, late afternoon light, dandelion fluff",     stylePresetId: "sp-cozy-chibi", status: "published", previewUrl: mockNanoBananaGenerateImage("Meadowfall battle bg") },
  { ...seedBase, id: "bg-2", realmId: "realm-2", realm: "Frostpine Hollow", environment: "snowy clearing",     timeOfDay: "morning",   mood: "magical", prompt: "snow-dappled pines, soft sunbeam, no scary shadows",            stylePresetId: "sp-storybook",  status: "pending",   previewUrl: mockNanoBananaGenerateImage("Frostpine snowy clearing") },
];

const SEED_NPCS: StudioNPC[] = [
  { ...seedBase, id: "npc-1", name: "Linden the Keeper",    role: "caretaker",   realmId: "realm-1", realm: "Meadowfall Grove", dialogue: "Welcome, little scholar! Your egg is warming up nicely.", tone: "calm",     temperament: "patient", teachingStyle: "encouraging", humorLevel: "light", formality: "casual",  encouragementStyle: "praise",            safetyNotes: "Always kind, never urgent. No collection of personal info.", status: "approved" },
  { ...seedBase, id: "npc-2", name: "Professor Bramble",    role: "teacher",     realmId: "realm-1", realm: "Meadowfall Grove", dialogue: "Great try! Let's practice that one again together.",       tone: "wise",     temperament: "patient", teachingStyle: "coach",        humorLevel: "light", formality: "balanced", encouragementStyle: "hints",             safetyNotes: "Encouraging only; no failure-shaming language.",            status: "approved" },
  { ...seedBase, id: "npc-3", name: "Mochi the Shopkeeper", role: "shopkeeper",  realmId: "realm-1", realm: "Meadowfall Grove", dialogue: "Pick a sparkle that matches your mood today!",            tone: "cheerful", temperament: "playful", teachingStyle: "storytelling", humorLevel: "silly", formality: "casual",  encouragementStyle: "calm-reassurance",  safetyNotes: "No real-money references.",                                 status: "pending" },
];

const SEED_SCENES: StudioScene[] = [
  { ...seedBase, id: "sc-1", name: "Cozy Hatchery",            purpose: "hatchery",          realmId: "realm-1", realm: "Meadowfall Grove", npcIds: ["npc-1"], npcs: ["Linden the Keeper"],   visualPrompt: "warm cottage interior, glowing eggs on shelves, plants", stylePresetId: "sp-cozy-chibi", status: "published" },
  { ...seedBase, id: "sc-2", name: "Learning Academy Atrium", purpose: "academy-interior", realmId: "realm-1", realm: "Meadowfall Grove", npcIds: ["npc-2"], npcs: ["Professor Bramble"],   visualPrompt: "round library with floating chalk numbers",              stylePresetId: "sp-storybook",  status: "approved" },
  { ...seedBase, id: "sc-3", name: "Sticker Shop",             purpose: "shop",              realmId: "realm-1", realm: "Meadowfall Grove", npcIds: ["npc-3"], npcs: ["Mochi the Shopkeeper"],visualPrompt: "tiny pastel shop, jars of stickers, soft yellow lights", stylePresetId: "sp-flat-pastel",status: "pending" },
];

const SEED_QUESTS: StudioQuest[] = [
  { ...seedBase, id: "q-1", title: "First Friend Forever", objective: "Help Linden welcome a new hatchling.", steps: ["Talk to Linden","Answer 3 grade-K questions","Hatch one egg"],   rewards: "20 XP, 10 coins, First Friend sticker",  subject: "addition", npcGiverId: "npc-1", npcGiver: "Linden the Keeper", status: "approved" },
  { ...seedBase, id: "q-2", title: "Whispering Rhymes",    objective: "Find the rhyming pages in Bramble's library.", steps: ["Talk to Professor Bramble","Solve 5 rhyming questions","Return the pages"], rewards: "30 XP, 12 coins, Rhyme Garden access", subject: "rhyming",  npcGiverId: "npc-2", npcGiver: "Professor Bramble", status: "pending" },
];

const SEED_EVENTS: StudioEvent[] = [
  { ...seedBase, id: "ev-1", name: "Spring Sparkle Week", startDate: "2026-04-01", endDate: "2026-04-08", rewardType: "Cosmetic + Egg", special: "Twinklet egg drop boost",  community: "Classroom shared sticker board",  status: "approved" },
  { ...seedBase, id: "ev-2", name: "Frostpine Festival",   startDate: "2026-12-15", endDate: "2026-12-31", rewardType: "Cosmetic",       special: "Limited Cloudkin variant", community: "Guild team challenges",            status: "pending" },
];

const DEFAULT_STATE: StudioState = {
  templates: seedTemplateMeta(),
  avatars: SEED_AVATARS,
  companions: SEED_COMPANIONS,
  evolutions: SEED_EVOLUTIONS,
  arts: SEED_ARTS,
  assets: SEED_ASSETS,
  realms: SEED_REALMS,
  battleBgs: SEED_BG,
  scenes: SEED_SCENES,
  npcs: SEED_NPCS,
  quests: SEED_QUESTS,
  events: SEED_EVENTS,
  palettes: SEED_PALETTES,
  stylePresets: SEED_STYLE_PRESETS,
};

export const useStudio = create<StudioStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setStatus: (collection, id, status) =>
        set((s) => ({
          [collection]: (s[collection] as Array<{ id: string; status: StudioStatus; updatedAt: string }>).map(
            (it) => (it.id === id ? { ...it, status, updatedAt: nowISO() } : it)
          ),
        }) as Partial<StudioStore>),

      addItem: (collection, item) =>
        set((s) => ({ [collection]: [...(s[collection] as unknown[]), item] }) as Partial<StudioStore>),

      removeItem: (collection, id) =>
        set((s) => ({
          [collection]: (s[collection] as Array<{ id: string }>).filter((it) => it.id !== id),
        }) as Partial<StudioStore>),

      updateItem: (collection, id, patch) =>
        set((s) => ({
          [collection]: (s[collection] as Array<{ id: string }>).map((it) =>
            it.id === id ? { ...it, ...patch, updatedAt: nowISO() } : it
          ),
        }) as Partial<StudioStore>),

      bulkSetStatus: (collection, ids, status) =>
        set((s) => ({
          [collection]: (s[collection] as Array<{ id: string; status: StudioStatus; updatedAt: string }>).map(
            (it) => (ids.includes(it.id) ? { ...it, status, updatedAt: nowISO() } : it)
          ),
        }) as Partial<StudioStore>),

      resetStudio: () => set(DEFAULT_STATE),

      addPalette: (palette) => set((s) => ({ palettes: [...s.palettes, palette] })),
      removePalette: (id) => set((s) => ({ palettes: s.palettes.filter((p) => p.id !== id) })),
      addStylePreset: (preset) => set((s) => ({ stylePresets: [...s.stylePresets, preset] })),
      removeStylePreset: (id) => set((s) => ({ stylePresets: s.stylePresets.filter((p) => p.id !== id) })),

      isTemplatePlayerReady: (templateId) => {
        const meta = get().templates.find((m) => m.templateId === templateId);
        if (!meta) return false;
        return PLAYER_VISIBLE_STATUSES.includes(meta.status);
      },
    }),
    {
      name: "questing-academy-studio-v2",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
