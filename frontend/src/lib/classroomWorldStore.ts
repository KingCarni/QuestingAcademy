import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ClassroomWorldStatus = "active" | "paused" | "archived";
export type ClassroomMemberRole = "student" | "teacher" | "helper";
export type ClassroomMemberStatus = "active" | "pending" | "removed";
export type ClassroomRoomTheme = "meadow" | "hatchery" | "library" | "crystal-cave" | "sky-dock";
export type ClassroomPrivacyMode = "invite-only" | "school-only" | "closed";
export type ClassroomRewardType = "xp" | "treat" | "coin" | "badge";

export interface ClassroomMember {
  id: string;
  classroomId: string;
  learnerId: string;
  displayName: string;
  role: ClassroomMemberRole;
  status: ClassroomMemberStatus;
  joinedAt: string;
}

export interface ClassroomPetState {
  petId: string;
  petName: string;
  petEmoji: string;
  level: number;
  xp: number;
  xpGoal: number;
  mood: "happy" | "focused" | "excited" | "proud" | "sleepy";
  treats: number;
}

export interface ClassroomRoomState {
  theme: ClassroomRoomTheme;
  roomName: string;
  decorationIds: string[];
  lastVisitedAt: string;
}

export interface ClassroomAssignmentRef {
  id: string;
  assignmentId: string;
  title: string;
  subject: string;
  skill: string;
  status: "draft" | "review" | "approved" | "assigned" | "completed";
}

export interface ClassroomRewardLog {
  id: string;
  classroomId: string;
  memberId?: string;
  type: ClassroomRewardType;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface ClassroomGoal {
  id: string;
  classroomId: string;
  subject: string;
  skill: string;
  target: string;
  progressPercent: number;
  createdAt: string;
}

export interface ClassroomEvent {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  startsAtLabel: string;
  status: "planned" | "active" | "complete";
}

export interface ClassroomPrivacySettings {
  mode: ClassroomPrivacyMode;
  requireTeacherApproval: boolean;
  showLeaderboard: boolean;
  allowStudentNicknames: boolean;
}

export interface ClassroomWorld {
  id: string;
  teacherId: string;
  teacherName: string;
  name: string;
  joinCode: string;
  gradeBand: string;
  subjectFocus: string[];
  status: ClassroomWorldStatus;
  privacy: ClassroomPrivacySettings;
  pet: ClassroomPetState;
  room: ClassroomRoomState;
  assignmentRefs: ClassroomAssignmentRef[];
  goalIds: string[];
  eventIds: string[];
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface ClassroomWorldStore {
  classrooms: ClassroomWorld[];
  members: ClassroomMember[];
  rewardLogs: ClassroomRewardLog[];
  goals: ClassroomGoal[];
  events: ClassroomEvent[];
  selectedClassroomId: string;
  createClassroom: (input: Pick<ClassroomWorld, "name" | "gradeBand" | "subjectFocus"> & { teacherId?: string; teacherName?: string; theme?: ClassroomRoomTheme }) => ClassroomWorld;
  selectClassroom: (id: string) => void;
  joinClassroomByCode: (input: { joinCode: string; learnerId: string; displayName: string }) => { ok: boolean; message: string; classroomId?: string };
  addRewardLog: (input: Pick<ClassroomRewardLog, "classroomId" | "type" | "amount" | "reason"> & { memberId?: string }) => void;
}

const nowISO = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeJoinCode = (existingCodes: string[]): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    if (!existingCodes.includes(code)) return code;
  }
  return `QA${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const seedClassrooms: ClassroomWorld[] = [
  {
    id: "classroom-meadow-math",
    teacherId: "teacher-demo",
    teacherName: "Ms. Rowan",
    name: "Meadow Math Circle",
    joinCode: "MEADOW",
    gradeBand: "Grades 2-3",
    subjectFocus: ["Math", "Reading"],
    status: "active",
    privacy: { mode: "invite-only", requireTeacherApproval: false, showLeaderboard: false, allowStudentNicknames: true },
    pet: { petId: "embercub", petName: "Embercub", petEmoji: "🔥", level: 2, xp: 65, xpGoal: 100, mood: "happy", treats: 4 },
    room: { theme: "meadow", roomName: "Meadowfall Homeroom", decorationIds: ["rug-leaf", "banner-stars"], lastVisitedAt: nowISO() },
    assignmentRefs: [
      { id: "cw-assignment-1", assignmentId: "assignment-1", title: "Meadow Addition Sprint", subject: "Math", skill: "Addition", status: "assigned" },
    ],
    goalIds: ["cw-goal-1"],
    eventIds: ["cw-event-1"],
    memberIds: ["cw-member-1", "cw-member-2"],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

const seedMembers: ClassroomMember[] = [
  { id: "cw-member-1", classroomId: "classroom-meadow-math", learnerId: "learner-1", displayName: "Ari", role: "student", status: "active", joinedAt: nowISO() },
  { id: "cw-member-2", classroomId: "classroom-meadow-math", learnerId: "learner-2", displayName: "Mina", role: "student", status: "active", joinedAt: nowISO() },
];

const seedGoals: ClassroomGoal[] = [
  { id: "cw-goal-1", classroomId: "classroom-meadow-math", subject: "Math", skill: "Addition", target: "Reach 90% accuracy as a class", progressPercent: 68, createdAt: nowISO() },
];

const seedEvents: ClassroomEvent[] = [
  { id: "cw-event-1", classroomId: "classroom-meadow-math", title: "Friday Treat Sprint", description: "Earn class pet treats by completing approved assignments.", startsAtLabel: "Friday", status: "planned" },
];

export const useClassroomWorldStore = create<ClassroomWorldStore>()(
  persist(
    (set, get) => ({
      classrooms: seedClassrooms,
      members: seedMembers,
      rewardLogs: [],
      goals: seedGoals,
      events: seedEvents,
      selectedClassroomId: seedClassrooms[0]?.id || "",
      createClassroom: (input) => {
        const joinCode = makeJoinCode(get().classrooms.map((classroom) => classroom.joinCode));
        const created: ClassroomWorld = {
          id: makeId("classroom"),
          teacherId: input.teacherId || "teacher-demo",
          teacherName: input.teacherName || "Demo Teacher",
          name: input.name.trim() || "New Classroom World",
          joinCode,
          gradeBand: input.gradeBand.trim() || "Mixed grades",
          subjectFocus: input.subjectFocus.length ? input.subjectFocus : ["Math"],
          status: "active",
          privacy: { mode: "invite-only", requireTeacherApproval: false, showLeaderboard: false, allowStudentNicknames: true },
          pet: { petId: "embercub", petName: "Embercub", petEmoji: "🔥", level: 1, xp: 0, xpGoal: 100, mood: "focused", treats: 1 },
          room: { theme: input.theme || "meadow", roomName: `${input.name.trim() || "New"} Homeroom`, decorationIds: [], lastVisitedAt: nowISO() },
          assignmentRefs: [],
          goalIds: [],
          eventIds: [],
          memberIds: [],
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        set({ classrooms: [created, ...get().classrooms], selectedClassroomId: created.id });
        return created;
      },
      selectClassroom: (id) => set({ selectedClassroomId: id }),
      joinClassroomByCode: (input) => {
        const normalizedCode = input.joinCode.trim().toUpperCase();
        const classroom = get().classrooms.find((item) => item.joinCode.toUpperCase() === normalizedCode);
        if (!classroom) return { ok: false, message: "No classroom found for that code." };
        const existing = get().members.find((member) => member.classroomId === classroom.id && member.learnerId === input.learnerId && member.status !== "removed");
        if (existing) return { ok: false, message: `${input.displayName || "Student"} is already in ${classroom.name}.`, classroomId: classroom.id };
        const createdMember: ClassroomMember = {
          id: makeId("cw-member"),
          classroomId: classroom.id,
          learnerId: input.learnerId || makeId("learner"),
          displayName: input.displayName.trim() || "New student",
          role: "student",
          status: classroom.privacy.requireTeacherApproval ? "pending" : "active",
          joinedAt: nowISO(),
        };
        set({
          members: [createdMember, ...get().members],
          classrooms: get().classrooms.map((item) => item.id === classroom.id ? { ...item, memberIds: [createdMember.id, ...item.memberIds], updatedAt: nowISO() } : item),
          selectedClassroomId: classroom.id,
        });
        return { ok: true, message: `${createdMember.displayName} joined ${classroom.name}.`, classroomId: classroom.id };
      },
      addRewardLog: (input) => {
        const created: ClassroomRewardLog = { id: makeId("cw-reward"), classroomId: input.classroomId, memberId: input.memberId, type: input.type, amount: input.amount, reason: input.reason, createdAt: nowISO() };
        set({ rewardLogs: [created, ...get().rewardLogs] });
      },
    }),
    {
      name: "edu-mates-classroom-world-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
