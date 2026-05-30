import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { useGame } from "../lib/gameStore";
import { COMPANIONS } from "../lib/mockData";

const HATCHERY_BG = "https://static.prod-images.emergentagent.com/jobs/2eddbcc9-3d07-49c8-985b-00a190300e36/images/7f39166ca6a00cef0337bdedb962bd6400342f077934204050cdb81a9d54a9b9.png";

const EggHatch: React.FC = () => {
  const nav = useNavigate();
  const eggs = useGame((s) => s.eggs);
  const hatchIfReady = useGame((s) => s.hatchIfReady);
  const [newlyHatched, setNewlyHatched] = useState<string[]>([]);

  useEffect(() => {
    const hatched = hatchIfReady();
    if (hatched.length) setNewlyHatched(hatched);
  }, [hatchIfReady]);

  return (
    <div className="min-h-screen pb-12">
      <TopBar back="/hub" title="The Hatchery" />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <Card className="!p-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-cover bg-center opacity-90" style={{ backgroundImage: `url(${HATCHERY_BG})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-white/60" />
          <div className="relative px-6 md:px-10 py-8 text-center">
            <p className="text-sm font-extrabold uppercase tracking-widest text-primary">Cozy Nursery</p>
            <h1 className="h-display text-4xl md:text-5xl mt-1">Warm your eggs by learning ✨</h1>
            <p className="text-ink-muted mt-1">Each question you answer adds a little heartbeat.</p>
          </div>
        </Card>

        {newlyHatched.length > 0 && (
          <Card className="border-gold/50">
            <p className="h-display text-2xl">A new friend appeared! 🎉</p>
            <div className="flex flex-wrap gap-4 mt-3">
              {newlyHatched.map((id) => {
                const c = COMPANIONS.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <div key={id} className="flex items-center gap-3 chip bg-white border-gold/40">
                    <CompanionAvatar companion={c} size={48} />
                    <span className="h-display text-lg">{c.name}</span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">added to collection</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {eggs.map((e) => {
            const into = COMPANIONS.find((c) => c.id === e.hatchesIntoCompanionId)!;
            return (
              <Card key={e.id} data-testid={`egg-card-${e.id}`} className="text-center">
                <div className="grid place-items-center py-4">
                  <div
                    className={"relative w-40 h-44 grid place-items-center " + (e.hatched ? "" : "animate-bounceSoft")}
                  >
                    <div
                      className="absolute inset-0 rounded-[50%] border-[6px] border-white"
                      style={{
                        background: `linear-gradient(180deg, ${e.palette.from}, ${e.palette.to})`,
                        boxShadow: `0 14px 0 ${e.palette.to}55`,
                      }}
                    />
                    {/* cracks */}
                    {!e.hatched && e.progress > 30 && (
                      <svg viewBox="0 0 100 110" className="relative z-10 w-32 h-36" fill="none" stroke="#4A4A4A" strokeWidth="2">
                        <path d="M50 25 L46 40 L56 55 L48 70" />
                        {e.progress > 60 && <path d="M40 50 L52 60 L40 75" />}
                        {e.progress > 80 && <path d="M58 35 L66 50 L60 65" />}
                      </svg>
                    )}
                    {e.hatched && (
                      <div className="relative z-10 animate-popIn">
                        <CompanionAvatar companion={into} size={120} />
                      </div>
                    )}
                  </div>
                </div>
                <p className="h-display text-2xl">{e.name}</p>
                <p className="text-ink-muted text-sm">
                  Hatches into <span className="font-extrabold">{into.name}</span>
                </p>
                <div className="mt-4">
                  <ProgressBar value={e.progress} max={100} color="egg" showLabel label="Warmth" testid={`egg-progress-${e.id}`} />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-wider mt-2 text-ink-muted">
                  {e.hatched ? "Hatched 🎉" : "Answer math questions in battles to warm this egg"}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center gap-3">
          <button data-testid="egg-battle-btn" onClick={() => nav("/battle")} className="btn-primary">
            Earn warmth in Battle ⚔️
          </button>
          <button data-testid="egg-collection-btn" onClick={() => nav("/collection")} className="btn-outline">
            See Collection
          </button>
        </div>
      </main>
    </div>
  );
};

export default EggHatch;
