import React, { useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { useGame } from "../lib/gameStore";
import { ACADEMY_SUBJECTS, COMPANIONS } from "../lib/mockData";
import { ShieldCheck, Clock, Target, BookOpen, Star } from "lucide-react";

const PIN = "1234";

const Parent: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const parent = useGame((s) => s.parent);
  const player = useGame((s) => s.player);
  const eggs = useGame((s) => s.eggs);
  const battleStats = useGame((s) => s.battleStats);

  if (!unlocked) {
    return (
      <div className="min-h-screen">
        <TopBar back="/" title="Parent Access" />
        <main className="max-w-md mx-auto px-4 md:px-8 py-10">
          <Card className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white grid place-items-center mx-auto shadow-btn-primary">
              <ShieldCheck strokeWidth={3} />
            </div>
            <h1 className="h-display text-3xl mt-3">Parent area</h1>
            <p className="text-ink-muted mt-1">Enter the parent PIN to see learning progress.</p>
            <p className="text-xs font-extrabold text-primary mt-1">(Demo PIN: 1234)</p>
            <input
              data-testid="parent-pin-input"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErr("");
              }}
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              className="mt-5 w-full text-center text-3xl tracking-[0.5em] h-display border-4 border-primary/30 focus:border-primary outline-none rounded-full py-3 px-5 bg-white"
            />
            {err && <p data-testid="parent-pin-error" className="text-danger text-sm mt-2 font-bold">{err}</p>}
            <button
              data-testid="parent-pin-submit"
              onClick={() => (pin === PIN ? setUnlocked(true) : setErr("That PIN didn’t work. Try 1234."))}
              className="btn-primary mt-5 w-full !text-xl"
            >
              Unlock
            </button>
          </Card>
        </main>
      </div>
    );
  }

  const acc = parent.questionsAnswered
    ? Math.round((parent.correctAnswers / parent.questionsAnswered) * 100)
    : 0;
  const activeCompanion = COMPANIONS.find((c) => c.id === player?.activeCompanionId);

  return (
    <div className="min-h-screen pb-12">
      <TopBar back="/" title="Parent Dashboard" />
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <Card>
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <h1 className="h-display text-3xl md:text-4xl">{player ? `${player.name}'s journey` : "Learning Snapshot"}</h1>
              <p className="text-ink-muted">A friendly weekly overview. No personal data is sent anywhere.</p>
            </div>
            <Link to="/adventure" data-testid="parent-go-hub" className="btn-outline !text-base">Open the game</Link>
          </div>
          <div className="mt-3">
            <Link to="/admin" data-testid="parent-admin-link" className="text-xs font-extrabold text-primary hover:underline">
              Staff / admin tools →
            </Link>
          </div>
        </Card>

        <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Stat data-testid="parent-stat-questions" icon={<BookOpen className="text-primary" strokeWidth={3} />} label="Questions answered" value={String(parent.questionsAnswered)} />
          <Stat data-testid="parent-stat-accuracy"  icon={<Target  className="text-sage"    strokeWidth={3} />} label="Accuracy" value={`${acc}%`} />
          <Stat data-testid="parent-stat-time"      icon={<Clock   className="text-gold"    strokeWidth={3} />} label="Time played" value={`${Math.round(parent.timePlayedMinutes)} min`} />
          <Stat data-testid="parent-stat-battles"   icon={<Star    className="text-fire"    strokeWidth={3} />} label="Battles" value={String(battleStats.totalBattles)} />
        </section>

        <section className="grid md:grid-cols-2 gap-5">
          <Card>
            <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted">Topics practiced</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACADEMY_SUBJECTS.map((s) => {
                const tried = parent.topicsPracticed.includes(s.id);
                return (
                  <span key={s.id} className={"chip border " + (tried ? "border-primary/40 bg-primary/10 text-primary" : "bg-bg")}>
                    {s.emoji} {s.name}
                    <span className="ml-1 text-[10px] uppercase">{tried ? "practiced" : "not yet"}</span>
                  </span>
                );
              })}
            </div>
            <p className="text-xs font-bold text-ink-muted mt-3">All Grade {player?.grade ?? "K"} aligned content. No external content shown to your child.</p>
          </Card>

          <Card>
            <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted">Highlights</p>
            <ul className="mt-3 space-y-2">
              {parent.highlights.length === 0 && (
                <li className="text-ink-muted text-sm">Highlights will appear as your child plays.</li>
              )}
              {parent.highlights.map((h) => (
                <li key={h} className="chip bg-bg border-white">⭐ {h}</li>
              ))}
              {activeCompanion && (
                <li className="chip bg-bg border-white">{activeCompanion.emoji} Active companion: {activeCompanion.name}</li>
              )}
              {eggs.map((e) => (
                <li key={e.id} className="chip bg-bg border-white">
                  🥚 {e.name}: {e.hatched ? "hatched" : `${Math.round(e.progress)}% warm`}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <Card>
          <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted mb-3">Recent sessions</p>
          {parent.recentSessions.length === 0 ? (
            <p className="text-ink-muted text-sm">No sessions yet. Start an adventure together!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              {parent.recentSessions.map((s) => (
                <div key={s.date} className="rounded-2xl bg-bg p-3 border-2 border-white text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">{s.date.slice(5)}</p>
                  <p className="h-display text-lg">{Math.round(s.minutes)}m</p>
                  <p className="text-xs font-extrabold text-sage">{s.accuracy}%</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-muted mt-3">
            ⚠️ Demo data only. In production, all child data is privacy-first and parent-controlled.
          </p>
        </Card>
      </main>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; "data-testid"?: string }> = ({
  icon,
  label,
  value,
  ...rest
}) => (
  <div className="card-base p-5 flex items-center gap-3" {...rest}>
    <div className="w-12 h-12 rounded-2xl bg-bg grid place-items-center border-2 border-white">{icon}</div>
    <div>
      <p className="text-xs font-extrabold uppercase text-ink-muted">{label}</p>
      <p className="h-display text-2xl">{value}</p>
    </div>
  </div>
);

export default Parent;
