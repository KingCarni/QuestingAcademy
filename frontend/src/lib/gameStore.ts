import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Player,
  AvatarConfig,
  Grade,
  Egg,
  AcademyAssignment,
  ParentReport,
  BattleStats,
  TrickyEntry,
  GameSettings,
  Question,
} from "./types";
import { STARTER_EGGS } from "./mockData";
import { generateQuestion } from "./questionEngine";

// TODO(backend): swap zustand+localStorage for API + auth-bound state when backend exists.

interface GameState {
  player: Player | null;
  eggs: Egg[];
  academy: AcademyAssignment[];
  parent: ParentReport;
  battleStats: BattleStats;
  tricky: TrickyEntry[];
  settings: GameSettings;

  // Setup actions
  setGrade: (g: Grade) => void;
  setAvatar: (a: AvatarConfig) => void;
  pickStarter: (companionId: string) => void;
  resetAll: () => void;

  // Gameplay
  awardBattle: (xp: number, coins: number, eggProgress: number) => { leveledUp: boolean; newLevel: number };
  trackQuestion: (correct: boolean, topic: string, timeSec: number) => void;
  setActiveCompanion: (companionId: string) => void;
  assignCompanionToSubject: (subjectId: string, companionId: string | null) => void;
  hatchIfReady: () => string[];

  // Question pipeline (procedural + spaced repetition)
  nextQuestion: () => Question;
  recordWrong: (q: Question) => void;
  recordCorrect: (q: Question) => void;

  // Settings
  setSubjectMode: (m: GameSettings["subjectMode"]) => void;
  toggleTemplate: (id: string, enabled: boolean) => void;
  setSoundOn: (on: boolean) => void;

  // Admin / debug helpers
  adminUpdatePlayer: (patch: Partial<Player>) => void;
  adminGrantCompanion: (id: string) => void;
  adminRevokeCompanion: (id: string) => void;
  adminSetEggProgress: (eggId: string, progress: number, hatched?: boolean) => void;
  adminResetEggs: () => void;
  adminClearTricky: () => void;
}

const baseParent: ParentReport = {
  questionsAnswered: 0,
  correctAnswers: 0,
  timePlayedMinutes: 0,
  topicsPracticed: [],
  recentSessions: [],
  highlights: [],
};

const baseAcademy: AcademyAssignment[] = [
  { subjectId: "addition", companionId: null, progress: 0 },
  { subjectId: "subtraction", companionId: null, progress: 0 },
  { subjectId: "multiplication", companionId: null, progress: 0 },
  { subjectId: "fractions", companionId: null, progress: 0 },
  { subjectId: "shapes", companionId: null, progress: 0 },
  { subjectId: "counting", companionId: null, progress: 0 },
  { subjectId: "reading-vocab", companionId: null, progress: 0 },
  { subjectId: "rhyming", companionId: null, progress: 0 },
];

const baseSettings: GameSettings = {
  subjectMode: "mixed",
  disabledTemplateIds: [],
  soundOn: true,
};

const newPlayer = (): Player => ({
  id: "local-" + Date.now(),
  name: "",
  grade: "K",
  avatar: {
    skin: "#FFE0BD",
    hair: "tuft",
    hairColor: "#8C5A2B",
    outfit: "#9D8DF1",
    accessory: "none",
    name: "",
  },
  level: 1,
  xp: 0,
  xpToNext: 60,
  coins: 25,
  starterCompanionId: null,
  ownedCompanionIds: [],
  activeCompanionId: null,
  createdAt: new Date().toISOString(),
});

// Spaced repetition cadence (in questions answered) per stage.
const STAGE_INTERVAL = [2, 5, 10, 20]; // graduate after stage >= 4

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      player: null,
      eggs: STARTER_EGGS,
      academy: baseAcademy,
      parent: baseParent,
      battleStats: { totalBattles: 0, totalQuestions: 0, totalCorrect: 0 },
      tricky: [],
      settings: baseSettings,

      setGrade: (g) =>
        set((s) => {
          const p = s.player ?? newPlayer();
          return { player: { ...p, grade: g } };
        }),

      setAvatar: (a) =>
        set((s) => {
          const p = s.player ?? newPlayer();
          return { player: { ...p, avatar: a, name: a.name || p.name } };
        }),

      pickStarter: (companionId) =>
        set((s) => {
          const p = s.player ?? newPlayer();
          return {
            player: {
              ...p,
              starterCompanionId: companionId,
              activeCompanionId: companionId,
              ownedCompanionIds: Array.from(new Set([...p.ownedCompanionIds, companionId])),
            },
          };
        }),

      resetAll: () =>
        set({
          player: null,
          eggs: STARTER_EGGS,
          academy: baseAcademy,
          parent: baseParent,
          battleStats: { totalBattles: 0, totalQuestions: 0, totalCorrect: 0 },
          tricky: [],
          settings: baseSettings,
        }),

      awardBattle: (xp, coins, eggProgress) => {
        const before = get();
        if (!before.player) return { leveledUp: false, newLevel: 1 };
        let nxp = before.player.xp + xp;
        let level = before.player.level;
        let xpToNext = before.player.xpToNext;
        let leveledUp = false;
        while (nxp >= xpToNext) {
          nxp -= xpToNext;
          level += 1;
          xpToNext = Math.floor(xpToNext * 1.25);
          leveledUp = true;
        }
        const eggs = before.eggs.map((e) =>
          e.hatched ? e : { ...e, progress: Math.min(100, e.progress + eggProgress) }
        );
        set({
          player: { ...before.player, xp: nxp, level, xpToNext, coins: before.player.coins + coins },
          eggs,
          battleStats: { ...before.battleStats, totalBattles: before.battleStats.totalBattles + 1 },
        });
        return { leveledUp, newLevel: level };
      },

      trackQuestion: (correct, topic, timeSec) =>
        set((s) => {
          const topicsPracticed = Array.from(new Set([...s.parent.topicsPracticed, topic]));
          const today = new Date().toISOString().slice(0, 10);
          const sessions = [...s.parent.recentSessions];
          const idx = sessions.findIndex((x) => x.date === today);
          const newQ = s.parent.questionsAnswered + 1;
          const newC = s.parent.correctAnswers + (correct ? 1 : 0);
          const acc = newQ ? Math.round((newC / newQ) * 100) : 0;
          const minutesAdded = +(timeSec / 60).toFixed(2);
          if (idx >= 0) {
            sessions[idx] = {
              ...sessions[idx],
              minutes: +(sessions[idx].minutes + minutesAdded).toFixed(2),
              accuracy: acc,
            };
          } else {
            sessions.push({ date: today, minutes: minutesAdded, accuracy: acc });
          }
          // Academy: map question topic → subject id used in academy assignments
          const subjectId = mapTopicToSubject(topic);
          const academy = subjectId
            ? s.academy.map((a) =>
                a.subjectId === subjectId
                  ? { ...a, progress: Math.min(100, a.progress + (correct ? 8 : 2)) }
                  : a
              )
            : s.academy;
          const highlights = [...s.parent.highlights];
          if (newC === 5 && !highlights.includes("First 5 correct! 🌟")) {
            highlights.push("First 5 correct! 🌟");
          }
          if (acc >= 80 && newQ >= 10 && !highlights.includes("Sharp scholar streak ✨")) {
            highlights.push("Sharp scholar streak ✨");
          }
          return {
            parent: {
              ...s.parent,
              questionsAnswered: newQ,
              correctAnswers: newC,
              topicsPracticed,
              recentSessions: sessions.slice(-7),
              timePlayedMinutes: +(s.parent.timePlayedMinutes + minutesAdded).toFixed(2),
              highlights,
            },
            academy,
            battleStats: {
              ...s.battleStats,
              totalQuestions: s.battleStats.totalQuestions + 1,
              totalCorrect: s.battleStats.totalCorrect + (correct ? 1 : 0),
            },
          };
        }),

      setActiveCompanion: (companionId) =>
        set((s) => (s.player ? { player: { ...s.player, activeCompanionId: companionId } } : s)),

      assignCompanionToSubject: (subjectId, companionId) =>
        set((s) => ({
          academy: s.academy.map((a) =>
            a.subjectId === subjectId ? { ...a, companionId } : a
          ),
        })),

      hatchIfReady: () => {
        const state = get();
        const hatched: string[] = [];
        const eggs = state.eggs.map((e) => {
          if (!e.hatched && e.progress >= 100) {
            hatched.push(e.hatchesIntoCompanionId);
            return { ...e, hatched: true };
          }
          return e;
        });
        if (hatched.length && state.player) {
          set({
            eggs,
            player: {
              ...state.player,
              ownedCompanionIds: Array.from(
                new Set([...state.player.ownedCompanionIds, ...hatched])
              ),
            },
          });
        }
        return hatched;
      },

      // -- Question pipeline ----------------------------------------------------
      nextQuestion: () => {
        const s = get();
        const grade = s.player?.grade ?? "K";
        const idx = s.battleStats.totalQuestions;
        // Pull from tricky pool if any entry is due. Probability scales with pool size
        // so QA + kids visibly see the spaced-repetition chip after a wrong answer.
        const due = s.tricky.filter((t) => t.resurfaceAtIndex <= idx);
        if (due.length) {
          const prob = Math.min(0.95, 0.75 + due.length * 0.05);
          if (Math.random() < prob) {
            const entry = due[Math.floor(Math.random() * due.length)];
            return { ...entry.question, source: "tricky" };
          }
        }
        const acc = s.battleStats.totalQuestions
          ? s.battleStats.totalCorrect / s.battleStats.totalQuestions
          : 0.6;
        return generateQuestion(grade, s.settings.subjectMode, s.settings.disabledTemplateIds, acc);
      },

      recordWrong: (q) =>
        set((s) => {
          // Only track template-generated or tricky questions
          if (q.source !== "template" && q.source !== "tricky") return {};
          const idx = s.battleStats.totalQuestions;
          // If already in tricky pool, demote stage to 0 and schedule sooner.
          const existing = s.tricky.find((t) => t.question.templateId === q.templateId && t.question.prompt === q.prompt);
          if (existing) {
            const next = s.tricky.map((t) =>
              t === existing ? { ...t, stage: 0, addedAtIndex: idx, resurfaceAtIndex: idx + STAGE_INTERVAL[0] } : t
            );
            return { tricky: next };
          }
          const entry: TrickyEntry = {
            question: { ...q },
            stage: 0,
            addedAtIndex: idx,
            resurfaceAtIndex: idx + STAGE_INTERVAL[0],
          };
          // Cap size to avoid runaway storage
          const trimmed = [...s.tricky, entry].slice(-50);
          return { tricky: trimmed };
        }),

      recordCorrect: (q) =>
        set((s) => {
          const idx = s.battleStats.totalQuestions;
          const existing = s.tricky.find(
            (t) => t.question.templateId === q.templateId && t.question.prompt === q.prompt
          );
          if (!existing) return {};
          const nextStage = existing.stage + 1;
          if (nextStage >= STAGE_INTERVAL.length) {
            // Graduate — remove
            return { tricky: s.tricky.filter((t) => t !== existing) };
          }
          return {
            tricky: s.tricky.map((t) =>
              t === existing
                ? { ...t, stage: nextStage, resurfaceAtIndex: idx + STAGE_INTERVAL[nextStage] }
                : t
            ),
          };
        }),

      // -- Settings -----------------------------------------------------------
      setSubjectMode: (m) => set((s) => ({ settings: { ...s.settings, subjectMode: m } })),
      toggleTemplate: (id, enabled) =>
        set((s) => {
          const cur = new Set(s.settings.disabledTemplateIds);
          if (enabled) cur.delete(id);
          else cur.add(id);
          return { settings: { ...s.settings, disabledTemplateIds: Array.from(cur) } };
        }),
      setSoundOn: (on) => set((s) => ({ settings: { ...s.settings, soundOn: on } })),

      // -- Admin --------------------------------------------------------------
      adminUpdatePlayer: (patch) =>
        set((s) => (s.player ? { player: { ...s.player, ...patch } } : s)),
      adminGrantCompanion: (id) =>
        set((s) =>
          s.player
            ? {
                player: {
                  ...s.player,
                  ownedCompanionIds: Array.from(new Set([...s.player.ownedCompanionIds, id])),
                },
              }
            : s
        ),
      adminRevokeCompanion: (id) =>
        set((s) =>
          s.player
            ? {
                player: {
                  ...s.player,
                  ownedCompanionIds: s.player.ownedCompanionIds.filter((c) => c !== id),
                  activeCompanionId: s.player.activeCompanionId === id ? null : s.player.activeCompanionId,
                },
              }
            : s
        ),
      adminSetEggProgress: (eggId, progress, hatched) =>
        set((s) => ({
          eggs: s.eggs.map((e) =>
            e.id === eggId
              ? { ...e, progress: Math.max(0, Math.min(100, progress)), hatched: hatched ?? e.hatched }
              : e
          ),
        })),
      adminResetEggs: () => set({ eggs: STARTER_EGGS }),
      adminClearTricky: () => set({ tricky: [] }),
    }),
    {
      name: "questing-academy-state-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Map free-form topic strings → academy subject ids so progress increments correctly.
function mapTopicToSubject(topic: string): string | null {
  switch (topic) {
    case "addition": return "addition";
    case "subtraction": return "subtraction";
    case "multiplication": return "multiplication";
    case "division": return "multiplication"; // share with multiplication hall
    case "fractions": return "fractions";
    case "percents": return "fractions";
    case "shapes": return "shapes";
    case "counting": return "counting";
    case "comparison": return "counting";
    case "algebra": return "fractions";
    case "rhyming": return "rhyming";
    case "letter-sounds": return "reading-vocab";
    case "vocabulary": return "reading-vocab";
    default: return null;
  }
}
