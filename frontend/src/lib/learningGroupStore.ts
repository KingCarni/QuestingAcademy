import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EduMatesUserRole = "parent" | "teacher" | "homeschool-parent" | "tutor" | "student" | "admin";
export type LearningGroupType = "classroom" | "homeschool" | "tutoring" | "pod" | "intervention";
export type LearningGroupStatus = "active" | "paused" | "archived";

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
  classPetMood: "happy" | "focused" | "sleepy" | "excited";
  learnerIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface LearningGroupStore {
  currentRole: EduMatesUserRole;
  groups: LearningGroup[];
  learners: LearningGroupLearner[];
  selectedGroupId: string;
  setCurrentRole: (role: EduMatesUserRole) => void;
  selectGroup: (id: string) => void;
  createGroup: (input: Pick<LearningGroup, "name" | "type" | "ownerRole" | "gradeBand">) => void;
  updateGroup: (id: string, patch: Partial<LearningGroup>) => void;
}

const nowISO = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const seedLearners: LearningGroupLearner[] = [
  { id: "learner-1", name: "Ari", grade: "2", avatarEmoji: "🦊", accuracy: 86, minutesThisWeek: 42, questsCompleted: 4, lastActiveLabel: "Today" },
  { id: "learner-2", name: "Mina", grade: "3", avatarEmoji: "🐰", accuracy: 78, minutesThisWeek: 35, questsCompleted: 3, lastActiveLabel: "Yesterday" },
  { id: "learner-3", name: "Leo", grade: "2", avatarEmoji: "🐻", accuracy: 91, minutesThisWeek: 58, questsCompleted: 5, lastActiveLabel: "Today" },
  { id: "learner-4", name: "Sam", grade: "4", avatarEmoji: "🐸", accuracy: 72, minutesThisWeek: 21, questsCompleted: 2, lastActiveLabel: "2 days ago" },
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
    learnerIds: ["learner-1", "learner-4"],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

export const useLearningGroupStore = create<LearningGroupStore>()(
  persist(
    (set, get) => ({
      currentRole: "teacher",
      groups: seedGroups,
      learners: seedLearners,
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
          learnerIds: [],
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set({ groups: [created, ...get().groups], selectedGroupId: created.id, currentRole: input.ownerRole });
      },
      updateGroup: (id, patch) => set({
        groups: get().groups.map((group) => group.id === id ? { ...group, ...patch, updatedAt: nowISO() } : group),
      }),
    }),
    {
      name: "edu-mates-learning-groups-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const getGroupLearners = (group: LearningGroup | null | undefined, learners: LearningGroupLearner[]): LearningGroupLearner[] => {
  if (!group) return [];
  return learners.filter((learner) => group.learnerIds.includes(learner.id));
};
