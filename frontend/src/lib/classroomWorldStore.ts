import { create } from "zustand";

type ClassroomWorldState = {
  classrooms: any[];
  selectedClassroomId: string;
  goals: any[];
  rewardLogs: any[];
  events: any[];
};

const demoClassroom = {
  id: "demo-classroom",
  teacherName: "Teacher",
  roomName: "Classroom Hub",
  subjectFocus: ["Math", "Reading"],
  pet: {
    name: "Embercub",
    petName: "Embercub",
    emoji: "🔥",
    level: 1,
    xp: 0,
    xpGoal: 100,
  },
  members: [],
  assignmentRefs: [],
};

export const useClassroomWorldStore = create<ClassroomWorldState>(() => ({
  classrooms: [demoClassroom],
  selectedClassroomId: demoClassroom.id,
  goals: [],
  rewardLogs: [],
  events: [],
}));
