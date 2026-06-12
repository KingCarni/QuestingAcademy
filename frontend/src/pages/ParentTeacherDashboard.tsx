import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { useStudio } from "../lib/studioStore";
import { useClassroomWorldStore, CLASSROOM_SUBJECT_OPTIONS, CLASSROOM_ROOM_THEME_OPTIONS, CLASSROOM_GRADE_BAND_OPTIONS, CLASSROOM_ROOM_THEME_LABELS, type ClassroomRoomTheme, type ClassroomSubjectFocus } from "../lib/classroomWorldStore";
import {
  APPROVED_SUBJECT_SKILLS,
  ASSIGNMENT_DUE_OPTIONS,
  ASSIGNMENT_WORK_TYPE_LABELS,
  CLASS_PET_OPTIONS,
  EDU_MATES_ROLE_LABELS,
  LEARNING_GROUP_TYPE_LABELS,
  getGroupAssignments,
  getGroupLearners,
  useLearningGroupStore,
  type AssignmentDifficulty,
  type AssignmentStatus,
  type AssignmentWorkType,
  type EduMatesUserRole,
  type LearningGroupType,
  type LearningGoal,
  type MasteryLevel,
  type ParentReport,
} from "../lib/learningGroupStore";
import { BookOpen, Castle, CheckCircle2, ClipboardList, Copy, Eye, Gift, GraduationCap, Plus, RefreshCw, Sparkles, Target, TrendingUp, Users, X, UserPlus } from "lucide-react";

const ROLE_OPTIONS: EduMatesUserRole[] = ["teacher", "parent", "homeschool-parent", "tutor", "admin"];
const GROUP_TYPE_OPTIONS: LearningGroupType[] = ["classroom", "homeschool", "tutoring", "pod", "intervention"];
const DIFFICULTY_OPTIONS: AssignmentDifficulty[] = ["gentle", "standard", "challenge"];
const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  draft: "Draft",
  generated: "Generated",
  review: "In review",
  approved: "Approved",
  assigned: "Assigned",
  completed: "Completed",
};

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  secure: "Secure",
  developing: "Developing",
  "needs-support": "Needs support",
};

type ReviewQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

const buildMockQuestion = (assignment: any, index: number, variant = 0): ReviewQuestion => {
  const subject = assignment?.subject || "Math";
  const skill = assignment?.skill || "Addition";
  const base = index + 1 + variant;

  if (subject === "Math") {
    const left = base + 3;
    const right = variant + index + 2;
    const answer = String(left + right);
    return {
      id: `${assignment?.id || "assignment"}-q-${index}-${variant}`,
      prompt: `Solve: ${left} + ${right}`,
      choices: [String(left + right - 1), answer, String(left + right + 1), String(left + right + 2)],
      correctAnswer: answer,
      explanation: `${left} plus ${right} equals ${answer}. This checks ${skill.toLowerCase()}.`,
    };
  }

  return {
    id: `${assignment?.id || "assignment"}-q-${index}-${variant}`,
    prompt: `Which answer best demonstrates ${skill}?`,
    choices: [`A clear ${skill} example`, `An unrelated detail`, `A repeated guess`, `A missing answer`],
    correctAnswer: `A clear ${skill} example`,
    explanation: `The correct answer directly practices ${skill} in ${subject}.`,
  };
};

const buildMockQuestions = (assignment: any): ReviewQuestion[] => {
  const count = Math.min(5, Math.max(3, Number(assignment?.questionCount || 5)));
  return Array.from({ length: count }, (_, index) => buildMockQuestion(assignment, index));
};

const normalizeStudioImageUrl = (url?: string): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/api/studio/image")) return `http://localhost:5050${trimmed}`;
  if (trimmed.startsWith("api/studio/image")) return `http://localhost:5050/${trimmed}`;
  if (trimmed.startsWith("/studio/image")) return `http://localhost:5050/api${trimmed}`;
  if (trimmed.startsWith("studio/image")) return `http://localhost:5050/api/${trimmed}`;
  if (trimmed.startsWith("/uploads/")) return `http://localhost:5050${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `http://localhost:5050/${trimmed}`;
  return trimmed;
};

const getStudioAssetImageUrl = (item?: any): string => normalizeStudioImageUrl(
  item?.transparentUrl ||
  item?.transparentPreviewUrl ||
  item?.companionPreviewUrl ||
  item?.previewCompositeUrl ||
  item?.previewUrl ||
  item?.generatedImageUrl ||
  item?.imageUrl ||
  item?.url ||
  item?.assetUrl ||
  item?.localUrl ||
  item?.dataUrl ||
  ""
);

const normalizeMatchText = (value?: string): string => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const findClassPetAsset = (petId: string, petName: string, collections: any[][]): any | null => {
  const normalizedPetId = normalizeMatchText(petId);
  const normalizedPetName = normalizeMatchText(petName);
  const sourceIdBridge = normalizedPetId === "embercub" ? "scmp2" : "";
  const allItems = collections.flat().filter(Boolean);
  const hasImage = (item: any): boolean => Boolean(getStudioAssetImageUrl(item));

  const exactSourceIdMatches = allItems.filter((item: any) => {
    const sourceId = normalizeMatchText(item?.sourceId);
    return sourceIdBridge && sourceId === sourceIdBridge;
  });

  const exactNameMatches = allItems.filter((item: any) => {
    const name = normalizeMatchText(item?.name || item?.title || item?.assetName || item?.companionName || item?.label);
    return name === normalizedPetName || name === normalizedPetId;
  });

  const exactIdMatches = allItems.filter((item: any) => {
    const id = normalizeMatchText(item?.id);
    return id === normalizedPetId || id === sourceIdBridge;
  });

  const rankedMatches = [
    ...exactSourceIdMatches,
    ...exactNameMatches,
    ...exactIdMatches,
  ];

  const seen = new Set<string>();
  const dedupedMatches = rankedMatches.filter((item: any) => {
    const key = [item?.id, item?.sourceId, item?.name, getStudioAssetImageUrl(item)].map((value) => String(value || "")).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return dedupedMatches.find(hasImage) || dedupedMatches[0] || null;
};

const ParentTeacherDashboard: React.FC = () => {
  const currentRole = useLearningGroupStore((s) => s.currentRole);
  const groups = useLearningGroupStore((s) => s.groups);
  const learners = useLearningGroupStore((s) => s.learners);
  const assignments = useLearningGroupStore((s) => s.assignments);
  const learningGoals = useLearningGroupStore((s) => (s as any).learningGoals || []);
  const parentReports = useLearningGroupStore((s) => (s as any).parentReports || []);
  const selectedGroupId = useLearningGroupStore((s) => s.selectedGroupId);
  const setCurrentRole = useLearningGroupStore((s) => s.setCurrentRole);
  const selectGroup = useLearningGroupStore((s) => s.selectGroup);
  const createGroup = useLearningGroupStore((s) => s.createGroup);
  const createAssignment = useLearningGroupStore((s) => s.createAssignment);
  const moveAssignmentToReview = useLearningGroupStore((s) => s.moveAssignmentToReview);
  const approveAssignment = useLearningGroupStore((s) => s.approveAssignment);
  const deleteAssignment = useLearningGroupStore((s) => (s as any).deleteAssignment);
  const addLearningGoal = useLearningGroupStore((s) => (s as any).addLearningGoal);
  const generateParentReport = useLearningGroupStore((s) => (s as any).generateParentReport);
  const addLearnerToGroup = useLearningGroupStore((s) => s.addLearnerToGroup);
  const giveClassPetReward = useLearningGroupStore((s) => s.giveClassPetReward);
  const setClassPet = useLearningGroupStore((s) => s.setClassPet);
  const classrooms = useClassroomWorldStore((s) => s.classrooms);
  const classroomMembers = useClassroomWorldStore((s) => s.members);
  const selectedClassroomId = useClassroomWorldStore((s) => s.selectedClassroomId);
  const createClassroom = useClassroomWorldStore((s) => s.createClassroom);
  const selectClassroom = useClassroomWorldStore((s) => s.selectClassroom);
  const joinClassroomByCode = useClassroomWorldStore((s) => s.joinClassroomByCode);
  const copyJoinCode = useClassroomWorldStore((s) => s.copyJoinCode);
  const studioCompanions = useStudio((s) => (s as any).companions || []);
  const studioAssets = useStudio((s) => (s as any).assets || []);
  const studioAvatars = useStudio((s) => (s as any).avatars || []);

  const subjectOptions = Object.keys(APPROVED_SUBJECT_SKILLS);
  const [newGroupName, setNewGroupName] = useState("New Edu-Mates Group");
  const [newGroupType, setNewGroupType] = useState<LearningGroupType>("classroom");
  const [newGroupGradeBand, setNewGroupGradeBand] = useState("Grades 2-3");
  const [assignmentTitle, setAssignmentTitle] = useState("Meadow Practice Quest");
  const [assignmentSubject, setAssignmentSubject] = useState(subjectOptions[0] || "Math");
  const [assignmentSkill, setAssignmentSkill] = useState(APPROVED_SUBJECT_SKILLS[subjectOptions[0]]?.[0] || "Addition");
  const [assignmentWorkType, setAssignmentWorkType] = useState<AssignmentWorkType>("daily-assignment");
  const [assignmentCount, setAssignmentCount] = useState(10);
  const [assignmentDifficulty, setAssignmentDifficulty] = useState<AssignmentDifficulty>("standard");
  const [assignmentDue, setAssignmentDue] = useState(ASSIGNMENT_DUE_OPTIONS[2] || "Friday");
  const [learnerName, setLearnerName] = useState("New learner");
  const [learnerGrade, setLearnerGrade] = useState("2");
  const [learnerEmoji, setLearnerEmoji] = useState("🧒");
  const [reviewAssignmentId, setReviewAssignmentId] = useState<string | null>(null);
  const [questionVariants, setQuestionVariants] = useState<Record<string, number>>({});
  const [goalSubject, setGoalSubject] = useState(subjectOptions[0] || "Math");
  const [goalSkill, setGoalSkill] = useState(APPROVED_SUBJECT_SKILLS[subjectOptions[0]]?.[0] || "Addition");
  const [goalTarget, setGoalTarget] = useState("Reach 90% accuracy with this skill");
  const [classroomName, setClassroomName] = useState("Meadow Rangers");
  const [classroomGradeBand, setClassroomGradeBand] = useState("Grades 2-3");
  const [classroomSubjectFocus, setClassroomSubjectFocus] = useState<ClassroomSubjectFocus>("Math");
  const [classroomRoomTheme, setClassroomRoomTheme] = useState<ClassroomRoomTheme>("meadow");
  const [joinCodeInput, setJoinCodeInput] = useState("MEADOW");
  const [studentJoinName, setStudentJoinName] = useState("New student");
  const [joinMessage, setJoinMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || groups[0] || null;
  const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedClassroomId) || classrooms[0] || null;
  const selectedClassroomMembers = selectedClassroom ? classroomMembers.filter((member) => selectedClassroom.memberIds.includes(member.id)) : [];
  const groupLearners = useMemo(() => getGroupLearners(selectedGroup, learners), [selectedGroup, learners]);
  const groupAssignments = useMemo(() => getGroupAssignments(selectedGroup, assignments), [selectedGroup, assignments]);
  const groupLearningGoals = useMemo(() => selectedGroup ? (learningGoals as LearningGoal[]).filter((goal) => goal.groupId === selectedGroup.id) : [], [selectedGroup, learningGoals]);
  const groupParentReports = useMemo(() => selectedGroup ? (parentReports as ParentReport[]).filter((report) => report.groupId === selectedGroup.id) : [], [selectedGroup, parentReports]);
  const skillOptions = APPROVED_SUBJECT_SKILLS[assignmentSubject] || [];
  const goalSkillOptions = APPROVED_SUBJECT_SKILLS[goalSubject] || [];
  const selectablePets = CLASS_PET_OPTIONS.filter((pet) => pet.teacherSelectable);
  const avgAccuracy = groupLearners.length ? Math.round(groupLearners.reduce((sum, learner) => sum + learner.accuracy, 0) / groupLearners.length) : 0;
  const weeklyMinutes = groupLearners.reduce((sum, learner) => sum + learner.minutesThisWeek, 0);
  const activeAssignment = groupAssignments.find((assignment) => assignment.status === "assigned") || groupAssignments[0] || null;
  const selectedPetId = selectedGroup?.classPetId || "embercub";
  const selectedPetName = selectedGroup?.classPetName || "Embercub";
  const selectedPetAsset = useMemo(() => findClassPetAsset(selectedPetId, selectedPetName, [studioAssets, studioCompanions, studioAvatars]), [selectedPetId, selectedPetName, studioAssets, studioCompanions, studioAvatars]);
  const selectedPetImageUrl = getStudioAssetImageUrl(selectedPetAsset);
  const reviewAssignment = groupAssignments.find((assignment) => assignment.id === reviewAssignmentId) || null;
  const reviewQuestions = useMemo(() => {
    if (!reviewAssignment) return [];
    return buildMockQuestions(reviewAssignment).map((question, index) => {
      const variant = questionVariants[`${reviewAssignment.id}-${index}`] || 0;
      return buildMockQuestion(reviewAssignment, index, variant);
    });
  }, [reviewAssignment, questionVariants]);

  useEffect(() => {
    const options = APPROVED_SUBJECT_SKILLS[assignmentSubject] || [];
    if (options.length && !options.includes(assignmentSkill)) setAssignmentSkill(options[0]);
  }, [assignmentSubject, assignmentSkill]);

  useEffect(() => {
    const options = APPROVED_SUBJECT_SKILLS[goalSubject] || [];
    if (options.length && !options.includes(goalSkill)) setGoalSkill(options[0]);
  }, [goalSubject, goalSkill]);

  const handleCreateGroup = () => {
    createGroup({ name: newGroupName, type: newGroupType, ownerRole: currentRole, gradeBand: newGroupGradeBand });
    setNewGroupName("New Edu-Mates Group");
  };

  const handleGenerateAssignment = () => {
    if (!selectedGroup) return;
    createAssignment({
      groupId: selectedGroup.id,
      title: assignmentTitle,
      subject: assignmentSubject,
      skill: assignmentSkill,
      workType: assignmentWorkType,
      questionCount: assignmentCount,
      difficulty: assignmentDifficulty,
      dueLabel: assignmentDue,
    });
    setAssignmentTitle("Meadow Practice Quest");
  };

  const handleAddLearner = () => {
    if (!selectedGroup) return;
    addLearnerToGroup(selectedGroup.id, { name: learnerName, grade: learnerGrade, avatarEmoji: learnerEmoji });
    setLearnerName("New learner");
  };

  const handleAddLearningGoal = () => {
    if (!selectedGroup) return;
    addLearningGoal({ groupId: selectedGroup.id, subject: goalSubject, skill: goalSkill, target: goalTarget });
    setGoalTarget("Reach 90% accuracy with this skill");
  };

  const handleCreateClassroom = () => {
    const created = createClassroom({
      name: classroomName,
      gradeBand: classroomGradeBand,
      subjectFocus: classroomSubjectFocus,
      roomTheme: classroomRoomTheme,
    });
    setJoinCodeInput(created.joinCode);
    setClassroomName("Meadow Rangers");
    setCopyMessage(`Created ${created.name} with code ${created.joinCode}.`);
  };

  const handleCopyJoinCode = async () => {
    if (!selectedClassroom) return;
    const code = copyJoinCode(selectedClassroom.id);
    try {
      await navigator.clipboard?.writeText(code);
      setCopyMessage(`Copied ${code}.`);
    } catch {
      setCopyMessage(`Code ${code} ready to copy.`);
    }
  };

  const handleJoinClassroom = () => {
    const result = joinClassroomByCode(joinCodeInput, studentJoinName);
    setJoinMessage(result.message);
    if (result.ok) setStudentJoinName("New student");
  };

  const handleOpenReview = (assignmentId: string) => {
    moveAssignmentToReview(assignmentId);
    setReviewAssignmentId(assignmentId);
  };

  const handleRegenerateQuestion = (assignmentId: string, index: number) => {
    const key = `${assignmentId}-${index}`;
    setQuestionVariants((current) => ({ ...current, [key]: (current[key] || 0) + 1 }));
  };

  const handleApproveReviewAssignment = () => {
    if (!reviewAssignment) return;
    approveAssignment(reviewAssignment.id);
    setReviewAssignmentId(null);
  };

  const handleDenyReviewAssignment = () => {
    setReviewAssignmentId(null);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    const assignment = assignments.find((item) => item.id === assignmentId);
    const confirmed = window.confirm(`Delete "${assignment?.title || "this assignment"}"? This cannot be undone.`);
    if (!confirmed) return;
    if (reviewAssignmentId === assignmentId) setReviewAssignmentId(null);
    deleteAssignment(assignmentId);
  };

  return (
    <div className="min-h-screen pb-16">
      <TopBar back="/" title="Edu-Mates Dashboard" />
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <Card>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Parent / Teacher Command Center</p>
              <h1 className="h-display text-4xl md:text-5xl text-ink mt-1">Learning groups for Edu-Mates</h1>
              <p className="text-ink-muted mt-2 max-w-3xl">Manage classrooms, homeschool rooms, tutoring pods, assignments, learner progress, and class pets from one shared dashboard model.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/adventure" className="btn-outline !text-sm !py-2 !px-4"><Castle size={15} strokeWidth={3} /> Open learner world</Link>
              <Link to="/admin/studio" className="btn-primary !text-sm !py-2 !px-4"><Sparkles size={15} strokeWidth={3} /> Content Studio</Link>
            </div>
          </div>
        </Card>

        <section className="grid lg:grid-cols-[20rem_1fr] gap-5">
          <aside className="space-y-5">
            <Card>
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Current role</p>
              <select className="input mt-2" value={currentRole} onChange={(e) => setCurrentRole(e.target.value as EduMatesUserRole)} data-testid="dashboard-role-select">
                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{EDU_MATES_ROLE_LABELS[role]}</option>)}
              </select>
              <p className="text-xs text-ink-muted mt-2">Role-aware dashboard labels without auth yet.</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3"><Users size={18} strokeWidth={3} className="text-primary" /><p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Learning groups</p></div>
              <div className="space-y-2">
                {groups.map((group) => (
                  <button type="button" key={group.id} onClick={() => selectGroup(group.id)} className={`w-full text-left rounded-2xl border-2 p-3 transition ${selectedGroup?.id === group.id ? "border-primary bg-primary/10" : "border-white bg-bg hover:border-primary/30"}`} data-testid={`dashboard-group-${group.id}`}>
                    <p className="h-display text-lg truncate">{group.name}</p>
                    <p className="text-xs font-bold text-ink-muted">{LEARNING_GROUP_TYPE_LABELS[group.type]} · {group.gradeBand}</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3"><Plus size={18} strokeWidth={3} className="text-primary" /><p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Create group</p></div>
              <div className="space-y-3">
                <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Group name</span><input className="input mt-1" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} data-testid="dashboard-new-group-name" /></label>
                <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Group type</span><select className="input mt-1" value={newGroupType} onChange={(e) => setNewGroupType(e.target.value as LearningGroupType)}>{GROUP_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{LEARNING_GROUP_TYPE_LABELS[type]}</option>)}</select></label>
                <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Grade band</span><select className="input mt-1" value={newGroupGradeBand} onChange={(e) => setNewGroupGradeBand(e.target.value)}>{CLASSROOM_GRADE_BAND_OPTIONS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
                <button type="button" className="btn-primary w-full justify-center" onClick={handleCreateGroup} data-testid="dashboard-create-group"><Plus size={16} strokeWidth={3} /> Create group</button>
              </div>
            </Card>
          </aside>

          <section className="space-y-5">
            <Card>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Dashboard overview</p>
                  <h2 className="h-display text-4xl text-ink mt-1">{selectedGroup?.name || "No group selected"}</h2>
                  <p className="text-ink-muted mt-1">{selectedGroup ? `${LEARNING_GROUP_TYPE_LABELS[selectedGroup.type]} · ${EDU_MATES_ROLE_LABELS[selectedGroup.ownerRole]} · ${selectedGroup.gradeBand}` : "Create or select a group to begin."}</p>
                </div>
                {selectedGroup && <span className="chip border-primary/30 bg-primary/10 text-primary capitalize">{selectedGroup.status}</span>}
              </div>
            </Card>

            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <DashboardStat icon={<Users className="text-primary" strokeWidth={3} />} label="Learners" value={String(groupLearners.length)} />
              <DashboardStat icon={<BookOpen className="text-sage" strokeWidth={3} />} label="Avg accuracy" value={`${avgAccuracy}%`} />
              <DashboardStat icon={<GraduationCap className="text-gold" strokeWidth={3} />} label="Weekly minutes" value={`${weeklyMinutes}m`} />
              <DashboardStat icon={<ClipboardList className="text-fire" strokeWidth={3} />} label="Assignments" value={String(groupAssignments.length)} />
            </section>

            <section className="grid xl:grid-cols-3 gap-5">
              <Card className="xl:col-span-2">
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Learner progress tracking</p>
                <div className="mt-3 space-y-3">
                  {groupLearners.length ? groupLearners.map((learner) => (
                    <div key={learner.id} className="rounded-3xl bg-bg border-2 border-white p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white grid place-items-center text-2xl shadow-inner">{learner.avatarEmoji}</div>
                      <div className="min-w-0 flex-1">
                        <p className="h-display text-xl truncate">{learner.name}</p>
                        <p className="text-xs font-bold text-ink-muted">Grade {learner.grade} · {learner.lastActiveLabel} · {learner.streakDays} day streak</p>
                        <p className="text-[10px] font-bold text-ink-muted truncate">Support: {learner.needsSupport.length ? learner.needsSupport.join(", ") : "none flagged"}</p>
                      </div>
                      <div className="text-right"><p className="h-display text-2xl text-primary">{learner.accuracy}%</p><p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">accuracy</p></div>
                    </div>
                  )) : <p className="text-sm text-ink-muted">No learners assigned yet. Add one below.</p>}
                </div>
              </Card>

              <div className="space-y-5">
                <Card>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Active assignment</p>
                  <h3 className="h-display text-2xl mt-2">{activeAssignment?.title || selectedGroup?.activeQuest || "No assignment yet"}</h3>
                  <p className="text-sm text-ink-muted mt-1">{activeAssignment ? `${ASSIGNMENT_WORK_TYPE_LABELS[activeAssignment.workType]} · ${activeAssignment.subject} · ${activeAssignment.skill} · Due ${activeAssignment.dueLabel}` : `Realm: ${selectedGroup?.activeRealm || "Not set"}`}</p>
                  {activeAssignment && <div className="mt-3"><div className="h-3 rounded-full bg-bg border border-white overflow-hidden"><div className="h-full bg-primary" style={{ width: `${activeAssignment.completionPercent}%` }} /></div><p className="text-xs text-ink-muted mt-1">{activeAssignment.completionPercent}% complete · {activeAssignment.averageAccuracy}% avg accuracy</p></div>}
                </Card>

                <Card>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Class pet</p>
                  <div className="mt-3 rounded-[2rem] bg-gradient-to-br from-primary/10 via-white to-gold/20 border-2 border-white p-4 text-center">
                    {selectedPetImageUrl ? (
                      <div className="mx-auto mb-3 w-28 h-28 rounded-[2rem] bg-white/80 border-2 border-white shadow-inner p-2 grid place-items-center overflow-hidden">
                        <img src={selectedPetImageUrl} alt={selectedPetName} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                      </div>
                    ) : (
                      <div className="text-5xl mb-2">{selectedGroup?.classPetEmoji || "🔥"}</div>
                    )}
                    <h3 className="h-display text-2xl">{selectedPetName}</h3>
                    <p className="text-sm font-bold text-ink-muted capitalize">Mood: {selectedGroup?.classPetMood || "focused"} · Level {selectedGroup?.classPetLevel || 1}</p>
                    <label className="block text-left mt-3"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Teacher companion</span><select className="input mt-1" value={selectedGroup?.classPetId || "embercub"} onChange={(e) => selectedGroup && setClassPet(selectedGroup.id, e.target.value)}>{selectablePets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select></label>
                    <div className="mt-3 h-3 rounded-full bg-white border border-white overflow-hidden"><div className="h-full bg-gold" style={{ width: `${selectedGroup ? Math.min(100, Math.round((selectedGroup.classPetXp / selectedGroup.classPetXpGoal) * 100)) : 0}%` }} /></div>
                    <p className="text-xs text-ink-muted mt-1">{selectedGroup?.classPetXp || 0}/{selectedGroup?.classPetXpGoal || 100} XP · {selectedGroup?.classPetTreats || 0} treats</p>
                    <button type="button" className="btn-primary !py-2 !px-4 !text-sm mt-3" onClick={() => selectedGroup && giveClassPetReward(selectedGroup.id, 15)}><Gift size={14} strokeWidth={3} /> Give class reward</button>
                  </div>
                </Card>
              </div>
            </section>

            <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5">
              <Card>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Classroom World Hub</p>
                    <h2 className="h-display text-4xl text-ink mt-1">{selectedClassroom?.name || "No classroom selected"}</h2>
                    <p className="text-sm text-ink-muted mt-1">{selectedClassroom?.gradeBand || "No grade band"} · {selectedClassroom?.subjectFocus?.join(", ") || "No subject"}</p>
                  </div>
                  <div className="rounded-3xl bg-primary/10 border-2 border-primary/20 px-5 py-3 min-w-[12rem]">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Join code</p>
                    <p className="h-display text-3xl text-ink tracking-widest">{selectedClassroom?.joinCode || "—"}</p>
                    <button type="button" className="btn-outline !py-2 !px-3 !text-xs mt-2 w-full justify-center" onClick={handleCopyJoinCode} disabled={!selectedClassroom}><Copy size={13} strokeWidth={3} /> Copy code</button>
                  </div>
                </div>
                {copyMessage && <p className="text-xs font-bold text-primary mt-3">{copyMessage}</p>}
                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  <div className="rounded-3xl bg-bg border-2 border-white p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Room</p><p className="h-display text-xl mt-1">{selectedClassroom?.roomName || selectedClassroom?.room.roomName || "Not set"}</p><p className="text-xs font-bold text-ink-muted">{CLASSROOM_ROOM_THEME_LABELS[selectedClassroom?.roomTheme || selectedClassroom?.room.theme || "meadow"]}</p></div>
                  <div className="rounded-3xl bg-bg border-2 border-white p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Class pet</p><p className="h-display text-xl mt-1">{selectedClassroom?.pet.name || selectedClassroom?.pet.petName || "None"}</p><p className="text-xs font-bold text-ink-muted">{selectedClassroom?.pet.xp || 0}/{selectedClassroom?.pet.xpGoal || 100} XP</p></div>
                  <div className="rounded-3xl bg-bg border-2 border-white p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Roster</p><p className="h-display text-xl mt-1">{selectedClassroomMembers.length} students</p><p className="text-xs font-bold text-ink-muted">{selectedClassroom?.privacy.requireTeacherApproval ? "Approval required" : "Instant join"}</p></div>
                </div>
                <div className="mt-5 grid md:grid-cols-[0.85fr_1.15fr] gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mb-2">Classrooms</p>
                    <div className="space-y-2">
                      {classrooms.map((classroom) => (
                        <button key={classroom.id} type="button" onClick={() => selectClassroom(classroom.id)} className={`w-full rounded-2xl border-2 p-3 text-left ${selectedClassroom?.id === classroom.id ? "border-primary bg-primary/10" : "border-white bg-bg hover:border-primary/30"}`}>
                          <p className="h-display text-lg">{classroom.name}</p>
                          <p className="text-xs font-bold text-ink-muted">{classroom.joinCode} · {classroom.gradeBand} · {classroom.memberIds.length} students</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mb-2">Roster preview</p>
                    <div className="rounded-3xl bg-bg border-2 border-white p-4 min-h-[9rem]">
                      {selectedClassroomMembers.length ? selectedClassroomMembers.slice(0, 6).map((member) => <p key={member.id} className="text-sm font-bold text-ink mt-1">{member.displayName} · {member.status}</p>) : <p className="text-sm text-ink-muted">No students yet. Share the join code or use the student join test.</p>}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-5">
                <Card>
                  <div className="flex items-center gap-2"><Plus size={18} strokeWidth={3} className="text-primary" /><p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Teacher create flow</p></div>
                  <p className="text-sm text-ink-muted mt-2">Controlled fields, unique join code, and cleaner classroom setup.</p>
                  <div className="mt-4 space-y-3">
                    <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Class name</span><input className="input mt-1" value={classroomName} onChange={(e) => setClassroomName(e.target.value)} /></label>
                    <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Grade band</span><select className="input mt-1" value={classroomGradeBand} onChange={(e) => setClassroomGradeBand(e.target.value)}>{CLASSROOM_GRADE_BAND_OPTIONS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Subject focus</span><select className="input mt-1" value={classroomSubjectFocus} onChange={(e) => setClassroomSubjectFocus(e.target.value as ClassroomSubjectFocus)}>{CLASSROOM_SUBJECT_OPTIONS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                      <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Room theme</span><select className="input mt-1" value={classroomRoomTheme} onChange={(e) => setClassroomRoomTheme(e.target.value as ClassroomRoomTheme)}>{CLASSROOM_ROOM_THEME_OPTIONS.map((theme) => <option key={theme} value={theme}>{CLASSROOM_ROOM_THEME_LABELS[theme]}</option>)}</select></label>
                    </div>
                    <button type="button" className="btn-primary w-full justify-center min-h-[4.25rem]" onClick={handleCreateClassroom}><Plus size={16} strokeWidth={3} /> Create classroom</button>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-2"><UserPlus size={18} strokeWidth={3} className="text-primary" /><p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Student join flow</p></div>
                  <p className="text-sm text-ink-muted mt-2">Validate a join code and preview duplicate protection.</p>
                  <div className="mt-4 space-y-3">
                    <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Join code</span><input className="input mt-1 uppercase tracking-widest" value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())} /></label>
                    <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Student display name</span><input className="input mt-1" value={studentJoinName} onChange={(e) => setStudentJoinName(e.target.value)} /></label>
                    <button type="button" className="btn-outline w-full justify-center min-h-[4.25rem]" onClick={handleJoinClassroom}><Users size={16} strokeWidth={3} /> Join classroom</button>
                    {joinMessage && <p className="text-xs font-bold text-ink-muted">{joinMessage}</p>}
                  </div>
                </Card>
              </div>
            </section>

            <section className="grid xl:grid-cols-2 gap-5">
              <Card>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Create assignment</p>
                <p className="text-sm text-ink-muted mt-1">Generate an assignment, review it, then approve it for learners.</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  <label className="block sm:col-span-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Assignment title</span><input className="input mt-1" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} /></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Work type</span><select className="input mt-1" value={assignmentWorkType} onChange={(e) => setAssignmentWorkType(e.target.value as AssignmentWorkType)}>{Object.entries(ASSIGNMENT_WORK_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Subject</span><select className="input mt-1" value={assignmentSubject} onChange={(e) => setAssignmentSubject(e.target.value)}>{subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Skill</span><select className="input mt-1" value={assignmentSkill} onChange={(e) => setAssignmentSkill(e.target.value)}>{skillOptions.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Questions</span><input className="input mt-1" type="number" min={1} max={50} value={assignmentCount} onChange={(e) => setAssignmentCount(Number(e.target.value))} /></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Difficulty</span><select className="input mt-1" value={assignmentDifficulty} onChange={(e) => setAssignmentDifficulty(e.target.value as AssignmentDifficulty)}>{DIFFICULTY_OPTIONS.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}</select></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Due</span><select className="input mt-1" value={assignmentDue} onChange={(e) => setAssignmentDue(e.target.value)}>{ASSIGNMENT_DUE_OPTIONS.map((due) => <option key={due} value={due}>{due}</option>)}</select></label>
                  <button type="button" className="btn-primary justify-center sm:col-span-2" onClick={handleGenerateAssignment} disabled={!selectedGroup}><Sparkles size={16} strokeWidth={3} /> Generate assignment draft</button>
                </div>
              </Card>

              <Card>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Assignment review queue</p>
                <div className="mt-3 space-y-3">
                  {groupAssignments.length ? groupAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-3xl bg-bg border-2 border-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="h-display text-xl">{assignment.title}</p><p className="text-xs font-bold text-ink-muted">{ASSIGNMENT_WORK_TYPE_LABELS[assignment.workType]} · {assignment.subject} · {assignment.skill} · {assignment.questionCount} questions</p></div>
                        <span className="chip bg-primary/10 text-primary border-primary/20 capitalize">{ASSIGNMENT_STATUS_LABELS[assignment.status]}</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-2">Due {assignment.dueLabel} · {assignment.difficulty} · {assignment.completionPercent}% complete</p>
                      <p className="text-xs text-ink-muted mt-2">{assignment.generatedSummary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="btn-outline !py-2 !px-3 !text-xs" onClick={() => handleOpenReview(assignment.id)} disabled={assignment.status === "review" || assignment.status === "approved" || assignment.status === "assigned" || assignment.status === "completed"}><Eye size={13} strokeWidth={3} /> Review</button>
                        <button type="button" className="btn-primary !py-2 !px-3 !text-xs" onClick={() => approveAssignment(assignment.id)} disabled={assignment.status === "approved" || assignment.status === "assigned" || assignment.status === "completed"}><CheckCircle2 size={13} strokeWidth={3} /> Approve</button>
                        <button type="button" className="btn-outline !py-2 !px-3 !text-xs !text-red-500 hover:!border-red-300" onClick={() => handleDeleteAssignment(assignment.id)}>Delete</button>
                      </div>
                    </div>
                  )) : <p className="text-sm text-ink-muted">No assignments yet.</p>}
                </div>
              </Card>
            </section>

            <section className="grid xl:grid-cols-3 gap-5">
              <Card>
                <div className="flex items-center gap-2"><Target size={18} strokeWidth={3} className="text-primary" /><p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Curriculum controls</p></div>
                <p className="text-sm text-ink-muted mt-2">Set teacher-controlled learning goals for the selected group.</p>
                <div className="mt-3 space-y-3">
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Subject</span><select className="input mt-1" value={goalSubject} onChange={(e) => setGoalSubject(e.target.value)}>{subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Skill</span><select className="input mt-1" value={goalSkill} onChange={(e) => setGoalSkill(e.target.value)}>{goalSkillOptions.map((skill: string) => <option key={skill} value={skill}>{skill}</option>)}</select></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Goal</span><input className="input mt-1" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} /></label>
                  <button type="button" className="btn-primary w-full justify-center" onClick={handleAddLearningGoal} disabled={!selectedGroup}><Plus size={15} strokeWidth={3} /> Add goal</button>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2"><TrendingUp size={18} strokeWidth={3} className="text-sage" /><p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Teacher analytics</p></div>
                <div className="mt-3 space-y-3">
                  {groupLearningGoals.length ? groupLearningGoals.map((goal) => (
                    <div key={goal.id} className="rounded-3xl bg-bg border-2 border-white p-3">
                      <p className="h-display text-lg">{goal.skill}</p>
                      <p className="text-xs font-bold text-ink-muted">{goal.subject} · {MASTERY_LABELS[goal.masteryLevel]}</p>
                      <p className="text-xs text-ink-muted mt-1">{goal.target}</p>
                    </div>
                  )) : <p className="text-sm text-ink-muted">No curriculum goals yet.</p>}
                </div>
              </Card>

              <Card>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Parent reports</p>
                <p className="text-sm text-ink-muted mt-2">Generate simple parent-facing learning summaries from learner progress.</p>
                <div className="mt-3 space-y-3">
                  {groupLearners.slice(0, 3).map((learner) => (
                    <button key={learner.id} type="button" className="w-full rounded-3xl bg-bg border-2 border-white p-3 text-left hover:border-primary/40" onClick={() => selectedGroup && generateParentReport(learner.id, selectedGroup.id)}>
                      <p className="h-display text-lg">{learner.name}</p>
                      <p className="text-xs font-bold text-ink-muted">Generate parent snapshot</p>
                    </button>
                  ))}
                  {groupParentReports.slice(0, 2).map((report) => (
                    <div key={report.id} className="rounded-3xl bg-primary/10 border-2 border-primary/20 p-3">
                      <p className="h-display text-lg">{report.title}</p>
                      <p className="text-xs text-ink-muted mt-1">{report.summary}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <Card>
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Quick actions</p>
              <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <QuickAction icon={<ClipboardList size={18} strokeWidth={3} />} title="Create assignment" sub="Generate / review / approve" />
                <QuickAction icon={<Users size={18} strokeWidth={3} />} title="Add learner" sub="Roster v1" onClick={handleAddLearner} />
                <QuickAction icon={<Gift size={18} strokeWidth={3} />} title="Give reward" sub="Class pet XP" onClick={() => selectedGroup && giveClassPetReward(selectedGroup.id, 15)} />
                <QuickAction icon={<Castle size={18} strokeWidth={3} />} title="Open classroom world" sub="Edu-Mates realm" to="/adventure/realms" />
              </div>
              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                <input className="input" value={learnerName} onChange={(e) => setLearnerName(e.target.value)} placeholder="Learner name" />
                <input className="input" value={learnerGrade} onChange={(e) => setLearnerGrade(e.target.value)} placeholder="Grade" />
                <input className="input" value={learnerEmoji} onChange={(e) => setLearnerEmoji(e.target.value)} placeholder="Emoji" />
              </div>
            </Card>
          </section>
        </section>
      </main>
      {reviewAssignment && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl border-2 border-white p-5 md:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-bg pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Teacher review modal</p>
                <h2 className="h-display text-3xl text-ink mt-1">{reviewAssignment.title}</h2>
                <p className="text-sm text-ink-muted mt-1">{ASSIGNMENT_WORK_TYPE_LABELS[reviewAssignment.workType]} · {reviewAssignment.subject} · {reviewAssignment.skill} · {reviewAssignment.questionCount} questions · Due {reviewAssignment.dueLabel}</p>
              </div>
              <button type="button" className="btn-outline !p-3" onClick={() => setReviewAssignmentId(null)} aria-label="Close review modal"><X size={18} strokeWidth={3} /></button>
            </div>

            <div className="mt-5 space-y-4">
              {reviewQuestions.map((question, index) => (
                <div key={question.id} className="rounded-3xl bg-bg border-2 border-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Question {index + 1}</p>
                      <p className="h-display text-xl mt-1">{question.prompt}</p>
                    </div>
                    <button type="button" className="btn-outline !py-2 !px-3 !text-xs" onClick={() => handleRegenerateQuestion(reviewAssignment.id, index)}><RefreshCw size={13} strokeWidth={3} /> Regenerate</button>
                  </div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    {question.choices.map((choice) => (
                      <div key={choice} className={`rounded-2xl border-2 p-3 text-sm font-bold ${choice === question.correctAnswer ? "border-sage bg-sage/10 text-ink" : "border-white bg-white text-ink-muted"}`}>{choice}</div>
                    ))}
                  </div>
                  <p className="text-xs text-ink-muted mt-3"><span className="font-extrabold text-ink">Answer:</span> {question.correctAnswer}</p>
                  <p className="text-xs text-ink-muted mt-1"><span className="font-extrabold text-ink">Explanation:</span> {question.explanation}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-bg pt-4">
              <button type="button" className="btn-outline" onClick={handleDenyReviewAssignment}>Deny / send back</button>
              <button type="button" className="btn-primary" onClick={handleApproveReviewAssignment}><CheckCircle2 size={16} strokeWidth={3} /> Approve assignment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardStat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="card-base p-5 flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-bg grid place-items-center border-2 border-white">{icon}</div><div><p className="text-xs font-extrabold uppercase text-ink-muted">{label}</p><p className="h-display text-3xl">{value}</p></div></div>
);

const QuickAction: React.FC<{ icon: React.ReactNode; title: string; sub: string; to?: string; onClick?: () => void }> = ({ icon, title, sub, to, onClick }) => {
  const content = <div className="rounded-3xl bg-bg border-2 border-white p-4 text-left hover:border-primary/40 transition h-full"><div className="w-10 h-10 rounded-2xl bg-white grid place-items-center text-primary mb-3">{icon}</div><p className="h-display text-xl">{title}</p><p className="text-xs font-bold text-ink-muted mt-1">{sub}</p></div>;
  if (to) return <Link to={to}>{content}</Link>;
  return <button type="button" className="text-left" onClick={onClick}>{content}</button>;
};

export default ParentTeacherDashboard;
