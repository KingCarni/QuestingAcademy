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
} from "./types";
import { STARTER_EGGS } from "./mockData";

// TODO(backend): swap zustand+localStorage for API + auth-bound state when backend exists.

interface GameState {
  player: Player | null;
  eggs: Egg[];
  academy: AcademyAssignment[];
  parent: ParentReport;
  battleStats: BattleStats;

  // Setup actions
  setGrade: (g: Grade) => void;
  setAvatar: (a: AvatarConfig) => void;
  pickStarter: (companionId: string) => void;
  resetAll: () => void;

  // Gameplay actions
  awardBattle: (xp: number, coins: number, eggProgress: number) => void;
  trackQuestion: (correct: boolean, topic: string, timeSec: number) => void;
  setActiveCompanion: (companionId: string) => void;
  assignCompanionToSubject: (subjectId: string, companionId: string | null) => void;
  hatchIfReady: () => string[]; // returns newly hatched companion ids
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
  { subjectId: "shapes", companionId: null, progress: 0 },
  { subjectId: "counting", companionId: null, progress: 0 },
];

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

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      player: null,
      eggs: STARTER_EGGS,
      academy: baseAcademy,
      parent: baseParent,
      battleStats: { totalBattles: 0, totalQuestions: 0, totalCorrect: 0 },

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
        }),

      awardBattle: (xp, coins, eggProgress) =>
        set((s) => {
          if (!s.player) return s;
          let nxp = s.player.xp + xp;
          let level = s.player.level;
          let xpToNext = s.player.xpToNext;
          while (nxp >= xpToNext) {
            nxp -= xpToNext;
            level += 1;
            xpToNext = Math.floor(xpToNext * 1.25);
          }
          const eggs = s.eggs.map((e) =>
            e.hatched ? e : { ...e, progress: Math.min(100, e.progress + eggProgress) }
          );
          return {
            player: { ...s.player, xp: nxp, level, xpToNext, coins: s.player.coins + coins },
            eggs,
            battleStats: { ...s.battleStats, totalBattles: s.battleStats.totalBattles + 1 },
          };
        }),

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
          // Bump academy progress on correct answers
          const academy = s.academy.map((a) =>
            a.subjectId === topic
              ? { ...a, progress: Math.min(100, a.progress + (correct ? 8 : 2)) }
              : a
          );
          // bonus highlight
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
        set((s) =>
          s.player ? { player: { ...s.player, activeCompanionId: companionId } } : s
        ),

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
    }),
    {
      name: "questing-academy-state-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
