import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ClassroomWorldStatus = "active" | "paused" | "archived";
export type ClassroomMemberRole = "student" | "teacher" | "helper";
export type ClassroomMemberStatus = "active" | "pending" | "removed";
export type ClassroomRoomTheme = "meadow" | "hatchery" | "library" | "crystal-cave" | "sky-dock";
export type ClassroomSubjectFocus = "Math" | "Reading" | "Writing" | "Science" | "Social Studies";
export type ClassroomPrivacyMode = "invite-only" | "school-only" | "closed";
export type ClassroomRewardType = "xp" | "treat" | "coin" | "badge";

export const CLASSROOM_GRADE_BAND_OPTIONS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grades K-2",
  "Grades 2-3",
  "Grades 3-5",
  "Grades 5-7",
  "Mixed K-4",
  "Mixed grades",
] as const;

export const CLASSROOM_SUBJECT_OPTIONS: ClassroomSubjectFocus[] = ["Math", "Reading", "Writing", "Science", "Social Studies"];
export const CLASSROOM_ROOM_THEME_OPTIONS: ClassroomRoomTheme[] = ["meadow", "hatchery", "library", "crystal-cave", "sky-dock"];

export const CLASSROOM_ROOM_THEME_LABELS: Record<ClassroomRoomTheme, string> = {
  meadow: "Meadow",
  hatchery: "Hatchery",
  library: "Library",
  "crystal-cave": "Crystal cave",
  "sky-dock": "Sky dock",
};

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
  name?: string;
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
  subjectFocus: ClassroomSubjectFocus[];
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
  roomName?: string;
  roomTheme?: ClassroomRoomTheme;
  members?: ClassroomMember[];
}

interface ClassroomWorldStore {
  classrooms: ClassroomWorld[];
  members: ClassroomMember[];
  rewardLogs: ClassroomRewardLog[];
  goals: ClassroomGoal[];
  events: ClassroomEvent[];
  selectedClassroomId: string;
  createClassroom: (input: Omit<Pick<ClassroomWorld, "name" | "gradeBand" | "subjectFocus">, "subjectFocus"> & { subjectFocus: ClassroomSubjectFocus | ClassroomSubjectFocus[]; teacherId?: string; teacherName?: string; roomTheme?: ClassroomRoomTheme; theme?: ClassroomRoomTheme }) => ClassroomWorld;
  selectClassroom: (id: string) => void;
  copyJoinCode: (classroomId: string) => string;
  joinClassroomByCode: ((input: { joinCode: string; learnerId: string; displayName: string }) => { ok: boolean; message: string; classroomId?: string }) & ((joinCode: string, displayName: string) => { ok: boolean; message: string; classroomId?: string });
  addRewardLog: (input: Pick<ClassroomRewardLog, "classroomId" | "type" | "amount" | "reason"> & { memberId?: string }) => void;
}

const nowISO = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeCode = (code: string): string => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const normalizeSubjectFocus = (subjects: ClassroomSubjectFocus | ClassroomSubjectFocus[] | string | string[]): ClassroomSubjectFocus[] => {
  const input = Array.isArray(subjects) ? subjects : [subjects];
  const valid = new Set<ClassroomSubjectFocus>(CLASSROOM_SUBJECT_OPTIONS);
  const normalized = input.filter((subject): subject is ClassroomSubjectFocus => valid.has(subject as ClassroomSubjectFocus));
  return normalized.length ? normalized : ["Math"];
};

const makeClassroomCompat = (classroom: ClassroomWorld, members: ClassroomMember[]): ClassroomWorld => ({
  ...classroom,
  roomName: classroom.room.roomName,
  roomTheme: classroom.room.theme,
  pet: { ...classroom.pet, name: classroom.pet.petName },
  members: members.filter((member) => classroom.memberIds.includes(member.id)),
});

const makeJoinCode = (existingCodes: string[]): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const normalizedExisting = new Set(existingCodes.map(normalizeCode));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    if (!normalizedExisting.has(code)) return code;
  }
  let fallback = `QA${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  while (normalizedExisting.has(fallback)) fallback = `QA${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return fallback;
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
    pet: { petId: "embercub", petName: "Embercub", petEmoji: "🔥", level: 2, xp: 65, xpGoal: 100, mood: "happy", treats: 4, name: "Embercub" },
    room: { theme: "meadow", roomName: "Meadowfall Homeroom", decorationIds: ["rug-leaf", "banner-stars"], lastVisitedAt: nowISO() },
    assignmentRefs: [
      { id: "cw-assignment-1", assignmentId: "assignment-1", title: "Meadow Addition Sprint", subject: "Math", skill: "Addition", status: "assigned" },
    ],
    goalIds: ["cw-goal-1"],
    eventIds: ["cw-event-1"],
    memberIds: ["cw-member-1", "cw-member-2"],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    roomName: "Meadowfall Homeroom",
    roomTheme: "meadow",
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
      classrooms: seedClassrooms.map((classroom) => makeClassroomCompat(classroom, seedMembers)),
      members: seedMembers,
      rewardLogs: [],
      goals: seedGoals,
      events: seedEvents,
      selectedClassroomId: seedClassrooms[0]?.id || "",
      createClassroom: (input) => {
        const state = get();
        const joinCode = makeJoinCode(state.classrooms.map((classroom) => classroom.joinCode));
        const roomTheme = input.roomTheme || input.theme || "meadow";
        const name = input.name.trim() || "New Classroom World";
        const created: ClassroomWorld = makeClassroomCompat({
          id: makeId("classroom"),
          teacherId: input.teacherId || "teacher-demo",
          teacherName: input.teacherName || "Demo Teacher",
          name,
          joinCode,
          gradeBand: input.gradeBand.trim() || "Mixed grades",
          subjectFocus: normalizeSubjectFocus(input.subjectFocus),
          status: "active",
          privacy: { mode: "invite-only", requireTeacherApproval: false, showLeaderboard: false, allowStudentNicknames: true },
          pet: { petId: "embercub", petName: "Embercub", petEmoji: "🔥", level: 1, xp: 0, xpGoal: 100, mood: "focused", treats: 1, name: "Embercub" },
          room: { theme: roomTheme, roomName: `${name} Homeroom`, decorationIds: [], lastVisitedAt: nowISO() },
          assignmentRefs: [],
          goalIds: [],
          eventIds: [],
          memberIds: [],
          createdAt: nowISO(),
          updatedAt: nowISO(),
        }, state.members);
        set({ classrooms: [created, ...state.classrooms], selectedClassroomId: created.id });
        return created;
      },
      selectClassroom: (id) => set({ selectedClassroomId: id }),
      copyJoinCode: (classroomId) => {
        const classroom = get().classrooms.find((item) => item.id === classroomId);
        return classroom?.joinCode || "";
      },
      joinClassroomByCode: ((inputOrJoinCode: { joinCode: string; learnerId: string; displayName: string } | string, displayNameOverride?: string) => {
        const input = typeof inputOrJoinCode === "string"
          ? { joinCode: inputOrJoinCode, learnerId: `local-${String(displayNameOverride || "New student").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, displayName: displayNameOverride || "New student" }
          : inputOrJoinCode;
        const normalizedCode = normalizeCode(input.joinCode);
        const displayName = (displayNameOverride || input.displayName || "New student").trim();
        const classroom = get().classrooms.find((item) => normalizeCode(item.joinCode) === normalizedCode);
        if (!classroom) return { ok: false, message: "No classroom found for that code." };
        const learnerId = input.learnerId || `local-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const existing = get().members.find((member) => member.classroomId === classroom.id && member.learnerId === learnerId && member.status !== "removed");
        if (existing) return { ok: false, message: `${displayName || "Student"} is already in ${classroom.name}.`, classroomId: classroom.id };
        const createdMember: ClassroomMember = {
          id: makeId("cw-member"),
          classroomId: classroom.id,
          learnerId,
          displayName,
          role: "student",
          status: classroom.privacy.requireTeacherApproval ? "pending" : "active",
          joinedAt: nowISO(),
        };
        const nextMembers = [createdMember, ...get().members];
        const nextClassrooms = get().classrooms.map((item) => {
          if (item.id !== classroom.id) return item;
          return makeClassroomCompat({ ...item, memberIds: [createdMember.id, ...item.memberIds], updatedAt: nowISO() }, nextMembers);
        });
        set({ members: nextMembers, classrooms: nextClassrooms, selectedClassroomId: classroom.id });
        return { ok: true, message: `${createdMember.displayName} joined ${classroom.name}.`, classroomId: classroom.id };
      }) as ClassroomWorldStore["joinClassroomByCode"],
      addRewardLog: (input) => {
        const created: ClassroomRewardLog = { id: makeId("cw-reward"), classroomId: input.classroomId, memberId: input.memberId, type: input.type, amount: input.amount, reason: input.reason, createdAt: nowISO() };
        set({ rewardLogs: [created, ...get().rewardLogs] });
      },
    }),
    {
      name: "edu-mates-classroom-world-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        classrooms: state.classrooms.map((classroom) => makeClassroomCompat(classroom, state.members)),
      }),
    }
  )
);
