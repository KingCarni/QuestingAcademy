import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { ProgressBar } from "../components/ProgressBar";
import { useGame } from "../lib/gameStore";
import { COMPANIONS, ACADEMY_SUBJECTS } from "../lib/mockData";
import { ALL_TEMPLATES, generateQuestion, templatesForGrade } from "../lib/questionEngine";
import type { Grade, Question } from "../lib/types";
import { ShieldCheck, Trash2, Wand2, RefreshCw, Lock, AlertTriangle, Eye } from "lucide-react";

const ADMIN_PIN = "2580";
const GRADE_OPTIONS: Grade[] = ["K", "1", "2", "3", "4", "5", "6", "7"];

const AdminDashboard: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const player = useGame((s) => s.player);
  const eggs = useGame((s) => s.eggs);
  const tricky = useGame((s) => s.tricky);
  const settings = useGame((s) => s.settings);
  const battleStats = useGame((s) => s.battleStats);

  const adminUpdatePlayer = useGame((s) => s.adminUpdatePlayer);
  const adminGrant = useGame((s) => s.adminGrantCompanion);
  const adminRevoke = useGame((s) => s.adminRevokeCompanion);
  const adminSetEgg = useGame((s) => s.adminSetEggProgress);
  const adminResetEggs = useGame((s) => s.adminResetEggs);
  const adminClearTricky = useGame((s) => s.adminClearTricky);
  const setActiveCompanion = useGame((s) => s.setActiveCompanion);
  const setSubjectMode = useGame((s) => s.setSubjectMode);
  const toggleTemplate = useGame((s) => s.toggleTemplate);
  const resetAll = useGame((s) => s.resetAll);

  if (!unlocked) {
    return (
      <div className="min-h-screen">
        <TopBar back="/" title="Admin Access" />
        <main className="max-w-md mx-auto px-4 md:px-8 py-10">
          <Card className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white grid place-items-center mx-auto shadow-btn-primary">
              <Lock strokeWidth={3} />
            </div>
            <h1 className="h-display text-3xl mt-3">Admin area</h1>
            <p className="text-ink-muted mt-1">Demo prototype — staff tools.</p>
            <p className="text-xs font-extrabold text-primary mt-1">(Demo PIN: 2580)</p>
            <input
              data-testid="admin-pin-input"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setErr(""); }}
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              className="mt-5 w-full text-center text-3xl tracking-[0.5em] h-display border-4 border-primary/30 focus:border-primary outline-none rounded-full py-3 px-5 bg-white"
            />
            {err && <p data-testid="admin-pin-error" className="text-danger text-sm mt-2 font-bold">{err}</p>}
            <button
              data-testid="admin-pin-submit"
              onClick={() => (pin === ADMIN_PIN ? setUnlocked(true) : setErr("Invalid PIN. Try 2580."))}
              className="btn-primary mt-5 w-full !text-xl"
            >
              Unlock
            </button>
          </Card>
        </main>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen">
        <TopBar back="/" title="Admin Dashboard" />
        <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
          <Card className="text-center">
            <p className="h-display text-2xl">No player yet.</p>
            <p className="text-ink-muted mt-1">Send a child through onboarding to start managing.</p>
            <Link to="/" data-testid="admin-go-home" className="btn-primary mt-4 inline-flex">Go to landing</Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <TopBar back="/" title="Admin Dashboard" />
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

        <Card>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary">
              <ShieldCheck strokeWidth={3} />
            </div>
            <div>
              <h1 className="h-display text-3xl md:text-4xl">Staff tools</h1>
              <p className="text-ink-muted">Prototype-only. Edits write straight to localStorage state.</p>
            </div>
            <Link to="/hub" data-testid="admin-go-hub" className="btn-outline ml-auto !text-base">Open game</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/admin/studio"
              data-testid="admin-open-studio"
              className="btn-primary !text-sm !py-2 !px-4"
            >
              <ShieldCheck size={14} strokeWidth={3} /> Open Content Studio →
            </Link>
            <Link
              to="/admin/approvals"
              data-testid="admin-open-approvals"
              className="btn-outline !text-sm !py-2 !px-4"
            >
              Review Content (approvals)
            </Link>
          </div>
        </Card>

        {/* PLAYER */}
        <Card>
          <SectionHeader title="Player" sub={`${player.name || "Unnamed"} · created ${player.createdAt.slice(0,10)}`} />
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <LabeledInput
                label="Hero name"
                testid="admin-input-name"
                value={player.name}
                onChange={(v) => adminUpdatePlayer({ name: v, avatar: { ...player.avatar, name: v } })}
              />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted mb-1">Grade</p>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      data-testid={`admin-grade-${g}`}
                      onClick={() => adminUpdatePlayer({ grade: g })}
                      className={
                        "px-3 py-1.5 rounded-full border-2 text-sm font-extrabold transition " +
                        (player.grade === g ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40")
                      }
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumberStat
                label="Level" testid="admin-stat-level" value={player.level}
                onMinus={() => adminUpdatePlayer({ level: Math.max(1, player.level - 1) })}
                onPlus={() => adminUpdatePlayer({ level: player.level + 1 })}
              />
              <NumberStat
                label="XP" testid="admin-stat-xp" value={player.xp}
                onMinus={() => adminUpdatePlayer({ xp: Math.max(0, player.xp - 10) })}
                onPlus={() => adminUpdatePlayer({ xp: player.xp + 10 })}
              />
              <NumberStat
                label="Coins" testid="admin-stat-coins" value={player.coins}
                onMinus={() => adminUpdatePlayer({ coins: Math.max(0, player.coins - 10) })}
                onPlus={() => adminUpdatePlayer({ coins: player.coins + 10 })}
              />
            </div>
          </div>
        </Card>

        {/* COMPANIONS */}
        <Card>
          <SectionHeader title="Companions" sub="Approve, grant, or revoke pets." />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {COMPANIONS.map((c) => {
              const owned = player.ownedCompanionIds.includes(c.id);
              const active = player.activeCompanionId === c.id;
              return (
                <div key={c.id} data-testid={`admin-companion-${c.id}`} className="rounded-2xl bg-bg border-2 border-white p-4 flex items-center gap-3">
                  <CompanionAvatar companion={c} size={64} locked={!owned} />
                  <div className="min-w-0 flex-1">
                    <p className="h-display text-lg truncate">{c.name}</p>
                    <p className={"text-[10px] font-extrabold uppercase " + c.palette.accent}>{c.affinity}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={"chip text-[10px] " + (owned ? "border-sage/40 bg-sage/10 text-sage" : "bg-white")}>
                        {owned ? "owned" : "locked"}
                      </span>
                      {active && <span className="chip text-[10px] border-primary/40 bg-primary/10 text-primary">active</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {owned ? (
                      <button
                        data-testid={`admin-revoke-${c.id}`}
                        onClick={() => adminRevoke(c.id)}
                        className="text-xs font-extrabold text-danger hover:underline"
                      >Revoke</button>
                    ) : (
                      <button
                        data-testid={`admin-grant-${c.id}`}
                        onClick={() => adminGrant(c.id)}
                        className="text-xs font-extrabold text-sage hover:underline"
                      >Grant</button>
                    )}
                    {owned && !active && (
                      <button
                        data-testid={`admin-active-${c.id}`}
                        onClick={() => setActiveCompanion(c.id)}
                        className="text-xs font-extrabold text-primary hover:underline"
                      >Set active</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* EGGS */}
        <Card>
          <SectionHeader title="Eggs" sub="Force progress or hatch on demand." actions={
            <button data-testid="admin-reset-eggs" onClick={adminResetEggs} className="btn-ghost !text-sm !py-2 !px-4">
              <RefreshCw size={14} strokeWidth={3} /> Reset eggs
            </button>
          } />
          <div className="grid md:grid-cols-2 gap-4">
            {eggs.map((e) => (
              <div key={e.id} className="rounded-2xl bg-bg border-2 border-white p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-14 h-16 rounded-[50%] border-4 border-white"
                    style={{ background: `linear-gradient(180deg, ${e.palette.from}, ${e.palette.to})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="h-display text-lg">{e.name}</p>
                    <p className="text-xs font-bold text-ink-muted">{e.hatched ? "Hatched ✓" : "Incubating"}</p>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={e.progress}
                  data-testid={`admin-egg-slider-${e.id}`}
                  onChange={(ev) => adminSetEgg(e.id, parseInt(ev.target.value, 10), false)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs font-extrabold text-ink-muted mt-1">
                  <span>{Math.round(e.progress)}%</span>
                  <button
                    data-testid={`admin-egg-hatch-${e.id}`}
                    onClick={() => adminSetEgg(e.id, 100, true)}
                    className="font-extrabold text-primary hover:underline"
                  >Force hatch →</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SUBJECT MODE + TEMPLATE LIBRARY */}
        <Card>
          <SectionHeader title="Question Library" sub="Approve which templates kids see. Preview generates a fresh sample." />
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Subject mode:</span>
            {(["mixed", "math", "reading"] as const).map((m) => (
              <button
                key={m}
                data-testid={`admin-mode-${m}`}
                onClick={() => setSubjectMode(m)}
                className={
                  "px-3 py-1.5 rounded-full border-2 text-sm font-extrabold transition " +
                  (settings.subjectMode === m ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40")
                }
              >
                {m === "mixed" ? "Math + Reading" : m === "math" ? "Math only" : "Reading only"}
              </button>
            ))}
          </div>
          <TemplateLibrary
            disabled={settings.disabledTemplateIds}
            onToggle={(id, enabled) => toggleTemplate(id, enabled)}
            grade={player.grade}
          />
        </Card>

        {/* ACADEMY OVERVIEW */}
        <Card>
          <SectionHeader title="Academy progress" sub="Read-only snapshot of mastery." />
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {ACADEMY_SUBJECTS.map((s) => {
              const a = useGame.getState().academy.find((x) => x.subjectId === s.id);
              return (
                <div key={s.id} className="rounded-2xl bg-bg border-2 border-white p-3">
                  <p className="text-sm font-extrabold">{s.emoji} {s.name}</p>
                  <ProgressBar value={a?.progress ?? 0} max={100} color="primary" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* SPACED REPETITION POOL */}
        <Card>
          <SectionHeader title="Tricky pool" sub={`${tricky.length} item${tricky.length === 1 ? "" : "s"} queued for spaced-repetition review.`} actions={
            <button data-testid="admin-clear-tricky" onClick={adminClearTricky} className="btn-ghost !text-sm !py-2 !px-4">
              <Trash2 size={14} strokeWidth={3} /> Clear pool
            </button>
          } />
          {tricky.length === 0 ? (
            <p className="text-sm text-ink-muted">Empty — wrong answers will land here automatically.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto pr-1">
              {tricky.map((t, i) => (
                <li key={i} className="rounded-xl bg-bg border-2 border-white p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold truncate">{t.question.prompt}</span>
                    <span className="chip text-[10px] bg-white">stage {t.stage} · due @ Q{t.resurfaceAtIndex}</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">Answer: {t.question.choices[t.question.answerIndex]} · template {t.question.templateId}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-danger/30">
          <SectionHeader title="Danger zone" sub="Wipes ALL local state (including this admin's player)." />
          <p className="text-sm text-ink-muted mb-3">
            Questions answered total: <b>{battleStats.totalQuestions}</b> · Battles: <b>{battleStats.totalBattles}</b>
          </p>
          <button
            data-testid="admin-reset-all"
            onClick={() => {
              if (window.confirm("Wipe player, progress, eggs, tricky pool, settings — everything?")) resetAll();
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-danger text-white font-extrabold hover:brightness-105 active:translate-y-1 transition"
          >
            <AlertTriangle size={18} strokeWidth={3} /> Reset entire account
          </button>
        </Card>

      </main>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; sub?: string; actions?: React.ReactNode }> = ({ title, sub, actions }) => (
  <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
    <div>
      <h2 className="h-display text-2xl">{title}</h2>
      {sub && <p className="text-sm text-ink-muted">{sub}</p>}
    </div>
    {actions}
  </div>
);

const LabeledInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; testid?: string }> = ({
  label, value, onChange, testid,
}) => (
  <label className="block">
    <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{label}</span>
    <input
      value={value}
      data-testid={testid}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full border-2 border-white bg-white rounded-full px-4 py-2 font-bold focus:outline-none focus:border-primary/40"
    />
  </label>
);

const NumberStat: React.FC<{ label: string; value: number; onMinus: () => void; onPlus: () => void; testid?: string }> = ({
  label, value, onMinus, onPlus, testid,
}) => (
  <div className="rounded-2xl bg-bg border-2 border-white p-3 text-center" data-testid={testid}>
    <p className="text-xs font-extrabold uppercase text-ink-muted">{label}</p>
    <p className="h-display text-2xl">{value}</p>
    <div className="flex justify-center gap-1 mt-1">
      <button onClick={onMinus} className="w-7 h-7 rounded-full bg-white border-2 border-white font-extrabold hover:border-primary/40">−</button>
      <button onClick={onPlus} className="w-7 h-7 rounded-full bg-primary text-white font-extrabold">+</button>
    </div>
  </div>
);

const TemplateLibrary: React.FC<{ disabled: string[]; onToggle: (id: string, enabled: boolean) => void; grade: Grade }> = ({
  disabled, onToggle, grade,
}) => {
  const [previewById, setPreviewById] = useState<Record<string, Question | undefined>>({});
  const gradeTemplates = useMemo(() => templatesForGrade(grade, "mixed", []), [grade]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
        Showing templates available for current player grade: {grade} ({gradeTemplates.length} of {ALL_TEMPLATES.length})
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        {ALL_TEMPLATES.map((t) => {
          const isDisabled = disabled.includes(t.id);
          const isForGrade = t.grades.includes(grade);
          const preview = previewById[t.id];
          return (
            <div
              key={t.id}
              data-testid={`admin-template-${t.id}`}
              className={"rounded-2xl border-2 p-3 " + (isDisabled ? "bg-bg border-danger/30 opacity-70" : "bg-bg border-white")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold">{t.label}</p>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                    {t.subject} · {t.topic} · grades {t.grades.join(", ")}
                  </p>
                  <p className="text-xs text-ink-muted mt-1 italic">e.g. {t.example}</p>
                  {!isForGrade && (
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 mt-1">
                      not used at grade {grade}
                    </p>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    data-testid={`admin-template-toggle-${t.id}`}
                    checked={!isDisabled}
                    onChange={(e) => onToggle(t.id, e.target.checked)}
                    className="w-5 h-5 accent-primary"
                  />
                  <span className="text-xs font-extrabold uppercase text-ink-muted">{isDisabled ? "Off" : "On"}</span>
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  data-testid={`admin-template-preview-${t.id}`}
                  onClick={() =>
                    setPreviewById((m) => ({
                      ...m,
                      [t.id]: { ...t.generate(0.5), id: "preview-" + Date.now(), grade },
                    }))
                  }
                  className="text-xs font-extrabold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Wand2 size={12} strokeWidth={3} /> Generate sample
                </button>
              </div>
              {preview && (
                <div className="mt-2 p-2 rounded-xl bg-white border-2 border-white">
                  <p className="text-xs font-extrabold flex items-center gap-1"><Eye size={12} strokeWidth={3} /> {preview.prompt}</p>
                  <p className="text-[10px] font-bold text-ink-muted mt-1">
                    {preview.choices.map((c, i) => (
                      <span key={i} className={i === preview.answerIndex ? "text-sage font-extrabold" : ""}>
                        {c}{i < preview.choices.length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Used so the engine import isn't tree-shaken if a future agent removes preview generation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keep = generateQuestion;

export default AdminDashboard;
