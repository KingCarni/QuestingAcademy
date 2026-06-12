import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EduMatesUserRole = "parent" | "teacher" | "homeschool-parent" | "tutor" | "student" | "admin";
export type LearningGroupType = "classroom" | "homeschool" | "tutoring" | "pod" | "intervention";
export type LearningGroupStatus = "active" | "paused" | "archived";
export type AssignmentStatus = "draft" | "assigned" | "completed";
export type AssignmentDifficulty = "gentle" | "standard" | "challenge";
export type ClassPetMood = "happy" | "focused" | "sleepy" | "excited" | "proud";

export const EDU_MATES_ROLE_LABELS: Record<EduMatesUserRole, string> = {
  parent: "Parent",
  teacher: "Teacher",
  "homeschool-parent": "Homeschool parent",
  tutor: "Tutor",
  student: "Student",
  admin: "Admin",
};

export const LEARNING_GROUP_TYPE_LABELS: Record<LearningGroupType, string> = {
  classroom: "Classroom",
  homeschool: "Homeschool room",
  tutoring: "Tutoring group",
  pod: "Learning pod",
  intervention: "Intervention group",
};

export interface LearningGroupLearner {
  id: string;
  name: string;
  grade: string;
  avatarEmoji: string;
  accuracy: number;
  minutesThisWeek: number;
  questsCompleted: number;
  lastActiveLabel: string;
  streakDays: number;
  needsSupport: string[];
  strengths: string[];
}

export interface LearningGroupAssignment {
  id: string;
  groupId: string;
  title: string;
  subject: string;
  skill: string;
  questionCount: number;
  difficulty: AssignmentDifficulty;
  status: AssignmentStatus;
  dueLabel: string;
  completionPercent: number;
  averageAccuracy: number;
  createdAt: string;
}

export interface LearningGroup {
  id: string;
  name: string;
  type: LearningGroupType;
  ownerRole: EduMatesUserRole;
  status: LearningGroupStatus;
  gradeBand: string;
  subjectFocus: string[];
  activeQuest: string;
  activeRealm: string;
  classPetName: string;
  classPetMood: ClassPetMood;
  classPetLevel: number;
  classPetXp: number;
  classPetXpGoal: number;
  classPetTreats: number;
  learnerIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface LearningGroupStore {
  currentRole: EduMatesUserRole;
  groups: LearningGroup[];
  learners: LearningGroupLearner[];
  assignments: LearningGroupAssignment[];
  selectedGroupId: string;
  setCurrentRole: (role: EduMatesUserRole) => void;
  selectGroup: (id: string) => void;
  createGroup: (input: Pick<LearningGroup, "name" | "type" | "ownerRole" | "gradeBand">) => void;
  updateGroup: (id: string, patch: Partial<LearningGroup>) => void;
  createAssignment: (input: Pick<LearningGroupAssignment, "groupId" | "title" | "subject" | "skill" | "questionCount" | "difficulty" | "dueLabel">) => void;
  addLearnerToGroup: (groupId: string, input: Pick<LearningGroupLearner, "name" | "grade" | "avatarEmoji">) => void;
  giveClassPetReward: (groupId: string, amount?: number) => void;
}

const nowISO = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const seedLearners: LearningGroupLearner[] = [
  { id: "learner-1", name: "Ari", grade: "2", avatarEmoji: "🦊", accuracy: 86, minutesThisWeek: 42, questsCompleted: 4, lastActiveLabel: "Today", streakDays: 5, needsSupport: ["subtraction regrouping"], strengths: ["addition", "story problems"] },
  { id: "learner-2", name: "Mina", grade: "3", avatarEmoji: "🐰", accuracy: 78, minutesThisWeek: 35, questsCompleted: 3, lastActiveLabel: "Yesterday", streakDays: 3, needsSupport: ["reading fluency"], strengths: ["patterns", "vocabulary"] },
  { id: "learner-3", name: "Leo", grade: "2", avatarEmoji: "🐻", accuracy: 91, minutesThisWeek: 58, questsCompleted: 5, lastActiveLabel: "Today", streakDays: 7, needsSupport: [], strengths: ["number sense", "mental math"] },
  { id: "learner-4", name: "Sam", grade: "4", avatarEmoji: "🐸", accuracy: 72, minutesThisWeek: 21, questsCompleted: 2, lastActiveLabel: "2 days ago", streakDays: 1, needsSupport: ["fractions", "focus time"], strengths: ["science words"] },
];

const seedGroups: LearningGroup[] = [
  {
    id: "group-meadow-class",
    name: "Meadow Math Circle",
    type: "classroom",
    ownerRole: "teacher",
    status: "active",
    gradeBand: "Grades 2-3",
    subjectFocus: ["Addition", "Reading fluency"],
    activeQuest: "First Friend Forever",
    activeRealm: "Meadowfall Grove",
    classPetName: "Spriggle",
    classPetMood: "happy",
    classPetLevel: 2,
    classPetXp: 65,
    classPetXpGoal: 100,
    classPetTreats: 4,
    learnerIds: ["learner-1", "learner-2", "learner-3"],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: "group-homeschool-room",
    name: "Johnson Homeschool Room",
    type: "homeschool",
    ownerRole: "homeschool-parent",
    status: "active",
    gradeBand: "Mixed K-4",
    subjectFocus: ["Number sense", "Story comprehension"],
    activeQuest: "Hatchery Helpers",
    activeRealm: "Cozy Hatchery",
    classPetName: "Bubblefin",
    classPetMood: "excited",
    classPetLevel: 1,
    classPetXp: 35,
    classPetXpGoal: 100,
    classPetTreats: 2,
    learnerIds: ["learner-1", "learner-4"],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

const seedAssignments: LearningGroupAssignment[] = [
  { id: "assignment-1", groupId: "group-meadow-class", title: "Meadow Addition Sprint", subject: "Math", skill: "Addition", questionCount: 10, difficulty: "standard", status: "assigned", dueLabel: "Friday", completionPercent: 67, averageAccuracy: 84, createdAt: nowISO() },
  { id: "assignment-2", groupId: "group-meadow-class", title: "Read With Spriggle", subject: "Reading", skill: "Fluency", questionCount: 8, difficulty: "gentle", status: "draft", dueLabel: "Next week", completionPercent: 0, averageAccuracy: 0, createdAt: nowISO() },
  { id: "assignment-3", groupId: "group-homeschool-room", title: "Cozy Number Quest", subject: "Math", skill: "Number sense", questionCount: 12, difficulty: "standard", status: "assigned", dueLabel: "Tomorrow", completionPercent: 50, averageAccuracy: 76, createdAt: nowISO() },
];

export const useLearningGroupStore = create<LearningGroupStore>()(
  persist(
    (set, get) => ({
      currentRole: "teacher",
      groups: seedGroups,
      learners: seedLearners,
      assignments: seedAssignments,
      selectedGroupId: seedGroups[0]?.id || "",
      setCurrentRole: (role) => set({ currentRole: role }),
      selectGroup: (id) => set({ selectedGroupId: id }),
      createGroup: (input) => {
        const created: LearningGroup = {
          id: makeId("group"),
          name: input.name.trim() || "New Edu-Mates group",
          type: input.type,
          ownerRole: input.ownerRole,
          status: "active",
          gradeBand: input.gradeBand.trim() || "Mixed grades",
          subjectFocus: ["Math", "Reading"],
          activeQuest: "No assignment yet",
          activeRealm: "Meadowfall Grove",
          classPetName: "Spriggle",
          classPetMood: "focused",
          classPetLevel: 1,
          classPetXp: 0,
          classPetXpGoal: 100,
          classPetTreats: 1,
          learnerIds: [],
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set({ groups: [created, ...get().groups], selectedGroupId: created.id, currentRole: input.ownerRole });
      },
      updateGroup: (id, patch) => set({
        groups: get().groups.map((group) => group.id === id ? { ...group, ...patch, updatedAt: nowISO() } : group),
      }),
      createAssignment: (input) => {
        const created: LearningGroupAssignment = {
          id: makeId("assignment"),
          groupId: input.groupId,
          title: input.title.trim() || "New Edu-Mates assignment",
          subject: input.subject.trim() || "Math",
          skill: input.skill.trim() || "Practice",
          questionCount: Math.max(1, Math.round(Number(input.questionCount) || 10)),
          difficulty: input.difficulty,
          status: "assigned",
          dueLabel: input.dueLabel.trim() || "This week",
          completionPercent: 0,
          averageAccuracy: 0,
          createdAt: nowISO(),
        };
        set({
          assignments: [created, ...get().assignments],
          groups: get().groups.map((group) => group.id === input.groupId ? { ...group, activeQuest: created.title, subjectFocus: [created.skill, created.subject], updatedAt: nowISO() } : group),
        });
      },
      addLearnerToGroup: (groupId, input) => {
        const created: LearningGroupLearner = {
          id: makeId("learner"),
          name: input.name.trim() || "New learner",
          grade: input.grade.trim() || "2",
          avatarEmoji: input.avatarEmoji.trim() || "🧒",
          accuracy: 0,
          minutesThisWeek: 0,
          questsCompleted: 0,
          lastActiveLabel: "Just added",
          streakDays: 0,
          needsSupport: ["baseline needed"],
          strengths: [],
        };
        set({
          learners: [created, ...get().learners],
          groups: get().groups.map((group) => group.id === groupId ? { ...group, learnerIds: [created.id, ...group.learnerIds], updatedAt: nowISO() } : group),
        });
      },
      giveClassPetReward: (groupId, amount = 10) => set({
        groups: get().groups.map((group) => {
          if (group.id !== groupId) return group;
          const nextXp = group.classPetXp + amount;
          const leveled = nextXp >= group.classPetXpGoal;
          return {
            ...group,
            classPetXp: leveled ? nextXp - group.classPetXpGoal : nextXp,
            classPetLevel: leveled ? group.classPetLevel + 1 : group.classPetLevel,
            classPetMood: leveled ? "proud" : "excited",
            classPetTreats: group.classPetTreats + 1,
            updatedAt: nowISO(),
          };
        }),
      }),
    }),
    {
      name: "edu-mates-learning-groups-v2",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const getGroupLearners = (group: LearningGroup | null | undefined, learners: LearningGroupLearner[]): LearningGroupLearner[] => {
  if (!group) return [];
  return learners.filter((learner) => group.learnerIds.includes(learner.id));
};

export const getGroupAssignments = (group: LearningGroup | null | undefined, assignments: LearningGroupAssignment[]): LearningGroupAssignment[] => {
  if (!group) return [];
  return assignments.filter((assignment) => assignment.groupId === group.id);
};
