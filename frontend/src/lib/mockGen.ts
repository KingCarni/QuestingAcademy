// Mock content generators used by the Content Studio.
// All generators return draft/generated items that must pass human approval before going live.
// Image generation uses a free/no-key Pollinations URL for prototype previews.
// TODO(api): Replace prototype image URLs with a backend storage/CDN pipeline when available.
// TODO(api): Replace mockTextGenerate* with backend call to LLM (Claude / GPT) when available.

import { ALL_TEMPLATES } from "./questionEngine";
import type {
  StudioArt,
  StudioBattleBg,
  StudioCompanion,
  StudioQuest,
  StudioRealm,
  StudioBase,
} from "./studioTypes";

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function baseMeta(origin: StudioBase["origin"] = "generator"): Omit<StudioBase, "id"> {
  const t = nowISO();
  return { status: "pending", createdAt: t, updatedAt: t, origin };
}

// ---- Prototype image generation --------------------------------------------
// Returns a live free/no-key image URL. This keeps the Studio flow working:
// prompt -> generated preview -> pending review -> approve/publish.
export function mockNanoBananaGenerateImage(prompt: string, palette?: { from: string; to: string }): string {
  const stylePrompt = [
    "Questing Academy game art",
    "cute chibi fantasy RPG companion or scene",
    "soft pastel colors",
    "storybook illustration",
    "kid-friendly",
    "cozy lighting",
    "clean readable silhouette",
    palette ? `palette ${palette.from} to ${palette.to}` : "",
    prompt,
  ].filter(Boolean).join(", ");

  const encodedPrompt = encodeURIComponent(stylePrompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&nologo=true&enhance=true&safe=true&seed=${Date.now()}`;
}

// ---- Companion concept generator -------------------------------------------
const COMPANION_THEMES = [
  { name: "Mossling",  emoji: "🌿", affinity: "nature", from: "#E8F4E1", to: "#86A789" },
  { name: "Sparklet",  emoji: "✨", affinity: "star",   from: "#FFF3D6", to: "#F4C753" },
  { name: "Bubblet",   emoji: "🫧", affinity: "water",  from: "#DCEEF7", to: "#7BB7D6" },
  { name: "Pebblet",   emoji: "🪨", affinity: "earth",  from: "#F1E5D1", to: "#D4A373" },
  { name: "Cinder",    emoji: "🔥", affinity: "fire",   from: "#FFE6D6", to: "#FF9F68" },
  { name: "Breezeling",emoji: "🌬️", affinity: "air",    from: "#EEF2FB", to: "#B6C0E5" },
];
const PERSONALITIES = ["bashful supporter", "bold defender", "playful trickster", "calm strategist", "loyal scout"];
const MOVES = [
  ["Leaf Pat", "Sun Hug", "Petal Shield"],
  ["Star Flick", "Twinkle Dust", "Wish Beam"],
  ["Bubble Bop", "Splash", "Mist Veil"],
  ["Stone Tumble", "Earth Snug", "Pebble Shield"],
  ["Spark Hop", "Warm Glow", "Ember Pat"],
  ["Whisper Wind", "Float", "Breeze Veil"],
];

export function mockCompanionConcept(prompt?: string): StudioCompanion {
  const idx = Math.floor(Math.random() * COMPANION_THEMES.length);
  const theme = COMPANION_THEMES[idx];
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  const rarity = (["common", "rare", "epic"] as const)[Math.floor(Math.random() * 3)];
  const roles = ["offense", "defense", "support", "balanced"] as const;
  return {
    ...baseMeta("generator"),
    id: uid("companion"),
    name: `${theme.name}-${Math.floor(Math.random() * 90 + 10)}`,
    affinity: theme.affinity as StudioCompanion["affinity"],
    rarity,
    role: roles[Math.floor(Math.random() * roles.length)],
    personality,
    lore: prompt
      ? `Prompted: "${prompt.slice(0, 80)}". A ${rarity} ${theme.affinity} companion who is a ${personality}.`
      : `A ${rarity} ${theme.affinity} companion who is a ${personality}. Loves the Meadowfall Grove tide pools.`,
    academyAffinity: theme.affinity === "fire" ? "multiplication" : theme.affinity === "water" ? "fractions" : "addition",
    moves: MOVES[idx],
    emoji: theme.emoji,
    stats: { hp: 90, attack: 20, defense: 14, speed: 15 },
    palette: { from: theme.from, to: theme.to },
  };
}

// ---- Realm concept generator -----------------------------------------------
const REALM_NAMES = ["Frostpine Hollow", "Lullaby Lagoon", "Sunberry Plateau", "Candlebark Wood", "Whisperdune"];
const BIOMES = ["snowy pine forest", "warm coastal lagoon", "sun-drenched savanna", "cozy autumn woodland", "shimmering desert"];
const ENEMY_SETS = [
  ["Snowmite", "Flakeling", "Iceburrow"],
  ["Tidepop", "Coralcub", "Mistwhisk"],
  ["Sungrub", "Hopberry", "Featherflit"],
  ["Acornaut", "Pumpcub", "Leafwhirl"],
  ["Sandpaw", "Dunelet", "Mirage Pup"],
];

export function mockRealmConcept(prompt?: string): StudioRealm {
  const idx = Math.floor(Math.random() * REALM_NAMES.length);
  return {
    ...baseMeta("generator"),
    id: uid("realm"),
    name: REALM_NAMES[idx],
    biome: BIOMES[idx],
    grades: ["K", "1", "2", "3"],
    subjects: ["math", "reading"],
    enemyTypes: ENEMY_SETS[idx],
    habitats: ["meadow", "forest edge"],
    description: prompt
      ? `Prompted: "${prompt.slice(0, 80)}". A ${BIOMES[idx]} where students practice mixed subjects.`
      : `A cozy ${BIOMES[idx]} where new companions roam. Suitable for ${["K", "1", "2", "3"].join(", ")} learners.`,
  };
}

// ---- Quest chain generator -------------------------------------------------
const QUEST_TITLES = [
  "The Lost Acorn",
  "Bubblefin's Riddle",
  "Star Map Mystery",
  "The Ember Berry Search",
  "Pebblin's Counting Walk",
];
const SUBJECTS = ["addition", "rhyming", "multiplication", "shapes", "vocabulary"];

export function mockQuestChain(prompt?: string): StudioQuest {
  const idx = Math.floor(Math.random() * QUEST_TITLES.length);
  return {
    ...baseMeta("generator"),
    id: uid("quest"),
    title: QUEST_TITLES[idx],
    objective: prompt ? prompt.slice(0, 120) : "Help the meadow keeper recover something lost.",
    steps: [
      "Talk to the meadow keeper",
      "Solve 3 grade-appropriate questions to earn the clue",
      "Find the hidden item using the clue",
      "Return the item and accept the reward",
    ],
    rewards: "50 coins, 30 XP, 1 cosmetic sticker",
    subject: SUBJECTS[idx],
    npcGiver: ["Linden the Keeper", "Mira the Mapmaker", "Old Acorn"][idx % 3],
  };
}

// ---- Battle background generator -------------------------------------------
export function mockBattleBackground(prompt: string, realm = "Meadowfall Grove"): StudioBattleBg {
  return {
    ...baseMeta("generator"),
    id: uid("bg"),
    realm,
    environment: prompt || "sunlit meadow",
    prompt,
    previewUrl: mockNanoBananaGenerateImage(`${realm} — ${prompt || "sunlit meadow"}`),
  };
}

// ---- Companion art generator -----------------------------------------------
export function mockCompanionArt(companionId: string, companionName: string, prompt: string, styleNotes = ""): StudioArt {
  return {
    ...baseMeta("generator"),
    id: uid("art"),
    companionId,
    companionName,
    prompt,
    styleNotes,
    previewUrl: mockNanoBananaGenerateImage(`${companionName} — ${prompt}${styleNotes ? ` — ${styleNotes}` : ""}`),
  };
}

// Convenience for testing — return all templates as approved meta records (seed default).
export function seedTemplateMeta() {
  const t = nowISO();
  return ALL_TEMPLATES.map((tpl) => ({
    id: `tmeta-${tpl.id}`,
    templateId: tpl.id,
    status: "approved" as const,
    createdAt: t,
    updatedAt: t,
    origin: "seed" as const,
  }));
}
