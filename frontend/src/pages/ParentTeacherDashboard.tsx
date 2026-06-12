import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import {
  EDU_MATES_ROLE_LABELS,
  LEARNING_GROUP_TYPE_LABELS,
  getGroupAssignments,
  getGroupLearners,
  useLearningGroupStore,
  type AssignmentDifficulty,
  type EduMatesUserRole,
  type LearningGroupType,
} from "../lib/learningGroupStore";
import { BookOpen, Castle, ClipboardList, Gift, GraduationCap, Plus, Sparkles, Users } from "lucide-react";

const ROLE_OPTIONS: EduMatesUserRole[] = ["teacher", "parent", "homeschool-parent", "tutor", "admin"];
const GROUP_TYPE_OPTIONS: LearningGroupType[] = ["classroom", "homeschool", "tutoring", "pod", "intervention"];
const DIFFICULTY_OPTIONS: AssignmentDifficulty[] = ["gentle", "standard", "challenge"];

const ParentTeacherDashboard: React.FC = () => {
  const currentRole = useLearningGroupStore((s) => s.currentRole);
  const groups = useLearningGroupStore((s) => s.groups);
  const learners = useLearningGroupStore((s) => s.learners);
  const assignments = useLearningGroupStore((s) => s.assignments);
  const selectedGroupId = useLearningGroupStore((s) => s.selectedGroupId);
  const setCurrentRole = useLearningGroupStore((s) => s.setCurrentRole);
  const selectGroup = useLearningGroupStore((s) => s.selectGroup);
  const createGroup = useLearningGroupStore((s) => s.createGroup);
  const createAssignment = useLearningGroupStore((s) => s.createAssignment);
  const addLearnerToGroup = useLearningGroupStore((s) => s.addLearnerToGroup);
  const giveClassPetReward = useLearningGroupStore((s) => s.giveClassPetReward);

  const [newGroupName, setNewGroupName] = useState("New Edu-Mates Group");
  const [newGroupType, setNewGroupType] = useState<LearningGroupType>("classroom");
  const [newGroupGradeBand, setNewGroupGradeBand] = useState("Grades 2-3");
  const [assignmentTitle, setAssignmentTitle] = useState("Meadow Practice Quest");
  const [assignmentSubject, setAssignmentSubject] = useState("Math");
  const [assignmentSkill, setAssignmentSkill] = useState("Addition");
  const [assignmentCount, setAssignmentCount] = useState(10);
  const [assignmentDifficulty, setAssignmentDifficulty] = useState<AssignmentDifficulty>("standard");
  const [assignmentDue, setAssignmentDue] = useState("Friday");
  const [learnerName, setLearnerName] = useState("New learner");
  const [learnerGrade, setLearnerGrade] = useState("2");
  const [learnerEmoji, setLearnerEmoji] = useState("🧒");

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || groups[0] || null;
  const groupLearners = useMemo(() => getGroupLearners(selectedGroup, learners), [selectedGroup, learners]);
  const groupAssignments = useMemo(() => getGroupAssignments(selectedGroup, assignments), [selectedGroup, assignments]);
  const avgAccuracy = groupLearners.length ? Math.round(groupLearners.reduce((sum, learner) => sum + learner.accuracy, 0) / groupLearners.length) : 0;
  const weeklyMinutes = groupLearners.reduce((sum, learner) => sum + learner.minutesThisWeek, 0);
  const questsCompleted = groupLearners.reduce((sum, learner) => sum + learner.questsCompleted, 0);
  const activeAssignment = groupAssignments.find((assignment) => assignment.status === "assigned") || groupAssignments[0] || null;

  const handleCreateGroup = () => {
    createGroup({ name: newGroupName, type: newGroupType, ownerRole: currentRole, gradeBand: newGroupGradeBand });
    setNewGroupName("New Edu-Mates Group");
  };

  const handleCreateAssignment = () => {
    if (!selectedGroup) return;
    createAssignment({
      groupId: selectedGroup.id,
      title: assignmentTitle,
      subject: assignmentSubject,
      skill: assignmentSkill,
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
                <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Grade band</span><input className="input mt-1" value={newGroupGradeBand} onChange={(e) => setNewGroupGradeBand(e.target.value)} /></label>
                <button type="button" className="btn-primary w-full justify-center" onClick={handleCreateGroup} data-testid="dashboard-create-group"><Plus size={16} strokeWidth={3} /> Create group</button>
              </div>
            </Card>
          </aside>

          <section className="space-y-5">
            <Card>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-primary">TEA-83 / 85 / 87 Dashboard Pass</p>
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
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">TEA-85 Learner progress tracking</p>
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
                  <p className="text-sm text-ink-muted mt-1">{activeAssignment ? `${activeAssignment.subject} · ${activeAssignment.skill} · Due ${activeAssignment.dueLabel}` : `Realm: ${selectedGroup?.activeRealm || "Not set"}`}</p>
                  {activeAssignment && <div className="mt-3"><div className="h-3 rounded-full bg-bg border border-white overflow-hidden"><div className="h-full bg-primary" style={{ width: `${activeAssignment.completionPercent}%` }} /></div><p className="text-xs text-ink-muted mt-1">{activeAssignment.completionPercent}% complete · {activeAssignment.averageAccuracy}% avg accuracy</p></div>}
                </Card>

                <Card>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">TEA-87 Class pet</p>
                  <div className="mt-3 rounded-[2rem] bg-gradient-to-br from-primary/10 via-white to-gold/20 border-2 border-white p-4 text-center">
                    <div className="text-5xl mb-2">🌱</div>
                    <h3 className="h-display text-2xl">{selectedGroup?.classPetName || "Spriggle"}</h3>
                    <p className="text-sm font-bold text-ink-muted capitalize">Mood: {selectedGroup?.classPetMood || "focused"} · Level {selectedGroup?.classPetLevel || 1}</p>
                    <div className="mt-3 h-3 rounded-full bg-white border border-white overflow-hidden"><div className="h-full bg-gold" style={{ width: `${selectedGroup ? Math.min(100, Math.round((selectedGroup.classPetXp / selectedGroup.classPetXpGoal) * 100)) : 0}%` }} /></div>
                    <p className="text-xs text-ink-muted mt-1">{selectedGroup?.classPetXp || 0}/{selectedGroup?.classPetXpGoal || 100} XP · {selectedGroup?.classPetTreats || 0} treats</p>
                    <button type="button" className="btn-primary !py-2 !px-4 !text-sm mt-3" onClick={() => selectedGroup && giveClassPetReward(selectedGroup.id, 15)}><Gift size={14} strokeWidth={3} /> Give class reward</button>
                  </div>
                </Card>
              </div>
            </section>

            <section className="grid xl:grid-cols-2 gap-5">
              <Card>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">TEA-83 Create assignment</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  <label className="block sm:col-span-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Assignment title</span><input className="input mt-1" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} /></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Subject</span><input className="input mt-1" value={assignmentSubject} onChange={(e) => setAssignmentSubject(e.target.value)} /></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Skill</span><input className="input mt-1" value={assignmentSkill} onChange={(e) => setAssignmentSkill(e.target.value)} /></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Questions</span><input className="input mt-1" type="number" min={1} max={50} value={assignmentCount} onChange={(e) => setAssignmentCount(Number(e.target.value))} /></label>
                  <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Difficulty</span><select className="input mt-1" value={assignmentDifficulty} onChange={(e) => setAssignmentDifficulty(e.target.value as AssignmentDifficulty)}>{DIFFICULTY_OPTIONS.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}</select></label>
                  <label className="block sm:col-span-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Due</span><input className="input mt-1" value={assignmentDue} onChange={(e) => setAssignmentDue(e.target.value)} /></label>
                  <button type="button" className="btn-primary justify-center sm:col-span-2" onClick={handleCreateAssignment} disabled={!selectedGroup}><ClipboardList size={16} strokeWidth={3} /> Assign to group</button>
                </div>
              </Card>

              <Card>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Assignment list</p>
                <div className="mt-3 space-y-3">
                  {groupAssignments.length ? groupAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-3xl bg-bg border-2 border-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="h-display text-xl">{assignment.title}</p><p className="text-xs font-bold text-ink-muted">{assignment.subject} · {assignment.skill} · {assignment.questionCount} questions</p></div>
                        <span className="chip bg-primary/10 text-primary border-primary/20 capitalize">{assignment.status}</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-2">Due {assignment.dueLabel} · {assignment.difficulty} · {assignment.completionPercent}% complete</p>
                    </div>
                  )) : <p className="text-sm text-ink-muted">No assignments yet.</p>}
                </div>
              </Card>
            </section>

            <Card>
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Quick actions</p>
              <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <QuickAction icon={<ClipboardList size={18} strokeWidth={3} />} title="Create assignment" sub="TEA-83 active" />
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
