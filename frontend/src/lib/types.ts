// Core domain types for Questing Academy frontend MVP.
// TODO(backend): Replace local-only types with shared API contracts when backend is available.

export type Grade = "K" | "1" | "2";

export type Affinity = "nature" | "fire" | "earth";
export type Personality = "friendly-support" | "bold-attacker" | "calm-defensive";

export interface AvatarConfig {
  skin: string;
  hair: string;
  hairColor: string;
  outfit: string;
  accessory: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  grade: Grade;
  avatar: AvatarConfig;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  starterCompanionId: string | null;
  ownedCompanionIds: string[];
  activeCompanionId: string | null;
  createdAt: string;
}

export interface Companion {
  id: string;
  name: string;
  affinity: Affinity;
  personality: Personality;
  emoji: string;
  tagline: string;
  description: string;
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  palette: {
    bg: string;       // tailwind bg class
    ring: string;     // tailwind border class
    accent: string;   // tailwind text color class
    glow: string;     // hex glow color
  };
  starter?: boolean;
}

export interface Question {
  id: string;
  grade: Grade;
  topic: "addition" | "subtraction" | "counting" | "comparison" | "shapes";
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export interface Enemy {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  reward: { xp: number; coins: number; eggProgress: number };
}

export interface Egg {
  id: string;
  name: string;
  hatchesIntoCompanionId: string;
  progress: number;     // 0..100
  emoji: string;
  palette: { from: string; to: string };
  hatched: boolean;
}

export interface AcademyAssignment {
  subjectId: string;
  companionId: string | null;
  progress: number; // 0..100
}

export interface AcademySubject {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string; // tailwind bg
}

export interface ParentReport {
  questionsAnswered: number;
  correctAnswers: number;
  timePlayedMinutes: number;
  topicsPracticed: string[];
  recentSessions: { date: string; minutes: number; accuracy: number }[];
  highlights: string[];
}

export interface BattleStats {
  totalBattles: number;
  totalQuestions: number;
  totalCorrect: number;
}
