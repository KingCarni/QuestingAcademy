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
} from "./studioTypes";
import { PLAYER_VISIBLE_STATUSES } from "./studioTypes";
import { mockNanoBananaGenerateImage, nowISO, seedTemplateMeta } from "./mockGen";

// TODO(backend): Replace localStorage persistence with an authenticated /api/studio/* surface.

interface StudioStore extends StudioState {
  // Generic CRUD on any collection
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

  // Selectors / helpers
  isTemplatePlayerReady: (templateId: string) => boolean;
  publishQueue: () => { collection: StudioCollectionKey; items: { id: string; label: string }[] }[];
}

// --- seed data --------------------------------------------------------------
const T = nowISO();
const seed = (i: number) => ({ createdAt: T, updatedAt: T, origin: "seed" as const, ...{ id: "" } });

const SEED_AVATARS: StudioAvatar[] = [
  { ...seed(0), id: "av-1", name: "Lavender Tuft",     category: "hair",      rarity: "common",    ageRange: "K-3", previewColor: "#9D8DF1", status: "published", description: "Classic chibi tuft, soft lavender." },
  { ...seed(0), id: "av-2", name: "Sun Braids",        category: "hair",      rarity: "rare",      ageRange: "K-7", previewColor: "#F4C753", status: "approved",  description: "Twin braids with gold ribbons." },
  { ...seed(0), id: "av-3", name: "Cozy Knit Outfit",  category: "outfit",    rarity: "common",    ageRange: "K-7", previewColor: "#86A789", status: "published", description: "Sage knit set." },
  { ...seed(0), id: "av-4", name: "Wizardling Robe",   category: "outfit",    rarity: "epic",      ageRange: "3-7", previewColor: "#7A6AC6", status: "pending",   description: "Dark lavender robe with star piping." },
  { ...seed(0), id: "av-5", name: "Moon Halo",         category: "accessory", rarity: "legendary", ageRange: "3-7", previewColor: "#D8D2FA", status: "pending",   description: "Soft glowing circlet." },
  { ...seed(0), id: "av-6", name: "Tide Skin Palette", category: "skin",      rarity: "rare",      ageRange: "K-7", previewColor: "#7BB7D6", status: "draft",     description: "Cool ocean undertones." },
];

const SEED_COMPANIONS: StudioCompanion[] = [
  { ...seed(0), id: "scmp-1", name: "Spriggle",  affinity: "nature", rarity: "common", personality: "friendly support", lore: "A bashful leaf-cub who hums when its friends solve problems.",  academyAffinity: "addition",      moves: ["Leaf Pat","Sun Hug","Petal Shield"], emoji: "🌱", palette: { from: "#E8F4E1", to: "#86A789" }, status: "published" },
  { ...seed(0), id: "scmp-2", name: "Embercub",  affinity: "fire",   rarity: "common", personality: "bold attacker",    lore: "Tiny spark, big courage.",                                       academyAffinity: "multiplication", moves: ["Spark Hop","Warm Glow","Cinder Pat"], emoji: "🔥", palette: { from: "#FFE6D6", to: "#FF9F68" }, status: "published" },
  { ...seed(0), id: "scmp-3", name: "Pebblin",   affinity: "earth",  rarity: "common", personality: "calm defender",    lore: "Steady stone, sturdy soul.",                                     academyAffinity: "shapes",         moves: ["Stone Tumble","Earth Snug","Pebble Shield"], emoji: "🪨", palette: { from: "#F1E5D1", to: "#D4A373" }, status: "published" },
  { ...seed(0), id: "scmp-4", name: "Bubblefin", affinity: "water",  rarity: "rare",   personality: "cheery scout",     lore: "Pearl giggles in pond glow.",                                    academyAffinity: "fractions",      moves: ["Bubble Bop","Splash","Mist Veil"],    emoji: "🫧", palette: { from: "#DCEEF7", to: "#7BB7D6" }, status: "pending" },
];

const SEED_EVOLUTIONS: StudioEvolution[] = [
  {
    ...seed(0), id: "evo-1",
    baseCompanionName: "Spriggle",
    stages: [
      { name: "Spriggle",  lore: "A leafy seedling who hums.",        unlockCondition: "Starter",                          visualDescription: "Tiny sprout with lavender leaves" },
      { name: "Bloomling", lore: "Petal armor blossoms outward.",     unlockCondition: "Answer 50 addition correctly",     visualDescription: "Rounder body with three petal collars" },
      { name: "Hartleaf",  lore: "A gentle forest guardian.",         unlockCondition: "Reach Academy mastery 80%",        visualDescription: "Antlered head, glowing leaf cape" },
    ],
    academyInfluence: "addition",
    status: "approved",
  },
];

const SEED_ARTS: StudioArt[] = [
  {
    ...seed(0), id: "art-1", companionId: "scmp-1", companionName: "Spriggle",
    prompt: "Cozy chibi nature companion, soft lavender + sage, big eyes, gentle smile",
    styleNotes: "Studio Ghibli x Pokemon, soft round shapes, no shading", status: "published",
    previewUrl: mockNanoBananaGenerateImage("Spriggle chibi companion"),
  },
  {
    ...seed(0), id: "art-2", companionId: "scmp-4", companionName: "Bubblefin",
    prompt: "Cute water bubble pup, transparent shimmer, pearl giggle expression",
    styleNotes: "Same cozy chibi family", status: "pending",
    previewUrl: mockNanoBananaGenerateImage("Bubblefin chibi water pup"),
  },
];

const SEED_ASSETS: StudioAsset[] = [
  { ...seed(0), id: "as-1", name: "Coin Icon",        kind: "icon",         previewColor: "#F4C753", status: "published" },
  { ...seed(0), id: "as-2", name: "XP Sparkle",       kind: "icon",         previewColor: "#9D8DF1", status: "published" },
  { ...seed(0), id: "as-3", name: "First-5 Badge",    kind: "badge",        previewColor: "#FF9F68", status: "approved" },
  { ...seed(0), id: "as-4", name: "Addition Hall",    kind: "academy-room", previewColor: "#FFF3D6", status: "approved" },
  { ...seed(0), id: "as-5", name: "Aqua Egg Art",     kind: "egg",          previewColor: "#7BB7D6", status: "pending" },
  { ...seed(0), id: "as-6", name: "Wizard Hat Item",  kind: "cosmetic",     previewColor: "#7A6AC6", status: "draft" },
  { ...seed(0), id: "as-7", name: "Sparkle Sticker",  kind: "sticker",      previewColor: "#F4C753", status: "pending" },
];

const SEED_REALMS: StudioRealm[] = [
  {
    ...seed(0), id: "realm-1", name: "Meadowfall Grove",
    biome: "spring meadow", grades: ["K","1","2","3"], subjects: ["math","reading"],
    enemyTypes: ["Slumbug","Mossling","Acornaut"], habitats: ["meadow","forest edge","brook"],
    description: "The starter realm. Cozy and bright, perfect for first quests.",
    status: "published",
  },
  {
    ...seed(0), id: "realm-2", name: "Frostpine Hollow",
    biome: "snowy pine forest", grades: ["2","3","4","5"], subjects: ["math","reading"],
    enemyTypes: ["Snowmite","Flakeling","Iceburrow"], habitats: ["snow drift","pine canopy"],
    description: "Crisp winter wonderland for intermediate adventurers.",
    status: "pending",
  },
];

const SEED_BG: StudioBattleBg[] = [
  { ...seed(0), id: "bg-1", realm: "Meadowfall Grove", environment: "sunlit meadow path", prompt: "soft pastel meadow, late afternoon light, dandelion fluff", status: "published", previewUrl: mockNanoBananaGenerateImage("Meadowfall battle bg") },
  { ...seed(0), id: "bg-2", realm: "Frostpine Hollow", environment: "snowy clearing", prompt: "snow-dappled pines, soft sunbeam, no scary shadows", status: "pending", previewUrl: mockNanoBananaGenerateImage("Frostpine snowy clearing") },
];

const SEED_SCENES: StudioScene[] = [
  { ...seed(0), id: "sc-1", name: "Cozy Hatchery", purpose: "Egg incubation hub", realm: "Meadowfall Grove", npcs: ["Linden the Keeper"], visualPrompt: "warm cottage interior, glowing eggs on shelves, plants",   status: "published" },
  { ...seed(0), id: "sc-2", name: "Learning Academy Atrium", purpose: "Companion training hub", realm: "Meadowfall Grove", npcs: ["Professor Bramble"], visualPrompt: "round library with floating chalk numbers", status: "approved" },
  { ...seed(0), id: "sc-3", name: "Sticker Shop", purpose: "Cosmetic shop", realm: "Meadowfall Grove", npcs: ["Mochi the Shopkeeper"], visualPrompt: "tiny pastel shop, jars of stickers, soft yellow lights", status: "pending" },
];

const SEED_NPCS: StudioNPC[] = [
  { ...seed(0), id: "npc-1", name: "Linden the Keeper",  role: "Hatchery host", realm: "Meadowfall Grove", dialogue: "Welcome, little scholar! Your egg is warming up nicely.", safetyNotes: "Always kind, never urgent. No collection of personal info.", status: "approved" },
  { ...seed(0), id: "npc-2", name: "Professor Bramble",  role: "Academy mentor", realm: "Meadowfall Grove", dialogue: "Great try! Let's practice that one again together.",       safetyNotes: "Encouraging only; no failure-shaming language.",            status: "approved" },
  { ...seed(0), id: "npc-3", name: "Mochi the Shopkeeper", role: "Cosmetic shopkeeper", realm: "Meadowfall Grove", dialogue: "Pick a sparkle that matches your mood today!",            safetyNotes: "No real-money references.",                                 status: "pending" },
];

const SEED_QUESTS: StudioQuest[] = [
  { ...seed(0), id: "q-1", title: "First Friend Forever", objective: "Help Linden welcome a new hatchling.", steps: ["Talk to Linden", "Answer 3 grade-K questions", "Hatch one egg"], rewards: "20 XP, 10 coins, First Friend sticker", subject: "addition", npcGiver: "Linden the Keeper", status: "approved" },
  { ...seed(0), id: "q-2", title: "Whispering Rhymes",    objective: "Find the rhyming pages in Professor Bramble's library.", steps: ["Talk to Professor Bramble", "Solve 5 rhyming questions", "Return the pages"], rewards: "30 XP, 12 coins, Rhyme Garden access", subject: "rhyming", npcGiver: "Professor Bramble", status: "pending" },
];

const SEED_EVENTS: StudioEvent[] = [
  { ...seed(0), id: "ev-1", name: "Spring Sparkle Week", startDate: "2026-04-01", endDate: "2026-04-08", rewardType: "Cosmetic + Egg", special: "Twinklet egg drop boost",  community: "Classroom shared sticker board",  status: "approved" },
  { ...seed(0), id: "ev-2", name: "Frostpine Festival",   startDate: "2026-12-15", endDate: "2026-12-31", rewardType: "Cosmetic",     special: "Limited Cloudkin variant", community: "Guild team challenges",            status: "pending" },
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
        set((s) => ({
          [collection]: [...(s[collection] as unknown[]), item],
        }) as Partial<StudioStore>),

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

      isTemplatePlayerReady: (templateId) => {
        const meta = get().templates.find((m) => m.templateId === templateId);
        if (!meta) return false;
        return PLAYER_VISIBLE_STATUSES.includes(meta.status);
      },

      publishQueue: () => {
        const s = get();
        const COLLECTIONS: { key: StudioCollectionKey; label: (it: unknown) => string }[] = [
          { key: "templates",  label: (it) => `Template · ${(it as StudioTemplateMeta).templateId}` },
          { key: "avatars",    label: (it) => `Avatar · ${(it as StudioAvatar).name}` },
          { key: "companions", label: (it) => `Companion · ${(it as StudioCompanion).name}` },
          { key: "evolutions", label: (it) => `Evolution · ${(it as StudioEvolution).baseCompanionName}` },
          { key: "arts",       label: (it) => `Art · ${(it as StudioArt).companionName}` },
          { key: "assets",     label: (it) => `Asset · ${(it as StudioAsset).name}` },
          { key: "realms",     label: (it) => `Realm · ${(it as StudioRealm).name}` },
          { key: "battleBgs",  label: (it) => `Battle BG · ${(it as StudioBattleBg).realm} / ${(it as StudioBattleBg).environment}` },
          { key: "scenes",     label: (it) => `Scene · ${(it as StudioScene).name}` },
          { key: "npcs",       label: (it) => `NPC · ${(it as StudioNPC).name}` },
          { key: "quests",     label: (it) => `Quest · ${(it as StudioQuest).title}` },
          { key: "events",     label: (it) => `Event · ${(it as StudioEvent).name}` },
        ];
        return COLLECTIONS.map(({ key, label }) => {
          const items = (s[key] as Array<{ id: string; status: StudioStatus }>).filter((it) => it.status === "approved");
          return { collection: key, items: items.map((it) => ({ id: it.id, label: label(it) })) };
        });
      },
    }),
    {
      name: "questing-academy-studio-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
