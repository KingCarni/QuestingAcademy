import React from "react";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { useGame } from "../lib/gameStore";
import { COMPANIONS } from "../lib/mockData";
import { Check, Lock } from "lucide-react";

const Collection: React.FC = () => {
  const player = useGame((s) => s.player)!;
  const setActiveCompanion = useGame((s) => s.setActiveCompanion);
  const owned = new Set(player.ownedCompanionIds);

  return (
    <div className="min-h-screen pb-12">
      <TopBar back="/hub" title="Companion Collection" />
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="h-display text-3xl md:text-4xl">Your magical menagerie</h1>
              <p className="text-ink-muted">{owned.size} of {COMPANIONS.length} discovered</p>
            </div>
            <div className="chip bg-bg border-white">
              Active: <span className="h-display text-base ml-1">
                {COMPANIONS.find((c) => c.id === player.activeCompanionId)?.name}
              </span>
            </div>
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {COMPANIONS.map((c) => {
            const isOwned = owned.has(c.id);
            const isActive = player.activeCompanionId === c.id;
            return (
              <Card
                key={c.id}
                data-testid={`collection-card-${c.id}`}
                className={`relative ${isActive ? "ring-4 ring-primary" : ""}`}
              >
                {!isOwned && (
                  <div className="absolute top-4 right-4 chip bg-white border-white/80 text-ink-muted">
                    <Lock size={12} strokeWidth={3} /> Locked
                  </div>
                )}
                {isOwned && isActive && (
                  <div className="absolute top-4 right-4 chip bg-primary text-white border-primary">
                    <Check size={12} strokeWidth={3} /> Active
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <CompanionAvatar companion={c} size={110} locked={!isOwned} animate={isOwned} />
                  <p className="h-display text-xl mt-3">{isOwned ? c.name : "???"}</p>
                  <p className={"text-xs font-extrabold uppercase " + c.palette.accent}>
                    {c.affinity} · {c.personality.replace("-", " ")}
                  </p>
                  <p className="text-ink-muted text-sm mt-2 min-h-[40px]">{isOwned ? c.tagline : "Keep playing to discover this companion."}</p>
                  {isOwned && !isActive && (
                    <button
                      data-testid={`collection-set-active-${c.id}`}
                      onClick={() => setActiveCompanion(c.id)}
                      className="btn-outline mt-3 !text-sm !py-2 !px-5"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Collection;
