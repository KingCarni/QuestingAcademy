// Mock content generators used by the Content Studio.
// All generators return draft/generated items that must pass human approval before going live.
// TODO(api): Replace mockNanoBananaGenerateImage with backend call to Gemini / Nano Banana image generation.
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

// ---- Mock Nano Banana ------------------------------------------------------
// Returns a styled inline SVG data URL — pure frontend, zero network.
export function mockNanoBananaGenerateImage(prompt: string, palette?: { from: string; to: string }): string {
  // TODO(api): Replace with `await fetch('/api/studio/generate-image', { body: { prompt } })`
  // when the backend / Gemini-Nano-Banana integration is connected.
  const seed = Array.from(prompt).reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [
    ["#9D8DF1", "#F4C753"],
    ["#86A789", "#FFE6D6"],
    ["#FF9F68", "#FCE2F0"],
    ["#7BB7D6", "#E6F2FF"],
    ["#D4A373", "#FFF3D6"],
  ];
  const c = palette ?? { from: hues[seed % hues.length][0], to: hues[seed % hues.length][1] };
  const safe = prompt.replace(/[<>&]/g, "").slice(0, 60);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.from}"/>
      <stop offset="100%" stop-color="${c.to}"/>
    </linearGradient>
    <filter id="b"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="320" height="220" rx="22" fill="url(#g)"/>
  <circle cx="60" cy="50" r="40" fill="#ffffff55" filter="url(#b)"/>
  <circle cx="280" cy="170" r="56" fill="#ffffff44" filter="url(#b)"/>
  <g font-family="Fredoka, Nunito, sans-serif" fill="#3F2A6B">
    <text x="20" y="38" font-size="14" font-weight="700" opacity="0.6">Nano Banana · preview</text>
    <text x="20" y="120" font-size="20" font-weight="700">${safe}</text>
    <text x="20" y="200" font-size="11" font-weight="600" opacity="0.6">Pending Review · prototype mock</text>
  </g>
</svg>`.trim();
  return `data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
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
    previewUrl: mockNanoBananaGenerateImage(`${companionName} — ${prompt}`),
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
