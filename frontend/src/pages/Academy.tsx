import React from "react";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { useGame } from "../lib/gameStore";
import { ACADEMY_SUBJECTS, COMPANIONS } from "../lib/mockData";

const Academy: React.FC = () => {
  const player = useGame((s) => s.player)!;
  const academy = useGame((s) => s.academy);
  const assign = useGame((s) => s.assignCompanionToSubject);
  const owned = COMPANIONS.filter((c) => player.ownedCompanionIds.includes(c.id));

  return (
    <div className="min-h-screen pb-12">
      <TopBar back="/hub" title="Math Academy" />
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <Card>
          <h1 className="h-display text-3xl md:text-4xl">Train your companions ✨</h1>
          <p className="text-ink-muted">Assign a companion to each subject. They learn while you play!</p>
        </Card>

        <div className="grid md:grid-cols-2 gap-5">
          {ACADEMY_SUBJECTS.map((sub) => {
            const a = academy.find((x) => x.subjectId === sub.id);
            const assigned = COMPANIONS.find((c) => c.id === a?.companionId) ?? null;
            return (
              <Card key={sub.id} data-testid={`academy-card-${sub.id}`} className={sub.color}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white grid place-items-center text-3xl border-2 border-white">{sub.emoji}</div>
                  <div className="min-w-0">
                    <p className="h-display text-2xl">{sub.name}</p>
                    <p className="text-sm text-ink-muted">{sub.description}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <ProgressBar
                    value={a?.progress ?? 0}
                    max={100}
                    color="primary"
                    showLabel
                    label="Mastery"
                    testid={`academy-progress-${sub.id}`}
                  />
                </div>

                <div className="mt-5 bg-white/80 rounded-2xl p-4 border-2 border-white">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted mb-2">Assigned Trainer</p>
                  {assigned ? (
                    <div className="flex items-center gap-3">
                      <CompanionAvatar companion={assigned} size={64} animate />
                      <div className="min-w-0 flex-1">
                        <p className="h-display text-lg">{assigned.name}</p>
                        <p className="text-xs font-extrabold uppercase text-ink-muted">{assigned.personality.replace("-", " ")}</p>
                      </div>
                      <button
                        data-testid={`academy-unassign-${sub.id}`}
                        onClick={() => assign(sub.id, null)}
                        className="btn-ghost !text-sm !py-2 !px-4"
                      >
                        Unassign
                      </button>
                    </div>
                  ) : (
                    <p className="text-ink-muted text-sm mb-2">Pick a companion to train this subject.</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {owned.map((c) => (
                      <button
                        key={c.id}
                        data-testid={`academy-assign-${sub.id}-${c.id}`}
                        onClick={() => assign(sub.id, c.id)}
                        className={
                          "px-3 py-1.5 rounded-full border-2 text-sm font-extrabold transition-colors " +
                          (assigned?.id === c.id
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-ink border-white hover:border-primary/40")
                        }
                      >
                        {c.emoji} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Academy;
