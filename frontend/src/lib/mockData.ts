import type {
  Companion,
  Question,
  Enemy,
  AcademySubject,
  Egg,
} from "./types";

// TODO(backend): Replace these static pools with API responses keyed by player/grade.

export const COMPANIONS: Companion[] = [
  {
    id: "spriggle",
    name: "Spriggle",
    affinity: "nature",
    personality: "friendly-support",
    emoji: "🌱",
    tagline: "Sunlit sprout, kind heart",
    description:
      "A bashful leaf-cub who hums when its friends solve problems. Casts gentle healing breezes.",
    baseHP: 90,
    baseAttack: 22,
    baseDefense: 14,
    palette: {
      bg: "bg-[#E8F4E1]",
      ring: "border-[#86A789]",
      accent: "text-[#3F6B45]",
      glow: "#86A789",
    },
    starter: true,
  },
  {
    id: "embercub",
    name: "Embercub",
    affinity: "fire",
    personality: "bold-attacker",
    emoji: "🔥",
    tagline: "Tiny spark, big courage",
    description:
      "A warm-bellied cub with cinder freckles. Charges in first and asks questions later.",
    baseHP: 80,
    baseAttack: 28,
    baseDefense: 10,
    palette: {
      bg: "bg-[#FFE6D6]",
      ring: "border-[#FF9F68]",
      accent: "text-[#B5572C]",
      glow: "#FF9F68",
    },
    starter: true,
  },
  {
    id: "pebblin",
    name: "Pebblin",
    affinity: "earth",
    personality: "calm-defensive",
    emoji: "🪨",
    tagline: "Steady stone, sturdy soul",
    description:
      "A patient pebble-pup who guards its squad. Never flinches, even at tough subtraction.",
    baseHP: 110,
    baseAttack: 18,
    baseDefense: 22,
    palette: {
      bg: "bg-[#F1E5D1]",
      ring: "border-[#D4A373]",
      accent: "text-[#7A4F23]",
      glow: "#D4A373",
    },
    starter: true,
  },
  // Locked / collectible companions
  {
    id: "bubblefin",
    name: "Bubblefin",
    affinity: "nature",
    personality: "friendly-support",
    emoji: "🫧",
    tagline: "Pond pal, pearl giggles",
    description: "Tells jokes underwater. Locked until you hatch the Aqua Egg.",
    baseHP: 95,
    baseAttack: 20,
    baseDefense: 16,
    palette: {
      bg: "bg-[#DCEEF7]",
      ring: "border-[#7BB7D6]",
      accent: "text-[#2E5F7A]",
      glow: "#7BB7D6",
    },
  },
  {
    id: "cloudkin",
    name: "Cloudkin",
    affinity: "nature",
    personality: "calm-defensive",
    emoji: "☁️",
    tagline: "Fluffy floater, soft thunder",
    description: "Naps on rooftops. Trained at the Academy through counting drills.",
    baseHP: 100,
    baseAttack: 19,
    baseDefense: 20,
    palette: {
      bg: "bg-[#EEF2FB]",
      ring: "border-[#B6C0E5]",
      accent: "text-[#3E4A78]",
      glow: "#B6C0E5",
    },
  },
  {
    id: "twinklet",
    name: "Twinklet",
    affinity: "fire",
    personality: "friendly-support",
    emoji: "✨",
    tagline: "Starlet, sparkler, secret keeper",
    description: "Glows brighter when you ace shapes. Hatches from a Stardust Egg.",
    baseHP: 85,
    baseAttack: 24,
    baseDefense: 12,
    palette: {
      bg: "bg-[#FFF3D6]",
      ring: "border-[#F4C753]",
      accent: "text-[#8A6620]",
      glow: "#F4C753",
    },
  },
];

export const STARTER_COMPANIONS = COMPANIONS.filter((c) => c.starter);

export const ENEMIES: Enemy[] = [
  {
    id: "slumbug",
    name: "Slumbug",
    emoji: "🐛",
    hp: 60,
    maxHp: 60,
    attack: 8,
    reward: { xp: 20, coins: 8, eggProgress: 12 },
  },
  {
    id: "mossling",
    name: "Mossling",
    emoji: "🌿",
    hp: 80,
    maxHp: 80,
    attack: 10,
    reward: { xp: 28, coins: 12, eggProgress: 16 },
  },
  {
    id: "acornaut",
    name: "Acornaut",
    emoji: "🌰",
    hp: 100,
    maxHp: 100,
    attack: 12,
    reward: { xp: 36, coins: 16, eggProgress: 20 },
  },
];

// Question pools by grade. Kept short for MVP. TODO(backend): paginate from API.
export const QUESTIONS: Question[] = [
  // Grade K — counting & tiny addition
  { id: "k1", grade: "K", topic: "counting", prompt: "How many apples? 🍎🍎🍎", choices: ["2", "3", "4", "5"], answerIndex: 1 },
  { id: "k2", grade: "K", topic: "counting", prompt: "Count the stars ⭐⭐⭐⭐⭐", choices: ["3", "4", "5", "6"], answerIndex: 2 },
  { id: "k3", grade: "K", topic: "addition", prompt: "1 + 1 = ?", choices: ["1", "2", "3", "4"], answerIndex: 1 },
  { id: "k4", grade: "K", topic: "addition", prompt: "2 + 1 = ?", choices: ["2", "3", "4", "5"], answerIndex: 1 },
  { id: "k5", grade: "K", topic: "comparison", prompt: "Which is bigger?", choices: ["3", "5", "2", "1"], answerIndex: 1 },
  { id: "k6", grade: "K", topic: "shapes", prompt: "How many sides does a triangle have?", choices: ["2", "3", "4", "5"], answerIndex: 1 },

  // Grade 1
  { id: "g1_1", grade: "1", topic: "addition", prompt: "5 + 3 = ?", choices: ["6", "7", "8", "9"], answerIndex: 2 },
  { id: "g1_2", grade: "1", topic: "addition", prompt: "4 + 6 = ?", choices: ["8", "9", "10", "11"], answerIndex: 2 },
  { id: "g1_3", grade: "1", topic: "subtraction", prompt: "9 − 4 = ?", choices: ["3", "4", "5", "6"], answerIndex: 2 },
  { id: "g1_4", grade: "1", topic: "subtraction", prompt: "7 − 3 = ?", choices: ["2", "3", "4", "5"], answerIndex: 2 },
  { id: "g1_5", grade: "1", topic: "comparison", prompt: "Which is smaller?", choices: ["8", "6", "9", "7"], answerIndex: 1 },
  { id: "g1_6", grade: "1", topic: "counting", prompt: "What comes after 12?", choices: ["11", "13", "14", "10"], answerIndex: 1 },

  // Grade 2
  { id: "g2_1", grade: "2", topic: "addition", prompt: "14 + 7 = ?", choices: ["20", "21", "22", "23"], answerIndex: 1 },
  { id: "g2_2", grade: "2", topic: "subtraction", prompt: "23 − 8 = ?", choices: ["13", "14", "15", "16"], answerIndex: 2 },
  { id: "g2_3", grade: "2", topic: "addition", prompt: "18 + 12 = ?", choices: ["28", "29", "30", "31"], answerIndex: 2 },
  { id: "g2_4", grade: "2", topic: "comparison", prompt: "Which is the largest?", choices: ["27", "72", "47", "67"], answerIndex: 1 },
  { id: "g2_5", grade: "2", topic: "subtraction", prompt: "30 − 15 = ?", choices: ["10", "12", "15", "20"], answerIndex: 2 },
  { id: "g2_6", grade: "2", topic: "shapes", prompt: "Sides on a hexagon?", choices: ["4", "5", "6", "8"], answerIndex: 2 },
];

export const ACADEMY_SUBJECTS: AcademySubject[] = [
  { id: "addition", name: "Addition Hall", emoji: "➕", description: "Stack and sum with sparkle.", color: "bg-[#FFF3D6]" },
  { id: "subtraction", name: "Subtraction Sanctum", emoji: "➖", description: "Take away with care.", color: "bg-[#FFE6D6]" },
  { id: "shapes", name: "Shape Atelier", emoji: "🔷", description: "Find sides and corners.", color: "bg-[#E8F4E1]" },
  { id: "counting", name: "Counting Cloister", emoji: "🔢", description: "Step by tiny step.", color: "bg-[#EEF2FB]" },
];

export const STARTER_EGGS: Egg[] = [
  {
    id: "aqua-egg",
    name: "Aqua Egg",
    hatchesIntoCompanionId: "bubblefin",
    progress: 0,
    emoji: "🥚",
    palette: { from: "#DCEEF7", to: "#7BB7D6" },
    hatched: false,
  },
  {
    id: "stardust-egg",
    name: "Stardust Egg",
    hatchesIntoCompanionId: "twinklet",
    progress: 0,
    emoji: "🥚",
    palette: { from: "#FFF3D6", to: "#F4C753" },
    hatched: false,
  },
];

export const AVATAR_OPTIONS = {
  skin: ["#FFE0BD", "#F4C7A1", "#D9A074", "#A87149", "#7A4B2A"],
  hair: ["tuft", "braids", "bowl", "puff", "spike"],
  hairColor: ["#3E2A1F", "#8C5A2B", "#D4A373", "#9D8DF1", "#F4C753", "#FF9F68"],
  outfit: ["#9D8DF1", "#86A789", "#F4C753", "#FF9F68", "#D4A373", "#7BB7D6"],
  accessory: ["none", "glasses", "crown", "headband", "wizard-hat"],
} as const;
